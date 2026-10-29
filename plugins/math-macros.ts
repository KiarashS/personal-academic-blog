/**
 * The KaTeX macros a post's maths is rendered with: the site's, from
 * `siteConfig.math.macros`, with the post's own `macros:` from its
 * frontmatter added on top, so a post can define a shorthand of its own or
 * give one of the site's a different meaning.
 *
 *     macros:
 *       \KL: 'D_{\mathrm{KL}}\left(#1 \,\Vert\, #2\right)'
 *       prior: \pi
 *
 * A name may be written with or without its backslash. A value that is not a
 * string is a mistake in the frontmatter, and is reported and left out.
 *
 * A fresh object every time: KaTeX writes into the macros it is given when a
 * post uses `\gdef`, and one post's definitions must not leak into the next.
 */
export function mathMacros(
  site: Record<string, string> | undefined,
  post: unknown,
  onWarn?: (message: string) => void,
): Record<string, string> {
  const out: Record<string, string> = {};
  const add = (name: string, value: unknown) => {
    const key = name.startsWith('\\') ? name : `\\${name}`;
    if (!/^\\[A-Za-z]+$/.test(key)) {
      onWarn?.(`macro "${name}" is not a name KaTeX can define; it is left out`);
      return;
    }
    if (typeof value !== 'string' && typeof value !== 'number') {
      onWarn?.(`macro "${name}" has no definition; it is left out`);
      return;
    }
    out[key] = String(value);
  };

  for (const [name, value] of Object.entries(site ?? {})) add(name, value);
  if (post !== undefined && post !== null) {
    if (typeof post !== 'object' || Array.isArray(post)) {
      onWarn?.('`macros` should map each name to its definition');
    } else {
      for (const [name, value] of Object.entries(post as Record<string, unknown>)) add(name, value);
    }
  }
  return out;
}
