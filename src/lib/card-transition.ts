/*
 * A selected-work card turning into its entry on the Publications page.
 *
 * The View Transitions API (`document.startViewTransition`) takes a picture of
 * the page, lets the page change underneath, takes a second picture, and
 * animates between them. An element with a `view-transition-name` in both
 * pictures is animated on its own, from where it was to where it is: here the
 * card's teaser and title, which land on the entry's teaser and title, while
 * the rest of the page cross-fades.
 *
 * The names go on the clicked card only, just before the first picture, and
 * on the one entry the link points at (`PublicationsPage` reads the hash). A
 * name may be on one element per picture, and four cards with names would
 * fly four teasers at entries a reader is not looking at.
 *
 * Where the API is missing, or the reader asked for less motion, nothing is
 * done here and the link navigates as any link does.
 */

export const TEASER_NAME = 'publication-teaser';
export const TITLE_NAME = 'publication-title';

/** Whether this browser can animate a navigation at all. */
export const canTransition = (): boolean =>
  typeof document !== 'undefined' && typeof document.startViewTransition === 'function';

/**
 * Resolves once `find` returns an element, or with nothing after `timeout`
 * ms: the Publications page is a chunk of its own and may still be arriving,
 * and the second picture must not be taken before the entry is on the page.
 *
 * Polled on a timer, not on animation frames: while a transition's update
 * runs the browser holds rendering, and `requestAnimationFrame` does not fire
 * until it is done, so a wait built on it never ends and the browser gives
 * the transition up after four seconds.
 */
function waitFor(find: () => HTMLElement | null, timeout: number): Promise<HTMLElement | null> {
  return new Promise((resolve) => {
    const started = performance.now();
    const check = () => {
      const found = find();
      if (found || performance.now() - started > timeout) resolve(found);
      else window.setTimeout(check, 16);
    };
    check();
  });
}

const pause = (ms: number): Promise<void> =>
  new Promise((resolve) => window.setTimeout(resolve, ms));

/**
 * Navigates inside a view transition. `navigate` changes the route; the
 * transition waits for the element `anchor` names to exist, scrolls it into
 * view as the site does for any link to a fragment, and then lets the browser
 * take its second picture.
 */
export function transitionTo(card: HTMLElement, anchor: string, navigate: () => void): void {
  const teaser = card.querySelector<HTMLElement>('[data-transition="teaser"]');
  const title = card.querySelector<HTMLElement>('[data-transition="title"]');
  if (teaser) teaser.style.viewTransitionName = TEASER_NAME;
  if (title) title.style.viewTransitionName = TITLE_NAME;

  const transition = document.startViewTransition(async () => {
    navigate();
    const target = await waitFor(() => document.getElementById(anchor), 2500);
    target?.scrollIntoView();
    // The entry's picture, decoded, or the flight lands on an empty box and
    // the picture pops in after it. The card has already fetched the same
    // file, so this is a decode from the cache, not a download; a short limit
    // keeps a slow one from holding the page.
    const picture = target?.querySelector('img');
    if (picture) await Promise.race([picture.decode().catch(() => {}), pause(400)]);
  });

  // The card is gone once the page has changed; if the transition is skipped
  // before that, it must not keep names a later one would find twice.
  void transition.finished.finally(() => {
    teaser?.style.removeProperty('view-transition-name');
    title?.style.removeProperty('view-transition-name');
  });
}
