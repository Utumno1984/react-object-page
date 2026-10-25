import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    globalSetup: ['./test/global-setup.ts'],
    setupFiles: ['./test/setup.ts'],
    include: ['test/**/*.test.{ts,tsx}', 'src/**/*.test.{ts,tsx}'],
    // Vitest blanks every `.css` module, `?raw` imports included. `cn()` reads tokens.css as
    // text (the single source of the token names), so let `?raw` imports through untouched.
    css: { include: [/\.css\?raw$/] },
  },
});
