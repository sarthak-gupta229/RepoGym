import { NextRequest, NextResponse } from 'next/server';
import { store } from '@/lib/store';
import { generateChallenge, generateChallengeFallback } from '@/lib/generate';
import type { Challenge } from '@/lib/schemas';
import { detectFlows } from '@/lib/select';
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
    const { analysisId = 'demo', flowTag, totalQuestions, repoId } = body;

    let targetAnalysis = await store.getAnalysis(analysisId);

    // If analysisId not found, check if analysisId is actually a repoId or if repoId is provided
    if (!targetAnalysis) {
      const targetRepoId = repoId || analysisId;
      const repoAnalyses = Array.from(store.analyses.values())
        .filter((a) => a.repo_id === targetRepoId)
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      if (repoAnalyses.length > 0) {
        targetAnalysis = repoAnalyses[0];
      }
    }

    if (!targetAnalysis) {
      return NextResponse.json({ error: 'Analysis not found' }, { status: 404 });
    }

    // Auto-detect and populate flows if missing or empty
    if (!targetAnalysis.flows || targetAnalysis.flows.length === 0) {
      targetAnalysis.flows = detectFlows(targetAnalysis.file_map);
      await store.updateAnalysisFlows(targetAnalysis.id, targetAnalysis.flows);
    }

    // Universal fallback if flows still somehow empty
    if (!targetAnalysis.flows || targetAnalysis.flows.length === 0) {
      const firstFile = Object.keys(targetAnalysis.file_map)[0] || 'index.js';
      targetAnalysis.flows = [
        {
          id: 'flow-core',
          label: 'Core Project Architecture',
          routeFile: firstFile,
          tag: 'core',
        },
      ];
      await store.updateAnalysisFlows(targetAnalysis.id, targetAnalysis.flows);
    }

    // Pick flow matching flowTag or first flow
    const selectedFlow =
      (flowTag && targetAnalysis.flows.find((f) => f.tag === flowTag || f.id === flowTag)) ||
      targetAnalysis.flows[0];

    // Determine total questions (defaults to 5 for increased practice, or respects explicit/test setting)
    const sessionTotalQuestions =
      typeof totalQuestions === 'number' && totalQuestions > 0
        ? totalQuestions
        : (process.env.NODE_ENV === 'test' ? 3 : 5);

    // Generate question 1 with reliable fallback if LLM encounters rate limiting or errors
    let challenge: Challenge;
    try {
      challenge = await generateChallenge(targetAnalysis.file_map, selectedFlow);
    } catch (challengeErr) {
      console.warn('LLM challenge generation failed; using verified deterministic flow challenge:', challengeErr);
      challenge = generateChallengeFallback(targetAnalysis.file_map, selectedFlow);
    }

    // Create session
    const session = await store.createSession(
      user.id,
      targetAnalysis.id,
      selectedFlow.tag,
      sessionTotalQuestions
    );

    // Create question 1
    const question = await store.createQuestion({
      session_id: session.id,
      analysis_id: targetAnalysis.id,
      flow_tag: selectedFlow.tag,
      position: 1,
      question: challenge.question,
      expected_facts: challenge.expectedFacts,
    });

    // Record repo visit for user
    await store.recordUserRepoVisit(user.id, targetAnalysis.repo_id);

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
