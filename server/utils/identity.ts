/**
 * Normaliza e sanitiza seguindo a REGRA ESTREITA:
 * 1. Deve começar com 55 (DDI Brasil).
 * 2. Deve ter sufixo de plataforma (@c.us, @s.whatsapp.net, @whatsapp).
 * 3. Se não cumprir, não é considerado um número de telefone válido (é técnico).
 */
export function normalizePhone(value: string | null | undefined): string {
  if (!value) return '';
  
  const original = value.trim();
  const hasSuffix = original.includes('@c.us') || original.includes('@s.whatsapp.net') || original.includes('@whatsapp.net') || original.includes('@whatsapp');
  
  // Pega a parte numérica
  const rawId = original.split('@')[0];
  const digits = rawId.replace(/\D/g, '');

  // REGRA ESTREITA: Brasil (55) + Sufixo de Plataforma
  // Se não começar com 55 ou não tiver sufixo (e for um ID longo), é técnico (LID)
  if (digits.length >= 10) {
    if (!digits.startsWith('55') || !hasSuffix) {
       // Se for um LID (ex: 73...), retornamos o ID técnico para que o sistema saiba tratar
       return digits; 
    }
  }

  return digits;
}

/**
 * Retorna o tipo de JID do ecossistema WhatsApp.
 */
export function extractJidType(value: string | null | undefined): 'user' | 'group' | 'broadcast' | 'newsletter' | 'unknown' {
  if (!value) return 'unknown';
  if (value.includes('@c.us') || value.includes('@s.whatsapp.net')) return 'user';
  if (value.includes('@g.us')) return 'group';
  if (value.includes('@broadcast')) return 'broadcast';
  if (value.includes('@newsletter')) return 'newsletter';
  return 'unknown';
}

/**
 * Converte um ID numérico puro (ex: 5548988003260) para o formato de exibição.
 * SEGUNDO SOLICITAÇÃO: Retorna apenas o número puro (ex: 5548988003260).
 * EXCETO para IDs de Sistema (Comunidades/Canais) que retornam 'Sistema'.
 */
export function formatPhoneForDisplay(phone: string | null | undefined): string {
  if (!phone) return 'Desconhecido';
  
  const digits = phone.replace(/\D/g, '');
  if (!digits) return 'Desconhecido';

  // IDs de Sistema Puros (Comunidades / Canais / IDs de Roteamento)
  // Prefixos conhecidos: 120363 (Comunidade), 1159 (Canal), 1547 (Sistema/Canal), 1834 (Sistema)
  const systemPrefixes = ['120363', '1159', '1547', '1834'];
  if (systemPrefixes.some(p => digits.startsWith(p)) && digits.length > 13) {
    return 'Sistema';
  }

  // Se for um ID excessivamente longo (> 15 dígitos) e não parecer um telefone BR/US, também é Sistema.
  if (digits.length > 15 && !digits.startsWith('55')) {
    return 'Sistema';
  }

  // Formato Solicitado: Apenas o número puro
  return digits;
}

/**
 * Evita que Nomes de Grupos exibam o ID gigante do JID.
 * Contexto 'chat' (padrão): Para nomes de conversas na barra lateral.
 * Contexto 'author': Para nomes de participantes em grupos.
 */
export function sanitizeIdForUI(value: string | null | undefined, context: 'chat' | 'author' = 'chat'): string {
  if (!value || value === 'Desconhecido' || value === 'Usuário Desconhecido') return 'Usuário Desconhecido';
  
  const digitsOnly = value.replace(/\D/g, '');
  
  // Detecção Seletiva de Sistema
  const systemPrefixes = ['120363', '1159', '1547', '1834'];
  if (systemPrefixes.some(p => digitsOnly.startsWith(p)) && digitsOnly.length > 13) {
    return 'Sistema';
  }

  // Detectar se já é um Nome Real (contém letras significativamente)
  const hasLetters = /[a-zA-Z]/.test(value);
  if (hasLetters && value !== 'Desconhecido' && value !== 'Usuário Desconhecido') {
    return value.trim();
  }

  const type = extractJidType(value);
  const normalized = normalizePhone(value);

  // Se for Grupo
  if (type === 'group') {
    // Se estivermos sanitizando o nome de um CHAT, retornamos 'Grupo (xxxx)'
    if (context === 'chat') {
      return `Grupo (${normalized.slice(0, 4)}...)`;
    }
    // Se for um AUTOR, retornamos o número puro (não deve ser 'Grupo')
    return normalized;
  }
  
  // Se for Newsletter (Canais)
  if (type === 'newsletter') return 'Canal';

  // Fallback final: Número puro conforme solicitado
  return normalized || 'Usuário Desconhecido';
}

/**
 * Normaliza participant IDs de grupos
 */
export function normalizeParticipantId(value: string | null | undefined): string {
  return normalizePhone(value);
}

/**
 * Detecta se um valor é uma identidade bruta (número, JID, ID de sistema, LID)
 * que NÃO deve ser exibida como nome humano.
 * Retorna TRUE se o valor é bruto/técnico.
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
  
  // Pure number with 10+ digits = phone number or system ID
  if (!hasLetters) {
    if (digits.length >= 10) {
      // REGRA ESTREITA: Se for longo e não começar com 55, é IDENTIDADE BRUTA (LID)
      if (!digits.startsWith('55')) return true;
      // No Brasil, telefones válidos têm entre 12 e 13 dígitos (55 + DDD + 8 ou 9 dígitos)
      if (digits.length > 13) return true;
      return true;
    }
  }
  
  // LIDs (Linked IDs) ou IDs Técnicos
  if (/^[78]\d{12,}$/.test(digits) && !hasLetters) return true;

  // Value equals 'Sistema' is a marker, not a real name
  if (trimmed === 'Sistema') return true;

  return false;
}

/**
 * [IDENTITY-SAFE] Classifica a identidade de forma semântica.
 */
export function classifyIdentity(name: string | null | undefined): 'rich' | 'medium' | 'poor' | 'empty' {
  if (!name || name === 'Desconhecido' || name === 'Usuário Desconhecido' || name === 'Unknown') return 'empty';
  
  const trimmed = name.trim();
  if (!trimmed) return 'empty';

  // Se contém letras e não parece um ID/telefone, é Rich (humano)
  const hasLetters = /[a-zA-ZÀ-ÿ]/.test(trimmed);
  const isRaw = isRawIdentity(trimmed);

  if (hasLetters && !isRaw) return 'rich';
  if (isRaw) return 'poor';
  
  return 'medium';
}

/**
 * [IDENTITY-SAFE] Decide se uma nova identidade deve sobrescrever a atual.
 * Regra: Nunca sobrescrever Rich por Poor.
 */
export function shouldOverwriteIdentity(currentQuality: string, newQuality: string): boolean {
  const ranks = { 'empty': 0, 'poor': 1, 'medium': 2, 'rich': 3 };
  const cur = ranks[currentQuality as keyof typeof ranks] || 0;
  const next = ranks[newQuality as keyof typeof ranks] || 0;

  // Só sobrescreve se a nova for de igual ou maior qualidade.
  // IMPORTANTE: Rich (3) nunca é sobrescrita por Poor (1) ou Empty (0).
  return next >= cur;
}
