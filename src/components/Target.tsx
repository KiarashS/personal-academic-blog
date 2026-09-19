import { Link } from 'react-router-dom';
import { isExternal } from '../lib/features';
import { withBase } from '../lib/urls';

/**
 * One link written in content, pointed wherever it needs to go.
 *
 * Three kinds and they are told apart by the target alone, so whoever writes a
 * news entry or the site notice never has to say which they meant. An external
 * URL opens in its own tab and carries `noopener`; a file under `public/` needs
 * the deployment's base path and a plain anchor, since the router has no route
 * for it; anything else is a page of the site and navigates client-side.
 *
 * Shared by the news list and the notice banner, which take the same sentence
 * syntax and should not disagree about what a target means.
 */
/** A path with an extension is a file under `public/`, not a route of the app. */
const FILE = /\.[a-z0-9]{2,5}$/i;

export function Target({
  href,
  label,
  children,
}: {
  href: string;
  label?: string;
  children: React.ReactNode;
}) {
  if (isExternal(href)) {
    return (
      <a href={href} rel="noopener noreferrer" target="_blank" aria-label={label}>
        {children}
      </a>
    );
  }
  // A file needs the deployment's base path and a plain anchor; a page of the
  // site gets client-side navigation like every other internal link.
  if (FILE.test(href)) {
    return (
      <a href={withBase(href)} aria-label={label}>
        {children}
      </a>
    );
  }
  return (
    <Link to={href} aria-label={label}>
      {children}
    </Link>
  );
}
