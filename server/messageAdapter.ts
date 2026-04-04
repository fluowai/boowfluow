import { CanonicalMessage, CanonicalMedia, CanonicalQuotedMessage } from '../src/types/chat';
import { normalizePhone, sanitizeIdForUI, formatPhoneForDisplay } from './utils/identity';

export function toCanonicalMessage(input: any, isFromMe: boolean = false): CanonicalMessage {
  // If it's already a canonical message (has renderedBody and media object), return it
  if (input.renderedBody !== undefined && input.media && typeof input.media === 'object' && input.phone_normalized) {
    return input as CanonicalMessage;
  }

  // Handle Supabase Row
  if (input.message_id || input.id && typeof input.id === 'string' && input.id.includes('-')) {
    const quoted = input.quoted_msg || {};
    return {
      id: input.message_id || input.id,
      remoteJid: input.jid,
      phone_normalized: input.phone_normalized || normalizePhone(input.jid) || '',
      body: input.content || '',
      renderedBody: input.rendered_body || input.content || '',
      type: input.type || input.message_type || 'chat',
      media_type: input.media_type || input.message_type || 'chat',
      timestamp: Math.floor(new Date(input.timestamp).getTime() / 1000),
      fromMe: !!input.is_from_me,
      isGroup: input.jid.includes('@g.us'),
      isNewsletter: input.jid.includes('@newsletter'),
      senderName: (input.sender_name && input.sender_name !== 'Desconhecido' && !input.sender_name.includes('@')) ? input.sender_name : (input.pushname || input.notify_name || formatPhoneForDisplay(input.sender_phone)),
      senderPhone: input.sender_phone || (input.is_from_me ? '' : normalizePhone(input.jid)),
      senderQuality: input.sender_quality || 'poor',
      authorName: (input.author_name && input.author_name !== 'Desconhecido' && !input.author_name.includes('@')) ? input.author_name : (input.pushname || input.notify_name || formatPhoneForDisplay(input.author_phone)),
      authorPhone: input.author_phone || (input.is_from_me ? '' : normalizePhone(input.jid)),
      authorQuality: input.author_quality || 'poor',
      notifyName: input.notify_name || '',
      mentions: Array.isArray(input.mentions) ? input.mentions : [],
      mentions_json: input.mentions_json || [],
      media: {
        hasMedia: !!input.media_url || input.media_status === 'pending' || input.media_status === 'failed',
        url: input.media_url || null,
        mimetype: null,
        filename: null,
        filesize: null,
        caption: null,
        status: (input.media_status as any) || (input.media_url ? 'ready' : (input.media_error ? 'failed' : 'none')),
        error: input.media_error || null,
      },
      quotedMsg: quoted.is_reply ? {
        id: quoted.quoted_message_id,
        body: quoted.quoted_body,
        fullText: input.quoted_full_text || quoted.quoted_body,
        type: quoted.quoted_type,
        authorName: quoted.quoted_author_name,
        authorPhone: quoted.quoted_author_phone || '',
        isFromMe: !!quoted.quoted_from_me,
        isGroup: !!quoted.quoted_is_from_group,
        participant: quoted.quoted_participant,
        mediaUrl: quoted.media_url
      } : null,
      vcardName: input.vcard_name || null,
      vcardPhone: input.vcard_phone || null,
      groupName: input.group_name || null,
      isInstagram: false,
      __normalized: true,
      raw: input
    };
  }

  // Handle Raw WWebJS Message
  const msg = input;
  const jid = isFromMe ? msg.to : msg.from;
  const isGroup = jid?.includes('@g.us');

  // --- CASCATA DE RESOLUÇÃO DE IDENTIDADE ---
  // Prioridade: notifyName > pushName > authorName injetado > telefone formatado
  const authorJid = msg.author || (isGroup ? msg.author : msg.from) || '';
  const authorPhone = authorJid.split('@')[0] || '';
  const isLidJid = authorJid.includes('@lid');

  // 1. Tenta extrair o nome humano de todas as fontes disponíveis no objeto bruto
  const candidateNames = [
    msg._data?.notifyName,         // Fonte mais confiável para grupos
    msg.pushName,                   // Presente em chats diretos
    msg.authorName,                 // Injetado pelo getChats() enriquecido
    (msg as any).notifyName,        // Fallback extra
  ].filter(Boolean);

  const rawNotifyName = candidateNames.find(n => n && /[a-zA-ZÀ-ÿ]/.test(n)) || null;
  const isHuman = !!rawNotifyName;

  // 2. Resolução segura do nome exibido
  // NUNCA exibe hash @lid como nome — usa "Contato" como fallback seguro
  let resolvedAuthorName: string;
  if (isHuman) {
    resolvedAuthorName = rawNotifyName!;
  } else if (!isLidJid && authorPhone && authorPhone.length <= 15) {
    // Telefone válido (não é hash @lid): formata para exibição
    resolvedAuthorName = formatPhoneForDisplay(authorPhone);
  } else {
    // Hash @lid ou JID inválido: nunca exibe o hash bruto
    resolvedAuthorName = 'Contato';
  }

  const quality = isHuman ? 'rich' : (resolvedAuthorName === 'Contato' ? 'empty' : 'poor');

  // 3. senderName: para grupos usa o resolvedAuthorName do participante
  //    para chats diretos usa pushName ou telefone formatado do remetente
  const senderJid = msg.from || '';
  const senderPhone = senderJid.split('@')[0] || '';
  const senderName = isGroup
    ? resolvedAuthorName
    : (rawNotifyName || formatPhoneForDisplay(senderPhone));

  return {
    id: msg.id?._serialized || msg.id?.id,
    remoteJid: jid,
    phone_normalized: normalizePhone(jid) || '',
    body: msg.body || '',
    renderedBody: msg.body || '', // To be filled by syncMessageToSupabase
    type: msg.type || 'chat',
    media_type: msg.type || 'chat',
    timestamp: msg.timestamp || Math.floor(Date.now() / 1000),
    fromMe: Boolean(msg.fromMe),
    isGroup: isGroup,
    isNewsletter: (jid || '').includes('@newsletter'),
    senderName: senderName,
    senderPhone: senderPhone,
    senderQuality: quality,
    authorName: resolvedAuthorName,
    authorPhone: authorPhone,
    authorQuality: quality,
    notifyName: msg._data?.notifyName || msg.pushName || '',
    mentions: msg.mentionedIds || [],
    mentions_json: [], // To be filled by syncMessageToSupabase
    media: {
      hasMedia: !!msg.hasMedia,
      url: null,
      mimetype: msg._data?.mimetype || null,
      filename: msg._data?.filename || null,
      filesize: msg._data?.size || null,
      caption: msg.body || null,
      status: msg.hasMedia ? 'pending' : 'none',
      error: null,
    },
    quotedMsg: msg.hasQuotedMsg && msg._data ? {
      id: msg._data.quotedStanzaID,
      body: msg._data.quotedMsg?.conversation || msg._data.quotedMsg?.extendedTextMessage?.text || msg._data.quotedMsg?.body || '',
      fullText: msg._data.quotedMsg?.conversation || msg._data.quotedMsg?.extendedTextMessage?.text || msg._data.quotedMsg?.body || '',
      type: msg._data.quotedMsg?.type || 'chat',
      authorName: formatPhoneForDisplay((msg._data.quotedParticipant || '').split('@')[0]) || 'Contato',
      authorPhone: (msg._data.quotedParticipant || '').split('@')[0],
      isFromMe: msg._data.quotedParticipant === msg.from,
      isGroup: isGroup,
      participant: msg._data.quotedParticipant,
      mediaUrl: null
    } : null,
    vcardName: input.vcard_name || null,
    vcardPhone: input.vcard_phone || null,
    groupName: input.group_name || null,
    isInstagram: false,
    __normalized: true,
    raw: msg
  };
}
