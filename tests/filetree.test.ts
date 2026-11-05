import { describe, it, expect } from 'vitest';
import { buildFileTree } from '@/components/FileTree';

describe('buildFileTree', () => {
  it('builds a hierarchical folder-file tree matching IDE structure', () => {
    const paths = [
      'prisma/migrations/init.sql',
      'prisma/schema.prisma',
      'src/routes/login.js',
      'src/routes/auth.js',
      'src/db.js',
      'src/index.js',
      '.env',
      '.gitignore',
      'package.json',
    ];

    const tree = buildFileTree(paths);

    // Folders should appear first: prisma, src, then root files .env, .gitignore, package.json
    expect(tree[0].name).toBe('prisma');
    expect(tree[0].isFolder).toBe(true);

    expect(tree[1].name).toBe('src');
    expect(tree[1].isFolder).toBe(true);

    // Root files
    const rootFileNames = tree.filter((n) => !n.isFolder).map((n) => n.name);
    expect(rootFileNames).toContain('.env');
    expect(rootFileNames).toContain('.gitignore');
    expect(rootFileNames).toContain('package.json');

    // Nested prisma folder
    const prismaNode = tree.find((n) => n.name === 'prisma')!;
    expect(prismaNode.children).toBeDefined();
    expect(prismaNode.children![0].name).toBe('migrations');
    expect(prismaNode.children![0].isFolder).toBe(true);
    expect(prismaNode.children![1].name).toBe('schema.prisma');
    expect(prismaNode.children![1].isFolder).toBe(false);

    // Nested src folder
    const srcNode = tree.find((n) => n.name === 'src')!;
    expect(srcNode.children).toBeDefined();
    const srcFolder = srcNode.children!.find((c) => c.name === 'routes')!;
    expect(srcFolder.isFolder).toBe(true);
    expect(srcFolder.children).toHaveLength(2);
    expect(srcFolder.children!.map((c) => c.name)).toEqual(['auth.js', 'login.js']);
  });
});
