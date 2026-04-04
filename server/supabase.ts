import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load variables from .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseKey) {
  console.warn('[Supabase] Warning: Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY in .env.local');
}

import { normalizePhone, extractJidType, formatPhoneForDisplay, isRawIdentity } from './utils/identity';
import { parseVCard } from './utils/vcardParser';
import { resolveMessageAuthor } from './lib/identityResolver';
import { toCanonicalMessage } from './messageAdapter';
import { mediaQueue } from './queue';
import { socketEmitter } from './socketEmitter';

// Tipo de evento para o frontend
export interface MediaUpdatePayload {
  event: 'message_media_update';
  messageId: string;
  waMessageId: string;
  chatId: string;
  mediaStatus: 'none' | 'pending' | 'processing' | 'ready' | 'failed';
  mediaUrl: string | null;
  type: string;
  mediaError: string | null;
}

export interface ChatMetadata {
  jid: string;
  is_favorite: boolean;
  custom_name: string | null;
}

export const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * Helper: Mapeia labels de qualidade (strings) para valores numéricos (inteiros).
 * Usado para persistência eficiente e filtros no PostGREST.
 */
function mapQualityToNumber(quality: any): number {
  const ranks: any = { 'empty': 0, 'poor': 1, 'medium': 2, 'rich': 3 };
  if (typeof quality === 'number') return quality;
  return ranks[quality] ?? 0;
}

/**
 * [NOVO] Builder centralizado de payload para a tabela whatsapp_messages.
 * Garante que apenas colunas oficiais do schema sejam enviadas e normaliza campos conflitantes.
 */
function buildMessageDbPayload(data: any): any {
  // Mapeamento e fallback de Tipos (Eliminando message_type redundante)
  const finalType = data.type || data.message_type || 'chat';

  return {
    instance_id: data.instance_id,
    message_id: data.message_id,
    jid: data.jid,
    phone_normalized: data.phone_normalized,
    sender: data.sender || data.sender_name, 
    sender_name: data.sender_name || data.sender,
    sender_phone: data.sender_phone || data.author_phone,
    sender_quality: mapQualityToNumber(data.sender_quality || 'poor'),
    pushname: data.pushname,
    author_name: data.author_name,
    author_phone: data.author_phone,
    author_quality: mapQualityToNumber(data.author_quality || 'poor'),
    group_name: data.group_name,
    notify_name: data.notify_name || '',
    identity_quality: mapQualityToNumber(data.quality || data.identity_quality || 'empty'),
    identity_source: data.source || data.identity_source || 'none',
    content: data.content || '',
    rendered_body: data.rendered_body,
    message_type: finalType, // Coluna oficial do Supabase
    media_url: data.media_url,
    media_status: data.media_status || 'none',
    media_error: data.media_error,
    mentions: data.mentions || [],
    mentions_json: data.mentions_json || [],
    is_from_me: data.is_from_me,
    timestamp: data.timestamp,
    quoted_msg: data.quoted_msg,
    quoted_full_text: data.quoted_full_text,
    vcard_name: data.vcard_name,
    vcard_phone: data.vcard_phone,
    updated_at: new Date().toISOString()
  };
}

/**
 * [NOVO] Executa o upsert de forma segura com logs estruturados.
 * [IDENTITY-SAFE] Protege contra recontaminação: nunca sobrescreve author_name bom com valor bruto.
 */
async function safeUpsertMessage(payload: any) {
  const dbPayload = buildMessageDbPayload(payload);
  
  // [ANTI-RECONTAMINATION] Check if DB already has a better identity
  const { shouldOverwriteIdentity, classifyIdentity } = await import('./utils/identity');
  
  if (dbPayload.message_id) {
    try {
      const { data: existing } = await supabase
        .from('whatsapp_messages')
        .select('author_name, sender_name, pushname, author_quality, sender_quality')
        .eq('message_id', dbPayload.message_id)
        .single();
      
      if (existing) {
        // Preserve existing good identity fields based on quality
        if (!shouldOverwriteIdentity(existing.author_quality || classifyIdentity(existing.author_name), dbPayload.author_quality)) {
          dbPayload.author_name = existing.author_name;
          dbPayload.author_quality = existing.author_quality;
        }
        if (!shouldOverwriteIdentity(existing.sender_quality || classifyIdentity(existing.sender_name), dbPayload.sender_quality)) {
          dbPayload.sender_name = existing.sender_name;
          dbPayload.sender_quality = existing.sender_quality;
        }
        // Force check for pushname too (legacy preservation)
        if (existing.pushname && !classifyIdentity(dbPayload.pushname).startsWith('r') && classifyIdentity(existing.pushname) === 'rich') {
           dbPayload.pushname = existing.pushname;
        }
      }
    } catch {
      // First insert, no existing row — proceed normally
    }
  }

  const { data, error } = await supabase
    .from('whatsapp_messages')
    .upsert([dbPayload], { onConflict: 'message_id' })
    .select()
    .single();

  if (error) {
    console.error(`[Supabase SafeUpsert] CRÍTICO: Falha ao persistir mensagem ${dbPayload.message_id}`);
    console.error(`> Erro: ${error.message}`);
    console.error(`> Payload enviado (Keys): ${Object.keys(dbPayload).join(', ')}`);
    console.error(`> Contexto: JID=${dbPayload.jid}, Type=${dbPayload.type}, Group=${dbPayload.group_name || 'N/A'}`);
    return { data: null, error };
  }

  return { data, error: null };
}

