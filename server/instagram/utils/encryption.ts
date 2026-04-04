import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const ENCODING = 'hex';

function getKey(): Buffer {
  const secret = process.env.ENCRYPTION_SECRET || 'instagram-session-secret-key-32ch';
  return crypto.scryptSync(secret, 'salt', 32);
}

export function encrypt(text: string): string {
  if (!text) return '';
  try {
    const iv = crypto.randomBytes(16);
    const key = getKey();
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
    let encrypted = cipher.update(text, 'utf8', ENCODING);
    encrypted += cipher.final(ENCODING);
    const authTag = cipher.getAuthTag();
    return `${iv.toString(ENCODING)}:${authTag.toString(ENCODING)}:${encrypted}`;
  } catch {
    return text;
  }
}

export function decrypt(encryptedText: string): string {
  if (!encryptedText || !encryptedText.includes(':')) return encryptedText;
  try {
    const [ivHex, authTagHex, encrypted] = encryptedText.split(':');
    const iv = Buffer.from(ivHex, ENCODING);
    const authTag = Buffer.from(authTagHex, ENCODING);
    const key = getKey();
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);
    let decrypted = decipher.update(encrypted, ENCODING, 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch {
    return encryptedText;
  }
}

export function hash(text: string): string {
  return crypto.createHash('sha256').update(text).digest('hex');
}

export function generateId(): string {
  return crypto.randomUUID();
}
