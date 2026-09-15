import { Link } from 'react-router-dom';
import { NewsList } from './NewsList';
import { homeNews, newsPageEnabled } from '../lib/news';
import { siteConfig } from '../site.config';

/**
 * The newest few entries, under the front page's lines.
 *
 * It is the page's third register and not a fourth: the display name, the
 * 300-weight prose, and then the small muted sans this shares with the profile
 * links below it. No rule, no box.
 *
 * The heading is `section-heading`, the same micro-label the revisions block
 * and the archive's years use — small, letterspaced, muted, nothing like the
 * name above it. It earns its place by closing a gap this block had without
 * it: the list was named for a screen reader and unnamed for everyone else,
 * and a visitor who has not met the site before should not have to infer from
 * three dates what they are looking at.
 *
 * The link out appears when there is more than the block is showing — either
 * more entries than it holds, or more than its window shows at once — and only
 * when `/news` exists to see them on. A windowed list has somewhere to send a
 * reader who would rather read than scroll.
 *
 * `home.newsRows` is how many entries the block stands at. Past that the list
 * scrolls rather than growing, so the page under a busy month is the same page
 * as under a quiet one — which is the point of a banner that fills the window
 * and stops.
 */
export function HomeNews() {
  const { items, more } = homeNews();
  if (items.length === 0) return null;

  // Only when there is something past the window: a list that fits keeps no
  // scrollbar, no tab stop and no fixed height, whatever the setting says.
  const rows = siteConfig.home.newsRows;
  const scrolls = rows > 0 && items.length > rows;

  return (
    <div className="news">
      <h2 className="section-heading news__heading" id="news-heading">
        News
      </h2>
      <NewsList items={items} labelledBy="news-heading" rows={scrolls ? rows : undefined} />
      {(more || scrolls) && newsPageEnabled() ? (
        <Link className="news__more" to="/news">
          All news <span aria-hidden="true">→</span>
        </Link>
      ) : null}
    </div>
  );
}
