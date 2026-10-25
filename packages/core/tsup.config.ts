import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import type { Plugin } from 'esbuild';
import { defineConfig } from 'tsup';

// `import css from './x.css?raw'` -> the CSS text as a string (comments stripped), the same
// behaviour Vite/Vitest provide natively, so tokens.css stays the single source for cn().
const cssRaw: Plugin = {
  name: 'css-raw',
  setup(build) {
    build.onResolve({ filter: /\.css\?raw$/ }, (args) => ({
      // Keep the `?raw` suffix on the virtual path so esbuild does not pick the css loader.
      path: resolve(args.resolveDir, args.path),
      namespace: 'css-raw',
    }));
    build.onLoad({ filter: /.*/, namespace: 'css-raw' }, (args) => {
      const css = readFileSync(args.path.replace(/\?raw$/, ''), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
      return { contents: `export default ${JSON.stringify(css)};`, loader: 'js', resolveDir: dirname(args.path) };
    });
  },
};

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm', 'cjs'],
  dts: true,
  clean: true,
  sourcemap: true,
  target: 'es2022',
  external: ['react', 'react-dom', 'react/jsx-runtime'],
  esbuildPlugins: [cssRaw],
});
