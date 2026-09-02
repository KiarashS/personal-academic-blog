import { Link } from 'react-router-dom';
import type { Author } from '../lib/types';

const LINK_LABELS: Record<string, string> = {
  website: 'Website',
  scholar: 'Google Scholar',
  orcid: 'ORCID',
  github: 'GitHub',
  mastodon: 'Mastodon',
  arxiv: 'arXiv',
};

interface AuthorCardProps {
  author: Author;
  /** `h2` on the post page, `h1` on the author's own page. */
  headingLevel?: 'h2' | 'h3';
  linkName?: boolean;
}

export function AuthorCard({ author, headingLevel = 'h3', linkName = true }: AuthorCardProps) {
  const Heading = headingLevel;
  const links = Object.entries(author.links ?? {}).filter(([, href]) => Boolean(href));

  return (
    <section className="author-card">
      <Heading>
        {linkName ? <Link to={`/authors/${author.id}`}>{author.name}</Link> : author.name}
      </Heading>
      {author.role || author.affiliation ? (
        <p className="meta">
          {[author.role, author.affiliation].filter(Boolean).join(', ')}
        </p>
      ) : null}
      {author.bio ? <p className="author-card__bio">{author.bio}</p> : null}
      {links.length > 0 || author.email ? (
        <ul className="author-links">
          {author.email ? (
            <li>
              <a href={`mailto:${author.email}`}>Email</a>
            </li>
          ) : null}
          {links.map(([key, href]) => (
            <li key={key}>
              <a href={href} target="_blank" rel="noopener noreferrer me">
                {LINK_LABELS[key] ?? key}
              </a>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
