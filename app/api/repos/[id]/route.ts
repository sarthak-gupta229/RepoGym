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
  let repo = await store.getRepo(id);

  // If id is 'demo', resolve demo repo
  if (!repo && id === 'demo') {
    repo = await store.getRepo('repo-demo');
  }

  if (!repo) {
    return NextResponse.json({ error: 'Repo not found' }, { status: 404 });
  }

  // Record user visit so it stays in dashboard
  await store.recordUserRepoVisit(user.id, repo.id);

  // Find latest analysis for repo
  const analyses = Array.from(store.analyses.values())
    .filter((a) => a.repo_id === repo.id)
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  const latestAnalysis = analyses[0] || (id === 'demo' ? await store.getAnalysis('demo') : null);

  // Find sessions for this repo and user
  const userSessions = await store.getUserSessions(user.id);
  const repoSessions = userSessions.filter((s) => s.analysis_id === latestAnalysis?.id);

  return NextResponse.json({
    repo,
    analysis: latestAnalysis,
    sessions: repoSessions,
  });
}
