import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import type { Plugin } from 'vite';
import { parseBib } from '../src/lib/bib-parse';
import { imageSize } from '../src/lib/image-size';
import { bibFieldsOnly, publicationMedia } from '../src/lib/publication-media';

/** A file under `public/`, measured, or nothing if it is not there. */
function sizeOf(src: string) {
  try {
    return imageSize(readFileSync(join(resolve('public'), src)));
  } catch {
    return undefined;
  }
}

/**
 * Turns an imported `.bib` file into parsed entries at build time, so the
 * publications page ships data rather than a parser.
 *
 * An entry's own fields (`teaser`, `teaseralt`, `teaserposter`, `badge`) come off
 * the entry here and arrive as its `media`, measured, so the page can hold
 * the picture's space before it loads and the BibTeX a reader copies is the
 * entry and nothing of the site's. A teaser the page cannot show is said out
 * loud, once per build.
 */
export function bibliography(): Plugin {
  return {
    name: 'academic-bibliography',
    enforce: 'pre',

    transform(_code, id) {
      const [path] = id.split('?');
      if (!path.endsWith('.bib')) return null;

      const entries = parseBib(readFileSync(path, 'utf8')).map((entry) => {
        const { media, problems } = publicationMedia(entry.key, entry.fields, sizeOf);
        for (const problem of problems) this.warn(problem);
        const badge = entry.fields.badge?.trim();
        return {
          ...entry,
          fields: bibFieldsOnly(entry.fields),
          ...(media ? { media } : {}),
          ...(badge ? { badge } : {}),
        };
      });
      return { code: `export default ${JSON.stringify(entries)};`, map: null };
    },
  };
}
