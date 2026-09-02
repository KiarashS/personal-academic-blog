import { Link } from 'react-router-dom';

export function NotFoundPage({ what = 'page' }: { what?: string }) {
  return (
    <>
      <h1>Not found</h1>
      <p>
        No such {what}. Try the <Link to="/">post list</Link> or <Link to="/search">search</Link>.
      </p>
    </>
  );
}