export async function getDbInstanceId(name: string, userId?: string): Promise<string | null> {
  // If the passed name is already a valid UUID, just return it
  const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(name);
  if (isUUID) return name;

  let query = supabase
    .from('whatsapp_instances')
    .select('id')
    .eq('name', name);
    
  if (userId) {
    query = query.eq('user_id', userId);
  }

  const { data, error } = await query.single();

  if (error || !data) {
    if (name === 'default') {
      const { data: newData, error: newError } = await supabase
        .from('whatsapp_instances')
        .insert([{ name: 'default', status: 'disconnected' }])
        .select('id')
        .single();
      if (!newError && newData) return newData.id;
    }
    return null;
  }
  return data.id;
}

/**
 * [SEGURANÇA] Verifica se uma instância pelo nome pertence a um usuário específico.
 */
export async function isInstanceOwnedByUser(name: string, userId: string): Promise<boolean> {
  const { count, error } = await supabase
    .from('whatsapp_instances')
    .select('id', { count: 'exact', head: true })
    .eq('name', name)
    .eq('user_id', userId);

  if (error || count === 0) return false;
  return true;
}

export async function getAgentByInstanceId(instanceName: string) {
  try {
    const { data: instData, error: instError } = await supabase
      .from('whatsapp_instances')
      .select('active_agent_id')
      .eq('name', instanceName)
      .single();

    if (instError || !instData || !instData.active_agent_id) return null;

    const { data: agentData, error: agentError } = await supabase
      .from('whatsapp_agents')
      .select('*')
      .eq('id', instData.active_agent_id)
      .single();

    if (agentError) return null;
    return agentData;
  } catch (error) {
    console.error('[Supabase Agent Lookup Exception]', error);
    return null;
  }
}

