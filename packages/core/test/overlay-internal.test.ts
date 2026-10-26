// @vitest-environment node
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import * as publicApi from '../src/index';

describe('overlay infrastructure is internal', () => {
  it('the public entry does not export it, nor reference its modules', () => {
    for (const name of ['overlayLayer', 'useReturnFocus', 'defineHidden']) {
      expect(Object.keys(publicApi)).not.toContain(name);
    }
    const entry = readFileSync(fileURLToPath(new URL('../src/index.ts', import.meta.url)), 'utf8');
    expect(entry).not.toMatch(/overlay|internal|define-hidden|return-focus/);
  });
});
