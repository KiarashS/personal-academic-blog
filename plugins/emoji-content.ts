import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { Plugin } from 'vite';
import { nameToEmoji } from 'gemoji';
import { SHORTCODE } from '../src/lib/shortcode';

/*
 * The shortcodes `src/content/news.ts` actually uses, and only those.
 *
 * Markdown is compiled at build time, so a post's shortcodes never cost a
 * reader anything. News is different: it is a TypeScript module the browser
 * receives and React re-renders on hydration, so whatever resolves the codes
 * has to exist on both sides of that line.
 *
 * Shipping gemoji whole would be 36KB of names to render a handful of
 * characters, on a site that moved its search index out of the main bundle to
 * save less. So the build reads the content, keeps the codes it finds, and
 * emits a table of those — typically a line or two, and never bigger than the
 * writing calls for.
 *
 * The scan is deliberately loose: any `:name:` anywhere in the file, filtered
 * by whether gemoji knows it. A name in a comment costs one entry; the
 * alternative is parsing TypeScript to find out which string is prose, and
 * getting that wrong would silently drop an emoji from the page.
 */

const VIRTUAL = 'virtual:emoji-map';
const RESOLVED = `\0${VIRTUAL}`;

/** Every shortcode in a source file that gemoji recognises, and its character. */
export function emojiTable(source: string): Record<string, string> {
  const found: Record<string, string> = {};
  SHORTCODE.lastIndex = 0;
  for (const [, name] of source.matchAll(SHORTCODE)) {
    const emoji = nameToEmoji[name.toLowerCase()];
    if (emoji) found[name.toLowerCase()] = emoji;
  }
  return found;
}

export function emojiContent(file = 'src/content/news.ts'): Plugin {
  const path = resolve(process.cwd(), file);
  const table = () => emojiTable(readFileSync(path, 'utf8'));

  return {
    name: 'academic-emoji-content',

    resolveId(id) {
      return id === VIRTUAL ? RESOLVED : null;
    },

    load(id) {
      if (id !== RESOLVED) return null;
      const found = table();
      return `export const EMOJI = ${JSON.stringify(found)};`;
    },

    // The map is read from a file this module does not import, so nothing
    // would otherwise tell the dev server that editing an entry changed it.
    configureServer(server) {
      server.watcher.add(path);
      server.watcher.on('change', (changed) => {
        if (changed !== path) return;
        const module = server.moduleGraph.getModuleById(RESOLVED);
        if (module) void server.reloadModule(module);
      });
    },
  };
}
