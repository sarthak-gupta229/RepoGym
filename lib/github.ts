export class GitHubError extends Error {
  code: 'INVALID_URL' | 'NOT_FOUND_OR_PRIVATE' | 'NO_SUPPORTED_FILES' | 'RATE_LIMITED' | 'GITHUB_API_ERROR';
  resetTime?: number;

  constructor(
    code: 'INVALID_URL' | 'NOT_FOUND_OR_PRIVATE' | 'NO_SUPPORTED_FILES' | 'RATE_LIMITED' | 'GITHUB_API_ERROR',
    message: string,
    resetTime?: number
  ) {
    super(message);
    this.name = 'GitHubError';
    this.code = code;
    this.resetTime = resetTime;
  }
}

export function parseRepoUrl(input: string): { owner: string; repo: string } {
  if (!input || typeof input !== 'string') {
    throw new GitHubError('INVALID_URL', 'Enter a valid GitHub repository URL');
  }

  let trimmed = input.trim();
  // Strip protocol
  trimmed = trimmed.replace(/^https?:\/\//i, '');

  if (!trimmed.toLowerCase().startsWith('github.com/')) {
    throw new GitHubError('INVALID_URL', 'Enter a valid GitHub repository URL');
  }

  const pathPart = trimmed.slice('github.com/'.length);
  const segments = pathPart.split('/').filter(Boolean);

  if (segments.length < 2) {
    throw new GitHubError('INVALID_URL', 'Enter a valid GitHub repository URL');
  }

  const owner = segments[0];
  let repo = segments[1];

  if (repo.endsWith('.git')) {
    repo = repo.slice(0, -4);
  }

  if (!owner || !repo) {
    throw new GitHubError('INVALID_URL', 'Enter a valid GitHub repository URL');
  }

  return { owner, repo };
}

export const SUPPORTED_EXTENSIONS = new Set(['.js', '.jsx', '.ts', '.tsx', '.py']);
export const EXCLUDED_DIRS = new Set(['node_modules', 'dist', 'build', 'vendor', '.git']);
export const LOCKFILES = new Set([
  'package-lock.json',
  'yarn.lock',
  'pnpm-lock.yaml',
  'poetry.lock',
  'pipfile.lock',
  'composer.lock',
]);
export const MAX_FILE_SIZE = 20 * 1024; // 20 KB
export const MAX_FILES = 150;

export function isSupportedCodeFile(path: string, size?: number): boolean {
  if (size !== undefined && size > MAX_FILE_SIZE) {
    return false;
  }

  const segments = path.split('/');
  const fileName = segments[segments.length - 1].toLowerCase();

  if (LOCKFILES.has(fileName)) {
    return false;
  }

  for (const seg of segments.slice(0, -1)) {
    if (EXCLUDED_DIRS.has(seg.toLowerCase())) {
      return false;
    }
  }

  const lastDot = fileName.lastIndexOf('.');
  if (lastDot === -1) {
    return false;
  }

  const ext = fileName.slice(lastDot);
  return SUPPORTED_EXTENSIONS.has(ext);
}

interface TreeItem {
  path: string;
  mode?: string;
  type: string;
  size?: number;
  sha?: string;
  url?: string;
}

interface TreeResponse {
  sha: string;
  tree: TreeItem[];
  truncated: boolean;
}

export interface RepoFilesResult {
  commitSha: string;
  defaultBranch: string;
  truncated: boolean;
  files: Record<string, string>;
}

function checkRateLimitHeaders(headers: Headers): void {
  const remaining = headers.get('x-ratelimit-remaining');
  const reset = headers.get('x-ratelimit-reset');

  if (remaining === '0' && reset) {
    const resetTimestamp = parseInt(reset, 10);
    const nowInSeconds = Math.floor(Date.now() / 1000);
    const diffSeconds = Math.max(0, resetTimestamp - nowInSeconds);
    const minutes = Math.max(1, Math.ceil(diffSeconds / 60));
    throw new GitHubError(
      'RATE_LIMITED',
      `GitHub is busy; try again in ${minutes} minutes`,
      resetTimestamp
    );
  }
}

function getGitHubHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    Accept: 'application/vnd.github.v3+json',
    'User-Agent': 'RepoGym',
  };
  const token = process.env.GITHUB_TOKEN;
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  return headers;
}

