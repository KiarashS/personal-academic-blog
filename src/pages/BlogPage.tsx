import { Navigate, useParams } from 'react-router-dom';
import { Pagination } from '../components/Pagination';
import { PostList } from '../components/PostList';
import { paginate } from '../lib/pagination';
import { featuredFirst } from '../lib/post-builder';
import { posts } from '../lib/posts';
import { blogIndexPath, blogPagePath } from '../lib/routes';
import { siteConfig } from '../site.config';

/**
 * Every post, newest first, with the featured ones pinned. This is the site's
 * front page until the `home` feature gives the site one of its own, at which
 * point it moves to /blog.
 */
export function BlogPage() {
  const { page: pageParam } = useParams();
  const requested = pageParam ? Number(pageParam) : 1;

  if (pageParam && (!Number.isInteger(requested) || requested < 1)) {
    return <Navigate to={blogIndexPath()} replace />;
  }

  const { items, page, totalPages } = paginate(
    featuredFirst(posts),
    requested,
    siteConfig.postsPerPage,
  );

  // A stale /page/9 link should land somewhere real rather than show nothing.
  if (pageParam && page !== requested) {
    return <Navigate to={blogPagePath(page)} replace />;
  }

  return (
    <>
      <PostList posts={items} />
      <Pagination page={page} totalPages={totalPages} hrefFor={blogPagePath} />
    </>
  );
}
