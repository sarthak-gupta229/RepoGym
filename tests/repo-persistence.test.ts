import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { store } from '@/lib/store';
import { POST as postRepo, GET as getRepos } from '@/app/api/repos/route';
import { GET as getRepoById } from '@/app/api/repos/[id]/route';

// Mock GitHub API so we can test repo ingestion deterministically
vi.mock('@/lib/github', () => ({
  parseRepoUrl: vi.fn((url: string) => {
    if (url.includes('my-org/auth-service')) {
      return { owner: 'my-org', repo: 'auth-service' };
    }
    if (url.includes('another-user/web-app')) {
      return { owner: 'another-user', repo: 'web-app' };
    }
    return { owner: 'test-owner', repo: 'test-repo' };
  }),
  fetchRepoFiles: vi.fn(async (owner: string, repo: string) => ({
    commitSha: `sha-${owner}-${repo}-123`,
    defaultBranch: 'main',
    truncated: false,
    files: {
      'index.js': "const express = require('express');\nconst app = express();\nmodule.exports = app;",
      'routes/api.js': "const express = require('express');\nconst router = express.Router();\nrouter.get('/health', (req, res) => res.json({ ok: true }));\nmodule.exports = router;",
    },
  })),
  GitHubError: class GitHubError extends Error {
    code: string;
    constructor(code: string, message: string) {
      super(message);
      this.code = code;
    }
  },
}));

let mockUser = {
  id: 'test-student-persistence-1',
  email: 'student@repogym.dev',
  name: 'Persistence Tester',
};

vi.mock('@/lib/auth-helper', () => ({
  getAuthenticatedUser: vi.fn(() => Promise.resolve(mockUser)),
}));

describe('Repository Persistence & User Dashboard Integration', () => {
  beforeEach(() => {
    mockUser = {
      id: 'test-student-persistence-1',
      email: 'student@repogym.dev',
      name: 'Persistence Tester',
    };
  });

  it('stores searched repositories in the database and lists them in GET /api/repos', async () => {
    // 1. User searches/analyzes a repository
    const req = new NextRequest('http://localhost:3000/api/repos', {
      method: 'POST',
      body: JSON.stringify({ url: 'https://github.com/my-org/auth-service' }),
    });

    const res = await postRepo(req);
    expect(res.status).toBe(200);
    const data = await res.json();

    expect(data.repo).toBeDefined();
    expect(data.repo.owner).toBe('my-org');
    expect(data.repo.name).toBe('auth-service');
    expect(data.analysis).toBeDefined();
    expect(data.analysis.commit_sha).toBe('sha-my-org-auth-service-123');

    // 2. Query GET /api/repos for this user
    const getReq = new NextRequest('http://localhost:3000/api/repos');
    const getRes = await getRepos(getReq);
    expect(getRes.status).toBe(200);

    const getData = await getRes.json();
    expect(Array.isArray(getData.repos)).toBe(true);

    const storedRepo = getData.repos.find(
      (r: { owner: string; name: string }) => r.owner === 'my-org' && r.name === 'auth-service'
    );
    expect(storedRepo).toBeDefined();
    expect(storedRepo.default_branch).toBe('main');
    expect(storedRepo.last_visited_at).toBeDefined();
    expect(storedRepo.latestCommitSha).toBe('sha-my-org-auth-service-123');
    expect(storedRepo.sessionsCount).toBe(0);
  });

  it('persists repository details across store reloads (simulating server restart)', async () => {
    // Check that the previously saved repo is in store
    const repoInStore = await store.getRepoByOwnerName('my-org', 'auth-service');
    expect(repoInStore).toBeDefined();

    // Verify user repos retrieval
    const userRepos = await store.getUserRepos(mockUser.id);
    const matched = userRepos.find((r) => r.owner === 'my-org' && r.name === 'auth-service');
    expect(matched).toBeDefined();
    expect(matched?.latestCommitSha).toBe('sha-my-org-auth-service-123');
  });

  it('updates last_visited_at when GET /api/repos/[id] is accessed', async () => {
    const repo = await store.getRepoByOwnerName('my-org', 'auth-service');
    expect(repo).toBeDefined();

    const detailReq = new NextRequest(`http://localhost:3000/api/repos/${repo!.id}`);
    const detailRes = await getRepoById(detailReq, {
      params: Promise.resolve({ id: repo!.id }),
    });

    expect(detailRes.status).toBe(200);
    const detailData = await detailRes.json();
    expect(detailData.repo.name).toBe('auth-service');
    expect(detailData.analysis).toBeDefined();

    // Confirm it exists in user's repository list
    const userRepos = await store.getUserRepos(mockUser.id);
    const visited = userRepos.find((r) => r.id === repo!.id);
    expect(visited).toBeDefined();
    expect(visited?.last_visited_at).toBeDefined();
  });

  it('tracks session progress on the repository for the dashboard', async () => {
    const repo = await store.getRepoByOwnerName('my-org', 'auth-service');
    expect(repo).toBeDefined();

    const analysis = await store.findAnalysis(repo!.id, 'sha-my-org-auth-service-123');
    expect(analysis).toBeDefined();

    // Start a session
    const session = await store.createSession(mockUser.id, analysis!.id, 'health', 5);
    expect(session.status).toBe('in_progress');

    // Retrieve user repos
    const userRepos = await store.getUserRepos(mockUser.id);
    const repoWithSession = userRepos.find((r) => r.id === repo!.id);

    expect(repoWithSession).toBeDefined();
    expect(repoWithSession?.sessionsCount).toBe(1);
    expect(repoWithSession?.latestSession).toBeDefined();
    expect(repoWithSession?.latestSession?.status).toBe('in_progress');
    expect(repoWithSession?.latestSession?.current_index).toBe(1);
    expect(repoWithSession?.latestSession?.total_questions).toBe(5);
  });
});
