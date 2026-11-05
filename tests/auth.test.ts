import { describe, it, expect } from 'vitest';
import { NextRequest } from 'next/server';
import { POST as postSignup } from '@/app/api/auth/signup/route';
import { POST as postSignin } from '@/app/api/auth/signin/route';
import { POST as postSignout } from '@/app/api/auth/signout/route';
import { GET as getMe } from '@/app/api/auth/me/route';
import { verifyJWT } from '@/lib/jwt';

describe('Auth API Routes with JWT', () => {
  const uniqueEmail = `tester-${Date.now()}@example.com`;
  const validPassword = 'securePassword123!';

  it('rejects signup with invalid email format', async () => {
    const req = new NextRequest('http://localhost:3000/api/auth/signup', {
      method: 'POST',
      body: JSON.stringify({ email: 'invalid-email', password: validPassword }),
    });
    const res = await postSignup(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain('valid email');
  });

  it('rejects signup with short password', async () => {
    const req = new NextRequest('http://localhost:3000/api/auth/signup', {
      method: 'POST',
      body: JSON.stringify({ email: uniqueEmail, password: '123' }),
    });
    const res = await postSignup(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain('at least 6 characters');
  });

  it('successfully creates an account and returns a valid JWT', async () => {
    const req = new NextRequest('http://localhost:3000/api/auth/signup', {
      method: 'POST',
      body: JSON.stringify({
        email: uniqueEmail,
        password: validPassword,
        name: 'Test Engineer',
      }),
    });
    const res = await postSignup(req);
    expect(res.status).toBe(201);
    const data = await res.json();
    expect(data.user).toBeDefined();
    expect(data.user.email).toBe(uniqueEmail.toLowerCase());
    expect(data.user.name).toBe('Test Engineer');
    expect(typeof data.token).toBe('string');

    // Verify JWT payload
    const payload = await verifyJWT(data.token);
    expect(payload).not.toBeNull();
    expect(payload?.email).toBe(uniqueEmail.toLowerCase());

    // Verify cookie set
    const cookieHeader = res.headers.get('set-cookie');
    expect(cookieHeader).toContain('repogym_jwt');
  });

  it('rejects signup with already existing email', async () => {
    const req = new NextRequest('http://localhost:3000/api/auth/signup', {
      method: 'POST',
      body: JSON.stringify({
        email: uniqueEmail,
        password: validPassword,
      }),
    });
    const res = await postSignup(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain('already exists');
  });

  it('successfully signs in with valid credentials and issues JWT', async () => {
    const req = new NextRequest('http://localhost:3000/api/auth/signin', {
      method: 'POST',
      body: JSON.stringify({
        email: uniqueEmail,
        password: validPassword,
      }),
    });
    const res = await postSignin(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.user.email).toBe(uniqueEmail.toLowerCase());
    expect(typeof data.token).toBe('string');

    const cookieHeader = res.headers.get('set-cookie');
    expect(cookieHeader).toContain('repogym_jwt');
  });

  it('successfully signs in with default demo credentials', async () => {
    const req = new NextRequest('http://localhost:3000/api/auth/signin', {
      method: 'POST',
      body: JSON.stringify({
        email: 'demo@repogym.dev',
        password: 'password123',
      }),
    });
    const res = await postSignin(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.user.email).toBe('demo@repogym.dev');
    expect(typeof data.token).toBe('string');
  });

  it('rejects signin with incorrect password', async () => {
    const req = new NextRequest('http://localhost:3000/api/auth/signin', {
      method: 'POST',
      body: JSON.stringify({
        email: uniqueEmail,
        password: 'WrongPassword999!',
      }),
    });
    const res = await postSignin(req);
    expect(res.status).toBe(401);
    const data = await res.json();
    expect(data.error).toContain('Invalid email or password');
  });

  it('signs out and clears the repogym_jwt cookie', async () => {
    const res = await postSignout();
    expect(res.status).toBe(200);
    const cookieHeader = res.headers.get('set-cookie');
    expect(cookieHeader).toContain('repogym_jwt=;');
  });

  it('authenticates GET /api/auth/me using Bearer token', async () => {
    // 1. Sign in to get token
    const signinReq = new NextRequest('http://localhost:3000/api/auth/signin', {
      method: 'POST',
      body: JSON.stringify({
        email: uniqueEmail,
        password: validPassword,
      }),
    });
    const signinRes = await postSignin(signinReq);
    const { token } = await signinRes.json();

    // 2. Request /api/auth/me with Bearer token
    const meReq = new NextRequest('http://localhost:3000/api/auth/me', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    const meRes = await getMe(meReq);
    expect(meRes.status).toBe(200);
    const meData = await meRes.json();
    expect(meData.user.email).toBe(uniqueEmail.toLowerCase());
  });
});
