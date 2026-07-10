import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';
import { env } from '../config/env';

const PREFIX = 'enc:v1';

function encryptionKey(): Buffer {
  const source = env.sessionSecret || 'nowen-blog-development-secret-storage-key';
  return createHash('sha256').update(source).digest();
}

export function sealSecret(value: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', encryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [PREFIX, iv.toString('base64url'), tag.toString('base64url'), encrypted.toString('base64url')].join(':');
}

export function openSecret(value: string | null): string | null {
  if (!value) return null;
  if (!value.startsWith(`${PREFIX}:`)) return value;
  const parts = value.split(':');
  if (parts.length !== 5 || parts[0] !== 'enc' || parts[1] !== 'v1') {
    throw new Error('加密凭据格式无效');
  }
  const [, , ivValue, tagValue, encryptedValue] = parts;
  if (!ivValue || !tagValue || !encryptedValue) throw new Error('加密凭据内容不完整');
  const decipher = createDecipheriv('aes-256-gcm', encryptionKey(), Buffer.from(ivValue, 'base64url'));
  decipher.setAuthTag(Buffer.from(tagValue, 'base64url'));
  return Buffer.concat([
    decipher.update(Buffer.from(encryptedValue, 'base64url')),
    decipher.final(),
  ]).toString('utf8');
}
