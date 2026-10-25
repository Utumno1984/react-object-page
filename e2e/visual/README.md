# Visual regression

Every Storybook story tagged `visual` is photographed by Playwright (`toHaveScreenshot`) at three
fixed viewports and compared with a baseline versioned in `e2e/visual/__screenshots__/`:

| Project         | Viewport   |
| --------------- | ---------- |
| `visual-mobile` | 375 x 667  |
| `visual-tablet` | 768 x 1024 |
| `visual-desktop`| 1280 x 800 |

Tests are generated from the static Storybook `index.json` (`visual.spec.ts`): to add a story to
the gate, tag it `tags: ['visual']`. Untagged stories are not photographed.

## Commands

```bash
npm run test:visual          # compare against the baselines (needs Docker)
npm run test:visual:update   # (re)generate baselines (needs Docker)
```

Both run inside the official Playwright image (`mcr.microsoft.com/playwright:v<version>-noble`,
version = the exact `@playwright/test` version), the same image used by the `visual` CI job:
baselines are only valid if generated and compared in the same environment. Without Docker the
scripts fail with an explicit message; they never fall back to the local browser.

A missing baseline is a **failure** (in CI and locally): baselines are created only by
`test:visual:update`, never implicitly.

## When a check fails

Failing screenshots produce `*-expected.png`, `*-actual.png` and `*-diff.png` in `test-results/`
(in CI: the `visual-diff` artifact of the workflow run). Open the diff image to see the area.

## Updating a baseline

1. Run `npm run test:visual:update` and look at the changed PNGs in `git diff`.
2. Commit them together with the change that caused them.
3. **Motivate it in the PR description.** Updating a baseline is a change of the expected value,
   so it follows the regression rule in `CLAUDE.md`: it is never done just to make the check pass.

If you bump `@playwright/test`, update the image tag in `.github/workflows/ci.yml` and regenerate
all baselines (a unit test fails if the pin, the lockfile and the CI image disagree).

## Per-story options and portals

By default the screenshot is of the **page viewport**, not just `#storybook-root`, so overlays
rendered in a portal on `document.body` (Dialog, Popover, Select...) are included. Extra tag:

- `visual-full-page`: capture the whole scrollable page instead of the viewport.

A story that throws or renders nothing fails the test with the render error (via `gotoStory`);
the Storybook error page is never photographed. Animations, transitions and the caret are
disabled and `document.fonts.ready` is awaited before each shot. Tolerance (10 pixels,
threshold 0.1) is declared in `playwright.config.ts`.

## Geometry assertions

`e2e/helpers/geometry.ts` offers layout assertions for functional e2e specs:
`expectSingleScroller`, `expectNoHorizontalOverflow`, `expectFocusRingVisible`. They are
self-tested in `e2e/geometry.spec.ts` against the healthy/broken stories of
`Internal/GeometryFixtures`.
