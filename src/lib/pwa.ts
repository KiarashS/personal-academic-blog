import { siteConfig, THEME_COLORS } from '../site.config';
import { isExternal, isNavGroup, navFor } from './features';
import { allRoutes } from './route-meta';
import type { PwaConfig } from '../site.config';

/** How many launcher shortcuts to take from the nav when none are configured. */
const DEFAULT_SHORTCUTS = 3;

/** Whether the site ships a manifest and a worker at all. */
export function pwaEnabled(pwa: PwaConfig = siteConfig.pwa): boolean {
  return pwa.enabled === true;
}

/** One entry of the menu a long press on the installed icon opens. */
export interface Shortcut {
  name: string;
  url: string;
}

/**
 * A route as the manifest wants it written: relative to the manifest's own
 * address, so the same file works at a domain root and in a subdirectory. `/`
 * is `./`, which is what `start_url` already says.
 */
function relativeUrl(route: string): string {
  const path = route.replace(/^\/+/, '').replace(/\/+$/, '');
  return path ? `${path}/` : './';
}

/**
 * The launcher shortcuts, resolved.
 *
 * With none configured this is the top of the header nav, which is the closest
 * thing the site has to a statement of where it wants readers to go, and which
 * is already filtered to the features that are on. Groups are dropped — a
 * shortcut opens a page, and a group is a label for several — as are links to
 * other sites, which have no business in a menu attached to this app's icon.
 */
export function pwaShortcuts(pwa: PwaConfig = siteConfig.pwa): Shortcut[] {
  if (pwa.shortcuts.length > 0) {
    const titles = new Map(
      navFor('header')
        .filter((item) => item.to && !isNavGroup(item))
        .map((item) => [item.to as string, item.label]),
    );
    return pwa.shortcuts.map((route) => ({
      name: titles.get(route) ?? (route.replace(/^\/+|\/+$/g, '') || 'Home'),
      url: relativeUrl(route),
    }));
  }

  return navFor('header')
    .filter((item) => item.to && !isNavGroup(item) && !isExternal(item.to))
    .slice(0, DEFAULT_SHORTCUTS)
    .map((item) => ({ name: item.label, url: relativeUrl(item.to as string) }));
}

/**
 * The web app manifest, as an object for the prerenderer to serialise.
 *
 * `id`, `start_url`, `scope` and every icon are relative to the manifest
 * itself, so a deployment under a subdirectory needs no edit — the same reason
 * the worker is generated rather than kept in `public/`.
 *
 * `theme_color` and `background_color` are one value each because a manifest
 * has no media query: a browser reads these when the app is installed and
 * dresses the window in them from then on, whatever the reader's system says.
 */
export function webManifest(pwa: PwaConfig = siteConfig.pwa): Record<string, unknown> {
  const colour = THEME_COLORS[pwa.theme];
  const shortcuts = pwaShortcuts(pwa);

  return {
    name: siteConfig.title,
    short_name: siteConfig.shortName,
    description: siteConfig.description,
    lang: 'en',
    dir: 'ltr',
    id: './',
    start_url: './',
    scope: './',
    display: pwa.display,
    background_color: colour,
    theme_color: colour,
    icons: [
      { src: 'favicons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: 'favicons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      {
        src: 'favicons/icon-maskable-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
    ...(shortcuts.length > 0 ? { shortcuts } : {}),
  };
}

/**
 * What the build should say about the PWA settings.
 *
 * A shortcut is the one setting here that can quietly name nothing: it is a
 * path typed into a config, it is only ever seen after the site is installed,
 * and a long press that opens the 404 page is not something its author is
 * likely to be the one to find.
 */
export function pwaWarnings(pwa: PwaConfig = siteConfig.pwa): string[] {
  if (!pwaEnabled(pwa)) return [];

  const known = new Set(allRoutes());
  const problems: string[] = [];

  for (const route of pwa.shortcuts) {
    const path = route.replace(/\/+$/, '') || '/';
    if (!known.has(path)) {
      problems.push(
        `pwa: shortcut “${route}” is not a page the site renders, so a long ` +
          'press on the installed icon would open the 404. Name a route, or ' +
          'clear `pwa.shortcuts` to take the first header links instead.',
      );
    }
  }
  return problems;
}
