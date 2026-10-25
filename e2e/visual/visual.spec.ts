import { expect, test } from '@playwright/test';
import { gotoStory } from '../helpers/story';

// One test per story tagged `visual` in Storybook's index.json, generated at load time:
// nothing is listed by hand and an untagged story is never photographed.
//
// Per-story options (as additional tags):
//   visual-full-page  capture the full scrollable page instead of the viewport.
// By default the screenshot is of the PAGE VIEWPORT (not just #storybook-root), so portals
// (Dialog, Popover, Select...) rendered on document.body are part of the picture.

interface IndexEntry {
  id: string;
  type?: string;
  tags?: string[];
}

async function loadIndex(baseURL: string): Promise<Record<string, IndexEntry>> {
  let lastError: unknown;
  for (let attempt = 0; attempt < 30; attempt++) {
    try {
      const res = await fetch(`${baseURL}/index.json`);
      if (res.ok) return ((await res.json()) as { entries?: Record<string, IndexEntry> }).entries ?? {};
      lastError = new Error(`HTTP ${res.status}`);
    } catch (e) {
      lastError = e;
    }
    await new Promise((r) => setTimeout(r, 1_000));
  }
  throw new Error(`visual: cannot read ${baseURL}/index.json: ${String(lastError)}`);
}

const entries = await loadIndex('http://localhost:6007');
const visualStories = Object.values(entries).filter(
  (e) => e.type !== 'docs' && e.tags?.includes('visual'),
);

if (visualStories.length === 0) {
  throw new Error('visual: no story is tagged "visual" in index.json (the gate would pass vacuously)');
}

for (const story of visualStories) {
  test(`visual: ${story.id}`, async ({ page }) => {
    // gotoStory throws on render errors, so we never photograph Storybook's error page.
    await gotoStory(page, story.id);
    await page.addStyleTag({
      content: `*, *::before, *::after { animation: none !important; transition: none !important; caret-color: transparent !important; }`,
    });
    await page.evaluate(() => document.fonts.ready);
    await expect(page).toHaveScreenshot(`${story.id}.png`, {
      fullPage: story.tags?.includes('visual-full-page') ?? false,
      animations: 'disabled',
      caret: 'hide',
      scale: 'css',
    });
  });
}
