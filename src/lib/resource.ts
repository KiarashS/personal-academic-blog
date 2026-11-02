import { use } from 'react';

export interface Resource<T> {
  /** The value if it is already here, or nothing. */
  peek: () => { current: T } | null;
  /** Starts the load, and resolves once `peek` will answer. */
  warm: () => Promise<T>;
}

/**
 * Reads a resource during render: synchronously if it is warm, else suspends.
 *
 * Always through `use`, never around it. It used to return a warm value
 * without calling `use` at all, and that raced: a component that suspended on
 * a cold load, and whose load then landed before React retried it, skipped
 * `use` on the retry. React switches back to first-render hooks from inside
 * `use`, so the hook after it ran in the wrong mode and failed, React error
 * #467 inside #422, and React threw the server's markup away and drew the
 * post again. Safari's engine hit it in three loads of 78 in one test. A settled load's
 * promise is marked fulfilled (below), so `use` hands the value back at once
 * without suspending, in the browser and in the prerender alike.
 */
export function useResource<T>(source: Resource<T>): T {
  return use(source.warm());
}

/** What React's `use` reads off a promise to return its value without waiting. */
type Tracked<T> = Promise<T> & { status?: 'fulfilled'; value?: T };

/**
 * A value loaded once and then readable without suspending.
 *
 * `use(promise)` is what a reader needs: the module arrives over the network,
 * the boundary shows its fallback, the page fills in. The prerenderer needs the
 * opposite. A boundary React cannot finish before it flushes the shell — and it
 * flushes on size, so the front page with its inlined signature and any post of
 * ordinary length are past the mark long before the boundary is reached — has
 * its fallback written into the shell, with the real markup appended afterwards
 * in a hidden block for a script to swap in. That page is whole only for a
 * reader running JavaScript; with scripts off it stays on the word "Loading…".
 *
 * So the build warms each resource and renders twice. Once `value` is set,
 * `read` returns it without going near a promise, nothing suspends, and React
 * writes the page into the shell whatever its size. In the browser `value`
 * starts empty and it behaves as it always did.
 *
 * A rejection is not cached. A chunk that failed once — a flaky connection, or
 * a deploy that replaced it under an open tab — would otherwise keep failing
 * for as long as the page stayed open, however many times the reader retried.
 */
export function resource<T>(load: () => Promise<T>): Resource<T> {
  let value: { current: T } | null = null;
  let promise: Promise<T> | null = null;

  const start = (): Promise<T> => {
    const tracked: Tracked<T> = (promise ??= load().then(
      (result) => {
        value = { current: result };
        tracked.status = 'fulfilled';
        tracked.value = result;
        return result;
      },
      (error: unknown) => {
        promise = null;
        throw error;
      },
    ));
    return tracked;
  };

  return { peek: () => value, warm: start };
}
