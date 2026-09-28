import { Navigate, useParams } from 'react-router-dom';
import { FeedLink } from '../components/FeedLink';
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

  // A stale /page/9 link should land somewhere real rather than show nothing,
  // and /page/1 is the index under a second address.
  if (pageParam && (page !== requested || page === 1)) {
    return <Navigate to={blogPagePath(page)} replace />;
  }

  return (
    <>
      {/* The index had no heading at all: the cards under it are `h2`, so the
          outline of the site's second most important page started a level down
          and the page never named itself. "Blog" whichever address it lives at
          — with the home feature off this is the front page, where the header
          carries the site's name and this still says what the page is. */}
      <h1>Blog</h1>
      {/* The same line the tag and category pages open with: how many posts,
          which page, and the feed. It is also what separates the heading from
          the list — without it the first title sat 10px under "Blog", closer
          than any two posts are to each other, and read as its subtitle. */}
      <p className="lede">
        {posts.length} post{posts.length === 1 ? '' : 's'} ·{' '}
        {page > 1 ? `page ${page} of ${totalPages} · ` : null}
        <FeedLink label="Feed for all posts" />
      </p>
      <PostList posts={items} />
      <Pagination page={page} totalPages={totalPages} hrefFor={blogPagePath} />
    </>
  );
}
