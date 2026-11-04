import { NextRequest, NextResponse } from 'next/server';
import { store } from '@/lib/store';
import { generateChallenge } from '@/lib/generate';
import { getAuthenticatedUser } from '@/lib/auth-helper';
import { enforceDailySessionLimit, RateLimitError } from '@/lib/limits';

export async function POST(req: NextRequest) {
  const user = await getAuthenticatedUser(req);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Phase 6 Limit: Check daily 20 session cap
    await enforceDailySessionLimit(user.id);

    const body = await req.json();
    const { analysisId = 'demo', flowTag } = body;

    const analysis = await store.getAnalysis(analysisId);
    if (!analysis) {
      return NextResponse.json({ error: 'Analysis not found' }, { status: 404 });
    }

    if (!analysis.flows || analysis.flows.length === 0) {
      return NextResponse.json({ error: 'No request flows found in this repository' }, { status: 400 });
    }

    // Pick flow matching flowTag or first flow
    const selectedFlow =
      (flowTag && analysis.flows.find((f) => f.tag === flowTag || f.id === flowTag)) ||
      analysis.flows[0];

    // Generate question 1
    const challenge = await generateChallenge(analysis.file_map, selectedFlow);

    // Create session
    const session = await store.createSession(user.id, analysis.id, selectedFlow.tag, 3);

    // Create question 1
    const question = await store.createQuestion({
      session_id: session.id,
      analysis_id: analysis.id,
      flow_tag: selectedFlow.tag,
      position: 1,
      question: challenge.question,
      expected_facts: challenge.expectedFacts,
    });

    return NextResponse.json({ session, question });
  } catch (err) {
    if (err instanceof RateLimitError) {
      return NextResponse.json({ error: err.message }, { status: 429 });
    }
    console.error('Failed to start session:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to start session' },
      { status: 500 }
    );
  }
}
