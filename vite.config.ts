import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';
import type { Plugin } from 'vite';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { markdown } from './plugins/markdown';
import { bibliography } from './plugins/bibliography';
import { emojiContent } from './plugins/emoji-content';
import { signature } from './plugins/signature';

// The day the site was built, in UTC, for pages that list things until a date:
// see `src/lib/today.ts`. The browser and server bundles are two `vite build`
// runs, so BUILD_DATE, when set, pins both to the same day.
const buildDate = process.env.BUILD_DATE ?? new Date().toISOString().slice(0, 10);

// The mdxcn components import `motion/react`; they get `src/mdxcn/motion.ts`,
// which is motion with one hook changed so a prerendered figure is drawn
// finished. See that file.
function mdxcnMotion(): Plugin {
  const registry = fileURLToPath(new URL('./src/mdxcn/registry/', import.meta.url));
  const shim = fileURLToPath(new URL('./src/mdxcn/motion.ts', import.meta.url));
  return {
    name: 'mdxcn-motion',
    enforce: 'pre',
    resolveId(id, importer) {
      return id === 'motion/react' && importer?.startsWith(registry) ? shim : null;
    },
  };
}

// BASE_PATH lets the site live under a subdirectory, e.g. GitHub Pages
// project sites served from /<repo>/.
export default defineConfig({
  base: process.env.BASE_PATH ?? '/',
  define: { __BUILD_DATE__: JSON.stringify(buildDate) },
  plugins: [
    react(),
    // Only for the mdxcn figures' stylesheet (`src/mdxcn/mdxcn.css`), which
    // names its own sources; the site's CSS is not Tailwind and is untouched.
    tailwindcss(),
    markdown(),
    bibliography(),
    emojiContent(),
    signature(),
    mdxcnMotion(),
  ],
  resolve: {
    // The paths the vendored mdxcn components import from, as shadcn lays a
    // project out. Nothing else in the site uses `@/`.
    alias: [
      {
        find: /^@\/registry\//,
        replacement: fileURLToPath(new URL('./src/mdxcn/registry/', import.meta.url)),
      },
      {
        find: /^@\/lib\/utils$/,
        replacement: fileURLToPath(new URL('./src/mdxcn/lib/utils.ts', import.meta.url)),
      },
    ],
  },
  test: {
    environment: 'node',
    include: ['src/test/**/*.test.ts'],
    // Pins the switches the suite is written against; see the file.
    setupFiles: ['src/test/setup.ts'],
  },
});
