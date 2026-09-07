import { Suspense, use } from 'react';
import { withBase } from '../lib/urls';
import { siteConfig } from '../site.config';

const load = () => import('../content/home.md') as Promise<{ html: string }>;
let promise: Promise<{ html: string }> | null = null;

function HomeBody() {
  promise ??= load();
  const { html } = use(promise);
  return <div className="banner__lines" dangerouslySetInnerHTML={{ __html: html }} />;
}

const isUrl = (value: string): boolean => /^https?:\/\//i.test(value);

/** A signature kept under `public/` needs the deployment's base; a URL does not. */
function Signature({ src }: { src: string }) {
  return (
    <img
      className="banner__signature"
      src={isUrl(src) ? src : withBase(src)}
      alt={siteConfig.title}
      style={{ transform: `rotate(${siteConfig.home.signatureTilt}deg)` }}
    />
  );
}

/**
 * The front page: a name, a line about yourself, and the two or three sentences
 * in `home.md` that point at everything else. It fills the window and stops
 * there — there is no list of posts under it, because the blog has its own
 * index and the nav is one click away.
 */
export function HomePage() {
  const { greeting, signature } = siteConfig.home;

  return (
    <div className="banner">
      <h1 className="banner__name">
        {greeting ? <span className="banner__greeting">{greeting} </span> : null}
        {signature ? <Signature src={signature} /> : siteConfig.title}
      </h1>
      <p className="banner__tagline">{siteConfig.tagline}</p>
      <Suspense fallback={<p className="empty">Loading…</p>}>
        <HomeBody />
      </Suspense>
    </div>
  );
}
