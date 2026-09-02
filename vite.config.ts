import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { copyFileSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * Static hosts serve 404.html for unknown paths. Shipping a copy of index.html
 * under that name lets a deep link like /posts/foo reach the client router
 * instead of a host error page.
 */
function spaFallback() {
  return {
    name: 'spa-fallback-404',
    closeBundle() {
      const dir = resolve(process.cwd(), 'dist');
      copyFileSync(resolve(dir, 'index.html'), resolve(dir, '404.html'));
    },
  };
}

// BASE_PATH lets the site live under a subdirectory, e.g. GitHub Pages
// project sites served from /<repo>/.
export default defineConfig({
  base: process.env.BASE_PATH ?? '/',
  plugins: [react(), spaFallback()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/mermaid') || id.includes('node_modules/cytoscape')) {
            return 'mermaid';
          }
          if (id.includes('node_modules/katex')) return 'katex';
          if (id.includes('node_modules/highlight.js')) return 'highlight';
          return undefined;
        },
      },
    },
  },
  test: {
    environment: 'node',
    include: ['src/test/**/*.test.ts'],
  },
});
