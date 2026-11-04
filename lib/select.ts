import { buildGraph, DependencyGraph } from './graph';

export interface Flow {
  id: string;
  label: string;
  routeFile: string;
  tag: string;
}

export function detectFlows(files: Record<string, string>): Flow[] {
  const flows: Flow[] = [];
  const seenIds = new Set<string>();

  for (const [filePath, content] of Object.entries(files)) {
    // 1. Express / Router routes: app.get('/path') or router.post('/path')
    const expressMatches = content.matchAll(/(?:app|router)\.(get|post|put|delete|patch)\s*\(\s*['"]([^'"]+)['"]/g);
    for (const m of expressMatches) {
      const method = m[1].toUpperCase();
      const path = m[2];
      const tag = path.replace(/^\/|\/$/g, '').split('/')[0] || 'api';
      const id = `${method.toLowerCase()}-${path.replace(/[^a-zA-Z0-9_-]/g, '_')}`;

      if (!seenIds.has(id)) {
        seenIds.add(id);
        flows.push({
          id,
          label: `${method} ${path}`,
          routeFile: filePath,
          tag,
        });
      }
    }

    // 2. Next.js App Router: app/api/**/route.(ts|js|tsx|jsx)
    if (/^app\/api\/.+\/route\.(ts|js|tsx|jsx)$/.test(filePath)) {
      const routePath = '/' + filePath.slice(0, filePath.lastIndexOf('/')).replace(/^app\//, '');
      const methods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'];
      for (const method of methods) {
        if (new RegExp(`export\\s+(?:async\\s+)?function\\s+${method}\\b`).test(content)) {
          const id = `${method.toLowerCase()}-${routePath.replace(/[^a-zA-Z0-9_-]/g, '_')}`;
          if (!seenIds.has(id)) {
            seenIds.add(id);
            const tag = routePath.split('/').filter(Boolean)[1] || 'api';
            flows.push({
              id,
              label: `${method} ${routePath}`,
              routeFile: filePath,
              tag,
            });
          }
        }
      }
    }

    // 3. Next.js Pages Router: pages/api/**.(ts|js)
    if (/^pages\/api\/.+\.(ts|js|tsx|jsx)$/.test(filePath)) {
      const cleanPath = '/' + filePath.replace(/^pages\//, '').replace(/\.(ts|js|tsx|jsx)$/, '');
      const id = `api-${cleanPath.replace(/[^a-zA-Z0-9_-]/g, '_')}`;
      if (!seenIds.has(id)) {
        seenIds.add(id);
        const tag = cleanPath.split('/').filter(Boolean)[1] || 'api';
        flows.push({
          id,
          label: cleanPath,
          routeFile: filePath,
          tag,
        });
      }
    }

    // 4. FastAPI / Flask decorators: @app.get('/path') or @router.post('/path')
    const pyMatches = content.matchAll(/@(?:app|router)\.(get|post|put|delete|patch|route)\s*\(\s*['"]([^'"]+)['"]/g);
    for (const m of pyMatches) {
      const method = m[1] === 'route' ? 'GET' : m[1].toUpperCase();
      const path = m[2];
      const tag = path.replace(/^\/|\/$/g, '').split('/')[0] || 'api';
      const id = `${method.toLowerCase()}-${path.replace(/[^a-zA-Z0-9_-]/g, '_')}`;

      if (!seenIds.has(id)) {
        seenIds.add(id);
        flows.push({
          id,
          label: `${method} ${path}`,
          routeFile: filePath,
          tag,
        });
      }
    }
  }

  return flows;
}

export function selectFlowFiles(
  files: Record<string, string>,
  flow: Flow,
  prebuiltGraph?: DependencyGraph
): Record<string, string> {
  const graph = prebuiltGraph || buildGraph(files);
  const selected = new Set<string>();

  if (files[flow.routeFile]) {
    selected.add(flow.routeFile);
  } else {
    return {};
  }

  // Build adjacency map (importer -> imported target)
  const outgoingMap = new Map<string, string[]>();
  for (const edge of graph.edges) {
    if (!outgoingMap.has(edge.source)) {
      outgoingMap.set(edge.source, []);
    }
    outgoingMap.get(edge.source)!.push(edge.target);
  }

  // Hop 1: direct imports of the route file
  const directImports = outgoingMap.get(flow.routeFile) || [];
  for (const target of directImports) {
    if (files[target]) {
      selected.add(target);
    }
  }

  // Check total line count of selected files
  let totalLines = 0;
  for (const f of selected) {
    totalLines += files[f].split('\n').length;
  }

  // If short on context (< 100 lines), expand up to 2 more hops
  if (totalLines < 100) {
    // Hop 2
    const hop2Targets = new Set<string>();
    for (const file of directImports) {
      const nextTargets = outgoingMap.get(file) || [];
      for (const t of nextTargets) {
        if (!selected.has(t) && files[t]) {
          selected.add(t);
          hop2Targets.add(t);
        }
      }
    }

    // Recalculate lines
    totalLines = 0;
    for (const f of selected) {
      totalLines += files[f].split('\n').length;
    }

    if (totalLines < 100) {
      // Hop 3
      for (const file of hop2Targets) {
        const nextTargets = outgoingMap.get(file) || [];
        for (const t of nextTargets) {
          if (!selected.has(t) && files[t]) {
            selected.add(t);
          }
        }
      }
    }
  }

  const result: Record<string, string> = {};
  for (const f of selected) {
    result[f] = files[f];
  }
  return result;
}

