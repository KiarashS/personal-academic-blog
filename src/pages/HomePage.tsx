import { Suspense, use } from 'react';
import { Link } from 'react-router-dom';
import { PostList } from '../components/PostList';
import { authors } from '../content/authors';
import { profileLinks, researchInterests } from '../lib/profiles';
import { isEnabled } from '../lib/features';
import { posts } from '../lib/posts';
import { blogIndexPath } from '../lib/routes';
import { siteConfig } from '../site.config';
import type { Author } from '../lib/types';

const load = () => import('../content/home.md') as Promise<{ html: string }>;
let promise: Promise<{ html: string }> | null = null;

function HomeBody() {
  promise ??= load();
  const { html } = use(promise);
  return <div className="prose" dangerouslySetInnerHTML={{ __html: html }} />;
}

/** The record the page speaks for, or the first one if the config names none. */
function owner(): Author | undefined {
  return authors[siteConfig.owner] ?? Object.values(authors)[0];
}

/**
 * The front page of a site that is more than its blog: who you are, what you
 * work on, and what you have written lately. Everything on it is generated
 * from records that already exist, except the prose, which is `home.md`.
 *
 * Deliberately not a splash screen. A reader arriving from a citation or a
 * search result wants the answer to "who is this and what have they done",
 * which is information, not an animation.
 */
export function HomePage() {
  const person = owner();
  const links = person ? profileLinks(person) : [];
  const interests = person ? researchInterests(person) : [];
  const recent = posts.slice(0, 4);

  return (
    <>
      <h1 className="home__name">{siteConfig.title}</h1>
      {person?.role || person?.affiliation ? (
        <p className="meta home__role">
          {[person.role, person.affiliation].filter(Boolean).join(', ')}
        </p>
      ) : null}

      <Suspense fallback={<p className="empty">Loading…</p>}>
        <HomeBody />
      </Suspense>

      {interests.length > 0 ? (
        <p className="home__interests">
          <span className="author-card__label">Research interests:</span> {interests.join(', ')}
        </p>
      ) : null}

      {links.length > 0 ? (
        <ul className="author-links home__links" aria-label="Profiles and contact">
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

      {recent.length > 0 ? (
        <>
          <h2 className="section-heading home__heading">Recent posts</h2>
          <PostList posts={recent} />
          {posts.length > recent.length ? (
            <p className="home__more">
              <Link to={blogIndexPath()}>All {posts.length} posts</Link>
            </p>
          ) : null}
        </>
      ) : null}

      {isEnabled('publications') ? (
        <p className="home__more">
          <Link to="/publications">Papers, preprints and other published work</Link>
        </p>
      ) : null}
    </>
  );
}
