import { NavLink, Link, Outlet, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import { siteConfig } from '../site.config';
import { isEnabled, visibleNav } from '../lib/features';
import { CvLink } from './CvLink';
import { FeedLink } from './FeedLink';
import { KeyboardShortcuts } from './KeyboardShortcuts';
import { MobileNav } from './MobileNav';
import { PageMeta } from './PageMeta';
import { RouteBoundary } from './RouteBoundary';
import { ThemeToggle } from './ThemeToggle';

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

export function Layout() {
  const year = new Date().getFullYear();
  // The front page carries the name at display size, so the header drops its
  // own copy of it and the tagline and leaves the nav on its own.
  const onHome = useLocation().pathname.replace(/\/+$/, '') === '';
  const bare = isEnabled('home') && onHome;

  return (
    <div className="page">
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
              {visibleNav().map((item) => (
                <NavLink key={item.to} to={item.to} end={item.to === '/'}>
                  {item.label}
                </NavLink>
              ))}
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
            <Link to="/about">About</Link> · <FeedLink /> · <KeyboardShortcuts />
          </div>
        </div>
      </footer>
    </div>
  );
}