export async function syncMessageToSupabase(instanceName: string, msg: any, isFromMe: boolean = false, isLean: boolean = false) {
  try {
    const dbId = await getDbInstanceId(instanceName);
    if (!dbId) return null;

    // 1. Identificar JID e Telefones
    const jid = isFromMe ? msg.to : msg.from;
    const isGroup = jid.includes('@g.us');
    const phone_normalized = normalizePhone(jid);
    
    const identity = await resolveMessageAuthor(msg, dbId, isLean);

    // FALLBACK SEGURO: Se identity veio vazia, constrói a partir do objeto bruto
    // Evita salvar mensagens com author_name nulo no banco
    if (!identity.authorName || identity.authorName === '' || identity.authorName === 'Desconhecido') {
      const rawNotify = msg._data?.notifyName || msg.pushName || null;
      const authorJid = msg.author || (isGroup ? msg.author : msg.from) || '';
      const authorPhone = authorJid.split('@')[0] || '';
      const isLidJid = authorJid.includes('@lid');

      if (rawNotify && /[a-zA-ZÀ-ÿ]/.test(rawNotify)) {
        identity.authorName = rawNotify;
        identity.pushname = rawNotify;
        identity.quality = 'rich';
      } else if (!isLidJid && authorPhone.length <= 15) {
        identity.authorName = formatPhoneForDisplay(authorPhone);
        identity.quality = 'poor';
      } else {
        identity.authorName = 'Contato';
        identity.quality = 'empty';
      }
    }

    // 3. Cache de Contato / Grupo (Inteligente e Pular se isLean)
    if (!isLean) {
      try {
        const dbId = await getDbInstanceId(instanceName);
        if (!dbId) return null;

        if (isGroup) {
          // 3a. Cache do Grupo
          const { data: cachedGroup } = await supabase
            .from('whatsapp_groups')
            .select('*')
            .eq('instance_id', dbId)
            .eq('jid', jid)
            .single();

          const isGroupStale = !cachedGroup || (new Date().getTime() - new Date(cachedGroup.updated_at).getTime() > 2 * 60 * 60 * 1000);

          if (isGroupStale) {
            const chat = await msg.getChat().catch(() => null);
            const group_name = chat?.name || jid;
            let avatar_url = null;
            try { avatar_url = await chat?.getProfilePicUrl(); } catch {}
            
            await supabase.from('whatsapp_groups').upsert({
              instance_id: dbId,
              jid: jid,
              group_name: group_name,
              avatar_url: avatar_url,
              updated_at: new Date().toISOString()
            }, { onConflict: 'instance_id, jid' });
          }

          // 3b. [PENTE-FINO] Cache do Autor (Participante) do Grupo
          if (identity.authorPhone) {
            const authorJid = identity.authorPhone + '@c.us';
            await safeUpsertContactIdentity({
              instance_id: dbId,
              jid: authorJid,
              phone_normalized: identity.authorPhone,
              pushname: identity.pushname || identity.authorName,
              identity_quality: identity.quality,
              identity_source: identity.source,
              avatar_url: null
            });
          }
        } else {
          // 3c. [IDENTITY-SAFE] Upsert de Contato Direto
          await safeUpsertContactIdentity({
            instance_id: dbId,
            jid: jid,
            phone_normalized: phone_normalized,
            pushname: identity.pushname,
            identity_quality: identity.quality,
            identity_source: identity.source,
            avatar_url: null
          });

          if (!isLean) {
            const contact = await msg.getContact?.().catch(() => null);
            let avatar_url = null;
            try { avatar_url = await contact?.getProfilePicUrl(); } catch {}
            if (avatar_url) {
              await supabase.from('whatsapp_contacts').update({ avatar_url }).eq('instance_id', dbId).eq('jid', jid);
            }
          }
        }
      } catch (cacheErr) {
        console.warn('[Supabase Sync] Failed to update contact/group cache:', cacheErr);
      }
    }

    const msgType = msg.type ?? msg.mediaType ?? 'chat';

    // 5. vCard parsing local e Auto-Lead (Ouro do CRM Lamborghini)
    let vcard_name = null;
    let vcard_phone = null;
    if (msgType === 'vcard' || msgType === 'contact' || msgType === 'contact_card') {
      const vData = parseVCard(msg.body);
      if (vData.isValid && vData.vcardPhone) {
        vcard_name = vData.vcardName;
        vcard_phone = vData.vcardPhone;
        
        // --- 🏎️ LÓGICA LAMBORGHINI: AUTO-LEAD ---
        // Se recebemos um vCard, salvamos como lead automaticamente com qualidade Rich.
        console.log(`[Lamborghini] Auto-Lead detectado via vCard: ${vcard_name} (${vcard_phone})`);
        await safeUpsertLead({
          name: vcard_name,
          phone: vcard_phone,
          source: 'whatsapp_vcard',
          status: 'active',
          summary: `Lead capturado automaticamente via vCard. Enviado por: ${phone_normalized}`
        });
      }
    }

    // 4. Resolver Menções e Rendered Body (Simplificar se isLean)
    let rendered_body = msg.body || '';
    let mentions_json: any[] = [];
    
    if (!isLean && rendered_body.includes('@')) {
      try {
        let mentions: any[] = [];
        if (typeof msg.getMentions === 'function') {
           mentions = await msg.getMentions().catch(() => []);
        }

        // --- FALLBACK DE MENÇÕES (Regex para casos de falha do WWebJS) ---
        if (mentions.length === 0) {
           const matches = rendered_body.match(/@(\d{8,20})/g);
           if (matches) {
              for (const m of matches) {
                 const mPhone = m.replace('@', '');
                 const mJid = mPhone + '@c.us';
                 mentions_json.push({
                   raw_id: mJid,
                   phone_normalized: mPhone,
                   display_name: formatPhoneForDisplay(mPhone),
                   mention_type: 'contact',
                   clickable: true
                 });
                 rendered_body = rendered_body.replace(m, `@${formatPhoneForDisplay(mPhone)}`);
              }
           }
        } else {
          for (const mContact of mentions) {
            const mJid = mContact.id?._serialized || mContact.id?.user + '@c.us';
            const mPhone = normalizePhone(mJid);
            const mName = mContact.pushname || mContact.name || formatPhoneForDisplay(mPhone) || 'Contato';
            
            mentions_json.push({
              raw_id: mJid,
              phone_normalized: mPhone,
              display_name: mName,
              mention_type: 'contact',
              clickable: true
            });

            const numberOnly = mContact.id?.user || mContact.number;
            if (numberOnly) {
              rendered_body = rendered_body.replace(new RegExp(`@${numberOnly}`, 'g'), `@${mName}`);
            }
          }
        }
      } catch (err) {
        console.warn('[Supabase Sync] Failed to resolve mentions:', err);
      }
    }
    // 5. Resolver Quoted Message (Pular se isLean)
    let quoted_msg = null;
    let quoted_full_text = null;
    if (!isLean && msg.hasQuotedMsg) {
      try {
        const quoted = await msg.getQuotedMessage();
        const qContact = await quoted.getContact().catch(() => null);
        const qAuthorJid = quoted.author || quoted.from;
        const qAuthorPhone = normalizePhone(qAuthorJid) || '';
        const qAuthorName = qContact?.pushname || qContact?.name || qAuthorPhone || 'Desconhecido';
        
        quoted_full_text = quoted.body;
        
        // Safety Check: Algumas mensagens citadas vêm com ID indefinido em grupos grandes
        const quotedId = quoted.id?._serialized || (quoted.id as any)?.id;
        
        if (quotedId) {
          quoted_msg = {
            is_reply: true,
            quoted_message_id: quotedId,
            quoted_body: quoted.body,
            quoted_type: quoted.type,
            quoted_author_name: qAuthorName,
            quoted_author_phone: qAuthorPhone,
            quoted_from_me: quoted.fromMe,
            quoted_origin_jid: quoted.from,
            quoted_is_from_group: (quoted.from as string)?.includes('@g.us'),
            quoted_participant: quoted.author,
            quoted_exists: true,
            media_url: null
          };
        }
      } catch (e) {
        console.warn('[Supabase Sync] Failed to parse quoted message safety check:', e);
      }
    }
    
    const msgTimestamp = new Date((msg.timestamp || Math.floor(Date.now() / 1000)) * 1000).toISOString();

    // 6. Processar Mídias (Delegação para a Fila Assíncrona ou On-Demand em Grupos)
    const isAudio = msgType === 'audio' || msgType === 'ptt';
    const isOnDemandGroupMedia = isGroup && msg.hasMedia && !isAudio;
    
    let mediaStatus: 'none' | 'pending' | 'processing' | 'ready' | 'failed' | 'on-demand' = 
        isOnDemandGroupMedia ? 'on-demand' : (msg.hasMedia ? 'pending' : 'none');
        
    let mediaUrl = null;

    // 7. Preparar Payload e Salvar Inicialmente (Sempre rápido e não-bloqueante!)
    const msgIdSerialized = msg.id?._serialized || msg.id?.id;
    const rawPayload: any = {
      instance_id: dbId,
      message_id: msgIdSerialized,
      jid: jid,
      phone_normalized: phone_normalized,
      sender_name: identity.senderName,
      sender_phone: identity.authorPhone,
      pushname: identity.pushname,
      author_name: identity.authorName, 
      author_phone: identity.authorPhone,
      group_name: identity.groupName,
      notify_name: msg._data?.notifyName || '',
      content: msg.body || '',
      rendered_body: rendered_body,
      type: msgType,
      message_type: msgType,  // Garante compatível com schema e buildMessageDbPayload
      media_url: mediaUrl,
      media_status: mediaStatus,
      mentions: msg.mentionedIds || [],
      mentions_json: mentions_json,
      is_from_me: isFromMe,
      timestamp: msgTimestamp,
      quoted_msg: quoted_msg,
      quoted_full_text: quoted_full_text,
      vcard_name: vcard_name,
      vcard_phone: vcard_phone,
      sender_quality: identity.quality || 'poor',
      author_quality: identity.quality || 'poor',
      identity_quality: identity.quality || 'poor'
    };

    // 7.1 Upsert Seguro e Blindado
    const { data: result, error: dbError } = await safeUpsertMessage(rawPayload);

    if (dbError) {
      return toCanonicalMessage(buildMessageDbPayload(rawPayload));
    }

    // --- 🏎️ LÓGICA LAMBORGHINI: RASTREAMENTO DE VÁCUO ---
    // Atualiza o lead para saber quem falou por último (indica vácuo se for isFromMe)
    if (!isGroup && phone_normalized.startsWith('55')) {
      try {
        await supabase.from('leads')
          .update({
            last_contact: new Date().toISOString(),
            last_message_from_me: isFromMe,
            updated_at: new Date().toISOString()
          })
          .eq('phone', phone_normalized);
      } catch (err) {
        console.error(`[Lamborghini] Erro ao atualizar vácuo do lead ${phone_normalized}:`, err);
      }
    }

    // 8. Se tem mídia, e não é um carregamento lean gigante, e não é on-demand, enfileiramos.
    if (msg.hasMedia && !isLean && !isOnDemandGroupMedia) {
       mediaQueue.enqueue('enrich_media', {
          instanceName,
          dbId,
          jid,
          msgIdSerialized,
          msgType
       }, msgIdSerialized); 
    }

    const canonicalResult = toCanonicalMessage(result);
    return canonicalResult;
  } catch (error) {
    console.error('[Supabase Sync Exception]', error);
    return null;
  }
}

