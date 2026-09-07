import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { metaFor } from '../lib/route-meta';
import { serialiseJsonLd, structuredDataFor } from '../lib/structured-data';
import { canonicalUrl } from '../lib/urls';

function setMeta(selector: string, attribute: 'name' | 'property', key: string, content: string) {
  let tag = document.head.querySelector<HTMLMetaElement>(selector);
  if (!tag) {
    tag = document.createElement('meta');
    tag.setAttribute(attribute, key);
    document.head.appendChild(tag);
  }
  tag.content = content;
}

const JSON_LD = 'script[type="application/ld+json"]';

/**
 * The prerenderer writes the front page's `Person` block into its static HTML.
 * A reader who then clicks through to a post is on a different page with the
 * same head, so the block is removed on the way out and put back on the way in
 * — a crawler that runs the page would otherwise read every route as a person.
 */
function setJsonLd(pathname: string) {
  const data = structuredDataFor(pathname);
  const existing = document.head.querySelector(JSON_LD);

  if (!data) {
    existing?.remove();
    return;
  }

  const script = existing ?? document.head.appendChild(document.createElement('script'));
  script.setAttribute('type', 'application/ld+json');
  script.textContent = serialiseJsonLd(data);
}

/**
 * Keeps the head in step during client-side navigation, using the same
 * `metaFor` the prerenderer used to write the static HTML that crawlers read.
 * Mounted once in the layout; every route is derived from the path.
 */
export function PageMeta() {
  const { pathname } = useLocation();

  useEffect(() => {
    const { title, description } = metaFor(pathname);
    const url = canonicalUrl(pathname);

    document.title = title;
    setMeta('meta[name="description"]', 'name', 'description', description);
    setMeta('meta[property="og:title"]', 'property', 'og:title', title);
    setMeta('meta[property="og:description"]', 'property', 'og:description', description);
    setMeta('meta[property="og:url"]', 'property', 'og:url', url);

    setJsonLd(pathname);

    const canonical = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (canonical) canonical.href = url;
  }, [pathname]);

  return null;
}
