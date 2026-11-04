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
});

