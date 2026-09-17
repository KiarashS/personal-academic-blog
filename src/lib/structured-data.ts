import { siteConfig } from '../site.config';
import { isEnabled } from './features';
import { isoDate } from './format';
import { getCategory } from './categories';
import { getPost } from './posts';
import { profileLinks, researchInterests, siteOwner } from './profiles';
import { blogIndexPath, postPath, postSlugFromPath } from './routes';
import { canonicalUrl } from './urls';
import type { Author, Post } from './types';

const isUrl = (value: string): boolean => /^https?:\/\//i.test(value);

/**
 * One identifier per person, used wherever that person is described.
 *
 * Every author has a page, so its URL is the natural name for them, and the
 * owner uses the same one on the front page as in the byline of a post. A
 * consumer merges nodes that share an `@id`, which is what makes "the Kiarash
 * who wrote this post" and "the Kiarash with these six profiles" one person
 * rather than two who happen to be called the same thing.
 */
function personId(author: Author): string {
  return `${canonicalUrl(`/authors/${author.id}`)}#person`;
}

/** A person as a byline names them: enough to identify, joined by `@id`. */
function authorNode(author: Author): Record<string, unknown> {
  return {
    '@type': 'Person',
    '@id': personId(author),
    name: author.name,
    url: canonicalUrl(`/authors/${author.id}`),
  };
}

/**
 * The front page as a `Person`, in the shape schema.org describes.
 *
 * `sameAs` is the point of it: ORCID, Google Scholar and the rest, and saying
 * they are the same person is what connects a name in a search result to an
 * identifier. Everything is drawn from the owner's record in
 * `src/content/authors.ts`, so a field that record does not fill in is absent
 * rather than empty — a `jobTitle: ""` is worse than no `jobTitle` at all.
 *
 * The record, not what any page shows: `profileLinkKeys` narrows the three
 * rendered rows and is deliberately not applied here. Every other field in this
 * block describes, and leaving one out only says less; `sameAs` asserts, and
 * dropping a URL from it says the account is not yours. A profile you want off
 * the site entirely comes out of the record, which takes it out of here too.
 */
export function personSchema(): Record<string, unknown> {
  const owner = siteOwner();
  const interests = researchInterests(owner);
  const description = siteConfig.home.tagline || owner.bio;

  // A CV is a document and an address is not an identity, so neither is a
  // profile of the person in the sense `sameAs` means.
  const sameAs = profileLinks(owner)
    .filter((link) => link.key !== 'cv' && link.key !== 'email')
    .map((link) => link.href);

  return {
    '@context': 'https://schema.org',
    '@type': 'Person',
    '@id': personId(owner),
    name: owner.name,
    url: canonicalUrl('/'),
    ...(description ? { description } : {}),
    ...(owner.role ? { jobTitle: owner.role } : {}),
    ...(owner.affiliation
      ? { affiliation: { '@type': 'Organization', name: owner.affiliation } }
      : {}),
    ...(interests.length > 0 ? { knowsAbout: interests } : {}),
    ...(owner.email ? { email: `mailto:${owner.email}` } : {}),
    ...(siteConfig.home.avatar
      ? {
          image: isUrl(siteConfig.home.avatar)
            ? siteConfig.home.avatar
            : canonicalUrl(siteConfig.home.avatar),
        }
      : {}),
    ...(sameAs.length > 0 ? { sameAs } : {}),
  };
}

/**
 * A post as a `BlogPosting`, which is the `Article` subtype for something
 * published on a blog.
 *
 * Every field here is something the page already states in prose and a reader
 * takes for granted: who wrote it, when, what it is about, which blog it
 * belongs to. Saying it again in a vocabulary a machine reads is the whole
 * trick — a date in a byline is a string until it is `datePublished`.
 *
 * `dateModified` falls back to the publication date rather than being omitted,
 * so a post that has never been revised says so instead of leaving the question
 * open.
 *
 * The bylines are `@id` references to the same nodes the front page's `Person`
 * uses, so a co-author with a page here and the owner with a page and six
 * profiles both resolve to one person across the site.
 *
 * `image` is the post's own social card, which the build renders one of per
 * post, so the URL is always there to be named.
 *
 * A post's `doi` is deliberately absent. It identifies the paper the post
 * accompanies, not the post, so `identifier` would claim the wrong thing and
 * `citation` would single out one reference from a post that has a whole
 * bibliography. Every field here is something the page says about itself.
 */
export function postSchema(post: Post): Record<string, unknown> {
  const url = canonicalUrl(postPath(post.slug));
  const blog = canonicalUrl(blogIndexPath());
  const category = post.category ? getCategory(post.category)?.label : undefined;

  return {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    '@id': `${url}#post`,
    mainEntityOfPage: url,
    url,
    headline: post.title,
    ...(post.summary ? { description: post.summary } : {}),
    datePublished: isoDate(post.date),
    dateModified: isoDate(post.updated ?? post.date),
    ...(post.authors.length > 0 ? { author: post.authors.map(authorNode) } : {}),
    publisher: authorNode(siteOwner()),
    image: canonicalUrl(`/og/${post.slug}.png`),
    ...(post.tags.length > 0 ? { keywords: post.tags } : {}),
    ...(category ? { articleSection: category } : {}),
    isPartOf: {
      '@type': 'Blog',
      '@id': `${blog}#blog`,
      name: siteConfig.title,
      url: blog,
    },
    // The one `lang` the document carries, in `index.html`.
    inLanguage: 'en',
  };
}

/**
 * The structured data for a path, or nothing.
 *
 * A post describes itself; the front page describes the person whose site this
 * is. Nothing else gets a block — an index of posts is a list, and a `Person`
 * repeated across every route would claim each of them is one.
 *
 * Posts are matched first. Without the home feature the blog is the whole site,
 * so `/` is the index and the posts sit under `/posts/`; with it they are under
 * `/blog/` and `/` is the person. `postSlugFromPath` knows which, so this does
 * not have to.
 */
export function structuredDataFor(pathname: string): Record<string, unknown> | null {
  const path = pathname.replace(/\/+$/, '') || '/';
  const post = getPost(postSlugFromPath(path));
  if (post) return postSchema(post);
  if (path !== '/' || !isEnabled('home')) return null;
  return personSchema();
}

/**
 * JSON for a `<script>` body. A closing tag inside a string would end the
 * element early, and `<` is the only character that can start one, so escaping
 * it is enough and leaves the JSON valid.
 */
export function serialiseJsonLd(data: Record<string, unknown>): string {
  return JSON.stringify(data).replace(/</g, '\\u003c');
}
