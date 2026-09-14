import { Link } from 'react-router-dom';
import { NewsList } from './NewsList';
import { homeNews, newsPageEnabled } from '../lib/news';

/**
 * The newest few entries, under the front page's lines.
 *
 * It is the page's third register and not a fourth: the display name, the
 * 300-weight prose, and then the small muted sans this shares with the profile
 * links below it. No heading, no rule, no box — the page has none of those
 * anywhere, and three dated lines do not need one to be understood.
 *
 * The link out only appears when there is more to see than this, and only when
 * `/news` exists to see it on.
 */
export function HomeNews() {
  const { items, more } = homeNews();
  if (items.length === 0) return null;

  return (
    <div className="news">
      <NewsList items={items} label="Recent news" />
      {more && newsPageEnabled() ? (
        <Link className="news__more" to="/news">
          All news <span aria-hidden="true">→</span>
        </Link>
      ) : null}
    </div>
  );
}
