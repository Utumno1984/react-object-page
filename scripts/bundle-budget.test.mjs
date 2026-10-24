import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { buildBaseline, compareBudget, limitFor, runCheck, runUpdate } from './bundle-budget.mjs';

describe('compareBudget', () => {
  const budget = { exports: { a: { baseline: 100, limit: 120 } } };

  it('passes within the limit', () => {
    const r = compareBudget({ a: 110 }, budget);
    expect(r.ok).toBe(true);
    expect(r.lines[0]).toContain('delta +10 B');
  });

  it('passes at exactly the limit', () => {
    expect(compareBudget({ a: 120 }, budget).ok).toBe(true);
  });

  it('fails over the limit reporting import, measured, baseline and delta', () => {
    const r = compareBudget({ a: 121 }, budget);
    expect(r.ok).toBe(false);
    expect(r.errors[0]).toContain('a:');
    expect(r.errors[0]).toContain('measured 121 B');
    expect(r.errors[0]).toContain('baseline 100 B');
    expect(r.errors[0]).toContain('delta +21 B');
  });

  it('fails for a public export missing from the baseline', () => {
    const r = compareBudget({ a: 100, b: 5 }, budget);
    expect(r.ok).toBe(false);
    expect(r.errors.join('\n')).toMatch(/b: public export without a budget/);
  });

  it('fails for an orphan baseline entry', () => {
    const r = compareBudget({}, budget);
    expect(r.ok).toBe(false);
    expect(r.errors[0]).toMatch(/a: orphan budget entry/);
  });

  it('passes on a negative delta and reports it', () => {
    const r = compareBudget({ a: 80 }, budget);
    expect(r.ok).toBe(true);
    expect(r.lines[0]).toContain('delta -20 B');
    expect(r.lines[0]).toContain('lighter than baseline');
  });

  it('treats a missing exports map as empty (every export is then unbudgeted)', () => {
    expect(compareBudget({ a: 1 }, {}).ok).toBe(false);
  });
});

describe('limitFor / buildBaseline', () => {
  it('gives headroom above the measured size', () => {
    expect(limitFor(1000)).toBe(1100);
    expect(limitFor(10)).toBe(30);
    expect(buildBaseline({ x: 100 }).exports.x).toEqual({ baseline: 100, limit: 120 });
  });
});

describe('CLI on a fixture package', () => {
  let dir;
  let budgetPath;
  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'budget-'));
    mkdirSync(join(dir, 'dist'));
    writeFileSync(
      join(dir, 'dist/index.js'),
      `export const small = () => 1;\nexport const big = () => "${'x'.repeat(200)}".split("").reverse().join("");\n`,
    );
    budgetPath = join(dir, 'bundle-budget.json');
  });
  afterEach(() => rmSync(dir, { recursive: true, force: true }));

  it('measures per import (tree-shaken): small is lighter than big', async () => {
    await runUpdate({ packageDir: dir });
    const { exports } = JSON.parse(readFileSync(budgetPath, 'utf8'));
    expect(Object.keys(exports)).toEqual(['big', 'small']);
    expect(exports.small.baseline).toBeLessThan(exports.big.baseline);
  });

  it('check passes and never rewrites the baseline file, even when lighter than baseline', async () => {
    await runUpdate({ packageDir: dir });
    const stale = JSON.parse(readFileSync(budgetPath, 'utf8'));
    stale.exports.big.baseline += 500;
    stale.exports.big.limit += 500;
    writeFileSync(budgetPath, `${JSON.stringify(stale, null, 2)}\n`);
    const before = readFileSync(budgetPath);
    const result = await runCheck({ packageDir: dir });
    expect(result.ok).toBe(true);
    expect(readFileSync(budgetPath).equals(before)).toBe(true);
  });

  it('check does not create the baseline when missing, and fails', async () => {
    const result = await runCheck({ packageDir: dir });
    expect(result.ok).toBe(false);
    expect(() => readFileSync(budgetPath)).toThrow();
  });

  it('check fails when a new export is not in the baseline, and leaves the file untouched', async () => {
    await runUpdate({ packageDir: dir });
    const before = readFileSync(budgetPath);
    writeFileSync(
      join(dir, 'dist/index.js'),
      `${readFileSync(join(dir, 'dist/index.js'), 'utf8')}export const added = 1;\n`,
    );
    const result = await runCheck({ packageDir: dir });
    expect(result.ok).toBe(false);
    expect(result.errors[0]).toContain('added');
    expect(readFileSync(budgetPath).equals(before)).toBe(true);
  });

  it('check fails on an orphan entry when an export disappears from dist', async () => {
    await runUpdate({ packageDir: dir });
    writeFileSync(join(dir, 'dist/index.js'), 'export const small = () => 1;\n');
    const result = await runCheck({ packageDir: dir });
    expect(result.ok).toBe(false);
    expect(result.errors[0]).toMatch(/big: orphan/);
  });

  it('check fails when dist is missing', async () => {
    await runUpdate({ packageDir: dir });
    rmSync(join(dir, 'dist'), { recursive: true });
    await expect(runCheck({ packageDir: dir })).rejects.toThrow(/npm run build/);
  });
});
