import { siteConfig } from '../site.config';
import { authors } from '../content/authors';
import { researchInterests } from './profiles';
import { allCategories, categoriesEnabled, getCategory, postsInCategory } from './categories';
import { allPosts, displayTag, getPost, posts, postsByTag } from './posts';
import { paginate } from './pagination';
import { archiveEnabled, blogEnabled, isEnabled } from './features';
import { newsPageEnabled } from './news';
import { openingsPageEnabled } from './openings';
import { peoplePageEnabled } from './people';
import { blogIndexPath, blogPagePath, postPath, postSlugFromPath } from './routes';

export interface RouteMeta {
  title: string;
  description: string;
  /** Asks search engines not to list the page: set for an unlisted post. */
  noindex?: boolean;
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

  // A post first: with the home feature on it lives under /blog, where the
  // index and its numbered pages also live.
  const slug = postSlugFromPath(path);
  if (slug) {
    const post = getPost(slug);
    if (post) {
      return {
        title: withSuffix(post.title),
        description: post.summary,
        ...(post.unlisted ? { noindex: true } : {}),
      };
    }
  }

  // The front page carries the site's own title, whether that page is the home
  // page or the blog index. `/blog` only exists when it is the latter's new
  // address, so it names itself.
  if (path === '/') {
    // With the home feature on, `/` is a page about the person and the site's
    // own description is about the writing, so the front page keeps its own.
    const description =
      (isEnabled('home') && siteConfig.home.description) || siteConfig.description;
    return { title: withSuffix(undefined), description };
  }
  if (path === blogIndexPath() && blogEnabled()) {
    return { title: withSuffix('Blog'), description: siteConfig.description };
  }

  // Named the way page one is — "Blog" — rather than "Posts", which is what
  // page two used to be called while page one was not. The page number goes
  // into the description too, or every page of the index previews identically.
  const paged = /^\/(?:blog\/)?page\/(\d+)$/.exec(path);
  if (paged && path === blogPagePath(Number(paged[1])) && blogEnabled()) {
    const { totalPages } = paginate(posts, 1, siteConfig.postsPerPage);
    return {
      title: withSuffix(`Blog, page ${paged[1]}`),
      description: `${siteConfig.description} Page ${paged[1]} of ${totalPages}.`,
    };
  }

  if (path === '/research' && isEnabled('research')) {
    return {
      title: withSuffix('Research'),
      description: `What ${siteConfig.title} works on, and where it is going.`,
    };
  }

  if (path === '/people' && peoplePageEnabled()) {
    return {
      title: withSuffix('People'),
      description: `Who is in the group, and where its alumni went.`,
    };
  }

  if (path === '/openings' && openingsPageEnabled()) {
    return {
      title: withSuffix('Openings'),
      description: 'Open positions in the group, and how to apply.',
    };
  }

  if (path === '/slides' && isEnabled('slides')) {
    return { title: withSuffix('Slides'), description: 'Talks, lectures and their materials.' };
  }

  if (path === '/news' && newsPageEnabled()) {
    return {
      title: withSuffix('News'),
      description: `Talks, papers and other recent news from ${siteConfig.title}.`,
    };
  }

  if (path === '/contact' && isEnabled('contact')) {
    return { title: withSuffix('Contact'), description: `How to reach ${siteConfig.title}.` };
  }

  if (segments[0] === 'categories' && segments[1] && categoriesEnabled()) {
    const category = getCategory(segments[1]);
    const count = category ? postsInCategory(category.slug).length : 0;
    // An empty or unknown category falls through to "Not found", as its page does.
    if (category && count > 0) {
      const page = segments[2] === 'page' ? `, page ${segments[3]}` : '';
      return {
        title: withSuffix(`${category.label}${page}`),
        description:
          category.description ?? `${count} post${count === 1 ? '' : 's'} in ${category.label}.`,
      };
    }
  }

  if (segments[0] === 'categories' && !segments[1] && categoriesEnabled()) {
    return {
      title: withSuffix('Categories'),
      description: 'The categories posts are filed under.',
    };
  }

  // A tag with no posts falls through to "Not found", as its page does.
  if (segments[0] === 'tags' && segments[1] && blogEnabled() && postsByTag(segments[1]).length) {
    const label = displayTag(segments[1]) ?? segments[1];
    const count = postsByTag(segments[1]).length;
    const page = segments[2] === 'page' ? `, page ${segments[3]}` : '';
    return {
      title: withSuffix(`Tagged “${label}”${page}`),
      description: `${count} post${count === 1 ? '' : 's'} tagged ${label}.`,
    };
  }

  if (segments[0] === 'tags' && !segments[1] && blogEnabled()) {
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
          : blogEnabled()
            ? `Posts by ${author.name}.`
            : [author.role, author.affiliation].filter(Boolean).join(', ') || author.name;
      return { title: withSuffix(author.name), description: author.bio ?? fallback };
    }
  }

  if (path === '/search' && blogEnabled()) {
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

  if (path === '/archive' && archiveEnabled()) {
    return {
      title: withSuffix('Archive'),
      description: `Every post, grouped by year — ${posts.length} in total.`,
    };
  }

  if (path === '/about' && isEnabled('about')) {
    return { title: withSuffix('About'), description: siteConfig.description };
  }

  return { title: withSuffix('Not found'), description: siteConfig.description };
}

/** Every path the build turns into a static HTML file. */
export function allRoutes(): string[] {
  const routes = new Set<string>(['/']);
  // Without a blog, none of its pages: the posts are already empty, so the
  // pagination, post and tag loops below add nothing either.
  if (blogEnabled()) {
    routes.add('/tags');
    routes.add('/search');
    if (isEnabled('home')) routes.add(blogIndexPath());
  }
  if (isEnabled('about')) routes.add('/about');
  if (isEnabled('publications')) routes.add('/publications');
  if (archiveEnabled()) routes.add('/archive');
  if (isEnabled('research')) routes.add('/research');
  if (isEnabled('slides')) routes.add('/slides');
  if (isEnabled('contact')) routes.add('/contact');
  if (newsPageEnabled()) routes.add('/news');
  if (peoplePageEnabled()) routes.add('/people');
  if (openingsPageEnabled()) routes.add('/openings');

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

  for (const id of Object.keys(authors)) routes.add(`/authors/${id}`);
  if (!blogEnabled()) return [...routes];

  const { totalPages } = paginate(posts, 1, siteConfig.postsPerPage);
  for (let page = 2; page <= totalPages; page += 1) routes.add(blogPagePath(page));

  // Every published post has an address, listed or not: unlisted is about
  // where a post is shown, not whether it exists.
  for (const post of allPosts) routes.add(postPath(post.slug));

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
