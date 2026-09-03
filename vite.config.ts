import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { markdown } from './plugins/markdown';
import { bibliography } from './plugins/bibliography';

// BASE_PATH lets the site live under a subdirectory, e.g. GitHub Pages
// project sites served from /<repo>/.
export default defineConfig({
  base: process.env.BASE_PATH ?? '/',
  plugins: [react(), markdown(), bibliography()],
  test: {
    environment: 'node',
    include: ['src/test/**/*.test.ts'],
  },
});
