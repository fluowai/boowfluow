import { CanonicalMessage } from '../types/chat';

/**
 * [IDENTITY-SAFE] Detecta se um valor é uma identidade bruta (número, JID, ID de sistema, LID)
 * que NÃO deve ser exibida como nome humano.
 * Retorna TRUE se o valor é bruto/técnico.
 * 
 * DUPLICADO INTENCIONAL do server/utils/identity.ts — 
 * Frontend não pode importar do server, então mantem cópia idêntica.
 */
export function isRawIdentity(value?: string | null): boolean {
  if (!value || value === 'Desconhecido' || value === 'Unknown' || value === 'Usuário Desconhecido') return true;
  
  const trimmed = value.trim();
  if (!trimmed) return true;

  // JID format (contains @)
  if (trimmed.includes('@')) return true;
  
  // Extract only digits
  const digits = trimmed.replace(/\D/g, '');
  
  // Pure digits string (the value IS just digits, no letters at all)
  const hasLetters = /[a-zA-ZÀ-ÿ]/.test(trimmed);
  
  if (!hasLetters) {
    // Pure number with 10+ digits = phone number or system ID
    if (digits.length >= 10) return true;
  }
  
  // Known system prefixes (Communities/Channels/Routing IDs)
  const systemPrefixes = ['120363', '1159', '1547', '1834'];
  if (systemPrefixes.some(p => digits.startsWith(p)) && digits.length > 13) return true;
  
  // Excessively long digit string (>15) without BR prefix
  if (digits.length > 15 && !digits.startsWith('55') && !hasLetters) return true;
  
  // WhatsApp internal hex-like IDs (e.g. 3EB0XXXXX...)
  if (/^[0-9A-F]{16,}$/i.test(trimmed)) return true;
  
  // Value equals 'Sistema' is a marker, not a real name
  if (trimmed === 'Sistema') return true;

  return false;
}

/**
 * [IDENTITY-SAFE] Verifica se um valor é um nome humano exibível na UI.
 * Retorna TRUE se o valor é seguro para exibir como nome de pessoa.
 */
export function isDisplayableHumanName(value?: string | null): boolean {
  return !isRawIdentity(value);
}

/**
 * [PHONE-DISPLAY] Verifica se um número é um telefone brasileiro válido.
 * Regra: Deve começar com DDI 55 e ter 12-13 dígitos.
 * LIDs, IDs de sistema e números internacionais retornam false.
 */
export function isValidBrazilianPhone(value?: string | null): boolean {
  if (!value) return false;
  const digits = value.replace(/\D/g, '');
  if (!digits.startsWith('55')) return false;
  // BR phones: 55 + DDD(2) + number(8-9) = 12-13 digits
  return digits.length >= 12 && digits.length <= 13;
}

/**
 * [PHONE-DISPLAY] Formata número para exibição na UI.
 * - Se for telefone BR válido: "+55 48 98800-3260"
 * - Se não for telefone válido (LID, sistema): retorna null (o componente deve esconder)
 */
export function formatPhoneDisplay(value?: string | null): string | null {
  if (!value) return null;
  const digits = value.replace(/\D/g, '');
  
  if (!isValidBrazilianPhone(digits)) return null;
  
  // Format: +55 XX XXXXX-XXXX (13 digits) or +55 XX XXXX-XXXX (12 digits)
  const ddi = digits.slice(0, 2);     // 55
  const ddd = digits.slice(2, 4);     // 48
  const numberPart = digits.slice(4); // 988003260
  
  if (numberPart.length === 9) {
    return `+${ddi} ${ddd} ${numberPart.slice(0, 5)}-${numberPart.slice(5)}`;
  } else if (numberPart.length === 8) {
    return `+${ddi} ${ddd} ${numberPart.slice(0, 4)}-${numberPart.slice(4)}`;
  }
  
  return `+${digits}`;
}

/**
 * [IDENTITY-SAFE] Dado um campo de identidade que pode ser nome OU ID bruto,
 * retorna o nome se for humano, ou null/fallback se for bruto.
 */
function sanitizeIdentityField(value?: string | null, fallback: string = ''): string {
  if (!value) return fallback;
  if (isRawIdentity(value)) return fallback;
  return value;
}

/**
 * [IDENTITY-SAFE] Inverte o mapeamento numérico do banco para labels amigáveis na UI.
 * [V5-FIX] Aceita tanto número (3) quanto string ("3") e labels diretas ("rich")
 */
function mapNumberToQualityLabel(val: any): 'rich' | 'medium' | 'poor' | 'empty' {
  // Se já for um label string válida, retorna direto
  if (val === 'rich' || val === 'medium' || val === 'poor' || val === 'empty') return val;
  const numericLabels: Record<number, 'rich' | 'medium' | 'poor' | 'empty'> = { 0: 'empty', 1: 'poor', 2: 'medium', 3: 'rich' };
  return numericLabels[Number(val)] ?? 'empty';
}

