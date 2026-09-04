import { Injectable } from '@nestjs/common';
import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';

/** AES-256-GCM envelope encryption for application secrets. The master key belongs in a secret manager/KMS. */
@Injectable()
export class SecretBoxService {
  private key(): Buffer {
    const raw = process.env.AFX_SECRET_BOX_KEY;
    if (!raw) throw new Error('AFX_SECRET_BOX_KEY is not configured');
    const key = Buffer.from(raw, 'base64url');
    if (key.length !== 32) throw new Error('AFX_SECRET_BOX_KEY must decode to 32 bytes');
    return key;
  }

  encrypt(plaintext: string): string {
    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', this.key(), iv);
    const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();
    return [iv, tag, ciphertext].map((part) => part.toString('base64url')).join('.');
  }

  decrypt(encoded: string): string {
    const [ivText, tagText, cipherText] = encoded.split('.');
    if (!ivText || !tagText || !cipherText) throw new Error('Invalid encrypted secret');
    const decipher = createDecipheriv('aes-256-gcm', this.key(), Buffer.from(ivText, 'base64url'));
    decipher.setAuthTag(Buffer.from(tagText, 'base64url'));
    return Buffer.concat([decipher.update(Buffer.from(cipherText, 'base64url')), decipher.final()]).toString('utf8');
  }
}
