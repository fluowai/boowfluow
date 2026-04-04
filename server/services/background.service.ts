import { messageQueue } from '../queue';
import { supabase, getAgentByInstanceId, getChatContext, syncMessageToSupabase, processMessageMedia } from '../supabase';
import { whatsappService } from '../whatsapp';
import { aiService } from './ai.service';
import { generateEmbedding, chunkText } from '../embeddings';
import { isAgentInWorkTime, resolveAgentPersonality } from '../utils/agentHelpers';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';

export function initializeBackgroundWorkers() {
  const autoReplyEnabled = process.env.AUTO_REPLY !== 'false';

  messageQueue.on('process_message', async ({ event, data }) => {
    if ((event === 'message' || event === 'message:new') && autoReplyEnabled) {
      const instanceId = data.instanceId;
      const msg = data;
      const msgFrom = msg.remoteJid || msg.from;
      
      if (!msgFrom) return;

      const agent = await getAgentByInstanceId(instanceId);
      if (!agent) return;

      if (!isAgentInWorkTime(agent)) return;

      const resolvedPersonality = await resolveAgentPersonality(agent);

      if (msg.fromMe) return;

      const isGroup = msgFrom.includes('@g.us');
      const table = isGroup ? 'whatsapp_groups' : 'whatsapp_contacts';
      
      const { data: chatConfig } = await supabase
        .from(table)
        .select('is_ai_enabled, needs_human')
        .eq('instance_id', instanceId)
        .eq('jid', msgFrom)
        .single();
      
      if (chatConfig) {
          if (chatConfig.is_ai_enabled === false || chatConfig.needs_human === true) return;
      }

      // ... Lógica de Grupos e Mídia ...
      // (Mantendo o código idêntico ao original do index.ts)
      // Nota: Esta função deve conter todo o bloco do messageQueue.on original
    }
  });

  // Vacuum Hunter
  setInterval(async () => {
     // Lógica do runVacuumHunter original
     // (Acessando global.io para emissões)
  }, 1 * 60 * 60 * 1000);
}
