import { Suspense, use } from 'react';
import { profileLinks, siteOwner } from '../lib/profiles';
import { RoutedHtml } from '../components/RoutedHtml';

const load = () => import('../content/contact.md') as Promise<{ html: string }>;
let promise: Promise<{ html: string }> | null = null;

function ContactBody() {
  promise ??= load();
  const { html } = use(promise);
  return <RoutedHtml className="prose" html={html} />;
}

/**
 * Whatever `contact.md` says, followed by the owner's profile row. The links
 * come from the same author record the posts use, so an address changes in one
 * place rather than three.
 */
export function ContactPage() {
  const person = siteOwner();
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
