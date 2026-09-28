/**
 * The portrait's sized copy, which `scripts/render-avatar.mjs` writes into the
 * build beside the original: `/avatar.jpg` becomes `/avatar-416.webp`.
 *
 * 416 because the picture is never drawn wider than 13rem, 208px, and a
 * screen at twice the density wants twice that. The original is whatever was
 * dropped into `public/` (1254px and 132 kB as shipped), which is four times
 * the pixels and several times the bytes of anything a reader will see.
 *
 * WebP rather than JPEG so a portrait with a transparent background keeps it.
 */
export const AVATAR_WIDTH = 416;

export const isUrl = (value: string): boolean => /^https?:\/\//i.test(value);

/** Where the sized copy of a portrait kept under `public/` is written. */
export function avatarCopyPath(src: string): string {
  const slash = src.lastIndexOf('/');
  const dot = src.lastIndexOf('.');
  const stem = dot > slash ? src.slice(0, dot) : src;
  return `${stem}-${AVATAR_WIDTH}.webp`;
}