/**
 * Converte qualquer formato de mensagem (Socket, Supabase ou Legado) 
 * para o formato CanonicalMessage.
 */
export function toCanonicalMessage(input: any): CanonicalMessage {
  if (!input) return null as any;

  // Blindagem Explicita: Se já estiver normalizado pelo backend (Arquitetura 3 Camadas), 
  // retorna sem tocar nos dados, preservando a fonte de verdade.
  if (input.__normalized) {
    return input as CanonicalMessage;
  }

  // Se vier do Supabase (snack_case)
  if (input.message_id || (input.id && typeof input.id === 'string' && input.id.includes('-'))) {
    const quoted = input.quoted_msg || {};
    const jidPhone = (input.jid || '').split('@')[0];
    
    // [IDENTITY-SAFE] Resolve identity from DB fields with sanitization
    const rawAuthorName = input.author_name || input.sender || null;
    const rawSenderName = input.sender_name || input.author_name || input.sender || null;
    const safeAuthorName = sanitizeIdentityField(rawAuthorName) || sanitizeIdentityField(input.pushname) || sanitizeIdentityField(input.notify_name) || '';
    const safeSenderName = sanitizeIdentityField(rawSenderName) || safeAuthorName || '';
    
    return {
      id: input.message_id || input.id,
      remoteJid: input.jid,
      phone_normalized: input.phone_normalized || jidPhone.replace(/\D/g, '') || '',
      body: input.content || '',
      renderedBody: input.rendered_body || input.content || '',
      type: input.type || 'chat',
      media_type: input.media_type || input.type || 'chat',
      timestamp: Math.floor(new Date(input.timestamp).getTime() / 1000),
      fromMe: Boolean(input.is_from_me),
      __normalized: true,
      isGroup: (input.jid || '').includes('@g.us'),
      isNewsletter: (input.jid || '').includes('@newsletter'),
      isInstagram: !!input.is_instagram || (input.jid || '').includes('instagram'),
      senderName: safeSenderName,
      senderPhone: input.sender_phone || (input.is_from_me ? '' : jidPhone),
      senderQuality: mapNumberToQualityLabel(input.sender_quality),
      authorName: safeAuthorName,
      authorPhone: input.author_phone || (input.is_from_me ? '' : jidPhone),
      authorQuality: mapNumberToQualityLabel(input.author_quality || input.identity_quality),
      notifyName: input.notify_name || '',
      mentions: Array.isArray(input.mentions) ? input.mentions : [],
      media: {
        hasMedia: !!input.media_url || input.media_status === 'pending' || input.media_status === 'failed',
        url: input.media_url || null,
        mimetype: null,
        filename: null,
        filesize: null,
        caption: null,
        status: (input.media_status as any) || (input.media_url ? 'ready' : 'none'),
      },
      quotedMsg: quoted.is_reply ? {
        id: quoted.quoted_message_id,
        body: quoted.quoted_body,
        fullText: quoted.quoted_body || quoted.quoted_full_text || '',
        type: quoted.quoted_type,
        authorName: quoted.quoted_author_name,
        authorPhone: quoted.author_phone || '',
        isFromMe: !!quoted.quoted_from_me,
        isGroup: !!quoted.quoted_is_from_group,
        participant: quoted.quoted_participant
      } : null,
      vcardName: input.vcard_name || null,
      vcardPhone: input.vcard_phone || null,
      groupName: input.group_name || null,
      translated_content: input.translated_content || null,
      detected_language: input.detected_language || null,
      raw: input
    };
  }

  // Fallback para mensagens brutas do socket ou formatos antigos
  const jid = input.from || input.to || input.key?.remoteJid;
  const authorPhone = (input.author || input.from || '').split('@')[0];
  
  // [IDENTITY-SAFE] Don't promote raw authorPhone as authorName
  // [IDENTITY-SAFE] Don't promote raw authorPhone as authorName
  const rawNotifyName = input.pushName || input._data?.notifyName;
  const isHuman = rawNotifyName && /[a-zA-ZÀ-ÿ]/.test(rawNotifyName);
  const resolvedName = isHuman ? rawNotifyName : '';
  const quality = isHuman ? 'rich' : 'poor';

  const result: CanonicalMessage = {
    id: input.id?._serialized || input.id?.id || input.key?.id,
    remoteJid: jid,
    phone_normalized: authorPhone.replace(/\D/g, '') || '',
    body: input.body || input.message?.conversation || '',
    renderedBody: input.body || input.message?.conversation || '',
    type: input.type || 'chat',
    media_type: input.type || 'chat',
    timestamp: input.timestamp || input.messageTimestamp || Math.floor(Date.now() / 1000),
    fromMe: typeof input.fromMe === 'boolean' ? input.fromMe : (input.key?.fromMe ?? undefined),
    __normalized: true,
    isGroup: (jid || '').includes('@g.us'),
    isNewsletter: (jid || '').includes('@newsletter'),
    isInstagram: (jid || '').includes('instagram') || !!input.isInstagram,
    senderName: resolvedName,
    senderPhone: (input.from || '').split('@')[0],
    senderQuality: quality,
    authorName: resolvedName,
    authorPhone: authorPhone,
    authorQuality: quality,
    notifyName: input._data?.notifyName || '',
    mentions: input.mentionedIds || [],
    media: {
      hasMedia: !!(input.hasMedia || input.media_url),
      url: input.media_url || null,
      mimetype: input._data?.mimetype || null,
      filename: input._data?.filename || null,
      filesize: input._data?.size || null,
      caption: input.body || null,
      status: input.media_url ? 'ready' : (input.hasMedia ? 'pending' : 'none'),
    },
    quotedMsg: null,
    vcardName: input.vcard_name || null,
    vcardPhone: input.vcard_phone || null,
    groupName: input.group_name || null,
    raw: input
  };

  // Validação de Segurança de Lado
  if (typeof result.fromMe !== 'boolean') {
    console.error("[Forense/Crítico] Mensagem recebida sem booleano fromMe definido!", { id: result.id, input });
  }

  return result;
}

