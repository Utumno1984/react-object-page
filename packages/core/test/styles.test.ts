// @vitest-environment node
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { cn } from '../src/index';
import { customProperties, findGlobalLeaks, stripComments } from './helpers/css-analysis';

const packageDir = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const tokensCss = readFileSync(join(packageDir, 'src/styles/tokens.css'), 'utf8');
const themeCss = readFileSync(join(packageDir, 'dist/theme.css'), 'utf8');
const stylesCss = readFileSync(join(packageDir, 'dist/styles.css'), 'utf8');

const tokenVars = customProperties(tokensCss);
const tokenNames = [...tokenVars.keys()];
const namesOf = (group: string): string[] =>
  tokenNames
    .filter((n) => n.startsWith(`--${group}-`) && !n.includes('--', 2 + group.length))
    .map((n) => n.slice(`--${group}-`.length));

describe('design tokens (src/styles/tokens.css, built into dist/theme.css and dist/styles.css)', () => {
  it('theme.css is the token source as is', () => {
    expect(themeCss).toBe(tokensCss);
  });

  it('defines semantic colors, the typographic scale, sans + mono families, radii', () => {
    for (const color of ['text', 'surface', 'border', 'primary', 'info', 'success', 'warning', 'error']) {
      expect(tokenVars.has(`--color-rop-${color}`), `color ${color}`).toBe(true);
    }
    for (const size of ['caption', 'body', 'label', 'title-sm', 'title-md', 'title-lg']) {
      expect(tokenVars.has(`--text-rop-${size}`), `size ${size}`).toBe(true);
      expect(tokenVars.has(`--text-rop-${size}--line-height`), `line height ${size}`).toBe(true);
    }
    expect(tokenVars.has('--font-rop-sans')).toBe(true);
    expect(namesOf('radius').length).toBeGreaterThan(0);
  });

  it('the mono stack is a system stack ending with the generic `monospace`, no web font', () => {
    const mono = tokenVars.get('--font-rop-mono') ?? '';
    expect(mono.split(',').pop()?.trim()).toBe('monospace');
    expect(tokensCss).not.toMatch(/@font-face|url\(/);
    expect(stylesCss).not.toMatch(/@font-face|url\(/);
  });

  it('the z-index scale is strictly increasing: sticky < overlay < modal < popover < tooltip', () => {
    // Read from the generated CSS, not from the source.
    const generated = customProperties(stylesCss);
    const order = ['sticky', 'overlay', 'modal', 'popover', 'tooltip'];
    const values = order.map((name) => Number(generated.get(`--z-index-rop-${name}`)));
    expect(values.every((v) => Number.isInteger(v))).toBe(true);
    for (let i = 1; i < values.length; i += 1) {
      expect(values[i], `${order[i]} above ${order[i - 1]}`).toBeGreaterThan(values[i - 1] as number);
    }
  });

  it('every custom property lives in ONE namespace and none redefines a default Tailwind token', () => {
    const namespaces = new Set<string>();
    for (const name of customProperties(themeCss).keys()) {
      const match = /^--(color|text|font|radius|z-index)-([a-z]+)-/.exec(name);
      expect(match, `${name} is outside a <group>-<namespace>- prefix`).not.toBeNull();
      namespaces.add(match?.[2] as string);
    }
    expect([...namespaces]).toEqual(['rop']);
    // Default Tailwind tokens must not appear in the token file.
    expect(stripComments(tokensCss)).not.toMatch(
      /--spacing\s*:|--color-(red|blue|gray|green)-\d+|--breakpoint-|--tw-/,
    );
    // No bare `@import "tailwindcss"` and no preflight reference in the published token file.
    expect(themeCss).not.toMatch(/@import|preflight/i);
  });
});

describe('styles.css (compiled)', () => {
  it('has no preflight, no global element selector, and every rule inside @layer', () => {
    expect(findGlobalLeaks(stylesCss)).toEqual([]);
    expect(stylesCss).toMatch(/@layer utilities\s*\{/);
  });

  it('the leak checker does fail on a reset, a global selector or an un-layered rule', () => {
    expect(findGlobalLeaks('*, ::before, ::after { box-sizing: border-box; }').length).toBeGreaterThan(0);
    expect(findGlobalLeaks('@layer base { html { line-height: 1.5; } }')).toContain('global selector: html');
    expect(findGlobalLeaks('@layer base { body { margin: 0; } }')).toContain('global selector: body');
    expect(findGlobalLeaks('@layer base { button { color: red; } }')).toContain('global selector: button');
    expect(findGlobalLeaks('.px-2 { padding-inline: 1px; }')).toContain('rule outside @layer: .px-2');
    expect(findGlobalLeaks('@layer theme { :root { color: red; } }')).toContain(
      ':root declares something other than custom properties',
    );
    expect(findGlobalLeaks('@layer utilities { .px-2 { padding-inline: 1px; } }')).toEqual([]);
  });

  it('contains the utilities used by the sources (fixture) and the rop tokens as variables', () => {
    const fixture = readFileSync(join(packageDir, 'src/internal/style-fixture.ts'), 'utf8');
    expect(fixture).toContain('z-rop-popover');
    expect(stylesCss).toContain('.z-rop-popover');
    expect(stylesCss).toContain('.font-rop-mono');
    expect(stylesCss).toContain('.px-2');
    expect(stylesCss).toContain('--color-rop-primary');
  });

  it('does NOT contain utilities no source uses (no safelist)', () => {
    expect(stylesCss).not.toContain('skew-x-12');
    // A token that exists as a variable but has no utility in use.
    expect(stylesCss).not.toContain('.z-rop-tooltip');
    expect(stylesCss).not.toContain('.text-rop-title-lg');
  });

  it('is deterministic: two builds produce the same bytes as dist/styles.css', () => {
    const dirs = [mkdtempSync(join(tmpdir(), 'rop-css-a-')), mkdtempSync(join(tmpdir(), 'rop-css-b-'))];
    try {
      for (const dir of dirs) {
        execFileSync(process.execPath, [join(packageDir, 'scripts/build-css.mjs'), dir], {
          cwd: packageDir,
          stdio: 'pipe',
        });
      }
      const [a, b] = dirs.map((dir) => readFileSync(join(dir, 'styles.css')));
      expect(Buffer.compare(a as Buffer, b as Buffer)).toBe(0);
      expect(Buffer.compare(a as Buffer, readFileSync(join(packageDir, 'dist/styles.css')))).toBe(0);
    } finally {
      for (const dir of dirs) rmSync(dir, { recursive: true, force: true });
    }
  }, 30_000);
});

describe('cn() knows every token of the CSS source', () => {
  it('there are tokens to check (the derivation did not silently produce an empty list)', () => {
    expect(namesOf('z-index')).toHaveLength(5);
    expect(namesOf('text').length).toBeGreaterThanOrEqual(6);
  });

  it.each(namesOf('z-index'))('z-index token %s conflicts with an arbitrary z', (name) => {
    expect(cn(`z-${name}`, 'z-[1]')).toBe('z-[1]');
    expect(cn('z-[1]', `z-${name}`)).toBe(`z-${name}`);
  });

  it.each(namesOf('text'))('font-size token %s conflicts with another size, not with a color', (name) => {
    expect(cn(`text-${name}`, 'text-lg')).toBe('text-lg');
    expect(cn(`text-${name}`, 'text-rop-error')).toBe(`text-${name} text-rop-error`);
  });

  it.each(namesOf('font'))('font-family token %s conflicts with an arbitrary family', (name) => {
    expect(cn(`font-${name}`, 'font-[family-name:Georgia]')).toBe('font-[family-name:Georgia]');
  });

  it.each(namesOf('color'))('color token %s conflicts with an arbitrary color', (name) => {
    expect(cn(`bg-${name}`, 'bg-[#fff]')).toBe('bg-[#fff]');
    expect(cn(`text-${name}`, 'text-[#fff]')).toBe('text-[#fff]');
  });
});
