import { NextRequest, NextResponse } from 'next/server';
import { store } from '@/lib/store';
import { getAuthenticatedUser } from '@/lib/auth-helper';
import { generateHackathonQuestion, HACKATHON_CRITERIA } from '@/lib/hackathon';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthenticatedUser(req);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const evaluation = await store.getHackathonEvaluation(id);
  if (!evaluation) {
    return NextResponse.json({ error: 'Hackathon evaluation not found' }, { status: 404 });
  }

  const analysis = await store.getAnalysis(evaluation.analysis_id);
  if (!analysis) {
    return NextResponse.json({ error: 'Analysis data not found' }, { status: 404 });
  }

  const repo = await store.getRepo(evaluation.repo_id);
  const repoName = repo ? `${repo.owner}/${repo.name}` : 'demo/login-service';

  // If completed, return evaluation directly without new question
  if (evaluation.status === 'completed') {
    return NextResponse.json({
      evaluation,
      analysis: {
        id: analysis.id,
        file_map: analysis.file_map,
        graph: analysis.graph,
        flows: analysis.flows,
      },
      repo,
      currentQuestion: null,
      criteria: HACKATHON_CRITERIA,
    });
  }

  // Generate question for current criterion
  const currentQuestion = await generateHackathonQuestion(
    analysis.file_map,
    repoName,
    evaluation.current_criterion_index
  );

  return NextResponse.json({
    evaluation,
    analysis: {
      id: analysis.id,
      file_map: analysis.file_map,
      graph: analysis.graph,
      flows: analysis.flows,
    },
    repo,
    currentQuestion,
    criteria: HACKATHON_CRITERIA,
  });
}
