import { authors } from '../content/authors';
import { siteConfig } from '../site.config';
import type { ProfileSurface } from '../site.config';
import { withBase } from './urls';
import type { Author, ProfileKey, ProfileLinkKey, Website } from './types';

/**
 * The author the site belongs to. `owner` naming a record that has since been
 * renamed or removed would otherwise leave the contact page and the front page
 * with nobody, so the first record stands in.
 */
export function siteOwner(): Author {
  return authors[siteConfig.owner] ?? Object.values(authors)[0];
}

/**
 * An author's research interests, trimmed and with the blanks dropped, so a
 * trailing comma in the record does not render an empty entry.
 */
export function researchInterests(author: Author): string[] {
  return (author.interests ?? []).map((interest) => interest.trim()).filter(Boolean);
}

export interface ProfileLink {
  key: ProfileLinkKey;
  label: string;
  href: string;
}

interface Service {
  label: string;
  /** Builds a URL from the bare id or handle the service uses. */
  url: (value: string) => string;
}

/**
 * Each service in the order an academic reader looks for them: identity first,
 * then the indexes, then the code and the social accounts.
 */
const SERVICES: Record<ProfileKey, Service> = {
  orcid: { label: 'ORCID', url: (id) => `https://orcid.org/${id}` },
  scholar: {
    label: 'Google Scholar',
    url: (id) => `https://scholar.google.com/citations?user=${id}`,
  },
  semanticScholar: {
    label: 'Semantic Scholar',
    url: (id) => `https://www.semanticscholar.org/author/${id}`,
  },
  arxiv: { label: 'arXiv', url: (id) => `https://arxiv.org/a/${id}` },
  github: { label: 'GitHub', url: (id) => `https://github.com/${id}` },
  linkedin: {
    label: 'LinkedIn',
    // A profile path is `in/name`; a company or school is `company/name`, so a
    // value that already names its kind is kept as it is.
    url: (id) => `https://www.linkedin.com/${id.includes('/') ? id : `in/${id}`}`,
  },
  mastodon: {
    label: 'Mastodon',
    // `@user@instance` is how a Mastodon address is written down.
    url: (id) => {
      const [, user, host] = /^@?([^@]+)@(.+)$/.exec(id) ?? [];
      return user && host ? `https://${host}/@${user}` : `https://${id}`;
    },
  },
  bluesky: { label: 'Bluesky', url: (handle) => `https://bsky.app/profile/${handle}` },
  website: { label: 'Website', url: (value) => `https://${value}` },
};

const ORDER = Object.keys(SERVICES) as ProfileKey[];

const isUrl = (value: string): boolean => /^https?:\/\//i.test(value);

/** `https://www.example.org/~ada` is "example.org", for a site with no label. */
function hostOf(href: string): string {
  try {
    return new URL(href).hostname.replace(/^www\./, '');
  } catch {
    return href;
  }
}

/**
 * One link per website, in the order written. A label written for a site is
 * its name; without one, a single site is "Website", as it always was, and
 * several are told apart by their host, since three icons all called
 * "Website" leave a screen reader user guessing which is which.
 */
export function websiteLinks(value: Website | Website[] | undefined): ProfileLink[] {
  const sites = (Array.isArray(value) ? value : value ? [value] : [])
    .map((site) => (typeof site === 'string' ? { url: site } : site))
    .map((site) => ({ label: site.label?.trim(), url: site.url?.trim() ?? '' }))
    .filter((site) => site.url);

  return sites.map(({ label, url }) => {
    const href = isUrl(url) ? url : SERVICES.website.url(url);
    return {
      key: 'website' as const,
      label: label || (sites.length === 1 ? SERVICES.website.label : hostOf(href)),
      href,
    };
  });
}

/**
 * The links for one author, from values that may be either a full URL or the
 * bare id the service uses — `0000-0002-1825-0097` and
 * `https://orcid.org/0000-0002-1825-0097` both work, because remembering which
 * form each service wants is not work worth doing twice.
 */
export function profileLinks(author: Author): ProfileLink[] {
  const links: ProfileLink[] = [];

  // First: of everything in this row it is the one a reader is most likely to
  // have come for. A file kept under `public/` needs the deployment's base.
  const cv = author.cv?.trim();
  if (cv) {
    links.push({ key: 'cv', label: 'CV', href: isUrl(cv) ? cv : withBase(cv) });
  }

  for (const key of ORDER) {
    if (key === 'website') {
      links.push(...websiteLinks(author.links?.website));
      continue;
    }
    const value = author.links?.[key]?.trim();
    if (!value) continue;
    const { label, url } = SERVICES[key];
    links.push({ key, label, href: isUrl(value) ? value : url(value) });
  }

  if (author.email) {
    links.push({ key: 'email', label: 'Email', href: `mailto:${author.email}` });
  }

  return links;
}

/**
 * `links` narrowed to `keys`, in the order `keys` gives them.
 *
 * Empty keeps everything, which is what an unconfigured site gets: a row that
 * shows whatever the record holds, in the order above. Name any keys and they
 * are the row, in the order written — choosing what appears and choosing what
 * comes first are the same decision, and a surface that wants its GitHub first
 * should not have to reorder `SERVICES` to get it.
 *
 * A key the author has no value for is skipped rather than rendered empty. The
 * same list covers every author on the site, and a co-author with no ORCID
 * should not leave a hole where the owner has one.
 */
export function selectProfileLinks(
  links: ProfileLink[],
  keys: readonly ProfileLinkKey[],
): ProfileLink[] {
  if (keys.length === 0) return links;
  // Every link under a key, not the first: `website` can be several.
  return [...new Set(keys)].flatMap((key) => links.filter((link) => link.key === key));
}

/**
 * The links one surface shows for one author.
 *
 * Four surfaces render this row — the front page, the contact page, the author
 * card under every post and each card on the People page — and each has its
 * own list in the config, so a front page can carry two marks while the
 * contact page carries all eleven.
 *
 * `structured-data.ts` deliberately does not go through here. Its `sameAs` is
 * the record itself, not a view of it: the point of that array is to tell a
 * search engine which accounts are the same person, and a profile left out of
 * it stops being tied to the others. Trimming a row of icons is a layout
 * decision and should not quietly become a claim about who you are.
 */
export function profileLinksFor(surface: ProfileSurface, author: Author): ProfileLink[] {
  return selectProfileLinks(profileLinks(author), siteConfig.profileLinkKeys[surface]);
}
