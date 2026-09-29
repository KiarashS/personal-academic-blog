/**
 * The sized copies of photos, which `scripts/render-avatar.mjs` writes into the
 * build beside the originals: `/avatar.jpg` becomes `/avatar-416.webp`.
 *
 * 416 for the front page's portrait, because it is never drawn wider than
 * 13rem, 208px, and a screen at twice the density wants twice that. The
 * original is whatever was dropped into `public/` (1254px and 132 kB as
 * shipped), which is four times the pixels and several times the bytes of
 * anything a reader will see.
 *
 * 256 for a photo on the People page, drawn at 7rem at most, 112px.
 *
 * WebP rather than JPEG so a portrait with a transparent background keeps it.
 */
export const AVATAR_WIDTH = 416;
export const PHOTO_WIDTH = 256;

export const isUrl = (value: string): boolean => /^https?:\/\//i.test(value);

/** Where the sized copy of a photo kept under `public/` is written. */
export function avatarCopyPath(src: string, width: number = AVATAR_WIDTH): string {
  const slash = src.lastIndexOf('/');
  const dot = src.lastIndexOf('.');
  const stem = dot > slash ? src.slice(0, dot) : src;
  return `${stem}-${width}.webp`;
}
