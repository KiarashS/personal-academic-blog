import { useEffect, useRef, useState } from 'react';
import { isExternal } from '../lib/features';
import { withBase } from '../lib/urls';
import type { NavItem } from '../site.config';

/** The chevron that says the label opens something. */
export function NavCaret({ className }: { className: string }) {
  return (
    <svg
      aria-hidden="true"
      className={className}
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
  );
}

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
 * half of a group.
 *
 * `details` rather than a button and a class, because the browser already knows
 * how to open and close one and does it with no script at all. That is the
 * point here: written as a div the popover stayed `visibility: hidden` until a
 * class arrived, so with scripting off its links sat in the page unreachable.
 * Now they open on a click either way.
 *
 * The state below mirrors the element's rather than driving what is on screen —
 * CSS does that, from `[open]`. It exists so the two listeners are only
 * attached while the popover is up: Escape and a click elsewhere, which are the
 * things `details` has no opinion about.
 */
export function NavGroup({ item }: { item: NavItem & { items: NavItem[] } }) {
  const [open, setOpen] = useState(false);
  const wrap = useRef<HTMLDetailsElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      setOpen(false);
      wrap.current?.querySelector('summary')?.focus();
    };
    const onPointer = (event: PointerEvent) => {
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
    <details
      className="nav-group"
      onToggle={(event) => {
        setOpen(event.currentTarget.open);
      }}
      open={open}
      ref={wrap}
    >
      <summary className="nav-group__toggle">
        {item.label}
        <NavCaret className="nav-group__caret" />
      </summary>
      <div className="nav-group__popover">
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
    </details>
  );
}
