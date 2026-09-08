import { useEffect } from 'react';

/** Long enough for a slow web font, short enough not to be a wait of its own. */
const FONT_TIMEOUT_MS = 1500;

/** Resolves when the fonts are ready, or when waiting for them stops paying. */
function fontsSettled(): Promise<unknown> {
  const fonts = document.fonts as FontFaceSet | undefined;
  if (!fonts) return Promise.resolve();
  return Promise.race([
    fonts.ready,
    new Promise((resolve) => setTimeout(resolve, FONT_TIMEOUT_MS)),
  ]);
}

/**
 * Takes the loading screen down. It renders nothing: the markup is in
 * `index.html`, because it has to be on screen before any of this has been
 * parsed, and the flag that shows it is set by the inline script there.
 *
 * The effect runs after React has committed, which on a prerendered page means
 * hydration is done — the point where the fallback a suspended boundary was
 * showing has been replaced by the real thing. Fonts get a moment after that,
 * capped, so the words do not reflow under the reader a beat after the screen
 * clears. Nothing here can strand anybody: the same inline script sets a timer
 * that clears the flag whatever happens to the bundle.
 */
export function SplashScreen() {
  useEffect(() => {
    let cancelled = false;

    void fontsSettled().then(() => {
      if (!cancelled) delete document.documentElement.dataset.loading;
    });

    return () => {
      cancelled = true;
    };
  }, []);

  return null;
}
