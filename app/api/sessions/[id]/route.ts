import { NextRequest, NextResponse } from 'next/server';
import { store } from '@/lib/store';
import { getAuthenticatedUser } from '@/lib/auth-helper';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthenticatedUser(req);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const session = await store.getSession(id);
  if (!session) {
    return NextResponse.json({ error: 'Session not found' }, { status: 404 });
  }

  // RLS enforcement: User B cannot access User A's session
  if (session.user_id !== user.id) {
    return NextResponse.json({ error: 'Session not found' }, { status: 404 });
  }

  const analysis = await store.getAnalysis(session.analysis_id);
  const questions = await store.getQuestionsForSession(session.id);
  const attempts = await store.getAttemptsForSession(session.id);

  const currentQuestion =
    questions.find((q) => q.position === session.current_index) ||
    questions[questions.length - 1] ||
    null;

  return NextResponse.json({
    session,
    currentQuestion,
    questions,
    attempts,
    analysis,
  });
}
