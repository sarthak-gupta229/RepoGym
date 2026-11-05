import { NextRequest, NextResponse } from 'next/server';
import { store } from '@/lib/store';
import { fetchRepoFiles, GitHubError } from '@/lib/github';
import { buildGraph } from '@/lib/graph';
import { detectFlows } from '@/lib/select';
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
  let repo = await store.getRepo(id);
  if (!repo && id === 'demo') {
    repo = await store.getRepo('repo-demo');
  }

  if (!repo) {
    return NextResponse.json({ error: 'Repo not found' }, { status: 404 });
  }

  try {
    const fetchResult = await fetchRepoFiles(repo.owner, repo.name);

    // If new commit SHA differs, save new analysis
    let analysis = await store.findAnalysis(repo.id, fetchResult.commitSha);
    if (!analysis) {
      const graph = buildGraph(fetchResult.files);
      const flows = detectFlows(fetchResult.files);

      analysis = await store.saveAnalysis({
        repo_id: repo.id,
        commit_sha: fetchResult.commitSha,
        file_map: fetchResult.files,
        graph,
        flows,
        truncated: fetchResult.truncated,
      });
    }

    // Record user visit
    await store.recordUserRepoVisit(user.id, repo.id);

    return NextResponse.json({ repo, analysis });
  } catch (err) {
    if (err instanceof GitHubError) {
      return NextResponse.json({ error: err.message, code: err.code }, { status: 400 });
    }
    return NextResponse.json({ error: 'Re-analysis failed' }, { status: 500 });
  }
}
