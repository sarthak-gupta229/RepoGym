import { NextRequest, NextResponse } from 'next/server';
import { store } from '@/lib/store';
import { getAuthenticatedUser } from '@/lib/auth-helper';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthenticatedUser(req);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id: attemptId } = await params;
  const attempt = await store.getAttempt(attemptId);
  if (!attempt) {
    return NextResponse.json({ error: 'Attempt not found' }, { status: 404 });
  }

  try {
    const body = await req.json();
    const { helpful, note } = body;

    if (typeof helpful !== 'boolean') {
      return NextResponse.json({ error: 'Field "helpful" must be a boolean' }, { status: 400 });
    }

    const feedback = await store.createFeedback({
      attempt_id: attempt.id,
      user_id: user.id,
      helpful,
      note: note || undefined,
    });

    return NextResponse.json({ success: true, feedback });
  } catch (err) {
    return NextResponse.json({ error: 'Failed to record feedback' }, { status: 500 });
  }
}

