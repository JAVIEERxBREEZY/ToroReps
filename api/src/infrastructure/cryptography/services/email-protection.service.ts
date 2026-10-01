import { ConfigService } from '@nestjs/config';
import { Injectable } from '@nestjs/common';
import { Buffer } from 'node:buffer';
import { createCipheriv, createDecipheriv, createHmac, randomBytes } from 'node:crypto';
import { ProtectedEmail } from '../models/interfaces/protected-email.interfcae.js';

const ALGORITHM = 'aes-256-gcm';
const FORMAT_VERSION = 'v1';
const KEY_LENGTH = 32;
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;
const CONTEXT = Buffer.from('tororeps:email:v1', 'utf8');

@Injectable()
export class EmailProtectionService {
  private readonly encryptionKey: Buffer;
  private readonly lookupKey: Buffer;

  constructor(config: ConfigService) {
    this.encryptionKey = this.readKey(config, 'EMAIL_ENCRYPTION_KEY');
    this.lookupKey = this.readKey(config, 'EMAIL_LOOKUP_KEY');

    if (this.encryptionKey.equals(this.lookupKey)) {
      throw new Error('Las claves de cifrado y búsqueda deben ser diferentes.');
    }
  }

  protect(email: string): ProtectedEmail {
    const iv = randomBytes(IV_LENGTH);

    const cipher = createCipheriv(ALGORITHM, this.encryptionKey, iv, {
      authTagLength: AUTH_TAG_LENGTH,
    });

    cipher.setAAD(CONTEXT);

    const ciphertext = Buffer.concat([
      cipher.update(email.trim(), 'utf8'),
      cipher.final(),
    ]);

    const payload = Buffer.concat([
      iv,
      cipher.getAuthTag(),
      ciphertext,
    ]).toString('base64url');

    return {
      emailEncrypted: `${FORMAT_VERSION}.${payload}`,
      emailLookupHash: this.createLookupHash(email),
    };
  }

  createLookupHash(email: string): string {
    const normalizedEmail = email.trim().toLowerCase();

    return createHmac('sha256', this.lookupKey)
      .update(normalizedEmail, 'utf8')
      .digest('hex');
  }

  decrypt(emailEncrypted: string): string {
    const [version, encodedPayload, ...extraParts] = emailEncrypted.split('.');

    if (
      version !== FORMAT_VERSION ||
      !encodedPayload ||
      extraParts.length > 0
    ) {
      throw new Error('Formato de email cifrado inválido.');
    }

    const payload = Buffer.from(encodedPayload, 'base64url');

    if (
      payload.toString('base64url') !== encodedPayload ||
      payload.length < IV_LENGTH + AUTH_TAG_LENGTH
    ) {
      throw new Error('Contenido de email cifrado inválido.');
    }

    const iv = payload.subarray(0, IV_LENGTH);
    const authTag = payload.subarray(
      IV_LENGTH,
      IV_LENGTH + AUTH_TAG_LENGTH,
    );
    const ciphertext = payload.subarray(IV_LENGTH + AUTH_TAG_LENGTH);

    const decipher = createDecipheriv(ALGORITHM, this.encryptionKey, iv, {
      authTagLength: AUTH_TAG_LENGTH,
    });

    decipher.setAAD(CONTEXT);
    decipher.setAuthTag(authTag);

    return Buffer.concat([
      decipher.update(ciphertext),
      decipher.final(),
    ]).toString('utf8');
  }

  private readKey(config: ConfigService, name: string): Buffer {
    const encodedKey = config.getOrThrow<string>(name);
    const key = Buffer.from(encodedKey, 'base64');

    if (
      key.length !== KEY_LENGTH ||
      key.toString('base64') !== encodedKey
    ) {
      throw new Error(`${name} debe contener 32 bytes codificados en Base64.`);
    }

    return key;
  }
}