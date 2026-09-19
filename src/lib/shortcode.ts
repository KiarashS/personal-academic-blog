/**
 * `:name:` — the shape of an emoji shortcode, wherever one is looked for.
 *
 * A pair of colons around anything gemoji does not know is left exactly as
 * written, which is what keeps `12:30:45`, a `16:9` ratio and a `Note:` opening
 * a line intact: the pattern matches them, the lookup misses, and nothing is
 * replaced. `+` and `-` are in the class for `:+1:` and `:-1:`.
 *
 * Alone in a module of its own because two things need it and they run in
 * different worlds. `plugins/emoji-content.ts` scans the content with it at
 * build time and `src/lib/emoji.ts` resolves with it in the browser; the
 * resolver imports the virtual module the plugin provides, so the plugin cannot
 * import the resolver without Node trying to load `virtual:` while it is still
 * reading the config. Two copies of the pattern would eventually disagree, and
 * the way they would disagree is a code the scan missed and the page prints raw.
 */
export const SHORTCODE = /:([a-z0-9_+-]+):/gi;