function emitMediaUpdate(instanceName: string, payload: MediaUpdatePayload) {
  socketEmitter.emitToInstance(instanceName, 'message:media_update', payload);
}

/**
 * Função exportada para processar mídias de forma isolada, 
 * usada tanto pelo worker automático quanto pela API On-Demand.
 */
export async function processMessageMedia(payload: { 
  instanceName: string, 
  dbId: string, 
  jid: string, 
  msgIdSerialized: string, 
  msgType: string 
}) {
  const { instanceName, dbId, jid, msgIdSerialized, msgType } = payload;
  
  try {
    // 1. Atualiza Status para 'processing' no BANCO e no Socket
    console.log(`[Media Processor] Iniciando processamento para ${msgIdSerialized} (${msgType})`);
    
    await supabase
      .from('whatsapp_messages')
      .update({ media_status: 'processing', updated_at: new Date().toISOString() })
      .eq('message_id', msgIdSerialized);

    emitMediaUpdate(instanceName, {
      event: 'message_media_update',
      messageId: msgIdSerialized,
      waMessageId: msgIdSerialized,
      chatId: jid,
      mediaStatus: 'processing',
      mediaUrl: null,
      type: msgType,
      mediaError: null
    });

    const MAX_RETRIES = 2;
    let lastError: any = null;
    let finalMediaUrl = null;
    let finalStatus: 'ready' | 'failed' = 'failed';
    
    // Importação dinâmica para evitar dependência circular
    const { whatsappService } = await import('./whatsapp');

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        const downloadPromise = whatsappService.downloadMedia(instanceName, msgIdSerialized);
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Media download timeout (30s)')), 30000)
        );
        
        const media = await Promise.race([downloadPromise, timeoutPromise]) as any;
        
        if (media && media.data) {
          const buffer = Buffer.from(media.data, 'base64');
          const ext = media.mimetype.split('/')[1]?.split(';')[0] || 'bin';
          const fileName = `${dbId}/${jid}/${Date.now()}_${msgIdSerialized.replace(/[^a-zA-Z0-9]/g, '_')}.${ext}`;

          const { data: uploadData, error: uploadError } = await supabase.storage
            .from('fluowai')
            .upload(fileName, buffer, {
              contentType: media.mimetype,
              upsert: true
            });

          if (!uploadError && uploadData) {
            const { data: publicUrlData } = supabase.storage
              .from('fluowai')
              .getPublicUrl(fileName);
            finalMediaUrl = publicUrlData.publicUrl;
            finalStatus = 'ready';
            break; 
          } else {
             lastError = uploadError;
          }
        }
      } catch (err: any) {
        lastError = err;
        console.warn(`[Media Processor] Tentativa ${attempt}/${MAX_RETRIES} falhou para ${msgIdSerialized}:`, err.message);
        if (attempt < MAX_RETRIES) await new Promise(r => setTimeout(r, 2000));
      }
    }

    // 2. Finaliza no Banco de Dados
    const errorString = finalStatus === 'failed' ? (lastError?.message || 'Erro ao baixar mídia') : null;
    await supabase
      .from('whatsapp_messages')
      .update({ 
        media_url: finalMediaUrl, 
        media_status: finalStatus, 
        media_error: errorString,
        updated_at: new Date().toISOString() 
      })
      .eq('message_id', msgIdSerialized);

    // 3. Emite update final via Socket
    emitMediaUpdate(instanceName, {
      event: 'message_media_update',
      messageId: msgIdSerialized,
      waMessageId: msgIdSerialized,
      chatId: jid,
      mediaStatus: finalStatus,
      mediaUrl: finalMediaUrl,
      type: msgType,
      mediaError: errorString
    });

    console.log(`[Media Processor] Concluído para ${msgIdSerialized}. Status: ${finalStatus}`);
    return { success: finalStatus === 'ready', url: finalMediaUrl };

  } catch (fatalError: any) {
    console.error('[Media Processor] Erro Fatal:', fatalError);
    return { success: false, error: fatalError.message };
  }
}

