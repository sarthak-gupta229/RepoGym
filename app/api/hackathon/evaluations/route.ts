import { NextRequest, NextResponse } from 'next/server';
import { store } from '@/lib/store';
import { getAuthenticatedUser } from '@/lib/auth-helper';
import { generateHackathonQuestion } from '@/lib/hackathon';

export async function POST(req: NextRequest) {
  const user = await getAuthenticatedUser(req);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { analysisId = 'demo', repoId } = body;

    let targetAnalysis = await store.getAnalysis(analysisId);

    // If analysisId not found, check if analysisId is a repoId or look up by repoId
    if (!targetAnalysis) {
      const targetRepoId = repoId || analysisId;
      const repoAnalyses = Array.from(store.analyses.values())
        .filter((a) => a.repo_id === targetRepoId)
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      if (repoAnalyses.length > 0) {
        targetAnalysis = repoAnalyses[0];
      }
    }

    if (!targetAnalysis && (analysisId === 'demo' || repoId === 'demo' || repoId === 'repo-demo')) {
      targetAnalysis = await store.getAnalysis('demo');
    }

    if (!targetAnalysis) {
      return NextResponse.json(
        { error: 'Repository analysis not found. Please click "Analyze Repo" first.' },
        { status: 404 }
      );
    }

    const repo = await store.getRepo(targetAnalysis.repo_id);
    const repoName = repo ? `${repo.owner}/${repo.name}` : 'demo/login-service';

    // Create a new hackathon evaluation
    const evaluation = await store.createHackathonEvaluation({
      userId: user.id,
      repoId: targetAnalysis.repo_id,
      analysisId: targetAnalysis.id,
    });

    // Generate Question 1 for Criterion 0 (Technical Implementation & Complexity)
    const currentQuestion = await generateHackathonQuestion(
      targetAnalysis.file_map,
      repoName,
      0
    );

    return NextResponse.json({
      evaluation,
      currentQuestion,
    });
  } catch (err) {
    console.error('Failed to create hackathon evaluation:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to start hackathon evaluation' },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  const user = await getAuthenticatedUser(req);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const repoId = searchParams.get('repoId') || undefined;

  const evaluations = await store.getUserHackathonEvaluations(user.id, repoId);
  return NextResponse.json({ evaluations });
}
