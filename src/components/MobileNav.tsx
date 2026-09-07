import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { visibleNav } from '../lib/features';

/**
 * The narrow-screen half of the header. The nav is eight entries and more when
 * features are switched on, which is two wrapped rows on a phone above every
 * page; behind a button it is one row, and the panel gives each entry a target
 * a thumb can actually hit.
 *
 * A `dialog` rather than a div: Escape, the backdrop and focus containment come
 * with it, and it is inert when closed, so the prerendered HTML carries the
 * links for a crawler without showing them to a reader.
 */
export function MobileNav() {
  const panel = useRef<HTMLDialogElement>(null);
  const [open, setOpen] = useState(false);
  const close = () => {
    setOpen(false);
  };

  useEffect(() => {
    const dialog = panel.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <>
      <button
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-label="Menu"
        className="mobile-nav__toggle"
        onClick={() => {
          setOpen(true);
        }}
        type="button"
      >
        <svg
          aria-hidden="true"
          fill="none"
          focusable="false"
          height="20"
          stroke="currentColor"
          strokeLinecap="round"
          strokeWidth="2"
          viewBox="0 0 20 20"
          width="20"
        >
          <path d="M3 5h14M3 10h14M3 15h14" />
        </svg>
      </button>

      <dialog className="mobile-nav__panel" onClose={close} ref={panel}>
        <button aria-label="Close menu" className="mobile-nav__close" onClick={close} type="button">
          ×
        </button>
        <nav aria-label="Main">
          {visibleNav().map((item) => (
            // Closed here rather than on a route change: following a link
            // would otherwise leave the panel open over the page it went to.
            <Link key={item.to} onClick={close} to={item.to}>
              {item.label}
            </Link>
          ))}
        </nav>
      </dialog>
    </>
  );
}
