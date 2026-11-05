/**
 * Zero-dependency JWT implementation and secure password hashing using standard Web Crypto API.
 * Compatible with Node.js, Next.js Edge/Server runtime, and browsers.
 */

export interface JWTPayload {
  sub: string;
  email: string;
  name?: string;
  iat?: number;
  exp?: number;
  [key: string]: unknown;
}

const DEFAULT_SECRET =
  process.env.JWT_SECRET ||
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  'repogym-jwt-secure-secret-key-2026-hackathon';

function base64UrlEncode(str: string): string {
  return Buffer.from(str)
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

function base64UrlDecode(str: string): string {
  let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4) {
    base64 += '=';
  }
  return Buffer.from(base64, 'base64').toString('utf8');
}

async function getHmacKey(secret: string): Promise<CryptoKey> {
  const enc = new TextEncoder();
  return crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify']
  );
}

/**
 * Sign a payload and return a standard HMAC-SHA256 JWT string.
 */
export async function signJWT(
  payload: {
    sub: string;
    email: string;
    name?: string;
    iat?: number;
    exp?: number;
    [key: string]: unknown;
  },
  secret: string = DEFAULT_SECRET,
  expiresInSeconds: number = 7 * 24 * 3600 // 7 days
): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const fullPayload: JWTPayload = Object.assign({}, payload, {
    iat: payload.iat ?? now,
    exp: payload.exp ?? now + expiresInSeconds,
  });

  const header = { alg: 'HS256', typ: 'JWT' };
  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(fullPayload));
  const dataToSign = `${encodedHeader}.${encodedPayload}`;

  const key = await getHmacKey(secret);
  const enc = new TextEncoder();
  const signatureBuffer = await crypto.subtle.sign(
    'HMAC',
    key,
    enc.encode(dataToSign)
  );

  const signatureBase64 = Buffer.from(signatureBuffer)
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');

  return `${dataToSign}.${signatureBase64}`;
}

/**
 * Verify a JWT string and return the decoded payload if valid and unexpired, or null otherwise.
 */
export async function verifyJWT<T = JWTPayload>(
  token: string,
  secret: string = DEFAULT_SECRET
): Promise<T | null> {
  if (!token || typeof token !== 'string') return null;

  const parts = token.split('.');
  if (parts.length !== 3) return null;

  const [encodedHeader, encodedPayload, encodedSignature] = parts;

  try {
    const key = await getHmacKey(secret);
    const enc = new TextEncoder();
    const dataToVerify = `${encodedHeader}.${encodedPayload}`;

    // Reconstruct signature buffer from base64url
    let base64 = encodedSignature.replace(/-/g, '+').replace(/_/g, '/');
    while (base64.length % 4) {
      base64 += '=';
    }
    const signatureBytes = Buffer.from(base64, 'base64');

    const isValid = await crypto.subtle.verify(
      'HMAC',
      key,
      signatureBytes,
      enc.encode(dataToVerify)
    );

    if (!isValid) return null;

    const payloadJson = base64UrlDecode(encodedPayload);
    const payload = JSON.parse(payloadJson) as JWTPayload;

    // Check expiration if present
    if (payload.exp && typeof payload.exp === 'number') {
      const now = Math.floor(Date.now() / 1000);
      if (now > payload.exp) {
        return null; // Expired
      }
    }

    return payload as unknown as T;
  } catch {
    return null;
  }
}

/**
 * Decode JWT without verifying signature (useful for client inspection).
 */
export function decodeJWT<T = JWTPayload>(token: string): T | null {
  try {
    const parts = token.split('.');
    if (parts.length < 2) return null;
    const json = base64UrlDecode(parts[1]);
    return JSON.parse(json) as T;
  } catch {
    return null;
  }
}

/**
 * Generate a random cryptographic salt.
 */
export function generateSalt(length = 16): string {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return Buffer.from(bytes).toString('hex');
}

/**
 * Hash a password with salt using SHA-256.
 */
export async function hashPassword(
  password: string,
  providedSalt?: string
): Promise<{ hash: string; salt: string }> {
  const salt = providedSalt || generateSalt();
  const enc = new TextEncoder();
  const data = enc.encode(`${salt}:${password}`);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hash = Buffer.from(hashBuffer).toString('hex');
  return { hash, salt };
}

/**
 * Verify a plain password against stored hash and salt.
 */
export async function verifyPassword(
  password: string,
  storedHash: string,
  salt: string
): Promise<boolean> {
  const { hash } = await hashPassword(password, salt);
  return hash === storedHash;
}
