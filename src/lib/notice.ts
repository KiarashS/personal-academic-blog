import { siteConfig } from '../site.config';
import { emojify } from './emoji';
import { isEnabled } from './features';
import { unsafeHrefs } from './inline-links';
import { blogIndexPath, blogPagePath, postSlugFromPath } from './routes';
import { todayUtc } from './post-builder';
import type { NoticeConfig, NoticeSurface } from '../site.config';

/**
 * Which of the three places a path is, or nothing if it is none of them.
 *
 * Asked of the path rather than configured as a list of routes, because the
 * routes move: with the home feature off the blog index is `/` and posts sit
 * under `/posts/`. `routes.ts` already knows which, so this does not have to.
 */
export function surfaceOf(pathname: string): NoticeSurface | undefined {
  const path = pathname.replace(/\/+$/, '') || '/';
  if (postSlugFromPath(path)) return 'post';
  if (path === '/' && isEnabled('home')) return 'home';
  if (path === blogIndexPath()) return 'blog';
  const paged = /^\/(?:blog\/)?page\/(\d+)$/.exec(path);
  if (paged && path === blogPagePath(Number(paged[1]))) return 'blog';
  return undefined;
}

/** Whether a notice has reached the day it retires itself on. */
export function expired(notice: NoticeConfig, today: string): boolean {
  return notice.until.trim().length > 0 && today >= notice.until;
}

/**
 * The notice a path should show, if any.
 *
 * Empty text is off, which is how the setting ships. `on` naming no surface is
 * also off, and the build says so rather than leaving a written notice
 * rendering nowhere.
 */
export function noticeFor(
  pathname: string,
  notice: NoticeConfig = siteConfig.notice,
  today: string = todayUtc(),
): NoticeConfig | undefined {
  if (!notice.text.trim() || expired(notice, today)) return undefined;
  const surface = surfaceOf(pathname);
  if (!surface || !notice.on.includes(surface)) return undefined;
  return { ...notice, text: emojify(notice.text) };
}

/**
 * What the build should say about the notice.
 *
 * The same reasoning as the stale-news warning: a recruiting call that ended
 * in March is the kind of thing nobody notices on their own site, because they
 * are not the one arriving at it. The build is where its owner is looking.
 */
export function noticeWarnings(
  notice: NoticeConfig = siteConfig.notice,
  today: string = todayUtc(),
): string[] {
  const text = notice.text.trim();
  if (!text) return [];

  const problems: string[] = [];
  if (expired(notice, today)) {
    problems.push(
      `notice: it expired on ${notice.until} and is no longer shown. Change ` +
        '`notice.until`, or clear `notice.text` to retire it for good.',
    );
  }
  if (notice.on.length === 0) {
    problems.push(
      'notice: `on` names no surface, so the text is written but shown nowhere. ' +
        "Add 'home', 'blog' or 'post'.",
    );
  }
  for (const href of unsafeHrefs(notice.text)) {
    problems.push(
      `notice: “${href}” is not a link the page will make. Give it a scheme ` +
        '(https://, mailto:) or write it as a path (/about).',
    );
  }
  return problems;
}
