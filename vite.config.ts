import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { markdown } from './plugins/markdown';
import { bibliography } from './plugins/bibliography';
import { emojiContent } from './plugins/emoji-content';

// The day the site was built, in UTC, for pages that list things until a date:
// see `src/lib/today.ts`. The browser and server bundles are two `vite build`
// runs, so BUILD_DATE, when set, pins both to the same day.
const buildDate = process.env.BUILD_DATE ?? new Date().toISOString().slice(0, 10);

// BASE_PATH lets the site live under a subdirectory, e.g. GitHub Pages
// project sites served from /<repo>/.
export default defineConfig({
  base: process.env.BASE_PATH ?? '/',
  define: { __BUILD_DATE__: JSON.stringify(buildDate) },
  plugins: [react(), markdown(), bibliography(), emojiContent()],
  test: {
    environment: 'node',
    include: ['src/test/**/*.test.ts'],
    // Pins the switches the suite is written against; see the file.
    setupFiles: ['src/test/setup.ts'],
  },
});
