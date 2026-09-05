import { siteConfig } from '../site.config';
import { authors } from '../content/authors';
import { researchInterests } from './profiles';
import { allCategories, categoriesEnabled, getCategory, postsInCategory } from './categories';
import { displayTag, posts, postsByTag } from './posts';
import { paginate } from './pagination';
import { isEnabled } from './features';

export interface RouteMeta {
  title: string;
  description: string;
}

function withSuffix(title: string | undefined): string {
  return title ? `${title} — ${siteConfig.title}` : siteConfig.title;
}

/**
 * The title and description for a path. The prerenderer writes these into the
 * static HTML; `PageMeta` applies the same values on client-side navigation.
 */
export function metaFor(pathname: string): RouteMeta {
  const path = pathname.replace(/\/+$/, '') || '/';
  const segments = path.split('/').filter(Boolean);

  if (path === '/') return { title: withSuffix(undefined), description: siteConfig.description };

  if (segments[0] === 'page') {
    return {
      title: withSuffix(`Posts, page ${segments[1]}`),
      description: siteConfig.description,
    };
  }

  if (segments[0] === 'posts') {
    const post = posts.find((candidate) => candidate.slug === segments[1]);
    if (post) return { title: withSuffix(post.title), description: post.summary };
  }

  if (segments[0] === 'categories' && segments[1] && categoriesEnabled()) {
    const category = getCategory(segments[1]);
    if (category) {
      const count = postsInCategory(category.slug).length;
      const page = segments[2] === 'page' ? `, page ${segments[3]}` : '';
      return {
        title: withSuffix(`${category.label}${page}`),
        description:
          category.description ?? `${count} post${count === 1 ? '' : 's'} in ${category.label}.`,
      };
    }
  }

  if (segments[0] === 'categories' && categoriesEnabled()) {
    return {
      title: withSuffix('Categories'),
      description: 'The categories posts are filed under.',
    };
  }

  if (segments[0] === 'tags' && segments[1]) {
    const label = displayTag(segments[1]) ?? segments[1];
    const count = postsByTag(segments[1]).length;
    const page = segments[2] === 'page' ? `, page ${segments[3]}` : '';
    return {
      title: withSuffix(`Tagged “${label}”${page}`),
      description: `${count} post${count === 1 ? '' : 's'} tagged ${label}.`,
    };
  }

  if (segments[0] === 'tags') {
    return { title: withSuffix('Tags'), description: 'Every tag used across the posts.' };
  }

  if (segments[0] === 'authors' && segments[1]) {
    const author = authors[segments[1]];
    if (author) {
      // Interests stand in for a bio the record does not have: a search result
      // saying what someone works on beats one saying only that they write.
      const interests = researchInterests(author);
      const fallback =
        interests.length > 0
          ? `${author.name} works on ${interests.join(', ')}.`
          : `Posts by ${author.name}.`;
      return { title: withSuffix(author.name), description: author.bio ?? fallback };
    }
  }

  if (path === '/search') {
    return {
      title: withSuffix('Search'),
      description: 'Search the archive by title, tag, author or text.',
    };
  }

  if (path === '/publications' && isEnabled('publications')) {
    return {
      title: withSuffix('Publications'),
      description: 'Papers, preprints and other published work.',
    };
  }

  if (path === '/archive' && isEnabled('archive')) {
    return {
      title: withSuffix('Archive'),
      description: `Every post, grouped by year — ${posts.length} in total.`,
    };
  }

  if (path === '/about') return { title: withSuffix('About'), description: siteConfig.description };

  return { title: withSuffix('Not found'), description: siteConfig.description };
}

/** Every path the build turns into a static HTML file. */
export function allRoutes(): string[] {
  const routes = new Set<string>(['/', '/tags', '/search', '/about']);
  if (isEnabled('publications')) routes.add('/publications');
  if (isEnabled('archive')) routes.add('/archive');

  if (categoriesEnabled()) {
    routes.add('/categories');
    for (const category of allCategories) {
      const inside = postsInCategory(category.slug);
      if (inside.length === 0) continue;
      routes.add(`/categories/${category.slug}`);
      const pages = paginate(inside, 1, siteConfig.postsPerPage).totalPages;
      for (let page = 2; page <= pages; page += 1) {
        routes.add(`/categories/${category.slug}/page/${page}`);
      }
    }
  }

  const { totalPages } = paginate(posts, 1, siteConfig.postsPerPage);
  for (let page = 2; page <= totalPages; page += 1) routes.add(`/page/${page}`);

  for (const post of posts) routes.add(`/posts/${post.slug}`);
  for (const id of Object.keys(authors)) routes.add(`/authors/${id}`);

  const tags = new Set(posts.flatMap((post) => post.tags.map((tag) => tag)));
  for (const tag of tags) {
    const slug = tagPath(tag);
    routes.add(`/tags/${slug}`);
    const pages = paginate(postsByTag(slug), 1, siteConfig.postsPerPage).totalPages;
    for (let page = 2; page <= pages; page += 1) routes.add(`/tags/${slug}/page/${page}`);
  }

  return [...routes];
}

function tagPath(tag: string): string {
  return tag
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}
