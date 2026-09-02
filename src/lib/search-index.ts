const textModules = import.meta.glob('../content/posts/*.md', {
  query: '?text',
  import: 'default',
  eager: true,
}) as Record<string, { slug: string; plainText: string }>;

/** slug -> prose. Imported dynamically so it lands in the search chunk. */
export const plainTextBySlug: Record<string, string> = Object.fromEntries(
  Object.values(textModules).map(({ slug, plainText }) => [slug, plainText]),
);
