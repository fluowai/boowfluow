import { messageQueue } from '../queue';
import { supabase, getAgentByInstanceId, getChatContext, getDbInstanceId, safeUpsertLead } from '../supabase';
import { whatsappService } from '../whatsapp';
import { supabaseAdmin } from '../lib/supabaseAdmin';
import { aiService } from './ai.service';
import { generateEmbedding, chunkText } from '../embeddings';
import { isAgentInWorkTime, resolveAgentPersonality } from '../utils/agentHelpers';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';
import { exec } from 'child_process';

const autoReplyEnabled = process.env.AUTO_REPLY !== 'false';

// ─── Transcrição local de áudio ───────────────────────────────────────────────
async function transcribeAudioLocal(filePath: string): Promise<{ text: string; language?: string }> {
  return new Promise((resolve) => {
    const pyCmd = os.platform() === 'win32' ? 'python' : 'python3';
    exec(`${pyCmd} server/transcribe.py "${filePath}"`, (error, stdout) => {
      if (error) return resolve({ text: '' });
      try {
        resolve(JSON.parse(stdout));
      } catch {
        resolve({ text: '' });
      }
    });
  });
}

// ─── Deduplicação de mensagens já respondidas ─────────────────────────────────
const processedMessages = new Set<string>();

export function initializeWorkers() {
  messageQueue.on('process_message', async ({ event, data }) => {
    if ((event === 'message' || event === 'message:new') && autoReplyEnabled) {
      const { instanceId } = data;
      const msg = data;
      const msgFrom = msg.remoteJid || msg.from;

      if (!msgFrom) return;

      // ── 1. Deduplicação ──────────────────────────────────────────────────────
      const msgKey = `${instanceId}:${msg.id?._serialized || msg.id || ''}`;
      if (processedMessages.has(msgKey)) return;
      processedMessages.add(msgKey);
      setTimeout(() => processedMessages.delete(msgKey), 10 * 60 * 1000);

      // ── 2. Filtros Iniciais ──────────────────────────────────────────────────
      if (msg.fromMe) return;
      if (msgFrom.includes('@g.us')) return; // Pula grupos por padrão

      // ── 3. Busca o agente vinculado à instância ──────────────────────────────
      const agent = await getAgentByInstanceId(instanceId);
      if (!agent) {
        console.warn(`[Worker] Nenhum agente vinculado à instância "${instanceId}".`);
        return;
      }

      // ── 4. Verifica horário de trabalho do agente ────────────────────────────
      if (!isAgentInWorkTime(agent)) return;

      // ── 5. Verifica se o chat tem IA habilitada ──────────────────────────────
      const { data: chatConfig } = await supabase
        .from('whatsapp_contacts')
        .select('is_ai_enabled, needs_human')
        .eq('instance_id', instanceId)
        .eq('jid', msgFrom)
        .single();

      if (chatConfig?.is_ai_enabled === false || chatConfig?.needs_human === true) return;

      try {
        // ── 6. Resolve texto da mensagem (Texto/Áudio) ──────────────────────────
        let messageText = msg.renderedBody || msg.body || '';
        const msgType = msg.type || 'chat';

        if ((msgType === 'audio' || msgType === 'ptt') && msg.hasMedia) {
          try {
            const media = await whatsappService.downloadMedia(instanceId, msg.id?._serialized);
            if (media?.data) {
              const tmpPath = path.join(os.tmpdir(), `audio_${Date.now()}.ogg`);
              fs.writeFileSync(tmpPath, Buffer.from(media.data, 'base64'));
              const transcription = await transcribeAudioLocal(tmpPath);
              if (fs.existsSync(tmpPath)) fs.unlinkSync(tmpPath);
              messageText = transcription.text ? `[Áudio transcrito]: ${transcription.text}` : '[Áudio recebido]';
            }
          } catch (err) {
            console.warn('[Worker] Erro ao transcrever áudio:', err);
            messageText = '[Áudio recebido]';
          }
        }

        if (!messageText.trim()) return;

        // ── 7. Busca histórico da conversa no banco (Persistência) ──────────────
        const dbId = await getDbInstanceId(instanceId);
        const history = dbId ? await getChatContext(dbId, msgFrom, 20) : [];

        // ── 8. Persona e IA ─────────────────────────────────────────────────────
        const resolvedPersonality = await resolveAgentPersonality(agent);
        
        // Simulação de comportamento humano
        await simulateTyping(instanceId, msgFrom, messageText);

        const aiResponse = await aiService.getAIResponse(
          messageText,
          resolvedPersonality,
          agent.knowledge || '',
          agent.ai_provider || undefined,
          history,
          agent.id,
        );

        const replyText = aiResponse?.text?.trim();
        if (!replyText) return;

        // ── 9. Resposta e Persistência ──────────────────────────────────────────
        await whatsappService.sendTextMessage(instanceId, msgFrom, replyText);
        
        if (dbId) {
          await supabase.from('whatsapp_messages').insert({
            instance_id: dbId,
            jid: msgFrom,
            phone_normalized: msgFrom.split('@')[0],
            content: replyText,
            rendered_body: replyText,
            message_type: 'chat',
            is_from_me: true,
            timestamp: new Date().toISOString(),
            sender_name: agent.name || 'Bot',
          });
        }

        // ── 10. Atualização de CRM (Lead) ───────────────────────────────────────
        const phone = msgFrom.split('@')[0];
        if (phone.startsWith('55')) {
          await safeUpsertLead({
            name: msg.pushName || msg.notifyName || phone,
            phone,
            source: 'whatsapp_private',
            status: 'active',
          }).catch(() => {});
        }

        console.log(`[Worker] ✅ Respondido em "${instanceId}" para ${msgFrom}`);

      } catch (err) { 
        console.error('[Worker] Fatal error ao processar mensagem:', err); 
      }
    }
  });

  // Vacuum Hunter (Manter lógica se necessário, omitindo aqui para manter o worker limpo)
}

