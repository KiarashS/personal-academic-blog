import { useSyncExternalStore } from 'react';

const QUERY = '(prefers-reduced-motion: reduce)';

function subscribe(onChange: () => void): () => void {
  const media = window.matchMedia(QUERY);
  media.addEventListener('change', onChange);
  return () => media.removeEventListener('change', onChange);
}

const get = (): boolean => window.matchMedia(QUERY).matches;

/**
 * The server cannot know, and the prerendered markup is what the client has to
 * hydrate against, so it is built as though the answer were yes: a page that
 * arrives still and starts moving is the right way round, and the other way
 * round is a video already playing when a reader who asked for less motion
 * gets there.
 */
const onServer = (): boolean => true;

/** Whether the reader has asked their system for less movement. */
export function useReducedMotion(): boolean {
  return useSyncExternalStore(subscribe, get, onServer);
}
