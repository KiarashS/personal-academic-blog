import { Link } from 'react-router-dom';
import { profileLinks } from '../lib/profiles';
import type { Author } from '../lib/types';

interface AuthorCardProps {
  author: Author;
  /** `h2` on the post page, `h1` on the author's own page. */
  headingLevel?: 'h2' | 'h3';
  linkName?: boolean;
}

export function AuthorCard({ author, headingLevel = 'h3', linkName = true }: AuthorCardProps) {
  const Heading = headingLevel;
  const links = profileLinks(author);

  return (
    <section className="author-card">
      <Heading>
        {linkName ? <Link to={`/authors/${author.id}`}>{author.name}</Link> : author.name}
      </Heading>
      {author.role || author.affiliation ? (
        <p className="meta">{[author.role, author.affiliation].filter(Boolean).join(', ')}</p>
      ) : null}
      {author.bio ? <p className="author-card__bio">{author.bio}</p> : null}
      {links.length > 0 ? (
        <ul className="author-links" aria-label={`${author.name}: profiles and contact`}>
          {links.map((link) => (
            <li key={link.key}>
              <a
                className="author-links__link"
                href={link.href}
                {...(link.key === 'email'
                  ? {}
                  : { rel: 'me noopener noreferrer', target: '_blank' })}
              >
                {link.label}
              </a>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
