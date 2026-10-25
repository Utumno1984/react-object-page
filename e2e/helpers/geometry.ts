import type { Locator } from '@playwright/test';

/** Sub-pixel tolerance (layout rounding) for rect comparisons, in CSS px. */
const EPS = 1;

/**
 * Fails if, inside the container (itself included), more than one element has scrollable
 * content on the same axis (default: vertical). Nested scrollers ("double scroll") are a
 * layout bug a functional test cannot see.
 */
export async function expectSingleScroller(
  container: Locator,
  axis: 'x' | 'y' = 'y',
): Promise<void> {
  const scrollers = await container.evaluate(
    (root, { axis, eps }) => {
      const found: string[] = [];
      for (const el of [root, ...Array.from(root.querySelectorAll('*'))]) {
        const cs = getComputedStyle(el);
        const overflow = axis === 'y' ? cs.overflowY : cs.overflowX;
        if (overflow !== 'auto' && overflow !== 'scroll') continue;
        const scrollable =
          axis === 'y'
            ? el.scrollHeight - el.clientHeight > eps
            : el.scrollWidth - el.clientWidth > eps;
        if (!scrollable) continue;
        const testId = el.getAttribute('data-testid');
        found.push(`${el.tagName.toLowerCase()}${testId ? `[data-testid=${testId}]` : ''}`);
      }
      return found;
    },
    { axis, eps: EPS },
  );
  if (scrollers.length > 1) {
    throw new Error(
      `expectSingleScroller: ${scrollers.length} elements scroll on the ${axis} axis (${scrollers.join(', ')}), expected at most 1`,
    );
  }
}

/**
 * Fails if the container has horizontally scrollable content (scrollWidth > clientWidth) or if
 * any descendant's bounding rect goes beyond the container's own rect (left or right).
 */
export async function expectNoHorizontalOverflow(container: Locator): Promise<void> {
  const problems = await container.evaluate((root, eps) => {
    const out: string[] = [];
    if (root.scrollWidth - root.clientWidth > eps) {
      out.push(`container scrollWidth ${root.scrollWidth} > clientWidth ${root.clientWidth}`);
    }
    const r = root.getBoundingClientRect();
    for (const el of Array.from(root.querySelectorAll('*'))) {
      if (el.getClientRects().length === 0) continue; // display: none
      const b = el.getBoundingClientRect();
      if (b.width === 0 && b.height === 0) continue;
      if (b.right > r.right + eps || b.left < r.left - eps) {
        const testId = el.getAttribute('data-testid');
        out.push(
          `${el.tagName.toLowerCase()}${testId ? `[data-testid=${testId}]` : ''} spans ${b.left.toFixed(1)}..${b.right.toFixed(1)} but container spans ${r.left.toFixed(1)}..${r.right.toFixed(1)}`,
        );
      }
    }
    return out;
  }, EPS);
  if (problems.length > 0) {
    throw new Error(`expectNoHorizontalOverflow: ${problems.join('; ')}`);
  }
}

/**
 * Focuses the element as a keyboard user would and fails if (a) it shows no focus indicator
 * (outline or non-inset box-shadow) or (b) the indicator is clipped by an ancestor whose
 * overflow is not `visible` (hidden/clip/auto/scroll).
 */
export async function expectFocusRingVisible(target: Locator): Promise<void> {
  const page = target.page();
  // A keyboard event first, so that :focus-visible heuristics treat the focus as keyboard-driven.
  await page.keyboard.press('Shift');
  await target.focus();
  const result = await target.evaluate((el) => {
    if (!el.matches(':focus-visible')) return { error: 'element is not :focus-visible after focus()' };
    const cs = getComputedStyle(el);

    // Extent of the indicator beyond the border box, per side.
    let ext = 0;
    if (cs.outlineStyle !== 'none' && parseFloat(cs.outlineWidth) > 0) {
      ext = Math.max(ext, parseFloat(cs.outlineWidth) + (parseFloat(cs.outlineOffset) || 0));
    }
    // Computed box-shadow: "rgb(..) 1px 2px 3px 4px [inset], ..." (commas inside parens ignored).
    const shadows = cs.boxShadow === 'none' ? [] : cs.boxShadow.split(/,(?![^(]*\))/);
    for (const s of shadows) {
      if (/\binset\b/.test(s)) continue;
      const nums = (s.replace(/rgba?\([^)]*\)/g, '').match(/-?[\d.]+px/g) ?? []).map(parseFloat);
      const [x = 0, y = 0, blur = 0, spread = 0] = nums;
      ext = Math.max(ext, spread + blur + Math.max(Math.abs(x), Math.abs(y)));
    }
    if (ext <= 0) return { error: 'element shows no focus indicator (no outline, no box-shadow)' };

    const b = el.getBoundingClientRect();
    const ring = { l: b.left - ext, t: b.top - ext, r: b.right + ext, b: b.bottom + ext };
    for (let p = el.parentElement; p; p = p.parentElement) {
      const pcs = getComputedStyle(p);
      if (pcs.overflowX === 'visible' && pcs.overflowY === 'visible') continue;
      const pr = p.getBoundingClientRect();
      // Clip region = padding box (inside the border).
      const clip = {
        l: pr.left + parseFloat(pcs.borderLeftWidth),
        t: pr.top + parseFloat(pcs.borderTopWidth),
        r: pr.right - parseFloat(pcs.borderRightWidth),
        b: pr.bottom - parseFloat(pcs.borderBottomWidth),
      };
      const clipX = pcs.overflowX !== 'visible';
      const clipY = pcs.overflowY !== 'visible';
      const cut =
        (clipX && (ring.l < clip.l - 0.5 || ring.r > clip.r + 0.5)) ||
        (clipY && (ring.t < clip.t - 0.5 || ring.b > clip.b + 0.5));
      if (cut) {
        const testId = p.getAttribute('data-testid');
        return {
          error: `focus indicator (${ext}px) is clipped by ancestor ${p.tagName.toLowerCase()}${testId ? `[data-testid=${testId}]` : ''} (overflow ${pcs.overflowX}/${pcs.overflowY})`,
        };
      }
    }
    return { error: null };
  });
  if (result.error) throw new Error(`expectFocusRingVisible: ${result.error}`);
}
