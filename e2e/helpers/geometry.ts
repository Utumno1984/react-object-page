import type { Locator } from '@playwright/test';

/** Sub-pixel tolerance (layout rounding) for rect comparisons, in CSS px. */
const EPS = 1;

/**
 * Fails if, inside the container (itself included) plus the PAGE (`document.scrollingElement`),
 * more than one element has scrollable content on the same axis (default: vertical). Nested
 * scrollers ("double scroll") are a layout bug a functional test cannot see. The page counts
 * because html/body have a computed `overflow` of `visible` even when the viewport scrolls.
 */
export async function expectSingleScroller(
  container: Locator,
  axis: 'x' | 'y' = 'y',
): Promise<void> {
  const scrollers = await container.evaluate(
    (root, { axis, eps }) => {
      const found: string[] = [];
      const page = document.scrollingElement;
      const candidates = new Set<Element>([root, ...Array.from(root.querySelectorAll('*'))]);
      if (page) candidates.add(page);
      for (const el of candidates) {
        const cs = getComputedStyle(el);
        const overflow = axis === 'y' ? cs.overflowY : cs.overflowX;
        // The page scrolls with overflow `visible` too; only hidden/clip stop the user scrolling it.
        // The viewport takes its overflow from <html>, or from <body> when <html> is `visible`, so
        // a scroll-locked body (Dialog open: Radix / react-remove-scroll) does not count as a scroller.
        const viewportOverflow =
          overflow === 'visible'
            ? axis === 'y'
              ? getComputedStyle(document.body).overflowY
              : getComputedStyle(document.body).overflowX
            : overflow;
        const scrolls =
          el === page
            ? viewportOverflow !== 'hidden' && viewportOverflow !== 'clip'
            : overflow === 'auto' || overflow === 'scroll';
        if (!scrolls) continue;
        const scrollable =
          axis === 'y'
            ? el.scrollHeight - el.clientHeight > eps
            : el.scrollWidth - el.clientWidth > eps;
        if (!scrollable) continue;
        const testId = el.getAttribute('data-testid');
        found.push(
          el === page ? 'page' : `${el.tagName.toLowerCase()}${testId ? `[data-testid=${testId}]` : ''}`,
        );
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
 * any descendant sticks out of the container's own rect (left or right), with these deliberate
 * exceptions (patterns a real List Report uses on purpose):
 * - the part of a descendant clipped by an intermediate ancestor does not count when that
 *   ancestor really clips: `overflow-x` hidden/clip (ellipsis-truncated cell), or auto/scroll on
 *   an ancestor that does NOT also scroll vertically (an intentional horizontal scroll wrapper).
 *   A panel with overflow-y:auto has a computed overflow-x of `auto` too, but if it scrolls
 *   vertically a too-wide row inside it is a real, unwanted horizontal overflow. (Computed style
 *   cannot tell a vertical panel with no vertical overflow from a horizontal wrapper.)
 *   Clipping follows CSS containing blocks: an `absolute` box is clipped by its containing block
 *   (first positioned ancestor) and the ancestors above it, NOT by the static ones in between;
 * - a descendant lying entirely off the left edge of the PAGE (e.g. `left: -9999px` hidden text)
 *   does not count: it is off-screen on purpose and cannot cause a scrollbar (LTR). A box that is
 *   merely left of its container but still on screen does count.
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
      let left = b.left;
      let right = b.right;
      const position = getComputedStyle(el).position;
      if (position !== 'fixed') {
        // An absolutely positioned box is not clipped by the ancestors between it and its
        // containing block (first positioned ancestor); the containing block and everything above
        // it clip. If the containing block is the root or above, nothing below the root clips it.
        let reachedContainingBlock = position !== 'absolute';
        for (let p = el.parentElement; p && p !== root; p = p.parentElement) {
          const pcs = getComputedStyle(p);
          if (!reachedContainingBlock) {
            const establishes =
              pcs.position !== 'static' ||
              pcs.transform !== 'none' ||
              pcs.perspective !== 'none' ||
              pcs.filter !== 'none' ||
              /paint|layout|strict|content/.test(pcs.contain);
            if (!establishes) continue;
            reachedContainingBlock = true;
          }
          const clips =
            pcs.overflowX === 'hidden' ||
            pcs.overflowX === 'clip' ||
            ((pcs.overflowX === 'auto' || pcs.overflowX === 'scroll') &&
              p.scrollHeight - p.clientHeight <= eps);
          if (clips) {
            const pr = p.getBoundingClientRect();
            left = Math.max(left, pr.left + parseFloat(pcs.borderLeftWidth));
            right = Math.min(right, pr.right - parseFloat(pcs.borderRightWidth));
          }
        }
      }
      if (right <= left) continue; // fully clipped away
      if (right <= 0) continue; // entirely off the left edge of the page, on purpose
      if (right > r.right + eps || left < r.left - eps) {
        const testId = el.getAttribute('data-testid');
        out.push(
          `${el.tagName.toLowerCase()}${testId ? `[data-testid=${testId}]` : ''} spans ${left.toFixed(1)}..${right.toFixed(1)} but container spans ${r.left.toFixed(1)}..${r.right.toFixed(1)}`,
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
 * Focuses the element as a keyboard user would and fails if (a) the focused state shows no
 * VISIBLE focus indicator that differs from the unfocused state (a permanent outline/shadow, or
 * one with a fully transparent colour such as Tailwind's `outline: 2px solid transparent`, is
 * not an indicator) or (b) the indicator is clipped by an ancestor whose overflow is not
 * `visible` (hidden/clip/auto/scroll). Transitions/animations on the element are disabled while
 * measuring, so a CSS transition cannot make the measured style depend on timing.
 */
export async function expectFocusRingVisible(target: Locator): Promise<void> {
  const page = target.page();
  // No transition may be in flight when the style is read (it would give interpolated values).
  await target.evaluate((el) => {
    const s = (el as HTMLElement).style;
    el.setAttribute('data-geo-prev-style', s.cssText);
    s.setProperty('transition', 'none', 'important');
    s.setProperty('animation', 'none', 'important');
  });
  // A keyboard event first, so that :focus-visible heuristics treat the focus as keyboard-driven.
  await page.keyboard.press('Shift');
  await target.focus();
  const result = await target.evaluate((el) => {
    if (!el.matches(':focus-visible')) return { error: 'element is not :focus-visible after focus()' };

    const COLOR = /(?:rgba?|hsla?|color)\([^)]*\)/;
    // Alpha of a computed colour; anything unparsable counts as opaque.
    const alphaOf = (color: string): number => {
      if (color === 'transparent') return 0;
      const m = color.match(COLOR);
      if (!m) return 1;
      const inner = m[0].slice(m[0].indexOf('(') + 1, -1);
      const alpha = inner.includes('/') ? inner.split('/')[1] : inner.split(',')[3];
      return alpha === undefined ? 1 : parseFloat(alpha) || 0;
    };
    const measure = () => {
      const cs = getComputedStyle(el);
      let ext = 0;
      let visible = false;
      if (
        cs.outlineStyle !== 'none' &&
        parseFloat(cs.outlineWidth) > 0 &&
        alphaOf(cs.outlineColor) > 0
      ) {
        visible = true;
        ext = Math.max(ext, parseFloat(cs.outlineWidth) + (parseFloat(cs.outlineOffset) || 0));
      }
      // Computed box-shadow: "rgb(..) 1px 2px 3px 4px [inset], ..." (commas inside parens ignored).
      const shadows = cs.boxShadow === 'none' ? [] : cs.boxShadow.split(/,(?![^(]*\))/);
      for (const sh of shadows) {
        if (/\binset\b/.test(sh)) continue;
        if (alphaOf(sh) <= 0) continue;
        const nums = (sh.replace(new RegExp(COLOR, 'g'), '').match(/-?[\d.]+px/g) ?? []).map(parseFloat);
        const [x = 0, y = 0, blur = 0, spread = 0] = nums;
        visible = true;
        ext = Math.max(ext, spread + blur + Math.max(Math.abs(x), Math.abs(y)));
      }
      const signature = [
        cs.outlineStyle,
        cs.outlineWidth,
        cs.outlineColor,
        cs.outlineOffset,
        cs.boxShadow,
      ].join('|');
      return { ext: Math.max(ext, 0), visible, signature };
    };

    const focused = measure();
    (el as HTMLElement).blur();
    const unfocused = measure();
    (el as HTMLElement).focus();

    if (!focused.visible) {
      return { error: 'element shows no focus indicator (no visible outline or box-shadow when focused)' };
    }
    if (focused.signature === unfocused.signature) {
      return {
        error:
          'element shows no focus indicator: its outline/box-shadow is the same with and without focus',
      };
    }
    const ext = focused.ext;

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
  await target.evaluate((el) => {
    (el as HTMLElement).style.cssText = el.getAttribute('data-geo-prev-style') ?? '';
    el.removeAttribute('data-geo-prev-style');
  });
  if (result.error) throw new Error(`expectFocusRingVisible: ${result.error}`);
}
