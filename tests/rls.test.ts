import { describe, it, expect, vi } from 'vitest';
import { store } from '@/lib/store';
import { GET as getSession } from '@/app/api/sessions/[id]/route';
import { NextRequest } from 'next/server';

let mockCurrentUser = { id: 'user-a', email: 'userA@test.com' };

vi.mock('@/lib/auth-helper', () => ({
  getAuthenticatedUser: vi.fn().mockImplementation(() => Promise.resolve(mockCurrentUser)),
}));

describe('Phase 5: User Isolation and RLS', () => {
  it('confirms user B cannot read user A session by ID', async () => {
    // 1. Create a session owned by user A
    mockCurrentUser = { id: 'user-a', email: 'userA@test.com' };
    const sessionA = await store.createSession('user-a', 'demo', 'login', 3);

    // Verify user A can read own session
    const reqA = new NextRequest(`http://localhost:3000/api/sessions/${sessionA.id}`);
    const resA = await getSession(reqA, { params: Promise.resolve({ id: sessionA.id }) });
    expect(resA.status).toBe(200);
    const dataA = await resA.json();
    expect(dataA.session.id).toBe(sessionA.id);

    // 2. Switch authenticated user to user B
    mockCurrentUser = { id: 'user-b', email: 'userB@test.com' };

    // User B tries to read user A's session by ID
    const reqB = new NextRequest(`http://localhost:3000/api/sessions/${sessionA.id}`);
    const resB = await getSession(reqB, { params: Promise.resolve({ id: sessionA.id }) });

    // Expect 404 (or blocked)
    expect(resB.status).toBe(404);
    const dataB = await resB.json();
    expect(dataB.error).toBe('Session not found');
  });
});

