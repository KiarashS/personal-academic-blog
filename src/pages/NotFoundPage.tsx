import { Link } from 'react-router-dom';
import { blogEnabled } from '../lib/features';
import { blogIndexPath } from '../lib/routes';

export function NotFoundPage({ what = 'page' }: { what?: string }) {
  return (
    <>
      <h1>Not found</h1>
      {blogEnabled() ? (
        <p>
          No such {what}. Try the <Link to={blogIndexPath()}>post list</Link> or{' '}
          <Link to="/search">search</Link>.
        </p>
      ) : (
        <p>
          No such {what}. Try the <Link to="/">front page</Link>.
        </p>
      )}
    </>
  );
}
