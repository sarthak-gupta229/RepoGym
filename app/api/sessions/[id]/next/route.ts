import { NextRequest, NextResponse } from 'next/server';
import { store } from '@/lib/store';
import { generateChallenge } from '@/lib/generate';
import { PastResult } from '@/lib/prompt';
import { getAuthenticatedUser } from '@/lib/auth-helper';

export async function POST(
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

  if (session.status === 'completed') {
    return NextResponse.json(
      { error: 'Session is already completed', session },
      { status: 400 }
    );
  }

  const analysis = await store.getAnalysis(session.analysis_id);
  if (!analysis) {
    return NextResponse.json({ error: 'Analysis not found' }, { status: 404 });
  }

  const questions = await store.getQuestionsForSession(session.id);
  const attempts = await store.getAttemptsForSession(session.id);

  const nextPosition = session.current_index + 1;
  if (nextPosition > session.total_questions) {
    const updated = await store.updateSession(session.id, { status: 'completed' });
    return NextResponse.json({ session: updated, completed: true });
  }

  // Gather past results
  const usedFlowTags = new Set(questions.map((q) => q.flow_tag));
  const pastResults: PastResult[] = questions.map((q) => {
    const att = attempts.find((a) => a.question_id === q.id);
    return {
      flowTag: q.flow_tag,
      verdict: att?.verdict || 'unanswered',
      missedIds: att?.missed || [],
    };
  });

  // Pick next flow that hasn't been used yet in this session
  const availableFlows = analysis.flows.filter((f) => !usedFlowTags.has(f.tag));
  const nextFlow = availableFlows.length > 0 ? availableFlows[0] : analysis.flows[0];

  try {
    const challenge = await generateChallenge(analysis.file_map, nextFlow, pastResults);

    const question = await store.createQuestion({
      session_id: session.id,
      analysis_id: analysis.id,
      flow_tag: nextFlow.tag,
      position: nextPosition,
      question: challenge.question,
      expected_facts: challenge.expectedFacts,
    });

    const updatedSession = await store.updateSession(session.id, {
      current_index: nextPosition,
    });

    return NextResponse.json({
      session: updatedSession,
      question,
    });
  } catch (err) {
    console.error('Failed to generate next question:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to generate question' },
      { status: 500 }
    );
  }
}

