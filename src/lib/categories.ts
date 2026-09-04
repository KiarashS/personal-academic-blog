import { siteConfig } from '../site.config';
import { categoriesEnabled } from './features';
import { posts } from './posts';
import type { Category } from '../site.config';
import type { Post } from './types';

export interface CategoryCount {
  category: Category;
  count: number;
}

/**
 * Everything that renders a category goes through this module, so switching the
 * flag off takes the pages, the chips and the per-shelf feeds with it at once.
 */
export { categoriesEnabled };

/** The configured shelves, in the order the site config lists them. */
export const allCategories: Category[] = siteConfig.categories;

const bySlug = new Map(allCategories.map((category) => [category.slug, category]));

/**
 * The category a post names, or nothing when the feature is off. That is what
 * keeps a post still carrying `category:` from rendering a chip pointing at a
 * route the build no longer writes.
 */
export function getCategory(slug: string | undefined): Category | undefined {
  return slug && categoriesEnabled() ? bySlug.get(slug) : undefined;
}

export function postsInCategory(slug: string): Post[] {
  return categoriesEnabled() ? posts.filter((post) => post.category === slug) : [];
}

/**
 * Every category that has something in it, in configured order. An empty shelf
 * is a promise the archive does not keep, so the index leaves it out.
 */
export function categoryCounts(): CategoryCount[] {
  if (!categoriesEnabled()) return [];
  return allCategories
    .map((category) => ({ category, count: postsInCategory(category.slug).length }))
    .filter((entry) => entry.count > 0);
}
