import { describe, it, expect, beforeEach } from 'vitest';
import { store } from '@/lib/store';
import { enforceDailySessionLimit, RateLimitError, checkDailySessionLimit } from '@/lib/limits';

describe('Phase 6: Daily Session Limits', () => {
  const testUserId = 'test-limit-user';

  beforeEach(() => {
    // Clear any past sessions for test user
    for (const [id, s] of store.sessions.entries()) {
      if (s.user_id === testUserId) {
        store.sessions.delete(id);
      }
    }
  });

  it('allows up to 20 sessions per day and blocks the 21st session with a clear message', async () => {
    // Create 20 sessions
    for (let i = 0; i < 20; i++) {
      const check = await checkDailySessionLimit(testUserId);
      expect(check.allowed).toBe(true);
      expect(check.remaining).toBe(20 - i);
      await store.createSession(testUserId, 'demo', 'login');
    }

    // Now 20 sessions are created
    const checkAfter20 = await checkDailySessionLimit(testUserId);
    expect(checkAfter20.allowed).toBe(false);
    expect(checkAfter20.remaining).toBe(0);

    // Attempting 21st session must throw RateLimitError
    await expect(enforceDailySessionLimit(testUserId)).rejects.toThrow(RateLimitError);
    await expect(enforceDailySessionLimit(testUserId)).rejects.toThrow(
      'Daily limit reached. You can start up to 20 sessions per day. Please come back tomorrow.'
    );
  });
});

