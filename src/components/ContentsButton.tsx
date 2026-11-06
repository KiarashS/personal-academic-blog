import { useEffect, useId, useRef, useState } from 'react';
import { contentsButtonShown, headingInView, railShown } from '../lib/contents';
import { siteConfig } from '../site.config';
import type { Heading } from '../lib/types';

/**
 * The contents within reach anywhere in a post, on a screen with no margin for
 * the rail: a button in the bottom corner that opens the list from the bottom
 * of the window, with the reader's section marked.
 *
 * It comes once the collapsed list at the top of the post has gone up out of
 * view, so the two are never on the screen together and nothing covers the
 * opening of the post; and it goes again if the reader comes back up to it.
 * From 80rem up the rail is the contents and CSS takes the button away, unless
 * the site has no rail (`contents.wide: 'inline'`).
 *
 * It stands in the corner of the rail's side, opposite the pair that leads
 * out of the post (PostFooterLinks), and takes their look: the same 44px
 * circle below 80rem, the same pill with its label above.
 *
 * The list is a `dialog` opened with `showModal`, so the focus trap, Escape and
 * returning the focus to the button are the browser's. Following a heading
 * closes it and the link goes where it always did. Neither is in the
 * prerendered page: the button arrives on scrolling and the list on asking,
 * and a reader without JavaScript has the collapsed list.
 */
function Outline() {
  return (
    <svg
      aria-hidden="true"
      fill="none"
      focusable="false"
      height="15"
      stroke="currentColor"
      strokeLinecap="round"
      strokeWidth="2"
      viewBox="0 0 24 24"
      width="15"
    >
      <path d="M3 5h18" />
      <path d="M8 10h13" />
      <path d="M8 15h13" />
      <path d="M3 20h18" />
    </svg>
  );
}

export function ContentsButton({ headings }: { headings: Heading[] }) {
  const [shown, setShown] = useState(false);
  // The section marked, measured as the list opens; nothing while it is shut.
  const [current, setCurrent] = useState<string | undefined>(undefined);
  const [open, setOpen] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const list = useRef<HTMLOListElement>(null);
  const heading = useRef<HTMLParagraphElement>(null);
  const frame = useRef(0);
  const title = useId();

  useEffect(() => {
    const measure = () => {
      frame.current = 0;
      setShown(contentsButtonShown(document.querySelector('.toc')?.getBoundingClientRect()));
    };
    const schedule = () => {
      if (frame.current === 0) frame.current = window.requestAnimationFrame(measure);
    };

    measure();
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule);
    return () => {
      window.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', schedule);
      if (frame.current !== 0) window.cancelAnimationFrame(frame.current);
    };
  }, []);

  // The sheet is put in the page when it is asked for, and opened once it is
  // there, with the marked heading in view in a list longer than the sheet.
  useEffect(() => {
    if (!open) return;
    dialog.current?.showModal();
    // The focus starts on the sheet's title rather than on its first control,
    // the close button, which Safari rings even for a tap; a screen reader
    // starts at the top of the sheet, and Tab reaches the button next.
    heading.current?.focus();
    if (current) {
      list.current
        ?.querySelector(`[href="#${CSS.escape(current)}"]`)
        ?.scrollIntoView({ block: 'nearest' });
    }
  }, [open, current]);

  if (headings.length === 0) return null;

  const show = () => {
    setCurrent(headingInView(headings.map((heading) => heading.id)));
    setOpen(true);
  };

  const close = () => dialog.current?.close();

  const side = siteConfig.contents.side === 'right' ? 'right' : 'left';
  const narrowOnly = railShown() ? ' contents-button--narrow-only' : '';

  return (
    <>
      {shown ? (
        <div className={`contents-button contents-button--${side}${narrowOnly}`}>
          <button
            aria-haspopup="dialog"
            aria-label="Contents"
            className="post-exit__link"
            onClick={show}
            type="button"
          >
            <Outline />
            <span className="post-exit__label">Contents</span>
          </button>
        </div>
      ) : null}
      {open ? (
        <dialog
          aria-labelledby={title}
          className="contents-sheet"
          // A press on the backdrop lands on the dialog itself; one inside it
          // lands on what is inside.
          onClick={(event) => {
            if (event.target === dialog.current) close();
          }}
          onClose={() => {
            setOpen(false);
            setCurrent(undefined);
          }}
          ref={dialog}
        >
          <div className="contents-sheet__inner">
            <div className="contents-sheet__bar">
              <p className="contents-sheet__title" id={title} ref={heading} tabIndex={-1}>
                Contents
              </p>
              <button
                aria-label="Close the contents"
                className="contents-sheet__close"
                onClick={close}
                type="button"
              >
                <svg
                  aria-hidden="true"
                  fill="none"
                  focusable="false"
                  height="16"
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeWidth="2"
                  viewBox="0 0 24 24"
                  width="16"
                >
                  <path d="M6 6l12 12M18 6 6 18" />
                </svg>
              </button>
            </div>
            <nav aria-labelledby={title}>
              <ol ref={list}>
                {headings.map((heading) => (
                  <li
                    key={heading.id}
                    className={heading.depth === 3 ? 'contents-sheet__sub' : undefined}
                  >
                    <a
                      aria-current={heading.id === current ? 'location' : undefined}
                      href={`#${heading.id}`}
                      onClick={close}
                    >
                      {heading.number && <span className="toc__number">{heading.number}</span>}
                      {heading.text}
                    </a>
                  </li>
                ))}
              </ol>
            </nav>
          </div>
        </dialog>
      ) : null}
    </>
  );
}
