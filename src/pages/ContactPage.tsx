import { Suspense } from 'react';
import { profileLinksFor, siteOwner } from '../lib/profiles';
import { RoutedHtml } from '../components/RoutedHtml';
import { resource, useResource } from '../lib/resource';

export const contactBody = resource(
  () => import('../content/contact.md') as Promise<{ html: string }>,
);

function ContactBody() {
  return <RoutedHtml className="prose" html={useResource(contactBody).html} />;
}

/**
 * Whatever `contact.md` says, followed by the owner's profile row. The links
 * come from the same author record the posts use, so an address changes in one
 * place rather than three, and `profileLinkKeys.contact` chooses which of them
 * this page lists — the page a reader opens to get in touch is the one with
 * the least reason to leave anything out.
 */
export function ContactPage() {
  const person = siteOwner();
  const links = person ? profileLinksFor('contact', person) : [];

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
