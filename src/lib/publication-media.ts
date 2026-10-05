import type { Dimensions } from './image-size';
import { mediaKind } from './media';

/**
 * A publication's teaser: the picture, GIF or short clip beside its entry on
 * the Publications page. Written in the `.bib` file, on the entry it belongs
 * to, in three fields of the site's own:
 *
 *     teaser       = {/publications/knuth1984.gif},
 *     teaseralt    = {The literate source of a program, beside its output},
 *     teaserposter = {/publications/knuth1984.jpg},
 *
 * `teaser` is a path under `public/` or a URL, and an image (`.png`, `.jpg`,
 * `.webp`, `.avif`, `.gif`, `.svg`) or a video file (`.mp4`, `.webm`, `.mov`).
 * `teaseralt` describes it; leave it out when the picture only decorates the
 * title beside it. `teaserposter` is the still a video shows before it plays.
 *
 * None of the three is BibTeX anyone else wants, so they are taken off the
 * entry before the page shows or copies it.
 */
export interface PublicationMedia {
  kind: 'image' | 'video';
  src: string;
  alt: string;
  poster?: string;
  width?: number;
  height?: number;
}

export const MEDIA_FIELDS = ['teaser', 'teaseralt', 'teaserposter'] as const;

const isUrl = (value: string): boolean => /^(?:[a-z][a-z0-9+.-]*:)?\/\//i.test(value);

/**
 * The teaser an entry's fields describe, and what is wrong with them, if
 * anything. `sizeOf` measures a local file, so the page can reserve the space
 * before it loads; the build passes one that reads `public/`.
 */
export function publicationMedia(
  key: string,
  fields: Record<string, string>,
  sizeOf: (src: string) => Dimensions | undefined = () => undefined,
): { media?: PublicationMedia; problems: string[] } {
  const src = fields.teaser?.trim();
  if (!src) return { problems: [] };

  const where = `publications: ${key}`;
  const kind = mediaKind(src);
  if (kind !== 'image' && kind !== 'video') {
    return {
      problems: [
        `${where}: the teaser “${src}” is not an image or a video file the page can show; ` +
          'use .png, .jpg, .webp, .avif, .gif, .svg, .mp4, .webm or .mov.',
      ],
    };
  }
  if (!isUrl(src) && !src.startsWith('/')) {
    return {
      problems: [
        `${where}: the teaser “${src}” is neither a URL nor a path of the site. ` +
          'Write it from the root: /publications/teaser.gif.',
      ],
    };
  }

  const problems: string[] = [];
  const poster = fields.teaserposter?.trim() || undefined;
  if (poster && kind !== 'video') {
    problems.push(`${where}: \`teaserposter\` only applies to a video teaser, and is ignored.`);
  }

  const size = !isUrl(src) && kind === 'image' ? sizeOf(src) : undefined;
  if (!isUrl(src) && kind === 'image' && !size && !src.endsWith('.svg')) {
    problems.push(`${where}: no file at public${src}, or not one whose size the build can read.`);
  }

  return {
    media: {
      kind,
      src,
      alt: fields.teaseralt?.trim() ?? '',
      ...(poster && kind === 'video' ? { poster } : {}),
      ...(size ? { width: size.width, height: size.height } : {}),
    },
    problems,
  };
}

/** The entry's fields without the site's own, which no other BibTeX reader wants. */
export function bibFieldsOnly(fields: Record<string, string>): Record<string, string> {
  return Object.fromEntries(
    Object.entries(fields).filter(([name]) => !(MEDIA_FIELDS as readonly string[]).includes(name)),
  );
}