export async function fetchRepoFiles(
  owner: string,
  repo: string,
  fetchFn: typeof fetch = fetch
): Promise<RepoFilesResult> {
  const headers = getGitHubHeaders();

  // Step 1: GET /repos/{owner}/{repo}
  const repoRes = await fetchFn(`https://api.github.com/repos/${owner}/${repo}`, { headers });
  checkRateLimitHeaders(repoRes.headers);

  if (repoRes.status === 404 || repoRes.status === 403) {
    throw new GitHubError('NOT_FOUND_OR_PRIVATE', "This repo is private or doesn't exist");
  }

  if (!repoRes.ok) {
    throw new GitHubError('GITHUB_API_ERROR', `GitHub API error: ${repoRes.status} ${repoRes.statusText}`);
  }

  const repoData = (await repoRes.json()) as { default_branch?: string };
  const defaultBranch = repoData.default_branch || 'main';

  // Step 2: GET /repos/{owner}/{repo}/commits/{branch}
  const commitRes = await fetchFn(
    `https://api.github.com/repos/${owner}/${repo}/commits/${encodeURIComponent(defaultBranch)}`,
    { headers }
  );
  checkRateLimitHeaders(commitRes.headers);

  if (!commitRes.ok) {
    if (commitRes.status === 404 || commitRes.status === 403) {
      throw new GitHubError('NOT_FOUND_OR_PRIVATE', "This repo is private or doesn't exist");
    }
    throw new GitHubError('GITHUB_API_ERROR', `GitHub commit error: ${commitRes.status}`);
  }

  const commitData = (await commitRes.json()) as { sha?: string };
  const commitSha = commitData.sha;
  if (!commitSha) {
    throw new GitHubError('GITHUB_API_ERROR', 'Could not determine latest commit SHA');
  }

  // Step 3: GET /repos/{owner}/{repo}/git/trees/{branch}?recursive=1
  const treeRes = await fetchFn(
    `https://api.github.com/repos/${owner}/${repo}/git/trees/${encodeURIComponent(defaultBranch)}?recursive=1`,
    { headers }
  );
  checkRateLimitHeaders(treeRes.headers);

  if (!treeRes.ok) {
    if (treeRes.status === 404 || treeRes.status === 403) {
      throw new GitHubError('NOT_FOUND_OR_PRIVATE', "This repo is private or doesn't exist");
    }
    throw new GitHubError('GITHUB_API_ERROR', `GitHub tree error: ${treeRes.status}`);
  }

  const treeData = (await treeRes.json()) as TreeResponse;
  const isTruncated = Boolean(treeData.truncated);

  // Filter files
  const candidateItems = (treeData.tree || []).filter(
    (item) => item.type === 'blob' && isSupportedCodeFile(item.path, item.size)
  );

  if (candidateItems.length === 0) {
    throw new GitHubError('NO_SUPPORTED_FILES', 'No JavaScript, TypeScript, or Python files found');
  }

  // Cap at 150 files
  const filesToFetch = candidateItems.slice(0, MAX_FILES);

  // Step 4: GET raw.githubusercontent.com in batches of 10
  const filesMap: Record<string, string> = {};
  const batchSize = 10;

  for (let i = 0; i < filesToFetch.length; i += batchSize) {
    const batch = filesToFetch.slice(i, i + batchSize);
    await Promise.all(
      batch.map(async (item) => {
        const rawUrl = `https://raw.githubusercontent.com/${owner}/${repo}/${encodeURIComponent(defaultBranch)}/${item.path}`;
        const rawRes = await fetchFn(rawUrl, {
          headers: process.env.GITHUB_TOKEN ? { Authorization: `Bearer ${process.env.GITHUB_TOKEN}` } : {},
        });
        checkRateLimitHeaders(rawRes.headers);

        if (rawRes.ok) {
          const content = await rawRes.text();
          // Verify size
          if (content.length <= MAX_FILE_SIZE) {
            filesMap[item.path] = content;
          }
        }
      })
    );
  }

  if (Object.keys(filesMap).length === 0) {
    throw new GitHubError('NO_SUPPORTED_FILES', 'No JavaScript, TypeScript, or Python files found');
  }

  return {
    commitSha,
    defaultBranch,
    truncated: isTruncated,
    files: filesMap,
  };
}

