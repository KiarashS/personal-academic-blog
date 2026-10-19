import { createContext, useContext } from 'react';
import { useReducedMotion as useDeviceReducedMotion } from 'motion/react';

/*
 * `motion/react` as the mdxcn components see it: `vite.config.ts` resolves
 * their import of it here, and everything but one hook is motion's own.
 *
 * Every component starts its rows hidden (`initial="hidden"`, opacity 0) and
 * shows them when they scroll into view, unless the reader asks for less
 * motion, when `initial` is `false` and the rows render where they end. A
 * figure prerendered into the page has to be the second kind: the HTML is
 * read before any script runs, and without one, or before it arrives, opacity
 * 0 is a blank frame. So a figure rendered on the server, and the first render
 * in the browser that hydrates it, read "reduce" as true. A figure the browser
 * mounts itself, after a navigation, reads the reader's setting and animates.
 */
export const StillMotion = createContext(false);

export * from 'motion/react';

export function useReducedMotion(): boolean | null {
  const still = useContext(StillMotion);
  const device = useDeviceReducedMotion();
  return still ? true : device;
}