/**
 * Helper para normalizar listas de mensagens
 */
export function normalizeMessages(messages: any[]): CanonicalMessage[] {
  if (!Array.isArray(messages)) return [];
  return messages.map(toCanonicalMessage).filter(m => !!m);
}

/**
 * [IDENTITY-SAFE] Mescla duas listas de mensagens de forma determinística.
 * 
 * REGRAS DE PRIORIDADE (Pós-Auditoria Forense):
 * 1. Identidade humana confiável = MÁXIMA prioridade (+200)
 * 2. senderName humano = alta prioridade (+120)
 * 3. renderedBody enriquecido = média (+40) 
 * 4. mídia pronta = média (+50)
 * 5. authorName bruto = ZERO (nunca ajuda)
 * 
 * REGRA DE PROTEÇÃO: Se uma versão tem nome humano e a outra tem nome bruto,
 * o merge PRESERVA o nome humano mesmo que a outra versão ganhe em score geral,
 * combinando a melhor identidade com o melhor estado de mídia.
 */
export function mergeMessages(listA: any[], listB: any[]): CanonicalMessage[] {
  const map = new Map<string, CanonicalMessage>();
  
  const process = (item: any) => {
    const canonical = toCanonicalMessage(item);
    if (!canonical || !canonical.id) return;
    
    const existing = map.get(canonical.id);
    if (!existing) {
      map.set(canonical.id, canonical);
    } else {
      // [IDENTITY-SAFE] Score rebalanceado: identidade > mídia
      const score = (m: CanonicalMessage) => {
        let s = 0;
        // Identidade é a prioridade MÁXIMA
        if (m.authorName && !isRawIdentity(m.authorName)) s += 200;
        if (m.senderName && !isRawIdentity(m.senderName)) s += 120;
        // Conteúdo enriquecido
        if (m.renderedBody && m.renderedBody !== m.body) s += 40;
        // Mídia pronta
        if (m.media?.status === 'ready') s += 50;
        return s;
      };

      const canonicalScore = score(canonical);
      const existingScore = score(existing);

      if (canonicalScore >= existingScore) {
        // canonical vence — mas PRESERVA identidade da existing se for melhor
        let winner = canonical;
        if (isRawIdentity(canonical.authorName) && !isRawIdentity(existing.authorName)) {
          winner = { ...canonical, authorName: existing.authorName };
        }
        if (isRawIdentity(canonical.senderName) && !isRawIdentity(existing.senderName)) {
          winner = { ...winner, senderName: existing.senderName };
        }
        map.set(canonical.id, winner);
      } else {
        // existing vence — mas PRESERVA mídia/conteúdo da canonical se for melhor
        let winner = existing;
        if (existing.media?.status !== 'ready' && canonical.media?.status === 'ready') {
          winner = { ...winner, media: canonical.media };
        }
        if (!winner.renderedBody && canonical.renderedBody) {
          winner = { ...winner, renderedBody: canonical.renderedBody };
        }
        map.set(canonical.id, winner);
      }
    }
  };

  listA.forEach(process);
  listB.forEach(process);

  return Array.from(map.values()).sort((a, b) => a.timestamp - b.timestamp);
}
