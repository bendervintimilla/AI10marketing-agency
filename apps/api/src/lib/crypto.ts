import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const KEY_HEX = process.env.TOKEN_ENCRYPTION_KEY ?? '';

function getKey(): Buffer {
    if (!KEY_HEX || KEY_HEX.length !== 64) {
        throw new Error(
            'TOKEN_ENCRYPTION_KEY must be a 32-byte hex string (64 hex chars). ' +
            'Generate one with: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"'
        );
    }
    return Buffer.from(KEY_HEX, 'hex');
}

/**
 * Encrypt plaintext. Returns a colon-separated string: iv:authTag:ciphertext (all hex).
 */
export function encrypt(text: string): string {
    const key = getKey();
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
    const encrypted = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);
    const authTag = cipher.getAuthTag();
    return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted.toString('hex')}`;
}

/**
 * Decrypt a string produced by encrypt(). Returns plaintext.
 */
export function decrypt(encoded: string): string {
    const key = getKey();
    const [ivHex, authTagHex, ciphertextHex] = encoded.split(':');
    if (!ivHex || !authTagHex || !ciphertextHex) {
        throw new Error('Invalid encrypted token format');
    }
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');
    const ciphertext = Buffer.from(ciphertextHex, 'hex');
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);
    const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
    return decrypted.toString('utf8');
}
