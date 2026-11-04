import { describe, it, expect, vi } from 'vitest';
import {
  parseRepoUrl,
  isSupportedCodeFile,
  fetchRepoFiles,
  GitHubError,
  MAX_FILE_SIZE,
  MAX_FILES,
} from '@/lib/github';

describe('parseRepoUrl', () => {
  it('parses standard https URL', () => {
    expect(parseRepoUrl('https://github.com/facebook/react')).toEqual({
      owner: 'facebook',
      repo: 'react',
    });
  });

  it('parses URL without protocol', () => {
    expect(parseRepoUrl('github.com/facebook/react')).toEqual({
      owner: 'facebook',
      repo: 'react',
    });
  });

  it('strips .git extension', () => {
    expect(parseRepoUrl('https://github.com/facebook/react.git')).toEqual({
      owner: 'facebook',
      repo: 'react',
    });
  });

  it('handles trailing slash and subpaths', () => {
    expect(parseRepoUrl('https://github.com/facebook/react/tree/main/packages')).toEqual({
      owner: 'facebook',
      repo: 'react',
    });
  });

  it('rejects invalid inputs', () => {
    expect(() => parseRepoUrl('')).toThrow(GitHubError);
    expect(() => parseRepoUrl('gitlab.com/owner/repo')).toThrow(GitHubError);
    expect(() => parseRepoUrl('https://github.com/onlyowner')).toThrow(GitHubError);
    try {
      parseRepoUrl('https://notgithub.com/foo/bar');
    } catch (err) {
      expect(err).toBeInstanceOf(GitHubError);
      expect((err as GitHubError).code).toBe('INVALID_URL');
      expect((err as GitHubError).message).toBe('Enter a valid GitHub repository URL');
    }
  });
});

describe('isSupportedCodeFile filters', () => {
  it('accepts supported extensions', () => {
    expect(isSupportedCodeFile('index.js')).toBe(true);
    expect(isSupportedCodeFile('src/components/Button.jsx')).toBe(true);
    expect(isSupportedCodeFile('lib/utils.ts')).toBe(true);
    expect(isSupportedCodeFile('app/page.tsx')).toBe(true);
    expect(isSupportedCodeFile('main.py')).toBe(true);
  });

  it('rejects unsupported extensions', () => {
    expect(isSupportedCodeFile('README.md')).toBe(false);
    expect(isSupportedCodeFile('data.json')).toBe(false);
    expect(isSupportedCodeFile('styles.css')).toBe(false);
    expect(isSupportedCodeFile('image.png')).toBe(false);
  });

  it('rejects excluded directories', () => {
    expect(isSupportedCodeFile('node_modules/express/index.js')).toBe(false);
    expect(isSupportedCodeFile('dist/bundle.js')).toBe(false);
    expect(isSupportedCodeFile('build/static/app.js')).toBe(false);
    expect(isSupportedCodeFile('vendor/autoload.py')).toBe(false);
    expect(isSupportedCodeFile('.git/hooks/pre-commit.js')).toBe(false);
  });

  it('rejects lockfiles', () => {
    expect(isSupportedCodeFile('package-lock.json')).toBe(false);
    expect(isSupportedCodeFile('yarn.lock')).toBe(false);
    expect(isSupportedCodeFile('poetry.lock')).toBe(false);
  });

  it('rejects files larger than 20 KB', () => {
    expect(isSupportedCodeFile('big.js', MAX_FILE_SIZE + 1)).toBe(false);
    expect(isSupportedCodeFile('normal.js', MAX_FILE_SIZE)).toBe(true);
  });
});

describe('fetchRepoFiles', () => {
  it('handles 404 or 403 as private or missing repo', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      status: 404,
      ok: false,
      headers: new Headers(),
    });

    await expect(fetchRepoFiles('owner', 'private-repo', mockFetch as unknown as typeof fetch)).rejects.toThrow(
      "This repo is private or doesn't exist"
    );
  });

  it('handles rate limiting with reset time header', async () => {
    const resetTime = Math.floor(Date.now() / 1000) + 300; // 5 minutes
    const headers = new Headers();
    headers.set('x-ratelimit-remaining', '0');
    headers.set('x-ratelimit-reset', resetTime.toString());

    const mockFetch = vi.fn().mockResolvedValue({
      status: 403,
      ok: false,
      headers,
    });

    try {
      await fetchRepoFiles('owner', 'repo', mockFetch as unknown as typeof fetch);
      expect.unreachable('Should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(GitHubError);
      expect((err as GitHubError).code).toBe('RATE_LIMITED');
      expect((err as GitHubError).message).toContain('GitHub is busy; try again in');
    }
  });

  it('throws NO_SUPPORTED_FILES when tree has no code files', async () => {
    const mockFetch = vi.fn().mockImplementation((url: string) => {
      if (url.includes('/repos/owner/repo/commits')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          headers: new Headers(),
          json: () => Promise.resolve({ sha: 'sha123' }),
        });
      }
      if (url.includes('/git/trees/')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          headers: new Headers(),
          json: () =>
            Promise.resolve({
              sha: 'tree123',
              tree: [
                { path: 'README.md', type: 'blob', size: 100 },
                { path: 'package-lock.json', type: 'blob', size: 500 },
              ],
              truncated: false,
            }),
        });
      }
      return Promise.resolve({
        ok: true,
        status: 200,
        headers: new Headers(),
        json: () => Promise.resolve({ default_branch: 'main' }),
      });
    });

    await expect(fetchRepoFiles('owner', 'repo', mockFetch as unknown as typeof fetch)).rejects.toThrow(
      'No JavaScript, TypeScript, or Python files found'
    );
  });

  it('caps at 150 files and respects truncation', async () => {
    const treeItems = Array.from({ length: 200 }, (_, i) => ({
      path: `src/file${i}.ts`,
      type: 'blob',
      size: 100,
    }));

    const mockFetch = vi.fn().mockImplementation((url: string) => {
      if (url.includes('/repos/owner/repo/commits')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          headers: new Headers(),
          json: () => Promise.resolve({ sha: 'sha123' }),
        });
      }
      if (url.includes('/git/trees/')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          headers: new Headers(),
          json: () =>
            Promise.resolve({
              sha: 'tree123',
              tree: treeItems,
              truncated: true,
            }),
        });
      }
      if (url.includes('raw.githubusercontent.com')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          headers: new Headers(),
          text: () => Promise.resolve('export const x = 1;'),
        });
      }
      return Promise.resolve({
        ok: true,
        status: 200,
        headers: new Headers(),
        json: () => Promise.resolve({ default_branch: 'main' }),
      });
    });

    const result = await fetchRepoFiles('owner', 'repo', mockFetch as unknown as typeof fetch);
    expect(result.commitSha).toBe('sha123');
    expect(result.defaultBranch).toBe('main');
    expect(result.truncated).toBe(true);
    expect(Object.keys(result.files).length).toBe(MAX_FILES);
  });
});

