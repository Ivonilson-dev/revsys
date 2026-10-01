import crypto from 'crypto';
import dotenv from 'dotenv';

dotenv.config();

const ALGORITHM = 'aes-256-cbc';
const SECRET_KEY = crypto.createHash('sha256').update(String(process.env.AES_KEY || 'default-secret-key-32-chars-length')).digest();
const IV_LENGTH = 16;

/**
 * Criptografa um texto usando AES-256-CBC
 * @param text - O texto a ser criptografado
 * @returns O texto criptografado no formato iv:encryptedData (hex)
 */
export function encrypt(text: string | null | undefined): string {
  if (!text) return text ?? '';
  try {
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, SECRET_KEY, iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return iv.toString('hex') + ':' + encrypted;
  } catch (error) {
    console.error('Erro na criptografia:', error);
    return text;
  }
}

/**
 * Descriptografa um texto no formato iv:encryptedData (hex)
 * @param text - O texto a ser descriptografado
 * @returns O texto descriptografado
 */
export function decrypt(text: string | null | undefined): string {
  if (!text) return text ?? '';
  try {
    const textParts = text.split(':');
    if (textParts.length !== 2) {
      // Se não estiver no formato iv:encrypted, retorna o próprio texto (pode ser dado antigo ou não criptografado)
      return text;
    }
    const ivHex = textParts[0];
    const encryptedHex = textParts[1];
    if (!ivHex || !encryptedHex) return text;

    const iv = Buffer.from(ivHex, 'hex');
    const encryptedText = Buffer.from(encryptedHex, 'hex');
    const decipher = crypto.createDecipheriv(ALGORITHM, SECRET_KEY, iv);
    let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (error) {
    console.error('Erro na descriptografia:', error);
    return text;
  }
}

export default {
  encrypt,
  decrypt
};

// Compatibilidade CommonJS
module.exports = {
  encrypt,
  decrypt,
  default: { encrypt, decrypt }
};

