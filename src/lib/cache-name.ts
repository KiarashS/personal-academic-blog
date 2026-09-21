/**
 * The prefix every cache the service worker opens is named with.
 *
 * It lives alone because two sides read it and they run in different worlds:
 * `scripts/prerender.mjs` writes it into the generated `sw.js`, and
 * `lib/pwa-client.ts` uses it to find those caches again when the feature is
 * switched off. A prefix that drifted between the two would leave a retired
 * site's storage behind with nothing left to clear it.
 */
export const CACHE_PREFIX = 'site-';
