const textModules: Record<string, { slug: string; plainText: string }> = import.meta.glob(
  '../content/posts/*.md',
  { query: '?text', import: 'default', eager: true },
);

/** slug -> prose. Imported dynamically so it lands in the search chunk. */
export const plainTextBySlug: Record<string, string> = Object.fromEntries(
  Object.values(textModules).map(({ slug, plainText }) => [slug, plainText]),
);
