import { CACHE_PREFIX } from './cache-name';

/** What a visit did about the service worker, for a test or a console. */
export type PwaAction = 'registered' | 'retired' | 'none';

/** The caches belonging to the worker, out of everything the origin holds. */
export function ownCaches(names: string[], prefix: string = CACHE_PREFIX): string[] {
  return names.filter((name) => name.startsWith(prefix));
}

/**
 * Tear down a worker and its caches.
 *
 * This is what makes `pwa.enabled: false` mean anything to a reader who was
 * already here. Dropping `sw.js` from the build does not retire a worker: an
 * installed one keeps serving until its next update check, and an update that
 * answers 404 leaves the old worker in place rather than removing it. So the
 * page that no longer wants a worker has to say so itself, once, on the next
 * visit — after which there is nothing left to run this again, which is fine,
 * because there is nothing left to clear.
 */
async function retire(): Promise<void> {
  try {
    const workers = await navigator.serviceWorker.getRegistrations();
    await Promise.all(workers.map((worker) => worker.unregister()));
  } catch {
    // No worker, or no permission to look.
  }

  try {
    const names = await caches.keys();
    await Promise.all(ownCaches(names).map((name) => caches.delete(name)));
  } catch {
    // `caches` is unavailable outside a secure context.
  }
}

/**
 * Bring the browser into line with the `pwa` setting, on every load.
 *
 * Registration failing is not worth bothering the reader about: the site works
 * without a worker, which is the whole point of prerendering it.
 */
export async function syncServiceWorker(enabled: boolean, base: string): Promise<PwaAction> {
  if (!('serviceWorker' in navigator)) return 'none';

  if (!enabled) {
    await retire();
    return 'retired';
  }

  try {
    await navigator.serviceWorker.register(`${base}sw.js`, { scope: base });
    return 'registered';
  } catch {
    return 'none';
  }
}