async function simulateTyping(instanceId: string, jid: string, text: string) {
  const wpm = 400;
  const delay = Math.min(Math.max((text.length / (wpm * 5)) * 60000, 800), 4000);
  try {
    await whatsappService.sendTyping?.(instanceId, jid, true);
    await new Promise((r) => setTimeout(r, delay));
    await whatsappService.sendTyping?.(instanceId, jid, false);
  } catch {}
}

export async function bootstrapAllInstances() {
  try {
    const { data: instances, error } = await supabaseAdmin
      .from('whatsapp_instances')
      .select('name, status');

    if (error) {
      console.error('[Bootstrap] Erro ao buscar instâncias:', error.message);
      return;
    }

    const list = instances || [];
    console.log(`[Bootstrap] Iniciando boot sequencial de ${list.length} instância(s)...`);

    for (let i = 0; i < list.length; i++) {
      const inst = list[i];
      console.log(`[Bootstrap] [${i + 1}/${list.length}] Inicializando: ${inst.name}`);
      
      try {
        await whatsappService.connect(inst.name);
        console.log(`[Bootstrap] [${i + 1}/${list.length}] ${inst.name} — inicialização disparada.`);
      } catch (err: any) {
        console.error(`[Bootstrap] Falha ao iniciar ${inst.name}:`, err.message);
      }

      // Delay entre instâncias para evitar competição de recursos do Puppeteer
      // Última instância não precisa de delay
      if (i < list.length - 1) {
        const DELAY_MS = 8000; // 8 segundos entre cada Puppeteer
        console.log(`[Bootstrap] Aguardando ${DELAY_MS / 1000}s antes da próxima instância...`);
        await new Promise(resolve => setTimeout(resolve, DELAY_MS));
      }
    }

    console.log(`[Bootstrap] Boot sequencial concluído para ${list.length} instância(s).`);
  } catch (err: any) {
    console.error('[Bootstrap] Falha crítica:', err.message);
  }
}
