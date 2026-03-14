import * as crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const SALT_LENGTH = 64;
const TAG_LENGTH = 16;

export class CryptoUtil {
    private static getKey(): Buffer {
        const keyString = process.env.ENCRYPTION_KEY;
        if (!keyString || keyString.length !== 64) {
            throw new Error('KVKK Şifreleme Hatası: ENCRYPTION_KEY 64 karakter (32 byte hex) olmalıdır.');
        }
        return Buffer.from(keyString, 'hex');
    }

    /**
     * Veriyi AES-256-GCM ile şifreler
     */
    static encrypt(text: string): string {
        try {
            const iv = crypto.randomBytes(IV_LENGTH);
            const salt = crypto.randomBytes(SALT_LENGTH);
            const key = crypto.pbkdf2Sync(this.getKey(), salt, 100000, 32, 'sha512');

            const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
            let encrypted = cipher.update(text, 'utf8', 'hex');
            encrypted += cipher.final('hex');

            const tag = cipher.getAuthTag();

            // Format: salt:iv:tag:encrypted
            return `${salt.toString('hex')}:${iv.toString('hex')}:${tag.toString('hex')}:${encrypted}`;
        } catch (error) {
            throw new Error('Şifreleme sırasında bir hata oluştu');
        }
    }

    /**
     * Şifreli veriyi AES-256-GCM ile deşifreler
     */
    static decrypt(encryptedText: string | null): string {
        if (!encryptedText) return '';
        try {
            const parts = encryptedText.split(':');
            if (parts.length !== 4) return encryptedText; // Belki şifreli değildir

            const [saltHex, ivHex, tagHex, encryptedHex] = parts;

            const salt = Buffer.from(saltHex, 'hex');
            const iv = Buffer.from(ivHex, 'hex');
            const tag = Buffer.from(tagHex, 'hex');

            const key = crypto.pbkdf2Sync(this.getKey(), salt, 100000, 32, 'sha512');

            const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
            decipher.setAuthTag(tag);

            let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
            decrypted += decipher.final('utf8');

            return decrypted;
        } catch (error) {
            // Deşifre başarısızsa orijinal değeri dön (eski veriler için tolerans)
            return encryptedText;
        }
    }

    /**
     * Arama ve unique indexler için geri döndürülemez Hash üretir
     */
    static hash(text: string): string {
        return crypto.createHash('sha256').update(text).digest('hex');
    }
}
