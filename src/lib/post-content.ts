const htmlModules = import.meta.glob('../content/posts/*.md') as Record<
  string,
  () => Promise<{ html: string }>
>;

const bySlug = new Map<string, () => Promise<{ html: string }>>();
for (const [path, load] of Object.entries(htmlModules)) {
  const base = path.split('/').pop() ?? path;
  bySlug.set(base.replace(/\.md$/, '').replace(/^\d{4}-\d{2}-\d{2}-/, ''), load);
}

/**
 * Loads one post's rendered HTML. Bodies are separate modules, so opening a
 * post fetches that post and nothing else.
 */
export async function loadPostHtml(slug: string): Promise<string> {
  const load = bySlug.get(slug);
  if (!load) throw new Error(`No content module for post "${slug}"`);
  return (await load()).html;
}

/** Used by the prerenderer, which needs every body up front. */
export function allContentSlugs(): string[] {
  return [...bySlug.keys()];
}
