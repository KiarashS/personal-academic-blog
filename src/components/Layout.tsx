import { NavLink, Link, Outlet, useLocation } from 'react-router-dom';
import { Fragment, Suspense, useEffect } from 'react';
import { siteConfig } from '../site.config';
import { useToday } from '../lib/today';
import { avatarCopyPath, CREDIT_WIDTH, isUrl } from '../lib/avatar';
import { footerCredit } from '../lib/credit';
import { withBase } from '../lib/urls';
import { blogEnabled, isEnabled, isExternal, isNavGroup, navFor } from '../lib/features';
import { SiteMark } from './SiteMark';
import { CvLink } from './CvLink';
import { FeedLink } from './FeedLink';
import { KeyboardShortcuts } from './KeyboardShortcuts';
import { MobileNav } from './MobileNav';
import { NavigationProgress } from './NavigationProgress';
import { NoticeBanner } from './NoticeBanner';
import { NavGroup } from './NavGroup';
import { PageMeta } from './PageMeta';
import { RouteBoundary } from './RouteBoundary';
import { ThemeToggle } from './ThemeToggle';

/**
 * A new page starts at the top — unless the link named a place on it.
 *
 * The browser does try the fragment itself, but it tries before React has
 * mounted the route, and this effect then scrolled over the result: every
 * permalink on the site, headings included, landed at the top of the post
 * rather than at the thing it pointed to. So the hash is handled here, once
 * the block it names is actually in the document.
 */
function ScrollToTop() {
  const { pathname, hash } = useLocation();
  useEffect(() => {
    const target = hash ? document.getElementById(decodeURIComponent(hash.slice(1))) : null;
    if (target) {
      target.scrollIntoView();
      return;
    }
    window.scrollTo(0, 0);
  }, [pathname, hash]);
  return null;
}

/**
 * "Built with 💙 by", the owner's portrait, and their name: `credit` in the
 * config. The portrait is the 64px copy `scripts/render-avatar.mjs` writes in
 * a build, the original on the dev server, as the front page's is. Its `alt`
 * is empty because the name follows it, and a screen reader would say the
 * name twice.
 */
function FooterCredit() {
  const credit = footerCredit();
  if (!credit) return null;
  const photo = credit.photo
    ? isUrl(credit.photo)
      ? credit.photo
      : withBase(import.meta.env.PROD ? avatarCopyPath(credit.photo, CREDIT_WIDTH) : credit.photo)
    : undefined;
  const who = (
    <>
      {photo ? (
        <img
          className="site-credit__photo"
          src={photo}
          alt=""
          width={28}
          height={28}
          loading="lazy"
          decoding="async"
        />
      ) : null}
      <span className="site-credit__name">{credit.name}</span>
    </>
  );

  return (
    <p className="site-credit">
      <span>{credit.text}</span>{' '}
      {credit.href ? (
        isExternal(credit.href) ? (
          <a className="site-credit__who" href={credit.href}>
            {who}
          </a>
        ) : (
          <Link className="site-credit__who" to={credit.href}>
            {who}
          </Link>
        )
      ) : (
        <span className="site-credit__who">{who}</span>
      )}
    </p>
  );
}

export function Layout() {
  // Through `useToday`, like the openings: read straight off the clock, the
  // year in the prerendered footer disagreed with the browser's from 1 January
  // until the next deploy, and React redrew every page to settle it.
  const year = useToday().slice(0, 4);
  // The front page carries the name at display size, so the header drops its
  // own copy of it and the tagline and leaves the nav on its own.
  const onHome = useLocation().pathname.replace(/\/+$/, '') === '';
  const bare = isEnabled('home') && onHome;

  return (
    <div className={`page${bare ? ' page--banner' : ''}`}>
      <PageMeta />
      <ScrollToTop />
      <NavigationProgress />
      <a className="skip-link" href="#main">
        Skip to content
      </a>

      <header className={`site-header${bare ? ' site-header--bare' : ''}`}>
        <div className="shell">
          <div className="site-header__inner">
            {bare ? null : (
              <Link className="site-title" to="/">
                {siteConfig.headerLogo ? <SiteMark /> : null}
                {siteConfig.title}
              </Link>
            )}
            <nav className="site-nav" aria-label="Main">
              {navFor('header').map((item) =>
                isNavGroup(item) ? (
                  <NavGroup item={item} key={item.label} />
                ) : (
                  <NavLink end={item.to === '/'} key={item.to} to={item.to ?? '/'}>
                    {item.label}
                  </NavLink>
                ),
              )}
              <CvLink />
              {/* The feed is the posts', so it goes with them. */}
              {blogEnabled() ? <FeedLink icon /> : null}
            </nav>
            <div className="site-header__controls">
              <ThemeToggle />
              <MobileNav />
            </div>
          </div>
          {bare ? null : <p className="site-tagline">{siteConfig.tagline}</p>}
        </div>
      </header>

      <main className={`site-main${bare ? ' site-main--banner' : ''}`} id="main" tabIndex={-1}>
        <div className="shell">
          {/* Inside `main`, so it is read in its turn rather than announced
              over whatever the reader is doing. Both slots are rendered and
              `notice.place` decides which one has it, per surface; the other
              returns nothing, so the document only ever holds one. */}
          <NoticeBanner slot="top" />
          <RouteBoundary>
            {/* The one boundary for every page, and it stays mounted. The router
                navigates in a transition, and a transition only holds back a
                boundary that is already on screen: when each page brought its
                own, every first visit to one showed "Loading…" in place of the
                page, then the heading over a second "Loading…" for its text,
                then the page. Now the page a reader is on stays until the next
                is ready, and `NavigationProgress` says that it is coming. */}
            <Suspense fallback={<p className="empty">Loading…</p>}>
              <Outlet />
            </Suspense>
          </RouteBoundary>
          <NoticeBanner slot="bottom" />
        </div>
      </main>

      <footer className="site-footer">
        <div className="shell">
          <p>
            © {year} {siteConfig.title}. Text licensed CC BY 4.0 unless a post says otherwise.
          </p>
          {/* Not a `p`: the shortcuts dialog is a block element, and a `p`
              closes before one, which puts the browser's DOM at odds with
              React's and fails hydration on every page. */}
          <div className="site-footer__links">
            {/* From the same list the header reads, rather than a second copy
                of it kept by hand: Tags, Search and About were written out
                twice, and Archive would have made four. */}
            {navFor('footer').map((item) => (
              <Fragment key={item.to}>
                {/* Each link is held to the separator after it, so a row that
                    wraps on a phone ends a line with one rather than opening
                    the next line with it. The break goes in the space between. */}
                <span className="site-footer__item">
                  {isExternal(item.to ?? '') ? (
                    <a href={item.to}>{item.label}</a>
                  ) : (
                    <Link to={item.to ?? '/'}>{item.label}</Link>
                  )}
                  {' ·'}
                </span>{' '}
              </Fragment>
            ))}
            {blogEnabled() ? (
              <>
                <span className="site-footer__item">
                  <FeedLink />
                  {' ·'}
                </span>{' '}
              </>
            ) : null}
            <KeyboardShortcuts />
          </div>
          <FooterCredit />
        </div>
      </footer>
    </div>
  );
}
