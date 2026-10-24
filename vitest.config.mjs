import { defineConfig } from 'vitest/config';

// Unit tests for the repo tooling in scripts/ (the packages have their own configs).
export default defineConfig({
  test: { environment: 'node', include: ['scripts/**/*.test.mjs'] },
});
