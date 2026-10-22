import entries from '../content/publications.bib';
import { blogEnabled, isEnabled } from './features';
import { llmsTxt, type LlmsInput } from './llms';
import { posts } from './posts';
import { profileLinks, researchInterests, siteOwner } from './profiles';
import { blogIndexPath, postPath } from './routes';
import { selectedWork } from './selected-work';
import { canonicalUrl } from './urls';
import { siteConfig } from '../site.config';
import type { FeatureName } from '../site.config';

/** The pages worth naming, each with a line on what is there, when switched on. */
const PAGES: [FeatureName, string, string, string][] = [
  ['about', 'About', '/about', 'Who I am and what I work on'],
  ['research', 'Research', '/research', 'Research areas and the questions in each'],
  ['publications', 'Publications', '/publications', 'Every paper, newest first, with BibTeX'],
  ['news', 'News', '/news', 'Dated announcements'],
  ['people', 'People', '/people', 'The group'],
  ['openings', 'Openings', '/openings', 'Open positions'],
  ['slides', 'Slides', '/slides', 'Talks'],
  ['contact', 'Contact', '/contact', 'How to get in touch'],
];

/** `/llms.txt` for this site, or nothing when `llms.enabled` is off. */
export function configuredLlmsTxt(): string | null {
  if (!siteConfig.llms.enabled) return null;
  const owner = siteOwner();
  const blog = blogEnabled();
  const publications = isEnabled('publications') ? entries : [];

  const input: LlmsInput = {
    title: siteConfig.title,
    summary: siteConfig.home.description || siteConfig.description,
    person: {
      name: owner.name,
      role: owner.role,
      affiliation: owner.affiliation,
      tagline: siteConfig.home.tagline,
      bio: owner.bio,
      interests: researchInterests(owner),
    },
    note: siteConfig.llms.note,
    profiles: profileLinks(owner).filter((link) => link.key !== 'email'),
    pages: [
      ...(isEnabled('home')
        ? [{ title: 'Home', url: canonicalUrl('/'), note: 'The front page' }]
        : []),
      ...(blog
        ? [{ title: 'Blog', url: canonicalUrl(blogIndexPath()), note: 'Posts, newest first' }]
        : []),
      ...PAGES.filter(([feature]) => isEnabled(feature)).map(([, title, path, note]) => ({
        title,
        url: canonicalUrl(path),
        note,
      })),
    ],
    publications,
    selected: selectedWork(publications, { ...siteConfig.home.selectedWork, enabled: true }).map(
      (card) => card.key,
    ),
    posts: blog
      ? posts.map((post) => ({
          title: post.title,
          url: canonicalUrl(postPath(post.slug)),
          date: post.date,
          summary: post.summary,
        }))
      : [],
    more: [
      ...(blog ? [{ title: 'Atom feed', url: canonicalUrl('/feed.xml') }] : []),
      { title: 'Sitemap', url: canonicalUrl('/sitemap.xml') },
    ],
  };
  return llmsTxt(input);
}
