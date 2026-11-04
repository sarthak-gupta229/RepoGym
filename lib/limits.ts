import { store } from './store';

export const DAILY_SESSION_LIMIT = 20;

export class RateLimitError extends Error {
  remaining: number;
  resetTime: number;

  constructor(message: string, remaining = 0, resetTime = Date.now() + 86400000) {
    super(message);
    this.name = 'RateLimitError';
    this.remaining = remaining;
    this.resetTime = resetTime;
  }
}

export async function checkDailySessionLimit(userId: string): Promise<{
  allowed: boolean;
  count: number;
  remaining: number;
}> {
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const userSessions = await store.getUserSessions(userId);

  // Filter sessions created in the last 24 hours
  const recentSessions = userSessions.filter((s) => s.created_at >= oneDayAgo);
  const count = recentSessions.length;
  const remaining = Math.max(0, DAILY_SESSION_LIMIT - count);

  return {
    allowed: count < DAILY_SESSION_LIMIT,
    count,
    remaining,
  };
}

export async function enforceDailySessionLimit(userId: string): Promise<void> {
  const check = await checkDailySessionLimit(userId);
  if (!check.allowed) {
    throw new RateLimitError(
      'Daily limit reached. You can start up to 20 sessions per day. Please come back tomorrow.'
    );
  }
}

