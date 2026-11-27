import { siteConfig } from '../site.config';
import type { License } from './types';

/**
 * Licences by the names an author is likely to write, so `license: CC BY-SA
 * 4.0` in a post or `content: 'CC BY 4.0'` in the site config links to the
 * right deed without the address being typed out. Names are compared with
 * case, spaces, hyphens and dots ignored, so the SPDX forms (`CC-BY-SA-4.0`,
 * `CC0-1.0`, `Apache-2.0`) match as well. An empty address is a statement
 * with no deed to link to.
 */
const KNOWN: Record<string, string> = {
  'CC BY 4.0': 'https://creativecommons.org/licenses/by/4.0/',
  'CC BY-SA 4.0': 'https://creativecommons.org/licenses/by-sa/4.0/',
  'CC BY-NC 4.0': 'https://creativecommons.org/licenses/by-nc/4.0/',
  'CC BY-NC-SA 4.0': 'https://creativecommons.org/licenses/by-nc-sa/4.0/',
  'CC BY-ND 4.0': 'https://creativecommons.org/licenses/by-nd/4.0/',
  'CC BY-NC-ND 4.0': 'https://creativecommons.org/licenses/by-nc-nd/4.0/',
  'CC0 1.0': 'https://creativecommons.org/publicdomain/zero/1.0/',
  MIT: 'https://opensource.org/license/mit',
  'Apache 2.0': 'https://www.apache.org/licenses/LICENSE-2.0',
  'BSD 3-Clause': 'https://opensource.org/license/bsd-3-clause',
  'All rights reserved': '',
};

const key = (name: string) => name.toLowerCase().replace(/[^a-z0-9]/g, '');
const BY_KEY = new Map(Object.entries(KNOWN).map(([name, url]) => [key(name), { name, url }]));

/**
 * A licence as written, a known name or `{ name, url }`, made whole; nothing
 * for an empty or unreadable value. A name this table does not know is kept
 * as written, with no link.
 */
export function resolveLicense(written: unknown): License | undefined {
  if (typeof written === 'string') {
    const name = written.trim();
    if (!name) return undefined;
    const known = BY_KEY.get(key(name));
    if (!known) return { name };
    return known.url ? { name: known.name, url: known.url } : { name: known.name };
  }
  if (written && typeof written === 'object' && !Array.isArray(written)) {
    const { name, url } = written as { name?: unknown; url?: unknown };
    if (typeof name !== 'string' || !name.trim()) return undefined;
    const fromTable = resolveLicense(name);
    const link = typeof url === 'string' && url.trim() ? url.trim() : fromTable?.url;
    return link ? { name: name.trim(), url: link } : { name: name.trim() };
  }
  return undefined;
}

/** What the build should say about a post's `license`. */
export function licenseWarnings(slug: string, written: unknown): string[] {
  if (written === undefined || written === null) return [];
  const license = resolveLicense(written);
  if (!license) {
    return [
      `${slug}: \`license: ${JSON.stringify(written)}\` is not a licence's name, so the post ` +
        "is under the site's. Write a name, `license: CC BY-SA 4.0`, or `license: { name, url }`.",
    ];
  }
  if (!license.url && typeof written === 'string' && !BY_KEY.has(key(license.name))) {
    return [
      `${slug}: \`license: ${license.name}\` is not a licence this site knows the address of, ` +
        'so it is shown without a link. Write `license: { name: …, url: … }` to link it.',
    ];
  }
  return [];
}

/** The site's licence for text and figures. */
export function contentLicense(): License {
  return resolveLicense(siteConfig.license.content) ?? { name: 'All rights reserved' };
}

/** The site's licence for code in posts, or nothing when it has no separate one. */
export function codeLicense(): License | undefined {
  return resolveLicense(siteConfig.license.code);
}

/** A licence as plain text, for a feed: its name and, where it has one, its deed. */
export function licenseText(license: License): string {
  return license.url ? `${license.name} (${license.url})` : license.name;
}

/** The site's licences in a line of plain text, for a feed's `<rights>`. */
export function siteRights(year: string): string {
  const code = codeLicense();
  return (
    `© ${year} ${siteConfig.title}. Text and figures: ${licenseText(contentLicense())}` +
    (code ? `; code: ${licenseText(code)}` : '') +
    '; except where a post or a caption says otherwise.'
  );
}
