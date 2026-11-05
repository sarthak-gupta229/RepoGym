import { describe, it, expect } from 'vitest';
import { buildGraph } from '@/lib/graph';
import { layout } from '@/lib/layout';
import loginFixture from './fixtures/login.json';

describe('buildGraph on login fixture', () => {
  it('extracts expected nodes and exports', () => {
    const graph = buildGraph(loginFixture);

    expect(graph.nodes.length).toBe(4);

    const nodeMap = new Map(graph.nodes.map((n) => [n.file, n]));

    expect(nodeMap.has('routes/login.js')).toBe(true);
    expect(nodeMap.has('models/user.js')).toBe(true);
    expect(nodeMap.has('app.js')).toBe(true);
    expect(nodeMap.has('utils/logger.js')).toBe(true);

    // Check exports
    expect(nodeMap.get('routes/login.js')?.exports).toContain('router');
    expect(nodeMap.get('models/user.js')?.exports).toContain('findUserByEmail');
    expect(nodeMap.get('utils/logger.js')?.exports).toContain('log');
  });

  it('produces the expected edges', () => {
    const graph = buildGraph(loginFixture);

    // routes/login.js -> models/user.js
    // app.js -> routes/login.js
    expect(graph.edges).toHaveLength(2);

    const edgePairs = graph.edges.map((e) => ({ source: e.source, target: e.target }));
    expect(edgePairs).toContainEqual({
      source: 'routes/login.js',
      target: 'models/user.js',
    });
    expect(edgePairs).toContainEqual({
      source: 'app.js',
      target: 'routes/login.js',
    });
  });

  it('computes layout positions with dagre rankdir LR', () => {
    const graph = buildGraph(loginFixture);
    const positionedNodes = layout(graph.nodes, graph.edges);

    for (const node of positionedNodes) {
      expect(node.position).toBeDefined();
      expect(typeof node.position?.x).toBe('number');
      expect(typeof node.position?.y).toBe('number');
    }

    const nodeMap = new Map(positionedNodes.map((n) => [n.file, n]));
    const appNode = nodeMap.get('app.js')!;
    const loginNode = nodeMap.get('routes/login.js')!;
    const userNode = nodeMap.get('models/user.js')!;

    // In Left-to-Right layout, app.js imports routes/login.js which imports models/user.js
    expect(appNode.position!.x).toBeLessThan(loginNode.position!.x);
    expect(loginNode.position!.x).toBeLessThan(userNode.position!.x);
  });

  it('resolves alias @/ and root-relative imports into connected edges', () => {
    const customFiles: Record<string, string> = {
      'app/page.tsx': "import { Button } from '@/components/button'; import { db } from 'lib/db';",
      'components/button.tsx': "export function Button() { return null; }",
      'lib/db.ts': "export const db = {};",
    };

    const graph = buildGraph(customFiles);
    expect(graph.nodes).toHaveLength(3);
    expect(graph.edges).toHaveLength(2);

    const edgePairs = graph.edges.map((e) => ({ source: e.source, target: e.target }));
    expect(edgePairs).toContainEqual({
      source: 'app/page.tsx',
      target: 'components/button.tsx',
    });
    expect(edgePairs).toContainEqual({
      source: 'app/page.tsx',
      target: 'lib/db.ts',
    });
  });

  it('builds complete connected graph for multi-tier repository with all files', () => {
    const multiTierFiles: Record<string, string> = {
      'server.js': 'const api = require("./routes/api"); const auth = require("./routes/auth");',
      'routes/api.js': 'const data = require("../controllers/data"); const log = require("../utils/logger");',
      'routes/auth.js': 'const authCtrl = require("../controllers/auth");',
      'controllers/data.js': 'const db = require("../database/db");',
      'controllers/auth.js': 'const db = require("../database/db");',
      'database/db.js': 'module.exports = { connect: () => {} };',
      'utils/logger.js': 'module.exports = { log: () => {} };',
    };

    const graph = buildGraph(multiTierFiles);
    // All 7 files must come as nodes
    expect(graph.nodes).toHaveLength(7);
    const nodeFiles = graph.nodes.map((n) => n.file);
    expect(nodeFiles).toEqual(expect.arrayContaining(Object.keys(multiTierFiles)));

    // All 7 connections must be resolved
    expect(graph.edges).toHaveLength(7);
    const edges = graph.edges.map((e) => `${e.source}->${e.target}`);
    expect(edges).toContain('server.js->routes/api.js');
    expect(edges).toContain('server.js->routes/auth.js');
    expect(edges).toContain('routes/api.js->controllers/data.js');
    expect(edges).toContain('routes/api.js->utils/logger.js');
    expect(edges).toContain('routes/auth.js->controllers/auth.js');
    expect(edges).toContain('controllers/data.js->database/db.js');
    expect(edges).toContain('controllers/auth.js->database/db.js');
  });
});

