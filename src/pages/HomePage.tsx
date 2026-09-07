import { Suspense, use } from 'react';
import signatureSource from '../content/signature.svg?raw';
import { siteConfig } from '../site.config';

const load = () => import('../content/home.md') as Promise<{ html: string }>;
let promise: Promise<{ html: string }> | null = null;

function HomeBody() {
  promise ??= load();
  const { html } = use(promise);
  return <div className="banner__lines" dangerouslySetInnerHTML={{ __html: html }} />;
}

/**
 * The file is stored exactly as it is published, `role="img"` included, which
 * axe reports as an image with no alternative text. The name belongs on the
 * wrapper, which is what the reader hears, so the inner element is hidden from
 * the accessibility tree here rather than by editing the drawing.
 */
const signature = signatureSource.replace('role="img"', 'aria-hidden="true" focusable="false"');

/**
 * The signature, inlined so `.ks-glyph` and `.ks-flourish` take their ink from
 * the page's own tokens. Loaded as an image it would keep whatever colour the
 * file was drawn in, and a reader who picks dark mode on a light system would
 * get dark ink on a dark page.
 */
function Signature() {
  return (
    <span
      className="banner__signature"
      role="img"
      aria-label={siteConfig.title}
      style={{ transform: `rotate(${siteConfig.home.signatureTilt}deg)` }}
      dangerouslySetInnerHTML={{ __html: signature }}
    />
  );
}

/**
 * The front page: a greeting, a name, a line about yourself, and the two or
 * three sentences in `home.md` that point at everything else. It fills the
 * window and stops there — no list of posts, because the blog has its own index
 * and the nav is one click away.
 */
export function HomePage() {
  const { greeting, signature: signed } = siteConfig.home;

  return (
    <div className="banner">
      <h1 className="banner__name">
        {greeting ? <span className="banner__greeting">{greeting} </span> : null}
        {signed ? <Signature /> : siteConfig.title}
      </h1>
      <p className="banner__tagline">{siteConfig.tagline}</p>
      <Suspense fallback={<p className="empty">Loading…</p>}>
        <HomeBody />
      </Suspense>
    </div>
  );
}
