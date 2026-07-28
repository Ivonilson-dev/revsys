const crypto = require('crypto');
require('dotenv').config();

const ALGORITHM = 'aes-256-cbc';
const SECRET_KEY = crypto.createHash('sha256').update(String(process.env.AES_KEY || 'default-secret-key-32-chars-length')).digest();
const IV_LENGTH = 16;

/**
 * Criptografa um texto usando AES-256-CBC
 * @param {string} text - O texto a ser criptografado
 * @returns {string} - O texto criptografado no formato iv:encryptedData (hex)
 */
function encrypt(text) {
  if (!text) return text;
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
 * @param {string} text - O texto a ser descriptografado
 * @returns {string} - O texto descriptografado
 */
function decrypt(text) {
  if (!text) return text;
  try {
    const textParts = text.split(':');
    if (textParts.length !== 2) {
      // Se não estiver no formato iv:encrypted, retorna o próprio texto (pode ser dado antigo ou não criptografado)
      return text;
    }
    const iv = Buffer.from(textParts.shift(), 'hex');
    const encryptedText = Buffer.from(textParts.join(':'), 'hex');
    const decipher = crypto.createDecipheriv(ALGORITHM, SECRET_KEY, iv);
    let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (error) {
    console.error('Erro na descriptografia:', error);
    return text;
  }
}

module.exports = {
  encrypt,
  decrypt
};
