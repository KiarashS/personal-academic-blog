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
 *
 * Back from the entry plays it in reverse; see `installBackTransition`.
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
/** The card's teaser and title, named or unnamed for a transition. */
function name(card: Element, on: boolean): void {
  for (const [part, value] of [
    ['teaser', TEASER_NAME],
    ['title', TITLE_NAME],
  ] as const) {
    const element = card.querySelector<HTMLElement>(`[data-transition="${part}"]`);
    if (!element) continue;
    if (on) element.style.viewTransitionName = value;
    else element.style.removeProperty('view-transition-name');
  }
}

/** Holds a transition's update until `picture` has decoded, for at most 400ms. */
async function decoded(picture: HTMLImageElement | null | undefined): Promise<void> {
  if (picture) await Promise.race([picture.decode().catch(() => {}), pause(400)]);
}

/** The entry a card last turned into, and the address the card was on. */
let pending: { anchor: string; from: string } | null = null;

/**
 * Back, from the entry a card turned into, to the page the card was on: the
 * same flight the other way, the entry's teaser and title landing on the
 * card's.
 *
 * Back is a `popstate`, and React Router answers it the moment it fires, by
 * rendering the front page, which is too soon: a transition takes its first
 * picture at the next frame, by when the entry would be gone. So this listener
 * has to hear the event before the router does, hold it back, start the
 * transition, and inside the transition's update hand the router the same
 * `popstate` again. The address has already changed by then, so the router
 * renders the front page exactly as it would have.
 *
 * Before the router means registered before it: listeners on `window` are
 * called in the order they were added. `main.tsx` calls this once, ahead of
 * rendering the app. It answers one Back only, from a page with the entry on
 * it to the address the card was clicked on; any other `popstate` passes
 * straight through.
 */
export function installBackTransition(): void {
  window.addEventListener(
    'popstate',
    (event) => {
      if (replayed.has(event) || !pending) return;
      const { anchor, from } = pending;
      // One Back or Forward, whichever it was, and the browser has its own
      // scrolling back; a transition still pending after it would be a
      // different page's.
      pending = null;
      releaseScroll();
      if (!document.getElementById(anchor) || `${location.pathname}${location.search}` !== from) {
        return;
      }
      if (prefersLessMotion() || !canTransition()) return;

      event.stopImmediatePropagation();
      const transition = document.startViewTransition(async () => {
        const again = new PopStateEvent('popstate', { state: event.state as unknown });
        replayed.add(again);
        window.dispatchEvent(again);
        const card = await waitFor(
          () => document.querySelector<HTMLElement>(`[data-card="${anchor}"]`),
          2500,
        );
        if (card) {
          name(card, true);
          card.scrollIntoView({ block: 'nearest' });
          await decoded(card.querySelector('img'));
        }
      });
      void transition.finished.finally(() => {
        const card = document.querySelector(`[data-card="${anchor}"]`);
        if (card) name(card, false);
      });
    },
    true,
  );
}

/**
 * The `popstate`s handed on to the router, which this module must not catch
 * again. A set rather than a subclass, which would be evaluated on the server
 * where there is no `PopStateEvent`.
 */
const replayed = new WeakSet<Event>();

const prefersLessMotion = (): boolean =>
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export function transitionTo(card: HTMLElement, anchor: string, navigate: () => void): void {
  const from = `${location.pathname}${location.search}`;
  name(card, true);

  const transition = document.startViewTransition(async () => {
    navigate();
    const target = await waitFor(() => document.getElementById(anchor), 2500);
    target?.scrollIntoView();
    // The entry's picture, decoded, or the flight lands on an empty box and
    // the picture pops in after it. The card has already fetched the same
    // file, so this is a decode from the cache, not a download; a short limit
    // keeps a slow one from holding the page.
    await decoded(target?.querySelector('img'));
  });

  // The card is gone once the page has changed; if the transition is skipped
  // before that, it must not keep names a later one would find twice.
  void transition.finished.finally(() => name(card, false));
  pending = { anchor, from };
  // The browser restores the scroll position it saved for an address on
  // Back, and does it before the `popstate`: the entry would be moved to the
  // front page's position, at the top of the page, before the transition took
  // its first picture, and fly from there. The site's own scrolling decides
  // where a Back lands (`Layout`'s ScrollToTop), so the browser's is only
  // switched off while a Back may play this, and switched on again after.
  restoration ??= history.scrollRestoration;
  history.scrollRestoration = 'manual';
}

/** What `history.scrollRestoration` was before a card held it. */
let restoration: ScrollRestoration | null = null;

function releaseScroll(): void {
  if (restoration) history.scrollRestoration = restoration;
  restoration = null;
}
