import { expect, test } from '@playwright/test';
import { expectPlayToPass } from './helpers/story';

const STORY = 'data-truncatedtext--playground';

test.describe('TruncatedText QA', () => {
  test('a horizontal scroll of an ancestor closes the open tooltip', async ({ page }) => {
    await expectPlayToPass(page, STORY, 'width:120');
    const container = page.getByTestId('container');
    await container.evaluate((el) => {
      const h = el as HTMLElement;
      h.style.overflowX = 'scroll';
      const wide = document.createElement('div');
      wide.style.cssText = 'width:2000px;height:1px';
      h.appendChild(wide);
    });
    await page.getByTestId('text').hover();
    await expect(page.getByRole('tooltip')).toBeVisible({ timeout: 3000 });
    await container.evaluate((el) => {
      el.scrollLeft = 40;
    });
    await expect(page.getByRole('tooltip')).toHaveCount(0);
  });

  test('moving the pointer away closes the tooltip and no aria-describedby is left', async ({ page }) => {
    await expectPlayToPass(page, STORY, 'width:120');
    const text = page.getByTestId('text');
    await text.hover();
    await expect(page.getByRole('tooltip')).toBeVisible({ timeout: 3000 });
    await expect(text).not.toHaveAttribute('aria-describedby');
    await page.mouse.move(600, 600, { steps: 8 });
    await expect(page.getByRole('tooltip')).toHaveCount(0, { timeout: 4000 });
    await expect(text).not.toHaveAttribute('aria-describedby');
  });

  test('full text stays in the DOM and is not aria-hidden', async ({ page }) => {
    await expectPlayToPass(page, STORY, 'width:120');
    const text = page.getByTestId('text');
    const full = await text.evaluate((el) => el.textContent);
    expect(full!.length).toBeGreaterThan(40);
    expect(await text.evaluate((el) => el.getAttribute('aria-hidden'))).toBeNull();
  });
});
