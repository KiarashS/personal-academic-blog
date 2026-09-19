import { Link } from 'react-router-dom';
import { linkKind } from '../lib/link-kind';
import { withBase } from '../lib/urls';

/**
 * One link written in content, pointed wherever it needs to go.
 *
 * Four kinds, told apart by the target alone, so whoever writes a news entry or
 * the site notice never has to say which they meant. A URL somewhere else opens
 * in its own tab with `noopener`. A `mailto:` or a `tel:` is handed to another
 * application, so it stays in this tab — nothing navigates, and a new tab would
 * be left empty. A file under `public/` needs the deployment's base path and a
 * plain anchor, since the router has no route for it. Anything else is a page
 * of the site and navigates client-side.
 *
 * Shared by the news list and the notice banner, which take the same sentence
 * syntax and should not disagree about what a target means.
 */
export function Target({
  href,
  label,
  children,
}: {
  href: string;
  label?: string;
  children: React.ReactNode;
}) {
  switch (linkKind(href)) {
    case 'external':
      return (
        <a href={href} rel="noopener noreferrer" target="_blank" aria-label={label}>
          {children}
        </a>
      );
    case 'handoff':
      return (
        <a href={href} aria-label={label}>
          {children}
        </a>
      );
    case 'file':
      return (
        <a href={withBase(href)} aria-label={label}>
          {children}
        </a>
      );
    default:
      return (
        <Link to={href} aria-label={label}>
          {children}
        </Link>
      );
  }
}
