import { NavLink, Link, Outlet, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import { siteConfig } from '../site.config';
import { isEnabled, isNavGroup, visibleNav } from '../lib/features';
import { CvLink } from './CvLink';
import { FeedLink } from './FeedLink';
import { KeyboardShortcuts } from './KeyboardShortcuts';
import { MobileNav } from './MobileNav';
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

export function Layout() {
  const year = new Date().getFullYear();
  // The front page carries the name at display size, so the header drops its
  // own copy of it and the tagline and leaves the nav on its own.
  const onHome = useLocation().pathname.replace(/\/+$/, '') === '';
  const bare = isEnabled('home') && onHome;

  return (
    <div className={`page${bare ? ' page--banner' : ''}`}>
      <PageMeta />
      <ScrollToTop />
      <a className="skip-link" href="#main">
        Skip to content
      </a>

      <header className={`site-header${bare ? ' site-header--bare' : ''}`}>
        <div className="shell">
          <div className="site-header__inner">
            {bare ? null : (
              <Link className="site-title" to="/">
                {siteConfig.title}
              </Link>
            )}
            <nav className="site-nav" aria-label="Main">
              {visibleNav().map((item) =>
                isNavGroup(item) ? (
                  <NavGroup item={item} key={item.label} />
                ) : (
                  <NavLink end={item.to === '/'} key={item.to} to={item.to ?? '/'}>
                    {item.label}
                  </NavLink>
                ),
              )}
              <CvLink />
              <FeedLink icon />
            </nav>
            <div className="site-header__controls">
              <ThemeToggle />
              <MobileNav />
            </div>
          </div>
          {bare ? null : <p className="site-tagline">{siteConfig.tagline}</p>}
        </div>
      </header>

      <main className={`site-main${bare ? ' site-main--banner' : ''}`} id="main">
        <div className="shell">
          <RouteBoundary>
            <Outlet />
          </RouteBoundary>
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
            <Link to="/tags">Tags</Link> · <Link to="/search">Search</Link> ·{' '}
            {isEnabled('about') ? (
              <>
                <Link to="/about">About</Link> ·{' '}
              </>
            ) : null}
            <FeedLink /> · <KeyboardShortcuts />
          </div>
        </div>
      </footer>
    </div>
  );
}
