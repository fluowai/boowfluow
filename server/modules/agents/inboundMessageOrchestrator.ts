import { agentBindingCache } from './agentBindingCache';
import { conversationContextService } from './conversationContextService';
import { agentRuntimeService } from './agentRuntimeService';


// Tipo que abstrai o envio da mensagem para evitar dependência circular com server/whatsapp.ts
export type SendMessageFn = (instanceName: string, jid: string, text: string, quotedMsgId?: string) => Promise<any>;
export type EmitSocketFn = (event: string, payload: any, instanceName: string) => void;

class InboundMessageOrchestrator {
  private sendMessageFn: SendMessageFn | null = null;
  private emitSocketFn: EmitSocketFn | null = null;

  // Anti-Duplicity: Impede que a mesma mensagem do sistema ou do webhook dispare dois orquestramentos ao mesmo tempo
  private processingQueue: Set<string> = new Set();
  
  // Cooldown de Segurança: Guarda o último momento que o agente respondeu a este JID (instanceId_jid -> Date.now())
  private lastReplyTime: Map<string, number> = new Map();

  attachDependencies(sender: SendMessageFn, emitter: EmitSocketFn) {
    this.sendMessageFn = sender;
    this.emitSocketFn = emitter;
  }

  async dispatch(msg: any, instanceName: string) {
    const trackingKey = `${instanceName}_${msg.id}`;
    const chatKey = `${instanceName}_${msg.remoteJid}`;
    
    try {
      if (this.processingQueue.has(trackingKey)) return;
      this.processingQueue.add(trackingKey);

      // 1. REGRAS NATIVAS INFLEXÍVEIS (Ignorar imediato)
      if (msg.fromMe) { console.log(`[AgentOrchestrator] Ignorando - fromMe: true`); return; } 
      if (msg.type !== 'chat') { console.log(`[AgentOrchestrator] Ignorando - Tipo não-chat: ${msg.type}`); return; } 
      // Evitar JIDs de Status e transmissões da API do zap
      if (msg.remoteJid === 'status@broadcast' || msg.remoteJid.includes('@newsletter')) return;

      // 2. RECUPERA CONFIGURAÇÃO DO AGENTE PARA ESTA INSTÂNCIA
      const binding = await agentBindingCache.getBindingForInstance(instanceName);
      
      if (!binding || !binding.is_active || !binding.agent) {
         console.log(`[AgentOrchestrator] Ignorando - Nenhum Binding válido ou ativo. Binding Info:`, binding ? "Present, but invalid" : "Missing completely");
         return; // Nenhuma IA ativa nesta linha
      }

      // 3. APPLY BINDING POLICIES
      if (!binding.reply_in_groups && msg.remoteJid.includes('@g.us')) {
         console.log(`[AgentOrchestrator] Ignorando - Grupos desativados nela`);
         return; // Grupo Banned
      }
      if (!binding.reply_in_private && !msg.remoteJid.includes('@g.us')) {
         console.log(`[AgentOrchestrator] Ignorando - Privado desativado nela`);
         return; // Privado Banned
      }
      if (binding.blocked_chat_ids.includes(msg.remoteJid)) { console.log(`[AgentOrchestrator] Banned Chat`); return; }
      if (binding.allowed_chat_ids.length > 0 && !binding.allowed_chat_ids.includes(msg.remoteJid)) { console.log(`[AgentOrchestrator] Not in whitelist`); return; }

      // Checa Cooldown Rápido
      const lastReply = this.lastReplyTime.get(chatKey) || 0;
      if (Date.now() - lastReply < (binding.cooldown_seconds * 1000)) {
         console.log(`[AgentOrchestrator][${chatKey}] Ignorando - Em Cooldown!`);
         return;
      }

      console.log(`[AgentOrchestrator] Tudo aprovado para dispatch! Preparando contexto de IA...`);

      // 4. NOTIFICAR UI DE QUE ESTAMOS PROCESSANDO
      if (this.emitSocketFn) {
         this.emitSocketFn('agent:message:processing', {
           instanceId: instanceName,
           jid: msg.remoteJid,
           messageId: msg.id,
           agentId: binding.agent_id
         }, instanceName);
      }

      // 5. CONTEXT & RUNTIME
      const context = await conversationContextService.buildContext(
         instanceName, 
         msg.remoteJid, 
         msg.content || '', 
         binding
      );

      // Se o atendente marcou (needsHuman), o bot CESSA IMEDIATAMENTE as falas
      if (context.needsHuman) {
         console.log(`[AgentOrchestrator][${chatKey}] Ignorando - Chat Aguardando Humano!`);
         return; // Não envia error/stop signal pra front, apenas para.
      }

      const runtimeResult = await agentRuntimeService.generateResponse(binding, context);

      if (runtimeResult.shouldReply && runtimeResult.replyText) {
         // Atualiza o Cooldown (Marca a intenção e bloqueia fila)
         this.lastReplyTime.set(chatKey, Date.now());

         console.log(`[AgentOrchestrator][${chatKey}] Agent Respondendo: ${runtimeResult.replyText.substring(0, 30)}...`);
         
         // 6. DESPACHAR MENSAGEM
         if (this.sendMessageFn) {
            await this.sendMessageFn(instanceName, msg.remoteJid, runtimeResult.replyText, msg.id);
            
            // Sucesso!
            if (this.emitSocketFn) {
              this.emitSocketFn('agent:message:replied', {
                instanceId: instanceName,
                jid: msg.remoteJid,
                messageId: msg.id,
                agentId: binding.agent_id,
                success: true
              }, instanceName);
           }
         }
      }

    } catch (err: any) {
       console.error(`[AgentOrchestrator] Falha Crítica no Dispatch:`, err);
       if (this.emitSocketFn) {
         this.emitSocketFn('agent:message:error', {
           instanceId: instanceName,
           jid: msg.remoteJid,
           error: err.message || 'Falha de processamento interna'
         }, instanceName);
       }
    } finally {
      // Libera GC do tracking local mas mantém por 1 minuto pra garantir flush anti-duplicidade em network retry
      setTimeout(() => this.processingQueue.delete(trackingKey), 60000);
    }
  }
}

export const inboundMessageOrchestrator = new InboundMessageOrchestrator();
