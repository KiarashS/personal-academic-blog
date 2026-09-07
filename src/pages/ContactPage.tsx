import { Suspense, use } from 'react';
import { authors } from '../content/authors';
import { profileLinks } from '../lib/profiles';
import { siteConfig } from '../site.config';

const load = () => import('../content/contact.md') as Promise<{ html: string }>;
let promise: Promise<{ html: string }> | null = null;

function ContactBody() {
  promise ??= load();
  const { html } = use(promise);
  return <div className="prose" dangerouslySetInnerHTML={{ __html: html }} />;
}

/**
 * Whatever `contact.md` says, followed by the owner's profile row. The links
 * come from the same author record the posts use, so an address changes in one
 * place rather than three.
 */
export function ContactPage() {
  const person = authors[siteConfig.owner] ?? Object.values(authors)[0];
  const links = person ? profileLinks(person) : [];

  return (
    <>
      <h1>Contact</h1>
      <Suspense fallback={<p className="empty">Loading…</p>}>
        <ContactBody />
      </Suspense>
      {links.length > 0 ? (
        <ul className="author-links" aria-label="Profiles and contact">
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
    </>
  );
}
