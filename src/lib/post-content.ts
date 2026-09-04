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

// The promise, not the HTML, is what `use` consumes, so it is cached here.
const pending = new Map<string, Promise<string>>();

/**
 * The cached promise for a post. A rejected one is dropped rather than kept:
 * a chunk that failed to load once — a flaky connection, or a deploy that
 * replaced it while the tab was open — would otherwise keep failing for as
 * long as the page is open, however many times the reader retried.
 */
export function postHtml(slug: string): Promise<string> {
  const hit = pending.get(slug);
  if (hit) return hit;

  const promise = loadPostHtml(slug).catch((error: unknown) => {
    pending.delete(slug);
    throw error;
  });
  pending.set(slug, promise);
  return promise;
}

/** Used by the prerenderer, which needs every body up front. */
export function allContentSlugs(): string[] {
  return [...bySlug.keys()];
}
