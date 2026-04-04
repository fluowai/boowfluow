import { normalizePhone, sanitizeIdForUI } from '../utils/identity';
import { supabase } from '../supabase';

export interface IdentityResult {
  authorName: string;
  authorPhone: string;
  senderName: string;
  pushname: string;
  avatarUrl: string | null;
  groupName: string | null;
  quality: 'rich' | 'medium' | 'poor' | 'empty';
  source: 'pushName' | 'notifyName' | 'contact.pushname' | 'contact.name' | 'phone' | 'none';
}

/**
 * Resolve o verdadeiro nome de quem enviou a mensagem (author), isolando o nome de Grupos!
 * NUNCA injeta Group Name como o autor da fala humana.
 */
export async function resolveMessageAuthor(
  msg: any,
  instanceId: string,
  isLean: boolean = false
): Promise<IdentityResult> {
  const jid = msg.fromMe ? msg.to : msg.from;
  const isGroup = jid.includes('@g.us');
  
  const phone_normalized = normalizePhone(jid);
  
  // Autor Real da Mensagem
  const author_jid = msg.author || msg.from;
  let author_phone = normalizePhone(author_jid);
  
  // [LID-EXPOSURE] Detecção e Tratamento de Linked IDs (7xx, 8xx, 10xx, 11xx prefixes). 
  // Se for um LID, tentamos resolver para o número real via getContact().
  if (/^[78]\d{12,}$/.test(author_phone) || /^1[01]\d{12,}$/.test(author_phone)) {
    try {
      const authorContact = await msg.getContact?.().catch(() => null);
      if (authorContact?.number && authorContact.number.startsWith('55')) {
        author_phone = authorContact.number;
      }
    } catch {}
  }

  const sender_phone = isGroup ? author_phone : normalizePhone(msg.from);
  
  let sender_name = '';
  let pushname = '';
  let author_name = '';
  let avatar_url = null;
  let group_name = null;
  let quality: IdentityResult['quality'] = 'empty';
  let source: IdentityResult['source'] = 'none';

  if (!isLean) {
    if (isGroup) {
      // ===== GRUPO =====
      const chat = await msg.getChat().catch(() => null);
      group_name = chat?.name || jid;
      try { avatar_url = await chat?.getProfilePicUrl(); } catch {}

      // Busca Pushname a partir do CONTATO do PARTICIPANTE, nao do grupo!
      try {
        const participantContact = await msg.getContact?.().catch(() => null);
        
        // Em grupos, .getContact as vezes falha e retorna o proprio grupo se msg.author for vago.
        // Entao rely primarily on native msg._data.notifyName (O nome puro de WhatsApp da pessoa que mandou)
        const waPushname = msg.pushName || msg._data?.notifyName;
        pushname = waPushname || participantContact?.pushname || participantContact?.name || '';
        source = waPushname ? (msg.pushName ? 'pushName' : 'notifyName') : (participantContact?.pushname ? 'contact.pushname' : 'none');
        
        // Sender Name -> o participante q disparou
        sender_name = pushname || (participantContact && !participantContact.isGroup ? (participantContact.name || participantContact.shortName) : '') || author_phone;
      } catch {
        const waPushname = msg.pushName || msg._data?.notifyName;
        pushname = waPushname || '';
        source = waPushname ? 'pushName' : 'none';
        sender_name = pushname || sanitizeIdForUI(author_phone, 'author');
      }
      
      author_name = sender_name || sanitizeIdForUI(author_phone, 'author');

      if (!msg._data?.notifyName && author_phone) {
        // Fallback no banco para buscar este participante antigo
        try {
          const { data: cachedAuthor } = await supabase
            .from('whatsapp_contacts')
            .select('push_name')
            .eq('instance_id', instanceId)
            .eq('phone_normalized', author_phone)
            .single();
          
          if (cachedAuthor?.push_name) {
            author_name = cachedAuthor.push_name;
            sender_name = cachedAuthor.push_name;
          }
        } catch {}
      }

    } else {
      // ===== PRIVADO =====
      const contact = await msg.getContact?.().catch(() => null);
      try { avatar_url = await contact?.getProfilePicUrl(); } catch {}
      
      pushname = contact?.pushname 
        || msg._data?.notifyName 
        || contact?.name 
        || contact?.shortName 
        || '';
      
      source = contact?.pushname ? 'contact.pushname' : (msg.pushName ? 'pushName' : (msg._data?.notifyName ? 'notifyName' : 'none'));
        
      sender_name = pushname || contact?.name || contact?.shortName || sender_phone;
      
      if ((!sender_name || sender_name === sender_phone) && phone_normalized) {
        // Cache DB fallback
        try {
          const { data: cachedContact } = await supabase
            .from('whatsapp_contacts')
            .select('push_name, identity_quality')
            .eq('instance_id', instanceId)
            .eq('phone_normalized', phone_normalized)
            .single();
          
          if (cachedContact?.push_name) {
            sender_name = cachedContact.push_name;
            pushname = cachedContact.push_name;
            source = 'contact.pushname';
          }
        } catch {}
      }
      
      author_name = sender_name;
    }
  } else {
    // Lean Load - Fast sync for historical backfills
    sender_name = msg._data?.notifyName || sender_phone;
    author_name = msg._data?.notifyName || author_phone;
    source = msg._data?.notifyName ? 'notifyName' : 'phone';
  }

  // Final Quality Check
  const { classifyIdentity } = await import('../utils/identity');
  quality = classifyIdentity(pushname || sender_name || author_name);

  return {
    authorName: author_name,
    authorPhone: author_phone,
    senderName: sender_name,
    pushname: pushname,
    avatarUrl: avatar_url,
    groupName: group_name,
    quality,
    source
  };
}
