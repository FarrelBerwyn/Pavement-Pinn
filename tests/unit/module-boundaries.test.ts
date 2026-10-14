/**
 * Static module-boundary checks (docs/architecture/DEPENDENCY_MAP.md).
 * Parses import specifiers from source text — no bundler, no runtime loading.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, existsSync, statSync } from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const toPosix = (p: string) => p.split(path.sep).join('/');

function walk(dir: string): string[] {
  const abs = path.join(ROOT, dir);
  if (!existsSync(abs)) return [];
  return readdirSync(abs, { withFileTypes: true }).flatMap((entry) =>
    entry.isDirectory() ? walk(`${dir}/${entry.name}`) : [`${dir}/${entry.name}`]
  );
}

const SOURCE_FILES = [...walk('src'), ...walk('server')].filter((f) => /\.(ts|tsx)$/.test(f));
const IMPORT_RE = /(?:\bfrom\s*|\bimport\s*\(?\s*)(['"])([^'"\n]+)\1/g;

interface ImportEdge {
  from: string;
  specifier: string;
  /** repo-relative resolved path for relative imports, otherwise null (package import) */
  target: string | null;
  typeOnly: boolean;
}

function resolveRelative(fromFile: string, specifier: string): string | null {
  const base = toPosix(path.posix.normalize(path.posix.join(path.posix.dirname(fromFile), specifier)));
  for (const candidate of [base, `${base}.ts`, `${base}.tsx`, `${base}/index.ts`, `${base}/index.tsx`]) {
    const abs = path.join(ROOT, candidate);
    if (existsSync(abs) && statSync(abs).isFile()) return candidate;
  }
  return null;
}

const EDGES: ImportEdge[] = SOURCE_FILES.flatMap((file) => {
  const text = readFileSync(path.join(ROOT, file), 'utf8');
  return [...text.matchAll(IMPORT_RE)].map((m) => {
    const specifier = m[2];
    const lineStart = text.lastIndexOf('\n', m.index ?? 0) + 1;
    const statementHead = text.slice(Math.max(0, (m.index ?? 0) - 400), m.index ?? 0);
    const lastImport = statementHead.lastIndexOf('import');
    const typeOnly = /^import\s+type\b/.test(statementHead.slice(lastImport)) || /^\s*import\s+type\b/.test(text.slice(lineStart));
    return {
      from: file,
      specifier,
      target: specifier.startsWith('.') ? resolveRelative(file, specifier) : null,
      typeOnly
    };
  });
});

const violations = (predicate: (edge: ImportEdge) => boolean) =>
  EDGES.filter(predicate).map((e) => `${e.from} imports ${e.specifier}`);

test('every relative import resolves to a file on disk', () => {
  assert.deepEqual(violations((e) => e.specifier.startsWith('.') && e.target === null), []);
});

test('engines/ and runtime/ are UI-free: no React, no components/features/pages/app imports', () => {
  const isCore = (f: string) => f.startsWith('src/engines/') || f.startsWith('src/runtime/');
  assert.deepEqual(
    violations(
      (e) =>
        isCore(e.from) &&
        (/^(react|react-dom|lucide-react|recharts|leaflet|motion)(\/|$)/.test(e.specifier) ||
          /^src\/(components|features|pages|app)\//.test(e.target ?? ''))
    ),
    []
  );
});

test('engines/ depend only on types (pure numerical core)', () => {
  assert.deepEqual(
    violations((e) => e.from.startsWith('src/engines/') && !(e.target ?? '').match(/^src\/(types|engines)\//)),
    []
  );
});

test('types/ import nothing but other type modules', () => {
  assert.deepEqual(violations((e) => e.from.startsWith('src/types/') && !(e.target ?? '').startsWith('src/types/')), []);
});

test('frontend never imports server-only code or Node built-ins', () => {
  assert.deepEqual(
    violations(
      (e) =>
        e.from.startsWith('src/') &&
        ((e.target ?? '').startsWith('server/') ||
          /^(node:|fs$|path$|express$|dotenv|child_process$|@google\/genai)/.test(e.specifier))
    ),
    []
  );
});

test('server imports from src/ are limited to the isomorphic shared kernel', () => {
  // domain/ is the isomorphic workflow kernel; data/mock seeds the demo workflow store.
  const allowed = /^src\/(types\/|engines\/|domain\/|data\/reference\/|data\/mock\/|constants\/)/;
  assert.deepEqual(
    violations((e) => e.from.startsWith('server/') && (e.target ?? '').startsWith('src/') && !allowed.test(e.target ?? '')),
    []
  );
});

test('server never imports React or browser UI libraries', () => {
  assert.deepEqual(
    violations((e) => e.from.startsWith('server/') && /^(react|react-dom|leaflet|lucide-react|recharts|jspdf)/.test(e.specifier)),
    []
  );
});

test('dependency direction: features/components/services never import pages/ or app/ (route layer sits on top)', () => {
  const isLower = (f: string) => /^src\/(features|components|services|engines|runtime|data|types|i18n)\//.test(f);
  // The two application shells legitimately live in app/layouts and are not "lower" modules.
  assert.deepEqual(violations((e) => isLower(e.from) && /^src\/(pages|app)\//.test(e.target ?? '')), []);
});

test('no circular imports between source modules (type-only imports excluded)', () => {
  const graph = new Map<string, string[]>();
  for (const edge of EDGES) {
    if (!edge.target || edge.typeOnly || !/\.(ts|tsx)$/.test(edge.target)) continue;
    graph.set(edge.from, [...(graph.get(edge.from) ?? []), edge.target]);
  }
  const state = new Map<string, 'visiting' | 'done'>();
  const cycles: string[] = [];
  const visit = (node: string, trail: string[]) => {
    if (state.get(node) === 'done') return;
    if (state.get(node) === 'visiting') {
      cycles.push([...trail.slice(trail.indexOf(node)), node].join(' -- '));
      return;
    }
    state.set(node, 'visiting');
    for (const next of graph.get(node) ?? []) visit(next, [...trail, node]);
    state.set(node, 'done');
  };
  [...graph.keys()].forEach((n) => visit(n, []));
  assert.deepEqual(cycles, []);
});

test('legacy pre-restructure paths are gone (single source of truth)', () => {
  const legacy = ['server.ts', 'src/App.tsx', 'src/types.ts', 'src/utils', 'src/index.css', 'src/components/PublicUserLayout.tsx'];
  assert.deepEqual(legacy.filter((p) => existsSync(path.join(ROOT, p))), []);
});
