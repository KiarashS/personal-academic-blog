/** How long to wait before a second attempt, so a dead chunk cannot loop. */
const COOLDOWN_MS = 60_000;

const KEY = 'chunk-recovery-at';

/** Errors a browser reports when a chunk the page asked for is no longer there. */
const MODULE_FAILURE =
  /dynamically imported module|Importing a module script failed|error loading dynamically imported module|Failed to fetch|ChunkLoadError/i;

export function looksLikeMissingChunk(error: unknown): boolean {
  const message = error instanceof Error ? `${error.name} ${error.message}` : String(error);
  return MODULE_FAILURE.test(message);
}

/**
 * Whether to try recovering now. One attempt, then a minute's silence: a chunk
 * that is missing for some other reason would otherwise reload forever, and a
 * reader watching the page flash is worse off than one reading an explanation.
 */
export function shouldAttempt(last: string | null, now: number): boolean {
  if (!last) return true;
  const at = Number(last);
  return !Number.isFinite(at) || now - at > COOLDOWN_MS;
}

/**
 * A deploy replaces every hashed chunk, so a tab open across one asks for files
 * that are gone. GitHub Pages answers those with `404.html`, and the browser
 * refuses it: an HTML body where a module was expected.
 *
 * Reloading alone is not enough. The service worker may still be handing out
 * the build that asked for those chunks, and its cache may still hold that
 * build's assets, so the reloaded page fails the same way. Both are cleared
 * first, which costs a returning reader one cold load and gets them a page.
 */
export async function recoverFromMissingChunk({ force = false } = {}): Promise<boolean> {
  let storage: Storage | undefined;
  try {
    storage = window.sessionStorage;
  } catch {
    // Private mode, or storage blocked. One attempt is still better than none.
  }

  // A reader who presses the button has asked for it, cooldown or not.
  if (!force && storage && !shouldAttempt(storage.getItem(KEY), Date.now())) return false;
  storage?.setItem(KEY, String(Date.now()));

  try {
    const workers = await navigator.serviceWorker?.getRegistrations();
    await Promise.all((workers ?? []).map((worker) => worker.unregister()));
  } catch {
    // No worker, or no permission to look. The reload below still helps.
  }

  try {
    const names = await caches.keys();
    await Promise.all(names.map((name) => caches.delete(name)));
  } catch {
    // `caches` is unavailable outside a secure context.
  }

  window.location.reload();
  return true;
}
