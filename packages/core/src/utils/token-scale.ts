/**
 * Reads the token names out of the CSS source (`src/styles/tokens.css`), the single source of
 * truth, so that nothing (cn() included) keeps a hand-written copy of the list that could drift.
 */
export type TokenGroup = 'color' | 'text' | 'font' | 'radius' | 'z-index';

export type TokenScale = Record<TokenGroup, string[]>;

// `--<group>-<namespace>-<name>:`; the namespace is one short word. Companion variables
// such as `--text-rop-body--line-height` are not tokens of their own and are skipped.
const TOKEN_RE = /--(color|text|font|radius|z-index)-([a-z]+)-([a-z0-9-]+)\s*:/g;

/**
 * Returns, per theme group, the names as they appear in utilities after the prefix
 * (e.g. `rop-modal` for `z-rop-modal`).
 */
export function parseTokenScale(css: string): TokenScale {
  const scale: TokenScale = { color: [], text: [], font: [], radius: [], 'z-index': [] };
  for (const match of css.replace(/\/\*[\s\S]*?\*\//g, '').matchAll(TOKEN_RE)) {
    const [, group, namespace, name] = match as unknown as [string, TokenGroup, string, string];
    if (name.includes('--')) continue;
    const key = `${namespace}-${name}`;
    if (!scale[group].includes(key)) scale[group].push(key);
  }
  return scale;
}
