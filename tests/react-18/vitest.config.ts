import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

const here = (path: string): string => fileURLToPath(new URL(path, import.meta.url));

export default defineConfig({
  // The core sources live outside this workspace and would resolve the root's React 19: pin
  // react / react-dom (and the JSX runtime) to this workspace's React 18, or the test would
  // exercise 19 while claiming 18.
  resolve: {
    alias: [
      { find: /^react$/, replacement: here('./node_modules/react') },
      { find: /^react\/jsx-runtime$/, replacement: here('./node_modules/react/jsx-runtime.js') },
      { find: /^react\/jsx-dev-runtime$/, replacement: here('./node_modules/react/jsx-dev-runtime.js') },
      { find: /^react-dom$/, replacement: here('./node_modules/react-dom') },
      { find: /^react-dom\/client$/, replacement: here('./node_modules/react-dom/client.js') },
    ],
  },
  test: {
    environment: 'jsdom',
    globals: true,
    include: ['*.test.{ts,tsx}'],
    // Radix lives in the root node_modules and would be loaded un-transformed with the root's
    // React 19; inlining it makes the aliases above apply to it too.
    server: { deps: { inline: [/@radix-ui/] } },
    // Core sources import tokens.css as text (`?raw`); Vitest would blank it otherwise.
    css: { include: [/\.css\?raw$/] },
  },
});
