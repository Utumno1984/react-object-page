import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    include: ['*.test.{ts,tsx}'],
    // Core sources import tokens.css as text (`?raw`); Vitest would blank it otherwise.
    css: { include: [/\.css\?raw$/] },
  },
});
