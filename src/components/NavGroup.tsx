import { useEffect, useId, useRef, useState } from 'react';
import { isExternal } from '../lib/features';
import { withBase } from '../lib/urls';
import type { NavItem } from '../site.config';

/**
 * One entry under a group. Always a real anchor, never a router link: these go
 * to a page the app does not render — a standalone page of your own kept in
 * `public/`, or another site — and routing one would hand it to React Router,
 * which has no route for it and would answer with the 404 page.
 */
export function NavGroupLink({ item, onClick }: { item: NavItem; onClick?: () => void }) {
  const to = item.to ?? '';
  const away = isExternal(to);

  return (
    <a
      href={away ? to : withBase(to)}
      onClick={onClick}
      {...(away ? { rel: 'noopener noreferrer', target: '_blank' } : {})}
    >
      {item.label}
    </a>
  );
}

/**
 * A nav entry that opens a list rather than going somewhere: the wide-screen
 * half of a group. It is a disclosure button, not a hover menu — a menu that
 * needs a pointer to be held over it is unusable on a touch screen and awkward
 * with a keyboard, and this one answers to a click, to Enter, and to Escape.
 *
 * The narrow-screen half is in `MobileNav`, where the entries are simply
 * indented under the label; a panel that already fills the screen has no need
 * of a second layer that opens and closes.
 */
export function NavGroup({ item }: { item: NavItem & { items: NavItem[] } }) {
  const [open, setOpen] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);
  const toggle = useRef<HTMLButtonElement>(null);
  const id = useId();

  useEffect(() => {
    if (!open) return;

    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      setOpen(false);
      toggle.current?.focus();
    };

    // A click anywhere else closes it, including on another group's button,
    // which then opens its own.
    const onPointer = (event: MouseEvent) => {
      if (!wrap.current?.contains(event.target as Node)) setOpen(false);
    };

    document.addEventListener('keydown', onKey);
    document.addEventListener('pointerdown', onPointer);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('pointerdown', onPointer);
    };
  }, [open]);

  return (
    <div className="nav-group" ref={wrap}>
      <button
        aria-controls={id}
        aria-expanded={open}
        className="nav-group__toggle"
        onClick={() => {
          setOpen((was) => !was);
        }}
        ref={toggle}
        type="button"
      >
        {item.label}
        <svg
          aria-hidden="true"
          className="nav-group__caret"
          fill="none"
          focusable="false"
          height="10"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
          viewBox="0 0 24 24"
          width="10"
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>

      {/* Rendered either way so the links are in the document for a reader
          without JavaScript, who gets the list open and cannot close it. */}
      <div className={`nav-group__popover${open ? ' nav-group__popover--open' : ''}`} id={id}>
        {item.items.map((child) => (
          <NavGroupLink
            item={child}
            key={child.to}
            onClick={() => {
              setOpen(false);
            }}
          />
        ))}
      </div>
    </div>
  );
}
