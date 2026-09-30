import { useSyncExternalStore } from 'react';
import { todayUtc } from './post-builder';

// Undefined under Vitest, which runs the modules without Vite's `define`.
const built: string = typeof __BUILD_DATE__ === 'string' ? __BUILD_DATE__ : todayUtc();

// The date never announces a change; a reader who keeps a tab open past
// midnight gets the new day on their next navigation.
const subscribe = (): (() => void) => () => {};

/**
 * Today in UTC, for a page that shows something until a date.
 *
 * The prerendered HTML was written on the build's day, and hydration has to
 * match it or React throws the markup away and draws the page again. So the
 * first render, on the server and in the browser alike, uses the build's day,
 * and React re-renders with the reader's own straight after. An opening whose
 * deadline passed since the last deploy is in the HTML, and gone before
 * anyone can read it.
 */
export function useToday(): string {
  return useSyncExternalStore(subscribe, todayUtc, () => built);
}
