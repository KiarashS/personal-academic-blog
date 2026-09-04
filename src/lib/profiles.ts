import { withBase } from './urls';
import type { Author, ProfileKey } from './types';

export interface ProfileLink {
  key: ProfileKey | 'cv' | 'email';
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
