import type { Page } from '@playwright/test';

interface StorybookIndex {
  entries?: Record<string, { id: string; type?: string }>;
}

/**
 * Opens a story in the preview iframe and waits until it has rendered.
 * Throws an explicit error if `storyId` is not listed in `index.json`
 * (otherwise Storybook would render a "story not found" page and tests would pass).
 */
export async function gotoStory(page: Page, storyId: string): Promise<void> {
  const res = await page.request.get('/index.json');
  if (!res.ok()) {
    throw new Error(`gotoStory: cannot read /index.json (HTTP ${res.status()})`);
  }
  const index = (await res.json()) as StorybookIndex;
  const entry = index.entries?.[storyId];
  if (!entry || entry.type === 'docs') {
    const known = Object.values(index.entries ?? {})
      .filter((e) => e.type !== 'docs')
      .map((e) => e.id);
    throw new Error(
      `gotoStory: story "${storyId}" not found in index.json. Known stories: ${known.join(', ') || '(none)'}`,
    );
  }

  await page.goto(`/iframe.html?id=${encodeURIComponent(storyId)}&viewMode=story`);
  await page.waitForSelector('body.sb-show-main, body.sb-show-errordisplay', { state: 'attached' });
  if ((await page.locator('body.sb-show-errordisplay').count()) > 0) {
    throw new Error(
      `gotoStory: story "${storyId}" failed to render: ${(await page.locator('#error-message').textContent()) ?? ''}`,
    );
  }
  await page.waitForFunction(() => {
    const root = document.querySelector('#storybook-root');
    return !!root && root.childElementCount > 0;
  });
}
