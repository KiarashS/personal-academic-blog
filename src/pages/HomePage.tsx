import { useEffect, useMemo } from 'react';
import { Avatar } from '../components/Avatar';
import { HomeNews } from '../components/HomeNews';
import { ProfileIcon } from '../components/ProfileIcon';
import { RoutedHtml } from '../components/RoutedHtml';
import { resource, useResource } from '../lib/resource';
import { Signature } from '../components/Signature';
import { profileLinksFor, siteOwner } from '../lib/profiles';
import { fillLatestPosts } from '../lib/latest-posts';
import { posts } from '../lib/posts';
import { siteConfig } from '../site.config';

export const homeBody = resource(() => import('../content/home.md') as Promise<{ html: string }>);

/** Space kept between the list and the window's edge, in pixels. */
const EDGE = 12;

/**
 * The lines from `home.md`, with `{{latest_posts}}` filled in (see
 * `src/lib/latest-posts.ts`).
 *
 * The list opens on hover and focus by CSS alone. What this adds is what CSS
 * cannot do: a tap that opens it and a second tap that closes it, for a phone,
 * which has no hover; Escape, which closes it and hands focus back to the
 * button; a click anywhere else, which closes it; `aria-expanded`, kept true
 * while the list shows; and a nudge left when the list would run past the
 * right edge of the window, which it does when the button ends a long line.
 */
function HomeBody() {
  const source = useResource(homeBody).html;
  const html = useMemo(() => fillLatestPosts(source, posts, siteConfig.home.latestPosts), [source]);
  useEffect(() => {
    const boxes = [...document.querySelectorAll<HTMLElement>('.banner__lines [data-latest-posts]')];
    if (boxes.length === 0) return;

    const parts = (box: HTMLElement) => ({
      button: box.querySelector<HTMLButtonElement>('.latest-posts__toggle'),
      panel: box.querySelector<HTMLElement>('.latest-posts__panel'),
    });
    // From layout, not from the panel's own box: that one carries the
    // transform being animated, so measured mid-transition it reports where
    // the panel is passing through rather than where it will rest.
    const place = (box: HTMLElement) => {
      const { panel } = parts(box);
      if (!panel) return;
      const left = box.getBoundingClientRect().left + panel.offsetLeft;
      const over = left + panel.offsetWidth - (document.documentElement.clientWidth - EDGE);
      const shift = over > 0 ? -Math.min(over, left - EDGE) : 0;
      panel.style.setProperty('--latest-shift', `${Math.round(shift)}px`);
    };
    // `data-closed` is a close the reader asked for, with Escape or a click,
    // while the pointer or the focus is still on it: it outranks the CSS that
    // opens the list on hover and focus until both have moved away.
    const sync = (box: HTMLElement) => {
      const shown =
        !box.hasAttribute('data-closed') &&
        (box.hasAttribute('data-open') || box.matches(':hover, :focus-within'));
      parts(box).button?.setAttribute('aria-expanded', String(shown));
      if (shown) place(box);
    };
    const close = (box: HTMLElement, held = false) => {
      box.removeAttribute('data-open');
      box.toggleAttribute('data-closed', held);
      sync(box);
    };
    const isShown = (box: HTMLElement) =>
      parts(box).button?.getAttribute('aria-expanded') === 'true';
    // Placed before it is first seen, so it opens where it will stay.
    boxes.forEach(place);

    const cleanups = boxes.map((box) => {
      const { button } = parts(box);
      // A click or a tap pins the list open, and the next one closes it. It
      // goes by the pin and not by whether the list shows: a tap is also a
      // hover and a focus, so by the time it lands the CSS has opened the list,
      // and judging by that would make every first tap a close.
      const onToggle = () => {
        if (box.hasAttribute('data-open')) {
          close(box, true);
        } else {
          box.removeAttribute('data-closed');
          box.setAttribute('data-open', '');
          sync(box);
        }
      };
      const onKey = (event: KeyboardEvent) => {
        if (event.key !== 'Escape' || !isShown(box)) return;
        close(box, true);
        button?.focus();
      };
      const onEnter = () => sync(box);
      // Once both pointer and focus are gone, a held close has done its job.
      const onLeave = () =>
        requestAnimationFrame(() => {
          if (!box.matches(':hover, :focus-within')) box.removeAttribute('data-closed');
          sync(box);
        });
      button?.addEventListener('click', onToggle);
      box.addEventListener('keydown', onKey);
      box.addEventListener('pointerenter', onEnter);
      box.addEventListener('pointerleave', onLeave);
      box.addEventListener('focusin', onEnter);
      box.addEventListener('focusout', onLeave);
      return () => {
        button?.removeEventListener('click', onToggle);
        box.removeEventListener('keydown', onKey);
        box.removeEventListener('pointerenter', onEnter);
        box.removeEventListener('pointerleave', onLeave);
        box.removeEventListener('focusin', onEnter);
        box.removeEventListener('focusout', onLeave);
      };
    });

    const onOutside = (event: PointerEvent) => {
      for (const box of boxes) if (!box.contains(event.target as Node)) close(box);
    };
    document.addEventListener('pointerdown', onOutside);
    return () => {
      cleanups.forEach((cleanup) => cleanup());
      document.removeEventListener('pointerdown', onOutside);
    };
  }, [html]);

  return <RoutedHtml className="banner__lines" html={html} />;
}

