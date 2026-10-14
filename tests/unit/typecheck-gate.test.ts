/**
 * Keeps `npm run lint` an honest gate.
 *
 * Until the hardening pass, @types/react was not installed: `React.FC` resolved to `any`,
 * component props were unchecked, and `tsc --noEmit` passed while 25 components read
 * properties that do not exist (one of them crashed a tab at runtime). These tests fail
 * if the type packages disappear or the compiler is told to stop checking.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const packageJson = JSON.parse(readFileSync(path.join(root, 'package.json'), 'utf8'));

test('React type packages are declared and installed', () => {
  for (const name of ['@types/react', '@types/react-dom']) {
    assert.ok(packageJson.devDependencies?.[name], `${name} must be a devDependency`);
    assert.ok(existsSync(path.join(root, 'node_modules', name, 'index.d.ts')), `${name} is not installed`);
  }
});

test('the lint script still runs the full type check', () => {
  assert.equal(packageJson.scripts.lint, 'tsc --noEmit');
});

test('no source file opts out of type checking', () => {
  const offenders: string[] = [];
  const walk = (dir: string): string[] => {
    const abs = path.join(root, dir);
    if (!existsSync(abs)) return [];
    return readdirSync(abs, { withFileTypes: true }).flatMap((entry) =>
      entry.isDirectory() ? walk(`${dir}/${entry.name}`) : [`${dir}/${entry.name}`]
    );
  };
  for (const file of [...walk('src'), ...walk('server')].filter((f) => /\.(ts|tsx)$/.test(f))) {
    const text = readFileSync(path.join(root, file), 'utf8');
    if (/@ts-nocheck/.test(text)) offenders.push(file);
  }
  assert.deepEqual(offenders, []);
});
