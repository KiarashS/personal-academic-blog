import { Navigate, useParams } from 'react-router-dom';
import { Pagination } from '../components/Pagination';
import { PostList } from '../components/PostList';
import { paginate } from '../lib/pagination';
import { posts } from '../lib/posts';
import { siteConfig } from '../site.config';

export function HomePage() {
  const { page: pageParam } = useParams();
  const requested = pageParam ? Number(pageParam) : 1;

  if (pageParam && (!Number.isInteger(requested) || requested < 1)) {
    return <Navigate to="/" replace />;
  }

  const { items, page, totalPages } = paginate(posts, requested, siteConfig.postsPerPage);

  // A stale /page/9 link should land somewhere real rather than show nothing.
  if (pageParam && page !== requested) {
    return <Navigate to={page === 1 ? '/' : `/page/${page}`} replace />;
  }

  return (
    <>
      <PostList posts={items} />
      <Pagination
        page={page}
        totalPages={totalPages}
        hrefFor={(n) => (n === 1 ? '/' : `/page/${n}`)}
      />
    </>
  );
}
