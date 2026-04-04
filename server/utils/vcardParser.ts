export interface VCardData {
  vcardName: string | null;
  vcardPhone: string | null;
  isValid: boolean;
}

/**
 * Extrai Nome e Telefone de um payload cru de vCard (BEGIN:VCARD)
 */
export function parseVCard(vcardRaw: string | null | undefined): VCardData {
  if (!vcardRaw || typeof vcardRaw !== 'string') {
    return { vcardName: null, vcardPhone: null, isValid: false };
  }

  if (!vcardRaw.includes('BEGIN:VCARD')) {
    return { vcardName: null, vcardPhone: null, isValid: false };
  }

  let extractedName: string | null = null;
  let extractedPhone: string | null = null;

  // Extrair FN (Full Name)
  const fnMatch = vcardRaw.match(/FN:(.+)/i);
  if (fnMatch && fnMatch[1]) {
    extractedName = fnMatch[1].trim();
  }

  // Extrair waid (O ID limpo do WhatsApp, preferencial)
  const waidMatch = vcardRaw.match(/waid=([^:]+):/i);
  if (waidMatch && waidMatch[1]) {
    extractedPhone = waidMatch[1].replace(/\D/g, '');
  } else {
    // Fallback extraindo número da tag TEL
    // Formato comum: TEL;type=CELL;type=VOICE;waid=551199999999:+55 11 9999-9999
    // Regex para pegar os digitos caso tenha o sinal ou não.
    const telLines = vcardRaw.split('\n').filter(line => line.toUpperCase().startsWith('TEL'));
    
    if (telLines.length > 0) {
      const telLine = telLines[0];
      const telValues = telLine.split(':');
      if (telValues.length > 1) {
        const rawPhone = telValues[telValues.length - 1]; // Pega a ultima parte apos os paramêtros
        extractedPhone = rawPhone.replace(/\D/g, '');
      }
    }
  }

  return {
    vcardName: extractedName,
    vcardPhone: extractedPhone,
    isValid: !!(extractedName || extractedPhone)
  };
}
