import { NextRequest, NextResponse } from 'next/server';
import { store } from '@/lib/store';
import { getAuthenticatedUser } from '@/lib/auth-helper';

export async function GET(req: NextRequest) {
  const user = await getAuthenticatedUser(req);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const sessions = await store.getUserSessions(user.id);
  const attempts = Array.from(store.attempts.values()).filter((a) => a.user_id === user.id);
  const feedbackList = Array.from(store.feedback.values()).filter((f) => f.user_id === user.id);

  // Score trend across completed sessions
  const completedSessions = sessions.filter((s) => s.status === 'completed');
  const scoreTrend = completedSessions.map((s) => {
    const sessionAttempts = attempts.filter(async (a) => {
      const q = await store.getQuestion(a.question_id);
      return q?.session_id === s.id;
    });
    const totalScore = sessionAttempts.reduce((acc, a) => acc + a.score, 0);
    const maxScore = sessionAttempts.reduce((acc, a) => acc + a.max_score, 0) || 10;
    return {
      sessionId: s.id,
      flowTag: s.flow_tag,
      date: s.created_at,
      score: totalScore,
      maxScore,
      percentage: Math.round((totalScore / maxScore) * 100),
    };
  });

  // Misses grouped by flow_tag
  const missesByTag: Record<string, number> = {};
  for (const att of attempts) {
    const question = await store.getQuestion(att.question_id);
    const tag = question?.flow_tag || 'general';
    missesByTag[tag] = (missesByTag[tag] || 0) + (att.missed ? att.missed.length : 0);
  }

  // Find most-missed topic
  let mostMissedTopic: string | null = null;
  let maxMisses = 0;
  for (const [tag, count] of Object.entries(missesByTag)) {
    if (count > maxMisses) {
      maxMisses = count;
      mostMissedTopic = tag;
    }
  }

  return NextResponse.json({
    sessionsCount: sessions.length,
    completedSessionsCount: completedSessions.length,
    scoreTrend,
    missesByTag,
    suggestedFocus: mostMissedTopic,
    feedbackCount: feedbackList.length,
  });
}

