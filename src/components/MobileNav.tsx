import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { visibleNav } from '../lib/features';

/** The two icons the one button shows, taken from the reference implementation. */
const BARS =
  'M3 5a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 10a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 15a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z';
const CROSS =
  'M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z';

/**
 * The narrow-screen half of the header, built to match kiarashs.ir: one button
 * that turns from three bars into a cross, and a sheet the width of the screen
 * that slides in from the right over 300ms and stops below the header.
 *
 * The button stays above the sheet and stays live, which is how the sheet is
 * closed again; tapping the sheet's own empty space closes it too, as does
 * Escape. The page behind cannot scroll while it is open.
 */
export function MobileNav() {
  const [open, setOpen] = useState(false);
  const toggle = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);

  // The sheet starts where the header ends, whatever the header happens to be:
  // it is taller on a page that shows the site's name than on the front page.
  useEffect(() => {
    const header = document.querySelector('.site-header');
    if (!header || !panel.current) return;
    panel.current.style.setProperty(
      '--mobile-nav-top',
      `${header.getBoundingClientRect().height}px`,
    );
  }, [open]);

  // The page behind must not scroll under the sheet.
  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', onKey);

    return () => {
      document.body.style.overflow = previous;
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const close = () => {
    setOpen(false);
    // Back to the button that opened it, rather than the top of the document.
    toggle.current?.focus();
  };

  return (
    <>
      <button
        aria-expanded={open}
        aria-label="Toggle Menu"
        className="mobile-nav__toggle"
        onClick={() => {
          setOpen((was) => !was);
        }}
        ref={toggle}
        type="button"
      >
        <svg aria-hidden="true" fill="currentColor" focusable="false" viewBox="0 0 20 20">
          <path clipRule="evenodd" d={open ? CROSS : BARS} fillRule="evenodd" />
        </svg>
      </button>

      <div
        className={`mobile-nav__panel${open ? ' mobile-nav__panel--open' : ''}`}
        // Tapping the sheet where there is no link closes it, as the reference
        // does with a full-size button behind its nav.
        onClick={(event) => {
          if (event.target === event.currentTarget) close();
        }}
        ref={panel}
      >
        <nav aria-label="Main">
          {visibleNav().map((item) => (
            <Link key={item.to} onClick={close} to={item.to}>
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
    </>
  );
}
