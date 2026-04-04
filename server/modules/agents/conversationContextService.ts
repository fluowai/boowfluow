import { supabase } from '../../supabase';
import { AgentBinding } from './agentBindingCache';

export interface ChatMessageContext {
  role: 'user' | 'assistant' | 'system';
  content: string;
  name?: string;
  timestamp?: number;
}

export interface ConversationContext {
  messages: ChatMessageContext[];
  contactName: string;
  contactPhone: string;
  isGroup: boolean;
  needsHuman: boolean;
}

export class ConversationContextService {
  /**
   * Puxa o histórico de mensagens e metadados do contato para criar
   * a janela de contexto para a LLM.
   */
  async buildContext(instanceId: string, jid: string, incomingMessageText: string, binding: AgentBinding, maxHistory = 10): Promise<ConversationContext> {
    
    // 1. Tentar pegar os dados cruciais do contato (pushname, funil, is_ai_enabled)
    let contactName = 'Usuário';
    const contactPhone = jid.split('@')[0];
    let isGroup = jid.includes('@g.us');
    let needsHuman = false;

    // Busca rápida do contato
    const { data: contact } = await supabase
      .from('whatsapp_contacts')
      .select('push_name, is_ai_enabled, is_human_needed')
      .eq('instance_id', instanceId)
      .eq('jid', jid)
      .single();

    if (contact) {
      if (contact.push_name) contactName = contact.push_name;
      if (contact.is_human_needed) needsHuman = true;
    }

    // 2. Buscar o histórico recente das mensagens
    const { data: history } = await supabase
      .from('whatsapp_messages')
      .select('content, is_from_me, sender_name, timestamp')
      .eq('instance_id', instanceId)
      .eq('jid', jid)
      .order('timestamp', { ascending: false })
      .limit(maxHistory);

    const chatContext: ChatMessageContext[] = [];

    // Formata o histórico do mais antigo para o mais novo
    if (history && history.length > 0) {
      // Inverte porque ordered desc do BD
      const reversedHistory = history.reverse();
      
      for (const msg of reversedHistory) {
        // Pula mensagens sem texto ou nulas
        if (!msg.content || typeof msg.content !== 'string' || msg.content.trim() === '') continue;
        
        let role = msg.is_from_me ? 'assistant' : 'user';
        let nameToUse = msg.is_from_me ? (binding.agent?.name || 'Assistant') : (msg.sender_name || contactName);

        chatContext.push({
          role: role as 'assistant' | 'user',
          content: msg.content.trim(),
          name: this.sanitizeNameForLLM(nameToUse),
          timestamp: msg.timestamp
        });
      }
    }

    // Adiciona a própria mensagem atual no fim do contexto se ela não foi pega pelo Supabase (ainda não syncou perfeitamente ou é a mesma thread crua)
    // Para simplificar, o orquestrador vai passar o text puro se precisar, 
    // mas na nossa stack de 3 camadas da arquitetura, o Supabase Sync roda *antes* do Orquestrador.
    // Então é provável que a incomingMessageText já esteja no histórico.
    // Confirmaremos deduplicando pelo timestamp/last.
    
    const lastMsgIdx = chatContext.length - 1;
    const lastInHistory = lastMsgIdx >= 0 ? chatContext[lastMsgIdx].content : '';
    
    if (incomingMessageText && lastInHistory.trim() !== incomingMessageText.trim()) {
       chatContext.push({
         role: 'user',
         content: incomingMessageText.trim(),
         name: this.sanitizeNameForLLM(contactName)
       });
    }

    return {
      messages: chatContext,
      contactName,
      contactPhone,
      isGroup,
      needsHuman
    };
  }

  // LLMs como a OpenAI não suportam espaços e caracteres muito estranhos no atributo 'name'
  private sanitizeNameForLLM(name: string): string {
    return name.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 64) || 'User';
  }
}

export const conversationContextService = new ConversationContextService();
