import { readFileSync } from 'node:fs';
import type { Plugin } from 'vite';
import { parseBib } from '../src/lib/bib-parse';

/**
 * Turns an imported `.bib` file into parsed entries at build time, so the
 * publications page ships data rather than a parser.
 */
export function bibliography(): Plugin {
  return {
    name: 'academic-bibliography',
    enforce: 'pre',

    transform(_code, id) {
      const [path] = id.split('?');
      if (!path.endsWith('.bib')) return null;

      const entries = parseBib(readFileSync(path, 'utf8'));
      return { code: `export default ${JSON.stringify(entries)};`, map: null };
    },
  };
}
