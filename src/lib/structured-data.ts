import { siteConfig } from '../site.config';
import { isEnabled } from './features';
import { profileLinks, researchInterests, siteOwner } from './profiles';
import { canonicalUrl } from './urls';

const isUrl = (value: string): boolean => /^https?:\/\//i.test(value);

/**
 * The front page as a `Person`, in the shape schema.org describes.
 *
 * `sameAs` is the point of it: ORCID, Google Scholar and the rest are the same
 * links the page already shows, and saying they are the same person is what
 * connects a name in a search result to an identifier. Everything is drawn from
 * the owner's record in `src/content/authors.ts`, so a field that record does
 * not fill in is absent rather than empty — a `jobTitle: ""` is worse than no
 * `jobTitle` at all.
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
 * The structured data for a path, or nothing. Only the front page has any: it
 * is the page that is about a person, and a `Person` block repeated on every
 * route would claim each of them is.
 */
export function structuredDataFor(pathname: string): Record<string, unknown> | null {
  const path = pathname.replace(/\/+$/, '') || '/';
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
