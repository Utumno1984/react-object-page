import { expect, test } from '@playwright/test';
import { expectPlayToPass, gotoStory } from './helpers/story';

const OVERVIEW = 'primitives-statusbadge--overview';
const PLAYGROUND = 'primitives-statusbadge--playground';
const EPS = 1;

const LONGWORD = 'Archiviato_in_attesa_di_approvazione_da_parte_del_responsabile_di_reparto';

test.describe('Primitives/StatusBadge (QA, extra cases)', () => {
  test('80px container with a long text: ellipsis, no horizontal overflow, whole text in the DOM', async ({ page }) => {
    await expectPlayToPass(page, PLAYGROUND, `children:${LONGWORD}`);
    // the play function leaves 100px; go down to 80px like the width control would
    await page.getByTestId('container').evaluate((c) => {
      c.style.width = '80px';
    });
    const m = await page.getByTestId('badge').evaluate((el) => {
      const c = document.querySelector('[data-testid="container"]') as HTMLElement;
      const label = el.lastElementChild as HTMLElement;
      return {
        badge: el.getBoundingClientRect().width,
        cont: c.getBoundingClientRect().width,
        h: el.getBoundingClientRect().height,
        clipped: label.scrollWidth > label.clientWidth,
        text: el.textContent,
        docOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
      };
    });
    expect(m.cont).toBe(80);
    expect(m.badge).toBeLessThanOrEqual(80 + EPS);
    expect(m.h).toBeLessThanOrEqual(20 + EPS);
    expect(m.clipped).toBe(true);
    expect(m.text).toContain('Archiviato in attesa');
    expect(m.docOverflow).toBe(false);
  });

  test('text changed after mount: width follows, height stays one line, no live region appears', async ({ page }) => {
    await gotoStory(page, OVERVIEW);
    const m = await page.getByTestId('line-badge').evaluate(async (el) => {
      const label = el.lastElementChild as HTMLElement;
      const before = el.getBoundingClientRect();
      label.textContent = 'Archiviato definitivamente';
      await new Promise((r) => requestAnimationFrame(() => r(null)));
      const after = el.getBoundingClientRect();
      return {
        wBefore: before.width,
        wAfter: after.width,
        hBefore: before.height,
        hAfter: after.height,
        live: document.querySelectorAll('[aria-live],[role=status],[role=alert]').length,
      };
    });
    expect(m.wAfter).toBeGreaterThan(m.wBefore);
    expect(Math.abs(m.hAfter - m.hBefore)).toBeLessThanOrEqual(EPS);
    expect(m.live).toBe(0);
  });

  test('a badge WITH an icon in a body text line is not taller than the line and does not lengthen it', async ({ page }) => {
    await gotoStory(page, OVERVIEW);
    const m = await page.evaluate(() => {
      const line = document.querySelector('[data-testid="line-with-badge"]') as HTMLElement;
      const plain = document.querySelector('[data-testid="line-plain"]') as HTMLElement;
      const plainH = plain.getBoundingClientRect().height;
      const old = line.querySelector('[data-testid="line-badge"]') as HTMLElement;
      const withIcon = document.querySelector('[data-testid="tone-icon-warning"]')!.cloneNode(true) as HTMLElement;
      old.replaceWith(withIcon);
      return { badge: withIcon.getBoundingClientRect().height, line: line.getBoundingClientRect().height, plainH };
    });
    expect(m.badge).toBeLessThanOrEqual(20 + EPS);
    expect(Math.abs(m.line - m.plainH)).toBeLessThanOrEqual(EPS);
  });

  test('in a flex row with fixed siblings the badge shrinks (ellipsis) instead of overflowing or overlapping', async ({ page }) => {
    await gotoStory(page, OVERVIEW);
    const m = await page.evaluate(() => {
      const root = document.querySelector('#storybook-static-qa') ?? document.querySelector('#storybook-root')!;
      const flex = document.createElement('div');
      flex.style.cssText = 'display:flex;gap:8px;width:200px;align-items:center';
      flex.innerHTML = '<span id="a" style="flex:none;width:60px;height:10px;background:#ccc"></span>';
      const badge = document.querySelector('[data-testid="narrow-badge"]')!.cloneNode(true) as HTMLElement;
      const b = document.createElement('span');
      b.id = 'b';
      b.style.cssText = 'flex:none;width:40px;height:10px;background:#ccc';
      flex.append(badge, b);
      // put the sibling before and after the badge
      flex.insertBefore(document.createElement('span'), badge).id = 'z';
      root.appendChild(flex);
      const A = document.getElementById('a')!.getBoundingClientRect();
      const B = document.getElementById('b')!.getBoundingClientRect();
      const r = badge.getBoundingClientRect();
      const out = { aRight: A.right, bLeft: B.left, bl: r.left, br: r.right, fr: flex.getBoundingClientRect().right, bw: r.width };
      flex.remove();
      return out;
    });
    expect(m.bl).toBeGreaterThanOrEqual(m.aRight - EPS);
    expect(m.br).toBeLessThanOrEqual(m.bLeft + EPS);
    expect(m.br).toBeLessThanOrEqual(m.fr + EPS);
  });

  test('zoom 200%: the badge stays inside a narrow container and does not overlap the following text', async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 700 });
    await gotoStory(page, OVERVIEW);
    await page.evaluate(() => {
      (document.body.style as CSSStyleDeclaration & { zoom: string }).zoom = '2';
    });
    const m = await page.evaluate(() => {
      const badge = document.querySelector('[data-testid="line-badge"]') as HTMLElement;
      const narrow = document.querySelector('[data-testid="narrow-badge"]') as HTMLElement;
      const nc = document.querySelector('[data-testid="narrow"]') as HTMLElement;
      const br = badge.getBoundingClientRect();
      const range = document.createRange();
      const next = badge.nextSibling as Text; // " da Mario Rossi."
      range.selectNodeContents(next);
      const rects = Array.from(range.getClientRects());
      const nr = narrow.getBoundingClientRect();
      const cr = nc.getBoundingClientRect();
      return {
        // the text after the badge starts at or after the badge's right edge, or on a later line
        overlap: rects.some((r) => r.top < br.bottom - 1 && r.bottom > br.top + 1 && r.left < br.right - 1 && r.right > br.left + 1),
        narrowInside: nr.right <= cr.right + 1,
        narrowH: nr.height / 2,
      };
    });
    expect(m.overlap).toBe(false);
    expect(m.narrowInside).toBe(true);
    expect(m.narrowH).toBeLessThanOrEqual(20 + EPS);
  });

  test('table-layout:fixed with an 80px column and a long badge: column width unchanged, no cell overflow', async ({ page }) => {
    await gotoStory(page, OVERVIEW);
    const m = await page.evaluate(() => {
      const root = document.querySelector('#storybook-root')!;
      const table = document.createElement('table');
      table.style.cssText = 'table-layout:fixed;width:200px;border-collapse:collapse';
      table.innerHTML =
        '<colgroup><col style="width:80px"><col></colgroup><tr><td id="c1" style="padding:0"></td><td>x</td></tr>';
      root.appendChild(table);
      const badge = document.querySelector('[data-testid="narrow-badge"]')!.cloneNode(true) as HTMLElement;
      document.getElementById('c1')!.appendChild(badge);
      const out = {
        cell: document.getElementById('c1')!.getBoundingClientRect().width,
        badge: badge.getBoundingClientRect().width,
        table: table.getBoundingClientRect().width,
      };
      table.remove();
      return out;
    });
    expect(m.cell).toBe(80);
    expect(m.table).toBe(200);
    expect(m.badge).toBeLessThanOrEqual(80 + EPS);
  });

  test('a consumer className adding padding on the root (content-box) breaks the max-width: documented limitation', async ({ page }) => {
    // Informational: measures what happens when `className="px-4"`-like padding lands on the root.
    await gotoStory(page, OVERVIEW);
    const m = await page.evaluate(() => {
      const holder = document.createElement('div');
      holder.style.cssText = 'width:120px';
      const badge = document.querySelector('[data-testid="narrow-badge"]')!.cloneNode(true) as HTMLElement;
      badge.style.paddingLeft = '16px';
      badge.style.paddingRight = '16px';
      holder.appendChild(badge);
      document.querySelector('#storybook-root')!.appendChild(holder);
      const w = badge.getBoundingClientRect().width;
      holder.remove();
      return w;
    });
    // eslint-disable-next-line no-console
    console.log(`badge width with 16px padding on the root in a 120px container: ${m}px`);
    expect(m).toBeGreaterThan(0);
  });
});
