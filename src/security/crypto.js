import { createCipheriv, createDecipheriv, createHash, createHmac, randomBytes } from 'node:crypto';

/**
 * Cifrado autenticado AES-256-GCM. Se usa para:
 *  - guardar credenciales IPTV y URLs de stream en la base de datos;
 *  - emitir tokens de stream opacos (el navegador nunca ve la URL real ni la contraseña).
 */
export function createSealer(secret) {
  const key = createHmac('sha256', secret).update('moga-tv:aes-key:v1').digest();

  function seal(value) {
    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', key, iv);
    const data = Buffer.concat([cipher.update(JSON.stringify(value), 'utf8'), cipher.final()]);
    return Buffer.concat([iv, cipher.getAuthTag(), data]).toString('base64url');
  }

  function open(token) {
    try {
      const buf = Buffer.from(String(token), 'base64url');
      if (buf.length < 29) return null;
      const decipher = createDecipheriv('aes-256-gcm', key, buf.subarray(0, 12));
      decipher.setAuthTag(buf.subarray(12, 28));
      const data = Buffer.concat([decipher.update(buf.subarray(28)), decipher.final()]);
      return JSON.parse(data.toString('utf8'));
    } catch {
      return null;
    }
  }

  return { seal, open };
}

export function randomToken(bytes = 32) {
  return randomBytes(bytes).toString('base64url');
}

export function sha256(value) {
  return createHash('sha256').update(value).digest('hex');
}