// --- WORKER DE MÍDIA DA FILA ASSÍNCRONA ---
mediaQueue.on('enrich_media', async (payload: any) => {
  await processMessageMedia(payload);
});

// --- NOVOS HELPERS PARA O MÓDULO DE AGENTES PROFISSIONAL ---

export async function getAgentTemplates() {
  const { data, error } = await supabase
    .from('agent_templates')
    .select('*')
    .eq('status', 'active')
    .order('name');
  if (error) throw error;
  return data;
}

export async function createAgent(payload: any) {
  const { data, error } = await supabase
    .from('whatsapp_agents')
    .insert([payload])
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function getAgentVariables(agentId: string) {
  const { data, error } = await supabase
    .from('agent_variables')
    .select('*')
    .eq('agent_id', agentId);
  if (error) throw error;
  return data;
}

export async function upsertAgentVariable(agentId: string, key: string, value: string, label?: string, type: string = 'text') {
  const { data, error } = await supabase
    .from('agent_variables')
    .upsert({
      agent_id: agentId,
      key,
      value,
      label: label || key,
      type,
      updated_at: new Date().toISOString()
    }, { onConflict: 'agent_id, key' })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function saveAgentVersion(agentId: string, versionNumber: number, snapshot: any, note?: string) {
  const { data, error } = await supabase
    .from('agent_versions')
    .insert({
      agent_id: agentId,
      version_number: versionNumber,
      snapshot,
      note
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function getAgentKnowledgeFiles(agentId: string) {
  const { data, error } = await supabase
    .from('agent_knowledge_files')
    .select('*')
    .eq('agent_id', agentId);
  if (error) throw error;
  return data;
}

export async function createAgentTestSession(agentId: string, version: number) {
  const { data, error } = await supabase
    .from('agent_test_sessions')
    .insert({
      agent_id: agentId,
      version,
      status: 'in_progress'
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function addAgentTestMessage(sessionId: string, role: 'user' | 'agent', content: string, modelResponse?: any, latency?: number) {
  const { data, error } = await supabase
    .from('agent_test_messages')
    .insert({
      test_session_id: sessionId,
      role,
      content,
      model_response: modelResponse,
      latency_ms: latency
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function getChatContext(instanceId: string, jid: string, limit: number = 15) {
  try {
    const { data, error } = await supabase
      .from('whatsapp_messages')
      .select('content, is_from_me')
      .eq('instance_id', instanceId)
      .eq('jid', jid)
      .order('timestamp', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('[Supabase Context Error]', error.message);
      return [];
    }

    // Inverte para ficar na ordem cronológica (mais antiga -> mais recente)
    return data.reverse().map(m => ({
      role: m.is_from_me ? 'assistant' : 'user',
      content: m.content
    }));
  } catch (error) {
    console.error('[Supabase Context Exception]', error);
    return [];
  }
}

/**
 * Recupera todos os metadados (favoritos, etc) de chats de uma instância específica
 */
export async function getChatMetadata(instanceName: string): Promise<ChatMetadata[]> {
  const instanceId = await getDbInstanceId(instanceName);
  if (!instanceId) return [];

  const { data, error } = await supabase
    .from('whatsapp_chat_metadata')
    .select('jid, is_favorite, custom_name')
    .eq('instance_id', instanceId);

  if (error) {
    console.error(`[Supabase Metadata] Erro ao buscar metadados para ${instanceName}:`, error.message);
    return [];
  }

  return data || [];
}

/**
 * Atualiza ou insere metadados de um chat (Favorito/Nome Customizado)
 */
export async function upsertChatMetadata(instanceName: string, jid: string, metadata: Partial<ChatMetadata>): Promise<boolean> {
  const instanceId = await getDbInstanceId(instanceName);
  if (!instanceId) return false;

  const { error } = await supabase
    .from('whatsapp_chat_metadata')
    .upsert({
      instance_id: instanceId,
      jid,
      ...metadata,
      updated_at: new Date().toISOString()
    }, { onConflict: 'instance_id, jid' });

  if (error) {
    console.error(`[Supabase Metadata] Erro ao salvar metadados para ${jid}:`, error.message);
    return false;
  }

  return true;
}

/**
 * [IDENTITY-SAFE] Upsert centralizado de contatos com proteção de qualidade.
 * Nunca sobrescreve um nome humano (rich) por um telefone ou vazio (poor).
 */
export async function safeUpsertContactIdentity(payload: any) {
  const { instance_id, jid, pushname, identity_quality, identity_source, phone_normalized, avatar_url } = payload;
  const { shouldOverwriteIdentity, classifyIdentity } = await import('./utils/identity');

  try {
    // 1. Busca estado atual do contato no banco
    const { data: existing } = await supabase
      .from('whatsapp_contacts')
      .select('push_name, identity_quality, identity_source')
      .eq('instance_id', instance_id)
      .eq('jid', jid)
      .single();

    const currentQuality = existing?.identity_quality || classifyIdentity(existing?.push_name);
    const newQuality = identity_quality || classifyIdentity(pushname);

    // 2. Decide se deve atualizar
    const canUpdate = !existing || shouldOverwriteIdentity(currentQuality, newQuality);

    if (canUpdate) {
      const upsertData: any = {
        instance_id,
        jid,
        phone_normalized,
        push_name: pushname,
        identity_quality: mapQualityToNumber(newQuality),
        identity_source: identity_source || 'none',
        last_identity_refresh_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      if (avatar_url) upsertData.avatar_url = avatar_url;

      const { error } = await supabase
        .from('whatsapp_contacts')
        .upsert(upsertData, { onConflict: 'instance_id, jid' });

      if (error) {
        console.error(`[Identity Shield] Error upserting contact ${jid}:`, error.message);
        return false;
      }
      
      console.log(`[Identity Shield][${jid}] Updated: ${currentQuality} -> ${newQuality} (Source: ${identity_source})`);
      return true;
    } else {
      // Log de preservação (Silencioso se for o mesmo, barulhento se evitou regressão)
      if (currentQuality === 'rich' && newQuality === 'poor') {
        console.warn(`[Identity Shield][${jid}] Bloqueada regressão de identidade: Preservando 'rich' contra tentativa 'poor' de ${identity_source}`);
      }
      return false;
    }
  } catch (err) {
    console.error(`[Identity Shield] Exception in contact upsert for ${jid}:`, err);
    return false;
  }
}

/**
 * Helpers para gerenciar o cache do Inbox Padrão do Kanban
 * Evita milhares de requisições de configuração desnecessárias ao banco.
 */
let defaultKanbanInboxCache: { kanban_id: string, kanban_column_id: string } | null = null;
let lastKanbanCacheTime = 0;

async function getDefaultKanbanInbox() {
  const ALIVE_MS = 1000 * 60 * 15; // 15 minutos em memória
  if (defaultKanbanInboxCache && (Date.now() - lastKanbanCacheTime < ALIVE_MS)) {
     return defaultKanbanInboxCache;
  }

  // Pegar o primeiro Kanban principal criado na conta
  console.log('[Kanban Debug] Buscando quadro principal...');
  const { data: board, error: bErr } = await supabase.from('kanbans').select('id').order('created_at', { ascending: true }).limit(1).single();
  
  if (bErr) {
      console.error('[Kanban Debug] Erro ao buscar Quadro:', bErr.message);
  }
  
  if (!board) {
      console.warn('[Kanban Debug] Nenhum quadro encontrado no banco "kanbans".');
      return null;
  }

  // Pegar a coluna de "Inbox" (aquela com o menor order)
  console.log(`[Kanban Debug] Quadro encontrado (ID: ${board.id}). Buscando primeira coluna...`);
  const { data: column, error: cErr } = await supabase
    .from('kanban_columns')
    .select('id')
    .eq('kanban_id', board.id)
    .order('order', { ascending: true })
    .limit(1)
    .single();

  if (cErr) {
      console.error('[Kanban Debug] Erro ao buscar Colunas:', cErr.message);
  }
  
  if (!column) {
      console.warn('[Kanban Debug] Nenhuma coluna encontrada para este quadro.');
      return null;
  }

  console.log(`[Kanban Debug] Inbox mapeada com sucesso! Coluna ID: ${column.id}`);
  defaultKanbanInboxCache = { kanban_id: board.id, kanban_column_id: column.id };
  lastKanbanCacheTime = Date.now();
  return defaultKanbanInboxCache;
}

/**
 * [LAMBORGHINI] Upsert de Lead robusto.
 * Gerencia a criação automática de leads a partir de interações ou vCards.
 */
export async function safeUpsertLead(payload: {
  name: string;
  phone: string;
  source?: string;
  status?: string;
  score?: number;
  sentiment?: string;
  summary?: string;
  ai_label?: string;
}) {
  const { name, phone, source, status, score, sentiment, summary, ai_label } = payload;
  
  try {
    // 1. Prepara dados (Limpeza básica de telefone se necessário)
    const cleanPhone = phone.replace(/\D/g, '');

    const upsertData: any = {
      name,
      phone: cleanPhone,
      source: source || 'whatsapp',
      status: status || 'active',
      updated_at: new Date().toISOString()
    };

    if (score !== undefined) upsertData.score = score;
    if (sentiment) upsertData.sentiment = sentiment;
    if (summary) upsertData.summary = summary;
    if (ai_label) upsertData.ai_label = ai_label;

    // --- 🎯 METODOLOGIA LAMBORGHINI INBOX ---
    if (source === 'whatsapp_private') {
       console.log(`[Lamborghini Inbox] Avaliando roteamento para Lead ${cleanPhone}...`);
       // Buscar se o Lead já está imerso no funil para não tirá-lo de lá
       const { data: existingLead, error: eErr } = await supabase
         .from('leads')
         .select('id, kanban_column_id')
         .eq('phone', cleanPhone)
         .single();
       
       if (eErr && eErr.code !== 'PGRST116') {
          console.error('[Lamborghini Inbox] Falha ao verificar existência do Lead:', eErr.message);
       }
       
       if (!existingLead?.kanban_column_id) {
          console.log(`[Lamborghini Inbox] Lead ${cleanPhone} não tem coluna designada. Buscando Inbox Kanban...`);
          const defKanban = await getDefaultKanbanInbox();
          if (defKanban) {
             upsertData.kanban_id = defKanban.kanban_id;
             upsertData.kanban_column_id = defKanban.kanban_column_id;
             console.log(`[Lamborghini Inbox] ✅ Lead ${cleanPhone} empacotado para inserção na Coluna ${defKanban.kanban_column_id} do Quadro ${defKanban.kanban_id}.`);
          } else {
             console.warn(`[Lamborghini Inbox] ❌ Fallback: Não foi possível obter Rota Kanban padrão. Salvando Lead solto...`);
          }
       } else {
          console.log(`[Lamborghini Inbox] Lead ${cleanPhone} já possui Quadro/Coluna. Ignorando routeamento.`);
       }
    }

    const { data, error } = await supabase
      .from('leads')
      .upsert(upsertData, { onConflict: 'phone' })
      .select()
      .single();

    if (error) {
      console.error(`[Lamborghini CRM] Erro ao dar upsert no Lead ${phone}:`, error.message);
      return null;
    }

    return data;
  } catch (err) {
    console.error(`[Lamborghini CRM] Exceção no upsert de lead para ${phone}:`, err);
    return null;
  }
}

/**
 * [RE-ARQUITETURA] Busca a lista de conversas (sidebar) diretamente do Banco de Dados.
 * Implementa a lógica de "Source of Truth" no Postgres.
 */
export async function getDbChats(instanceName: string = 'default') {
  try {
    const dbId = await getDbInstanceId(instanceName);
    if (!dbId) return [];

    // 1. Busca as últimas mensagens de cada JID para montar a sidebar
    // Usamos uma query que agrupa por JID e pega a mais recente
    const { data: messages, error: mErr } = await supabase
      .from('whatsapp_messages')
      .select('*')
      .eq('instance_id', dbId)
      .order('timestamp', { ascending: false });

    if (mErr) throw mErr;

    // 2. Deduplicação manual por JID (PostGREST não suporta DISTINCT ON facilmente via JS client sem rpc)
    const chatMap = new Map();
    for (const msg of messages) {
       if (!chatMap.has(msg.jid)) {
         chatMap.set(msg.jid, msg);
       }
    }
    const latestMessages = Array.from(chatMap.values());

    // 3. Enriquecimento com Metadados (Grupos/Contatos/Favoritos)
    const { data: groups } = await supabase.from('whatsapp_groups').select('*').eq('instance_id', dbId);
    const { data: contacts } = await supabase.from('whatsapp_contacts').select('*').eq('instance_id', dbId);
    const { data: metadata } = await supabase.from('whatsapp_chat_metadata').select('*').eq('instance_id', dbId);

    const groupMap = new Map(groups?.map(g => [g.jid, g]));
    const contactMap = new Map(contacts?.map(c => [c.jid, c]));
    const metaMap = new Map(metadata?.map(m => [m.jid, m]));

    // 4. Montagem do Objeto de Chat compatível com o Frontend
    const chats = latestMessages.map(msg => {
      const isGroup = msg.jid.includes('@g.us');
      const groupInfo = groupMap.get(msg.jid);
      const contactInfo = contactMap.get(msg.jid);
      const meta = metaMap.get(msg.jid);

      return {
        id: { _serialized: msg.jid },
        name: isGroup ? (groupInfo?.group_name || msg.group_name || msg.jid) : (contactInfo?.pushname || msg.author_name || msg.phone_normalized || msg.jid),
        jid: msg.jid,
        isGroup,
        unreadCount: 0, // TODO: Implementar contador no banco
        timestamp: new Date(msg.timestamp).getTime() / 1000,
        lastMessage: {
          id: { _serialized: msg.message_id },
          body: msg.content || msg.rendered_body || '',
          type: msg.message_type,
          timestamp: new Date(msg.timestamp).getTime() / 1000,
          fromMe: msg.is_from_me,
          from: msg.is_from_me ? 'me' : msg.jid,
          to: msg.is_from_me ? msg.jid : 'me'
        },
        isFavorite: meta?.is_favorite || false,
        customName: meta?.custom_name || null,
        avatarUrl: isGroup ? groupInfo?.avatar_url : contactInfo?.profile_picture_url
      };
    });

    // Ordenar: Favoritos primeiro, depois por timestamp
    return chats.sort((a, b) => {
      if (a.isFavorite && !b.isFavorite) return -1;
      if (!a.isFavorite && b.isFavorite) return 1;
      return b.timestamp - a.timestamp;
    });

  } catch (err) {
    console.error('[Supabase][getDbChats] Erro crítico:', err);
    return [];
  }
}

/**
 * [RE-ARQUITETURA] Busca o histórico de mensagens de um chat diretamente do Banco de Dados.
 */
export async function getDbMessages(instanceName: string, jid: string, limit: number = 50) {
  try {
    const dbId = await getDbInstanceId(instanceName);
    if (!dbId) return [];

    const { data, error } = await supabase
      .from('whatsapp_messages')
      .select('*')
      .eq('instance_id', dbId)
      .eq('jid', jid)
      .order('timestamp', { ascending: false })
      .limit(limit);

    if (error) throw error;

    // Converter para o formato Canônico que o frontend espera (Reverse order for scroll)
    return data.reverse().map(msg => ({
      id: msg.message_id,
      body: msg.content || msg.rendered_body || '',
      type: msg.message_type,
      timestamp: new Date(msg.timestamp).getTime(),
      fromMe: msg.is_from_me,
      from: msg.is_from_me ? 'me' : msg.jid,
      to: msg.is_from_me ? msg.jid : 'me',
      author: msg.author_phone || msg.sender_phone,
      authorName: msg.author_name || msg.sender_name,
      pushname: msg.pushname || msg.notify_name,
      mediaUrl: msg.media_url,
      mediaStatus: msg.media_status,
      isGroup: jid.includes('@g.us'),
      groupName: msg.group_name,
      quotedMsg: msg.quoted_msg
    }));

  } catch (err) {
    console.error('[Supabase][getDbMessages] Erro crítico:', err);
    return [];
  }
}