/**
 * The name as type, for `nameStyle: 'text'`: the heading's serif at a heavier
 * weight than the greeting, with a stroke of the accent drawn under its lower
 * half, the way you would run a highlighter under a name on a page. The stroke
 * is a background, so it follows the name onto a second line on a phone.
 */
function TypesetName({ text }: { text: string }) {
  return <span className="banner__typeset">{text}</span>;
}

/**
 * The front page: a greeting, a name, a line about yourself, and the two or
 * three sentences in `home.md` that point at everything else. It fills the
 * window and stops there. The blog has its own index and the nav is one click
 * away; the newest posts are behind an (i) in `home.md`, not listed here.
 *
 * The exception is the news block, which is three dated lines rather than a
 * list of writing: what a visitor wants from a page like this is to know
 * whether anything is happening, and that is not a question the nav answers.
 * It comes last, after the links, because everything above it is the person
 * and it is the only part that changes.
 *
 * The three blocks are grid items rather than a column beside a picture. The
 * stylesheet puts the portrait beside the introduction and the news on a row
 * of its own under it, which is why the news is a sibling here and not inside
 * `banner__text`.
 */
export function HomePage() {
  const { greeting, nameStyle, nameText, avatar, profileLinkStyle: style } = siteConfig.home;
  // The same record the contact page and every author card read, so an ORCID
  // that changes changes in one place; `profileLinkKeys.home` is which of them
  // this row shows, and in what order.
  const links = siteConfig.home.profileLinks ? profileLinksFor('home', siteOwner()) : [];
  // The front page speaks for the person; the header's tagline speaks for the
  // writing. They are the same line until this one is filled in.
  const tagline = siteConfig.home.tagline || siteConfig.tagline;
  const name = nameText.trim() || siteConfig.title;
  // A name of more than one word is what needs the smaller heading to share a
  // line with the greeting; one word fits at full size.
  const nameClass =
    nameStyle === 'signature'
      ? 'banner__name'
      : `banner__name banner__name--text${/\s/.test(name) ? ' banner__name--words' : ''}`;

  return (
    <div className="banner">
      <div className="banner__text">
        <h1 className={nameClass}>
          {greeting ? <span className="banner__greeting">{greeting} </span> : null}
          {nameStyle === 'signature' ? <Signature /> : <TypesetName text={name} />}
        </h1>
        <p className="banner__tagline">{tagline}</p>
        <HomeBody />
        {links.length > 0 ? (
          <ul
            className={`banner__links banner__links--${style}`}
            aria-label={`${siteConfig.title}: profiles and contact`}
          >
            {links.map((link) => (
              <li key={`${link.key}:${link.href}`}>
                <a
                  className={style === 'icon' ? 'icon-chip' : undefined}
                  href={link.href}
                  {...(link.key === 'email'
                    ? {}
                    : { rel: 'me noopener noreferrer', target: '_blank' })}
                  {...(style === 'icon' ? { title: link.label } : {})}
                >
                  {style === 'label' ? null : <ProfileIcon of={link.key} />}
                  {/* Kept in the markup when the mark stands alone: the name is
                      what a screen reader reads out, and what a tooltip shows
                      a reader who cannot place the mark. */}
                  <span className={style === 'icon' ? 'visually-hidden' : undefined}>
                    {link.label}
                  </span>
                </a>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
      {avatar ? <Avatar src={avatar} /> : null}
      <HomeNews />
    </div>
  );
}
