import { Link } from 'react-router-dom';
import { NewsList } from './NewsList';
import { homeNews, newsPageEnabled } from '../lib/news';

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
 * The link out only appears when there is more to see than this, and only when
 * `/news` exists to see it on.
 */
export function HomeNews() {
  const { items, more } = homeNews();
  if (items.length === 0) return null;

  return (
    <div className="news">
      <h2 className="section-heading news__heading" id="news-heading">
        News
      </h2>
      <NewsList items={items} labelledBy="news-heading" />
      {more && newsPageEnabled() ? (
        <Link className="news__more" to="/news">
          All news <span aria-hidden="true">→</span>
        </Link>
      ) : null}
    </div>
  );
}
