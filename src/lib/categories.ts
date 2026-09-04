import { siteConfig } from '../site.config';
import { posts } from './posts';
import type { Category } from '../site.config';
import type { Post } from './types';

export interface CategoryCount {
  category: Category;
  count: number;
}

/** The configured shelves, in the order the site config lists them. */
export const allCategories: Category[] = siteConfig.categories;

const bySlug = new Map(allCategories.map((category) => [category.slug, category]));

export function getCategory(slug: string | undefined): Category | undefined {
  return slug ? bySlug.get(slug) : undefined;
}

/** Whether the site uses categories at all. With none configured, it does not. */
export function categoriesEnabled(): boolean {
  return allCategories.length > 0;
}

export function postsInCategory(slug: string): Post[] {
  return posts.filter((post) => post.category === slug);
}

/**
 * Every category that has something in it, in configured order. An empty shelf
 * is a promise the archive does not keep, so the index leaves it out.
 */
export function categoryCounts(): CategoryCount[] {
  return allCategories
    .map((category) => ({ category, count: postsInCategory(category.slug).length }))
    .filter((entry) => entry.count > 0);
}
