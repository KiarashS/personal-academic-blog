import { formatDate, isoDate } from './format';
import { blogIndexPath, postPath } from './routes';
import { withBase } from './urls';
import type { LatestPostsConfig } from '../site.config';

/** Where the list goes, written into `src/content/home.md`. */
export const LATEST_POSTS_PLACEHOLDER = '{{latest_posts}}';

/** What the list needs of a post: enough to name it, date it and link to it. */
export interface LatestPost {
  slug: string;
  title: string;
  date: string;
  summary: string;
}

const escape = (text: string): string =>
  text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** The (i): a circle with the letter in it, drawn in the text's own colour. */
const INFO_ICON =
  '<svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true" focusable="false">' +
  '<circle cx="8" cy="8" r="6.75" fill="none" stroke="currentColor" stroke-width="1.3"/>' +
  '<path d="M8 7.1v4.2" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>' +
  '<circle cx="8" cy="4.75" r="0.95" fill="currentColor"/>' +
  '</svg>';

/**
 * The button and the list behind it, as HTML, for the placeholder's place in
 * the front page's Markdown.
 *
 * It is markup rather than a component because it lands in the middle of a
 * sentence the Markdown already compiled: the placeholder sits inside a `<p>`,
 * which is also why every element here is a `span` with a role rather than a
 * `ul` or a `div`, either of which would close the paragraph around it. Built
 * on the server and in the browser from the same list, so the prerendered page
 * already has it and hydration finds what it expects.
 *
 * The list opens on hover and on keyboard focus with CSS alone, so it works
 * before any script runs; `HomePage` adds a tap, Escape, and a nudge that keeps
 * it on screen.
 */
export function latestPostsMarkup(
  list: readonly LatestPost[],
  config: LatestPostsConfig,
  index = 0,
): string {
  const shown = list.slice(0, Math.max(0, Math.floor(config.count)));
  if (!config.enabled || shown.length === 0) return '';

  const id = `latest-posts-${index + 1}`;
  const title = escape(config.title || 'Latest posts');
  const items = shown
    .map((post) => {
      const date =
        config.dates && post.date
          ? ` <time class="latest-posts__date" datetime="${isoDate(post.date)}">${escape(formatDate(post.date, 'short'))}</time>`
          : '';
      const summary =
        config.summaries && post.summary
          ? `<span class="latest-posts__summary">${escape(post.summary)}</span>`
          : '';
      return (
        `<span class="latest-posts__item" role="listitem">` +
        `<a class="latest-posts__link" href="${withBase(postPath(post.slug))}">${escape(post.title)}</a>` +
        `${date}${summary}</span>`
      );
    })
    .join('');
  const all = config.allPostsLabel
    ? `<a class="latest-posts__all" href="${withBase(blogIndexPath())}">${escape(config.allPostsLabel)} →</a>`
    : '';

  return (
    `<span class="latest-posts" data-latest-posts>` +
    `<button type="button" class="latest-posts__toggle" aria-expanded="false" aria-controls="${id}" ` +
    `aria-label="${title}">${INFO_ICON}</button>` +
    `<span class="latest-posts__panel" id="${id}" role="group" aria-label="${title}">` +
    `<span class="latest-posts__title" aria-hidden="true">${title}</span>` +
    `<span class="latest-posts__list" role="list">${items}</span>${all}</span></span>`
  );
}

/**
 * The front page's HTML with each placeholder replaced by the list, or simply
 * taken out when there is no list to show: the feature is off, or there are no
 * posts. A placeholder inside `code` or `pre` is left as written, so `home.md`
 * can mention the syntax it is using.
 */
export function fillLatestPosts(
  html: string,
  list: readonly LatestPost[],
  config: LatestPostsConfig,
): string {
  if (!html.includes(LATEST_POSTS_PLACEHOLDER)) return html;
  let count = 0;
  // Split on code and pre elements, keeping them, so the odd pieces are code.
  return html
    .split(/(<pre[\s\S]*?<\/pre>|<code[\s\S]*?<\/code>)/)
    .map((piece, i) =>
      i % 2 === 1
        ? piece
        : piece.split(LATEST_POSTS_PLACEHOLDER).reduce((out, rest) => {
            const markup = latestPostsMarkup(list, config, count);
            count += 1;
            return `${out}${markup}${rest}`;
          }),
    )
    .join('');
}
