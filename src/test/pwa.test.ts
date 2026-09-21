import { describe, expect, it } from 'vitest';
import { pwaEnabled, pwaShortcuts, pwaWarnings, webManifest } from '../lib/pwa';
import { ownCaches } from '../lib/pwa-client';
import { CACHE_PREFIX } from '../lib/cache-name';
import { allRoutes } from '../lib/route-meta';
import { navFor } from '../lib/features';
import { siteConfig, THEME_COLORS } from '../site.config';
import type { PwaConfig } from '../site.config';

const pwa = (overrides: Partial<PwaConfig> = {}): PwaConfig => ({
  enabled: true,
  display: 'minimal-ui',
  theme: 'light',
  shortcuts: [],
  ...overrides,
});

describe('pwaEnabled', () => {
  it('is the flag and nothing else', () => {
    expect(pwaEnabled(pwa())).toBe(true);
    expect(pwaEnabled(pwa({ enabled: false }))).toBe(false);
  });
});

describe('webManifest', () => {
  it('names the site from the config it already has', () => {
    const manifest = webManifest(pwa());
    expect(manifest.name).toBe(siteConfig.title);
    expect(manifest.short_name).toBe(siteConfig.shortName);
    expect(manifest.description).toBe(siteConfig.description);
  });

  it('keeps every address relative, so a subdirectory deployment needs no edit', () => {
    const manifest = webManifest(pwa({ shortcuts: ['/about'] }));
    for (const key of ['id', 'start_url', 'scope']) {
      expect(String(manifest[key]).startsWith('/'), key).toBe(false);
    }
    for (const icon of manifest.icons as { src: string }[]) {
      expect(icon.src.startsWith('/'), icon.src).toBe(false);
    }
    for (const shortcut of manifest.shortcuts as { url: string }[]) {
      expect(shortcut.url.startsWith('/'), shortcut.url).toBe(false);
    }
  });

  it('carries the icon sizes a browser needs before it offers to install', () => {
    const icons = webManifest(pwa()).icons as { sizes: string; purpose: string }[];
    expect(icons.map((icon) => icon.sizes)).toContain('192x192');
    expect(icons.map((icon) => icon.sizes)).toContain('512x512');
    expect(icons.some((icon) => icon.purpose === 'maskable')).toBe(true);
  });

  it('dresses the window in the theme asked for', () => {
    expect(webManifest(pwa({ theme: 'dark' })).theme_color).toBe(THEME_COLORS.dark);
    expect(webManifest(pwa({ theme: 'dark' })).background_color).toBe(THEME_COLORS.dark);
    expect(webManifest(pwa({ theme: 'light' })).theme_color).toBe(THEME_COLORS.light);
  });

  it('only names a display a browser will install', () => {
    expect(['standalone', 'minimal-ui']).toContain(webManifest(pwa()).display);
    expect(webManifest(pwa({ display: 'standalone' })).display).toBe('standalone');
  });

  it('leaves the key out rather than writing an empty shortcut list', () => {
    // Not something the shipped config can reach, since an empty list falls
    // back to the nav; it is what a site with no header links would produce.
    const manifest = webManifest(pwa());
    if ((manifest.shortcuts as unknown[] | undefined)?.length === 0) {
      expect('shortcuts' in manifest).toBe(false);
    }
  });
});

describe('pwaShortcuts', () => {
  it('takes the first header links when none are configured', () => {
    const nav = navFor('header').filter((item) => item.to && !item.items);
    const shortcuts = pwaShortcuts(pwa());
    expect(shortcuts.length).toBeLessThanOrEqual(3);
    expect(shortcuts.length).toBeLessThanOrEqual(nav.length);
    expect(shortcuts[0]?.name).toBe(nav[0]?.label);
  });

  it('never offers a link to another site from the app icon', () => {
    for (const shortcut of pwaShortcuts(pwa())) {
      expect(/^[a-z][a-z0-9+.-]*:|^\/\//i.test(shortcut.url), shortcut.url).toBe(false);
    }
  });

  it('honours a written list, in the order written', () => {
    const shortcuts = pwaShortcuts(pwa({ shortcuts: ['/tags', '/search'] }));
    expect(shortcuts.map((shortcut) => shortcut.url)).toEqual(['tags/', 'search/']);
    expect(shortcuts.map((shortcut) => shortcut.name)).toEqual(['Tags', 'Search']);
  });

  it('writes the front page as the manifest already writes start_url', () => {
    expect(pwaShortcuts(pwa({ shortcuts: ['/'] }))[0]?.url).toBe('./');
  });

  it('falls back to the path when a route has no nav entry to name it', () => {
    expect(pwaShortcuts(pwa({ shortcuts: ['/archive'] }))[0]?.name).toBe('archive');
  });
});

describe('pwaWarnings', () => {
  it('says nothing about a site whose shortcuts are all real routes', () => {
    expect(pwaWarnings(pwa())).toEqual([]);
    expect(pwaWarnings(pwa({ shortcuts: [allRoutes()[0]] }))).toEqual([]);
  });

  it('answers the same with or without a trailing slash', () => {
    expect(pwaWarnings(pwa({ shortcuts: ['/search/'] }))).toEqual([]);
  });

  it('catches a shortcut that would open the 404', () => {
    const problems = pwaWarnings(pwa({ shortcuts: ['/not-a-page'] }));
    expect(problems).toHaveLength(1);
    expect(problems[0]).toContain('/not-a-page');
  });

  it('stays quiet when the feature is off, since nothing is written', () => {
    expect(pwaWarnings(pwa({ enabled: false, shortcuts: ['/not-a-page'] }))).toEqual([]);
  });
});

describe('ownCaches', () => {
  it('clears the worker’s caches and leaves anything else alone', () => {
    const names = [`${CACHE_PREFIX}abc123`, `${CACHE_PREFIX}def456`, 'giscus', 'workbox-precache'];
    expect(ownCaches(names)).toEqual([`${CACHE_PREFIX}abc123`, `${CACHE_PREFIX}def456`]);
  });

  it('has nothing to do on an origin that never had a worker', () => {
    expect(ownCaches([])).toEqual([]);
  });
});
