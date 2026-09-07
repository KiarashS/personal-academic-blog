import { Suspense, use } from 'react';
import { Avatar } from '../components/Avatar';
import { RoutedHtml } from '../components/RoutedHtml';
import { Signature } from '../components/Signature';
import { siteConfig } from '../site.config';

const load = () => import('../content/home.md') as Promise<{ html: string }>;
let promise: Promise<{ html: string }> | null = null;

function HomeBody() {
  promise ??= load();
  const { html } = use(promise);
  return <RoutedHtml className="banner__lines" html={html} />;
}

/**
 * The front page: a greeting, a name, a line about yourself, and the two or
 * three sentences in `home.md` that point at everything else. It fills the
 * window and stops there — no list of posts, because the blog has its own index
 * and the nav is one click away.
 */
export function HomePage() {
  const { greeting, signature: signed, avatar } = siteConfig.home;
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
      </div>
      {avatar ? <Avatar src={avatar} /> : null}
    </div>
  );
}
