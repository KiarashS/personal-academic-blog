import { Suspense } from 'react';
import { Avatar } from '../components/Avatar';
import { RoutedHtml } from '../components/RoutedHtml';
import { resource, useResource } from '../lib/resource';
import { Signature } from '../components/Signature';
import { profileLinks, siteOwner } from '../lib/profiles';
import { siteConfig } from '../site.config';

export const homeBody = resource(() => import('../content/home.md') as Promise<{ html: string }>);

function HomeBody() {
  return <RoutedHtml className="banner__lines" html={useResource(homeBody).html} />;
}

/**
 * The front page: a greeting, a name, a line about yourself, and the two or
 * three sentences in `home.md` that point at everything else. It fills the
 * window and stops there — no list of posts, because the blog has its own index
 * and the nav is one click away.
 */
export function HomePage() {
  const { greeting, signature: signed, avatar } = siteConfig.home;
  // The same links the contact page and every author card show, from the same
  // record: an ORCID that changes changes in one place.
  const links = siteConfig.home.profileLinks ? profileLinks(siteOwner()) : [];
  // The front page speaks for the person; the header's tagline speaks for the
  // writing. They are the same line until this one is filled in.
  const tagline = siteConfig.home.tagline || siteConfig.tagline;

  return (
    <div className="banner">
      <div className="banner__text">
        <h1 className="banner__name">
          {greeting ? <span className="banner__greeting">{greeting} </span> : null}
          {signed ? <Signature /> : siteConfig.title}
        </h1>
        <p className="banner__tagline">{tagline}</p>
        <Suspense fallback={<p className="empty">Loading…</p>}>
          <HomeBody />
        </Suspense>
        {links.length > 0 ? (
          <ul className="banner__links" aria-label={`${siteConfig.title}: profiles and contact`}>
            {links.map((link) => (
              <li key={link.key}>
                <a
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
      </div>
      {avatar ? <Avatar src={avatar} /> : null}
    </div>
  );
}
