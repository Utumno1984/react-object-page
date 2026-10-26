// @vitest-environment node
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { parseTokenScale } from '../utils/token-scale';
import tokensCss from '../styles/tokens.css?raw';
import { overlayLayer } from './layers';

const srcDir = fileURLToPath(new URL('..', import.meta.url));

function sourceFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return sourceFiles(path);
    return /\.(ts|tsx)$/.test(entry.name) && !/\.test\.tsx?$/.test(entry.name) ? [path] : [];
  });
}

describe('overlayLayer', () => {
  it('maps every level onto an existing z-index token, in increasing order', () => {
    const tokens = parseTokenScale(tokensCss)['z-index'];
    const classes = Object.values(overlayLayer);
    expect(Object.keys(overlayLayer)).toEqual(['backdrop', 'modal', 'popover', 'tooltip']);
    for (const cls of classes) expect(tokens).toContain(cls.replace(/^z-/, ''));
    const indexes = classes.map((cls) => tokens.indexOf(cls.replace(/^z-/, '')));
    expect(indexes).toEqual([...indexes].sort((a, b) => a - b));
    expect(new Set(indexes).size).toBe(indexes.length);
  });

  it('no source of the package writes a literal z-index (z-[...] or a numeric zIndex)', () => {
    const offenders = sourceFiles(srcDir).flatMap((file) => {
      const text = readFileSync(file, 'utf8');
      return /z-\[|zIndex\s*:\s*-?\d/.test(text) ? [file.slice(srcDir.length)] : [];
    });
    expect(offenders).toEqual([]);
  });
});
