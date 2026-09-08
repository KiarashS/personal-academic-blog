import { use } from 'react';

export interface Resource<T> {
  /** The value if it is already here, or nothing. */
  peek: () => { current: T } | null;
  /** Starts the load, and resolves once `peek` will answer. */
  warm: () => Promise<T>;
}

/** Reads a resource during render: synchronously if it is warm, else suspends. */
export function useResource<T>(source: Resource<T>): T {
  const settled = source.peek();
  return settled ? settled.current : use(source.warm());
}

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
    promise ??= load().then(
      (result) => {
        value = { current: result };
        return result;
      },
      (error: unknown) => {
        promise = null;
        throw error;
      },
    );
    return promise;
  };

  return { peek: () => value, warm: start };
}
