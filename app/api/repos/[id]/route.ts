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
  const repo = await store.getRepo(id);
  if (!repo) {
    return NextResponse.json({ error: 'Repo not found' }, { status: 404 });
  }

  // Find latest analysis for repo
  const analyses = Array.from(store.analyses.values())
    .filter((a) => a.repo_id === repo.id)
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  const latestAnalysis = analyses[0] || null;

  // Find sessions for this repo
  const userSessions = await store.getUserSessions(user.id);
  const repoSessions = userSessions.filter((s) => s.analysis_id === latestAnalysis?.id);

  return NextResponse.json({
    repo,
    analysis: latestAnalysis,
    sessions: repoSessions,
  });
}

