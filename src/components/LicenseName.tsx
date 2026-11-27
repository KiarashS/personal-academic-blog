import type { License } from '../lib/types';

/**
 * A licence's name, linked to its deed when it has one. `rel="license"` marks
 * the licence of the page's own content, for a crawler or a reference manager
 * looking for it; only one link on a page should carry it.
 */
export function LicenseName({ license, main = false }: { license: License; main?: boolean }) {
  if (!license.url) return <span className="license-name">{license.name}</span>;
  return (
    <a className="license-name" href={license.url} rel={main ? 'license' : undefined}>
      {license.name}
    </a>
  );
}
