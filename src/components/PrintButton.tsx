import { useEffect } from 'react';

/**
 * Printing, and saving as PDF, which is the same dialog. Two things happen
 * before it opens: every `details` on the page is expanded, since a contents
 * list or a citation collapsed on paper is a blank line, and the pieces closed
 * that way are restored afterwards.
 *
 * The listeners are on `window`, not the click, so the browser's own Ctrl-P
 * gets the same treatment.
 */
export function PrintButton() {
  useEffect(() => {
    let opened: HTMLDetailsElement[] = [];

    const before = () => {
      // A second `beforeprint` without an `afterprint` between — which is what
      // a headless print run does — must not forget what the first one opened.
      if (opened.length > 0) return;
      opened = [...document.querySelectorAll<HTMLDetailsElement>('details:not([open])')];
      for (const element of opened) element.open = true;
    };

    const after = () => {
      for (const element of opened) element.open = false;
      opened = [];
    };

    window.addEventListener('beforeprint', before);
    window.addEventListener('afterprint', after);
    return () => {
      window.removeEventListener('beforeprint', before);
      window.removeEventListener('afterprint', after);
    };
  }, []);

  return (
    <button className="share__link share__print" type="button" onClick={() => window.print()}>
      Print
      <span className="visually-hidden"> or save as PDF</span>
    </button>
  );
}
