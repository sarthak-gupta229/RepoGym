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

  function addFlow(id: string, label: string, routeFile: string, tag: string) {
    if (!seenIds.has(id) && files[routeFile]) {
      seenIds.add(id);
      flows.push({ id, label, routeFile, tag });
    }
  }

  // 1. Scan code files for route definitions
  for (const [filePath, content] of Object.entries(files)) {
    // 1a. Express / Router / Fastify / Koa routes: app.get('/path') or router.post('/path')
    const expressMatches = content.matchAll(/(?:app|router)\.(get|post|put|delete|patch|route)\s*\(\s*['"]([^'"]+)['"]/g);
    for (const m of expressMatches) {
      const method = m[1] === 'route' ? 'GET' : m[1].toUpperCase();
      const path = m[2];
      const tag = path.replace(/^\/|\/$/g, '').split('/')[0] || 'api';
      const id = `${method.toLowerCase()}-${path.replace(/[^a-zA-Z0-9_-]/g, '_')}`;
      addFlow(id, `${method} ${path}`, filePath, tag);
    }

    // 1b. Next.js App Router API: (?:^|\/)app\/api\/.+\/route\.(ts|js|tsx|jsx)$
    if (/(?:^|\/)app\/api\/.+\/route\.(ts|js|tsx|jsx)$/.test(filePath)) {
      const routePath = '/' + filePath.slice(0, filePath.lastIndexOf('/')).replace(/^(?:.*\/)?app\//, '');
      const methods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'];
      for (const method of methods) {
        if (new RegExp(`export\\s+(?:async\\s+)?function\\s+${method}\\b`).test(content)) {
          const id = `${method.toLowerCase()}-${routePath.replace(/[^a-zA-Z0-9_-]/g, '_')}`;
          const tag = routePath.split('/').filter(Boolean)[1] || 'api';
          addFlow(id, `${method} ${routePath}`, filePath, tag);
        }
      }
    }

    // 1c. Next.js Pages Router API: (?:^|\/)pages\/api\/.+\.(ts|js|tsx|jsx)$
    if (/(?:^|\/)pages\/api\/.+\.(ts|js|tsx|jsx)$/.test(filePath)) {
      const cleanPath = '/' + filePath.replace(/^(?:.*\/)?pages\//, '').replace(/\.(ts|js|tsx|jsx)$/, '');
      const id = `api-${cleanPath.replace(/[^a-zA-Z0-9_-]/g, '_')}`;
      const tag = cleanPath.split('/').filter(Boolean)[1] || 'api';
      addFlow(id, cleanPath, filePath, tag);
    }

    // 1d. FastAPI / Flask / Django decorators & route paths
    const pyMatches = content.matchAll(/@(?:app|router|blueprint)\.(get|post|put|delete|patch|route)\s*\(\s*['"]([^'"]+)['"]/g);
    for (const m of pyMatches) {
      const method = m[1] === 'route' ? 'GET' : m[1].toUpperCase();
      const path = m[2];
      const tag = path.replace(/^\/|\/$/g, '').split('/')[0] || 'api';
      const id = `${method.toLowerCase()}-${path.replace(/[^a-zA-Z0-9_-]/g, '_')}`;
      addFlow(id, `${method} ${path}`, filePath, tag);
    }

    // 1e. React Router: <Route path="..." element={...}> or <Route path="..." component={...}>
    const reactRouteMatches = content.matchAll(/<Route\s+[^>]*path=["']([^"']+)["'][^>]*>/g);
    for (const m of reactRouteMatches) {
      const path = m[1];
      const tag = path.replace(/^\/|\/$/g, '').split('/')[0] || 'home';
      const id = `route-${path.replace(/[^a-zA-Z0-9_-]/g, '_')}`;
      addFlow(id, `Route: ${path}`, filePath, tag);
    }

    // 1f. createBrowserRouter / route definition objects: path: '/...'
    if (/createBrowserRouter|useRoutes|createHashRouter/.test(content)) {
      const objRouteMatches = content.matchAll(/path\s*:\s*['"]([^'"]+)['"]/g);
      for (const m of objRouteMatches) {
        const path = m[1];
        const tag = path.replace(/^\/|\/$/g, '').split('/')[0] || 'route';
        const id = `route-${path.replace(/[^a-zA-Z0-9_-]/g, '_')}`;
        addFlow(id, `Route: ${path}`, filePath, tag);
      }
    }

    // 1g. Next.js App Router Page routes: **/app/**/page.(tsx|jsx|js|ts)
    const appPageMatch = filePath.match(/(?:^|\/)app\/(.+?)\/page\.(?:tsx|jsx|js|ts)$/);
    if (appPageMatch) {
      const segments = appPageMatch[1].split('/').filter((s) => !s.startsWith('(') && !s.endsWith(')'));
      const routePath = '/' + segments.join('/');
      const tag = segments[0] || 'home';
      const id = `page-${routePath.replace(/[^a-zA-Z0-9_-]/g, '_')}`;
      addFlow(id, `Page: ${routePath}`, filePath, tag);
    }
  }

  // 2. Detect frontend Views / Pages / Screens if flows are low
  for (const [filePath, _] of Object.entries(files)) {
    const pageMatch = filePath.match(/(?:pages|views|screens)\/(.+?)(?:\/index|\/([A-Z][a-zA-Z0-9]+))?\.(?:jsx|tsx|js|ts)$/);
    if (pageMatch) {
      const pageName = pageMatch[2] || pageMatch[1].split('/').pop() || 'page';
      if (!['index', 'App', 'main', '_app', '_document', '404', '500'].includes(pageName)) {
        const tag = pageName.toLowerCase();
        const id = `view-${tag}`;
        addFlow(id, `View: ${pageName}`, filePath, tag);
      }
    }
  }

  // 3. Universal Fallback: If STILL empty, generate architecture flows from core files
  if (flows.length === 0) {
    const allFiles = Object.keys(files);
    // Prioritize main entry files
    const entryCandidates = allFiles.filter((f) =>
      /(?:main|index|app|server|cli)\.(?:js|ts|jsx|tsx|py|go|rs)$/i.test(f)
    );
    const sourceCandidates = allFiles.filter((f) =>
      /(?:src|lib|controllers|services|components|api)\//i.test(f)
    );
    const selectedCandidates = Array.from(
      new Set([...entryCandidates, ...sourceCandidates, ...allFiles])
    ).slice(0, 3);

    for (const file of selectedCandidates) {
      const baseName = file.split('/').pop()?.replace(/\.[^.]+$/, '') || 'core';
      const tag = baseName.toLowerCase();
      const id = `flow-arch-${tag}`;
      addFlow(id, `Architecture Flow: ${baseName}`, file, tag);
    }
  }

  return flows;
}

export function selectFlowFiles(
  files: Record<string, string>,
  flow: Flow,
  prebuiltGraph?: DependencyGraph
): Record<string, string> {
  const fileKeys = Object.keys(files);
  if (fileKeys.length === 0) return {};

  const graph = prebuiltGraph || buildGraph(files);
  const selected = new Set<string>();

  let targetRouteFile = flow.routeFile;
  if (!files[targetRouteFile]) {
    const matched = fileKeys.find(
      (k) => k.endsWith(targetRouteFile) || targetRouteFile.endsWith(k) || k.toLowerCase().includes(targetRouteFile.toLowerCase())
    );
    if (matched) {
      targetRouteFile = matched;
    } else {
      targetRouteFile = fileKeys[0];
    }
  }

  if (files[targetRouteFile]) {
    selected.add(targetRouteFile);
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
  const directImports = outgoingMap.get(targetRouteFile) || [];
  for (const target of directImports) {
    if (files[target]) {
      selected.add(target);
    }
  }

  // Check total line count of selected files
  let totalLines = 0;
  for (const f of selected) {
    totalLines += files[f]?.split('\n').length || 0;
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
      totalLines += files[f]?.split('\n').length || 0;
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

  // If still only 1 file and more files exist in repo, pick related files in same directory
  if (selected.size === 1 && fileKeys.length > 1) {
    const dir = targetRouteFile.includes('/') ? targetRouteFile.slice(0, targetRouteFile.lastIndexOf('/')) : '';
    const sameDirFiles = fileKeys.filter((f) => f !== targetRouteFile && f.startsWith(dir));
    for (const neighbor of sameDirFiles.slice(0, 3)) {
      selected.add(neighbor);
    }
  }

  const result: Record<string, string> = {};
  for (const f of selected) {
    if (files[f]) {
      result[f] = files[f];
    }
  }
  return Object.keys(result).length > 0 ? result : { [fileKeys[0]]: files[fileKeys[0]] };
}
