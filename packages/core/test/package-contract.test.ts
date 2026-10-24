// @vitest-environment node
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { collectDeclaredPaths, findMissingPaths } from './helpers/package-paths';

const packageDir = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const distDir = join(packageDir, 'dist');
const pkg = JSON.parse(readFileSync(join(packageDir, 'package.json'), 'utf8')) as {
  [key: string]: unknown;
};

describe('package.json contract (requires a prior `npm run build`)', () => {
  it('every path in main/module/types/exports exists in dist', () => {
    const declared = collectDeclaredPaths(pkg);
    expect(declared.length).toBeGreaterThan(0);
    expect(findMissingPaths(pkg, packageDir)).toEqual([]);
  });

  it('dist has an ESM entry, a CJS entry and type declarations', () => {
    const files = readdirSync(distDir);
    expect(files).toContain('index.js');
    expect(files).toContain('index.cjs');
    expect(files).toContain('index.d.ts');
    expect(files).toContain('index.d.cts');
  });

  it('the path resolver detects an exports entry pointing to a file the build did not generate', () => {
    const broken = {
      ...pkg,
      exports: { '.': { import: './dist/does-not-exist.js', require: './dist/index.cjs' } },
    };
    expect(findMissingPaths(broken, packageDir)).toEqual(['./dist/does-not-exist.js']);
  });

  it('the path resolver detects a missing main/module/types file', () => {
    expect(findMissingPaths({ main: './dist/nope.cjs' }, packageDir)).toEqual(['./dist/nope.cjs']);
    expect(findMissingPaths({ module: './dist/nope.js' }, packageDir)).toEqual(['./dist/nope.js']);
    expect(findMissingPaths({ types: './dist/nope.d.ts' }, packageDir)).toEqual([
      './dist/nope.d.ts',
    ]);
  });

  it('declares react and react-dom as peerDependencies with the right range, not dependencies', () => {
    const peers = pkg.peerDependencies as Record<string, string>;
    expect(peers.react).toBe('^18.0.0 || ^19.0.0');
    expect(peers['react-dom']).toBe('^18.0.0 || ^19.0.0');
    const deps = (pkg.dependencies ?? {}) as Record<string, string>;
    expect(deps).not.toHaveProperty('react');
    expect(deps).not.toHaveProperty('react-dom');
  });

  it('declares sideEffects', () => {
    expect(pkg.sideEffects).toBe(false);
  });

  it('does not bundle React sources into dist', () => {
    const bundled = readdirSync(distDir)
      .filter((f) => /\.(js|cjs)$/.test(f))
      .map((f) => readFileSync(join(distDir, f), 'utf8'))
      .join('\n');
    expect(bundled.length).toBeGreaterThan(0);
    expect(bundled).not.toMatch(
      /__SECRET_INTERNALS_DO_NOT_USE|react\.production|ReactCurrentOwner|react-dom\.production/,
    );
  });
});
