import { describe, it, expect } from 'vitest';
import {
  signJWT,
  verifyJWT,
  decodeJWT,
  hashPassword,
  verifyPassword,
} from '@/lib/jwt';

describe('lib/jwt.ts', () => {
  it('signs and verifies a valid JWT payload', async () => {
    const payload = {
      sub: 'user-abc-123',
      email: 'alex@example.com',
      name: 'Alex Developer',
    };

    const token = await signJWT(payload, 'test-secret', 3600);
    expect(typeof token).toBe('string');
    expect(token.split('.').length).toBe(3);

    const verified = await verifyJWT(token, 'test-secret');
    expect(verified).not.toBeNull();
    expect(verified?.sub).toBe('user-abc-123');
    expect(verified?.email).toBe('alex@example.com');
    expect(verified?.name).toBe('Alex Developer');
    expect(verified?.exp).toBeGreaterThan(Math.floor(Date.now() / 1000));
  });

  it('rejects a JWT signed with a different secret', async () => {
    const payload = { sub: 'user-1', email: 'test@example.com' };
    const token = await signJWT(payload, 'secret-1');

    const result = await verifyJWT(token, 'secret-2');
    expect(result).toBeNull();
  });

  it('rejects an expired JWT', async () => {
    const payload = { sub: 'user-1', email: 'test@example.com' };
    // expired 10 seconds ago
    const token = await signJWT(payload, 'test-secret', -10);

    const result = await verifyJWT(token, 'test-secret');
    expect(result).toBeNull();
  });

  it('rejects a tampered JWT payload', async () => {
    const payload = { sub: 'user-1', email: 'test@example.com' };
    const token = await signJWT(payload, 'test-secret');

    const parts = token.split('.');
    // Tamper with payload
    const tamperedPayload = Buffer.from(
      JSON.stringify({ sub: 'user-hacker', email: 'admin@example.com' })
    ).toString('base64url');
    const tamperedToken = `${parts[0]}.${tamperedPayload}.${parts[2]}`;

    const result = await verifyJWT(tamperedToken, 'test-secret');
    expect(result).toBeNull();
  });

  it('decodes JWT without verification', () => {
    const payload = { sub: 'user-decode', email: 'decode@example.com' };
    const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
    const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
    const token = `${header}.${body}.fakesig`;

    const decoded = decodeJWT(token);
    expect(decoded?.sub).toBe('user-decode');
    expect(decoded?.email).toBe('decode@example.com');
  });

  it('hashes and correctly verifies passwords', async () => {
    const password = 'mySecretPassword!2026';
    const { hash, salt } = await hashPassword(password);

    expect(hash).toBeTruthy();
    expect(salt).toBeTruthy();
    expect(hash).not.toBe(password);

    const isMatch = await verifyPassword(password, hash, salt);
    expect(isMatch).toBe(true);

    const isWrong = await verifyPassword('wrongPassword', hash, salt);
    expect(isWrong).toBe(false);
  });
});
