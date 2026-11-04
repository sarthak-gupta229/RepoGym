import { NextRequest, NextResponse } from 'next/server';
import { parseRepoUrl, fetchRepoFiles, GitHubError } from '@/lib/github';
import { buildGraph } from '@/lib/graph';
import { detectFlows } from '@/lib/select';
import { store } from '@/lib/store';
import { getAuthenticatedUser } from '@/lib/auth-helper';

export async function POST(req: NextRequest) {
  const user = await getAuthenticatedUser(req);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { url } = body;
    if (!url || typeof url !== 'string') {
      return NextResponse.json({ error: 'Enter a valid GitHub repository URL' }, { status: 400 });
    }

    const { owner, repo: repoName } = parseRepoUrl(url);

    // Check if repo exists
    let repo = await store.getRepoByOwnerName(owner, repoName);
    if (!repo) {
      repo = await store.saveRepo({
        owner,
        name: repoName,
        default_branch: 'main',
      });
    }

    // Fetch repository files from GitHub
    const fetchResult = await fetchRepoFiles(owner, repoName);
    repo.default_branch = fetchResult.defaultBranch;

    // Check if analysis already cached for this commit
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

    return NextResponse.json({ repo, analysis });
  } catch (err) {
    if (err instanceof GitHubError) {
      const status = err.code === 'INVALID_URL' ? 400 : err.code === 'NOT_FOUND_OR_PRIVATE' ? 404 : 429;
      return NextResponse.json({ error: err.message, code: err.code }, { status });
    }
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Analysis failed' }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  const user = await getAuthenticatedUser(req);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const sessions = await store.getUserSessions(user.id);
  const repos = Array.from(store.repos.values());

  const result = repos.map((r) => {
    const repoSessions = sessions.filter(async (s) => {
      const a = await store.getAnalysis(s.analysis_id);
      return a?.repo_id === r.id;
    });
    return {
      ...r,
      sessionsCount: repoSessions.length,
    };
  });

  return NextResponse.json({ repos: result });
}

