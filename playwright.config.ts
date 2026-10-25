import { defineConfig, devices } from '@playwright/test';

const PORT = 6007;
const isCI = !!process.env.CI;

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: isCI,
  retries: isCI ? 1 : 0,
  reporter: isCI ? [['list'], ['html', { open: 'never' }]] : [['list']],
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: 'retain-on-failure',
  },
  // Policy on stale/missing builds: the server command ALWAYS rebuilds Storybook
  // before serving it, so tests never run against an old or absent `storybook-static/`
  // (a failing build makes the command, and therefore `test:e2e`, fail loudly).
  // `reuseExistingServer` is enabled only outside CI, for fast local iteration: in that
  // case whatever already listens on the port is used as-is (e.g. a server you started
  // yourself); stop it if you need a fresh build. In CI a busy port is an error.
  webServer: {
    command: `npm run build-storybook && npx http-server storybook-static -p ${PORT} -s -c-1`,
    url: `http://localhost:${PORT}/index.json`,
    reuseExistingServer: !isCI,
    timeout: 300_000,
  },
  projects: [
    { name: 'chromium', grepInvert: /@touch/, use: { ...devices['Desktop Chrome'] } },
    // Touch emulation, for tickets that need it. Opt-in by tag so that it does not
    // duplicate every test: tag tests with `@touch` to run them in this project.
    {
      name: 'chromium-touch',
      grep: /@touch/,
      use: { ...devices['Desktop Chrome'], hasTouch: true },
    },
  ],
});
