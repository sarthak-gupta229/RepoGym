export interface GraphNode {
  id: string;
  file: string;
  exports: string[];
  importsCount: number;
  unresolvedImports: string[];
  language: string;
  position?: { x: number; y: number };
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  statement?: string;
}

export interface DependencyGraph {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export function normalizePath(p: string): string {
  const parts = p.replace(/\\/g, '/').split('/');
  const stack: string[] = [];
  for (const part of parts) {
    if (!part || part === '.') continue;
    if (part === '..') {
      stack.pop();
    } else {
      stack.push(part);
    }
  }
  return stack.join('/');
}

export function resolveImportPath(importerPath: string, importSpecifier: string): string {
  const importerDir = importerPath.includes('/')
    ? importerPath.slice(0, importerPath.lastIndexOf('/'))
    : '';
  const combined = importerDir ? `${importerDir}/${importSpecifier}` : importSpecifier;
  return normalizePath(combined);
}

export function getFileLanguage(filePath: string): string {
  const ext = filePath.slice(filePath.lastIndexOf('.')).toLowerCase();
  switch (ext) {
    case '.ts':
      return 'typescript';
    case '.tsx':
      return 'typescriptreact';
    case '.jsx':
      return 'javascriptreact';
    case '.py':
      return 'python';
    case '.js':
    default:
      return 'javascript';
  }
}

export function extractExports(content: string, filePath: string): string[] {
  const exportsSet = new Set<string>();
  const isPython = filePath.endsWith('.py');

  if (isPython) {
    // Check __all__
    const allMatch = content.match(/__all__\s*=\s*\[([^\]]+)\]/);
    if (allMatch) {
      const items = allMatch[1].split(',').map((s) => s.trim().replace(/['"]/g, '')).filter(Boolean);
      items.forEach((item) => exportsSet.add(item));
      return Array.from(exportsSet);
    }
    // Top-level def and class
    const defMatches = content.matchAll(/^def\s+([a-zA-Z0-9_]+)/gm);
    for (const match of defMatches) {
      if (!match[1].startsWith('_')) {
        exportsSet.add(match[1]);
      }
    }
    const classMatches = content.matchAll(/^class\s+([a-zA-Z0-9_]+)/gm);
    for (const match of classMatches) {
      if (!match[1].startsWith('_')) {
        exportsSet.add(match[1]);
      }
    }
    return Array.from(exportsSet);
  }

  // ES Modules
  // export default ...
  if (/export\s+default\b/.test(content)) {
    exportsSet.add('default');
  }

  // export (async)? function name
  const esFnMatches = content.matchAll(/export\s+(?:async\s+)?function\s+([a-zA-Z0-9_$]+)/g);
  for (const m of esFnMatches) {
    exportsSet.add(m[1]);
  }

  // export class name
  const esClassMatches = content.matchAll(/export\s+class\s+([a-zA-Z0-9_$]+)/g);
  for (const m of esClassMatches) {
    exportsSet.add(m[1]);
  }

  // export (const|let|var) name
  const esVarMatches = content.matchAll(/export\s+(?:const|let|var)\s+([a-zA-Z0-9_$]+)/g);
  for (const m of esVarMatches) {
    exportsSet.add(m[1]);
  }

  // export { a, b as c }
  const esNamedMatches = content.matchAll(/export\s*\{([^}]+)\}/g);
  for (const m of esNamedMatches) {
    const names = m[1].split(',').map((s) => s.trim()).filter(Boolean);
    for (const item of names) {
      const parts = item.split(/\s+as\s+/);
      const exportedName = parts.length > 1 ? parts[1].trim() : parts[0].trim();
      if (exportedName) {
        exportsSet.add(exportedName);
      }
    }
  }

  // CommonJS
  // exports.name = ...
  const cjsNamedMatches = content.matchAll(/(?:module\.)?exports\.([a-zA-Z0-9_$]+)\s*=/g);
  for (const m of cjsNamedMatches) {
    exportsSet.add(m[1]);
  }

  // module.exports = { a, b: c, d }
  const cjsObjMatch = content.match(/module\.exports\s*=\s*\{([\s\S]*?)\}/);
  if (cjsObjMatch) {
    const rawBody = cjsObjMatch[1];
    // Match keys before : or bare shorthand properties
    const lines = rawBody.split(/,|\n/).map((s) => s.trim()).filter(Boolean);
    for (const item of lines) {
      const colonIdx = item.indexOf(':');
      if (colonIdx !== -1) {
        const key = item.slice(0, colonIdx).trim().replace(/['"]/g, '');
        if (key && /^[a-zA-Z0-9_$]+$/.test(key)) {
          exportsSet.add(key);
        }
      } else {
        const key = item.replace(/['"]/g, '');
        if (key && /^[a-zA-Z0-9_$]+$/.test(key)) {
          exportsSet.add(key);
        }
      }
    }
  }

  // module.exports = identifier (single export, not an object literal)
  const cjsSingleMatch = content.match(/module\.exports\s*=\s*([a-zA-Z0-9_$]+)\s*(?:;|$)/m);
  if (cjsSingleMatch && !content.includes('module.exports = {')) {
    exportsSet.add(cjsSingleMatch[1]);
  }

  return Array.from(exportsSet);
}

interface ImportStatement {
  specifier: string;
  raw: string;
}

export function extractImports(content: string, filePath: string): ImportStatement[] {
  const imports: ImportStatement[] = [];
  const isPython = filePath.endsWith('.py');

  if (isPython) {
    // from .foo import bar
    const pyFromMatches = content.matchAll(/from\s+([.\w]+)\s+import/g);
    for (const m of pyFromMatches) {
      imports.push({ specifier: m[1], raw: m[0] });
    }
    // import .foo
    const pyImportMatches = content.matchAll(/import\s+([.\w]+)/g);
    for (const m of pyImportMatches) {
      imports.push({ specifier: m[1], raw: m[0] });
    }
    return imports;
  }

  // JS/TS
  // import ... from '...'
  const esFromMatches = content.matchAll(/import\s+(?:[\s\S]*?)\s+from\s+['"]([^'"]+)['"]/g);
  for (const m of esFromMatches) {
    imports.push({ specifier: m[1], raw: m[0] });
  }

  // import '...'
  const esBareMatches = content.matchAll(/import\s+['"]([^'"]+)['"]/g);
  for (const m of esBareMatches) {
    imports.push({ specifier: m[1], raw: m[0] });
  }

  // require('...')
  const cjsMatches = content.matchAll(/require\s*\(\s*['"]([^'"]+)['"]\s*\)/g);
  for (const m of cjsMatches) {
    imports.push({ specifier: m[1], raw: m[0] });
  }

  // dynamic import('...')
  const dynamicMatches = content.matchAll(/import\s*\(\s*['"]([^'"]+)['"]\s*\)/g);
  for (const m of dynamicMatches) {
    imports.push({ specifier: m[1], raw: m[0] });
  }

  return imports;
}

function findTargetFile(resolvedBase: string, fileSet: Set<string>): string | null {
  const candidates = [
    resolvedBase,
    `${resolvedBase}.js`,
    `${resolvedBase}.ts`,
    `${resolvedBase}.jsx`,
    `${resolvedBase}.tsx`,
    `${resolvedBase}/index.js`,
    `${resolvedBase}/index.ts`,
    `${resolvedBase}/index.jsx`,
    `${resolvedBase}/index.tsx`,
    `${resolvedBase}.py`,
    `${resolvedBase}/__init__.py`,
  ];

  for (const cand of candidates) {
    if (fileSet.has(cand)) {
      return cand;
    }
  }

  return null;
}

export function buildGraph(files: Record<string, string>): DependencyGraph {
  const filePaths = Object.keys(files);
  const fileSet = new Set(filePaths);

  const nodes: GraphNode[] = [];
  const edges: GraphEdge[] = [];
  const edgeKeySet = new Set<string>();

  for (const filePath of filePaths) {
    const content = files[filePath];
    const exports = extractExports(content, filePath);
    const imports = extractImports(content, filePath);

    const unresolvedImports: string[] = [];
    let resolvedCount = 0;

    for (const imp of imports) {
      const spec = imp.specifier;
      // Only relative imports (starting with .) are considered for edges
      if (spec.startsWith('.')) {
        let resolved = resolveImportPath(filePath, spec);
        if (filePath.endsWith('.py') && spec.startsWith('.')) {
          // Python relative import handling
          resolved = resolveImportPath(filePath, spec.replace(/^\./, ''));
        }
        const target = findTargetFile(resolved, fileSet);
        if (target) {
          const edgeId = `${filePath}->${target}`;
          if (!edgeKeySet.has(edgeId)) {
            edgeKeySet.add(edgeId);
            edges.push({
              id: edgeId,
              source: filePath,
              target,
              statement: imp.raw,
            });
          }
          resolvedCount++;
        } else {
          unresolvedImports.push(spec);
        }
      } else {
        // External package or non-relative import
        unresolvedImports.push(spec);
      }
    }

    nodes.push({
      id: filePath,
      file: filePath,
      exports,
      importsCount: resolvedCount,
      unresolvedImports,
      language: getFileLanguage(filePath),
    });
  }

  return { nodes, edges };
}

