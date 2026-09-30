import { Navigate, useParams } from 'react-router-dom';
import { FeedLink } from '../components/FeedLink';
import { Pagination } from '../components/Pagination';
import { PostList } from '../components/PostList';
import { paginate } from '../lib/pagination';
import { displayTag, postsByTag } from '../lib/posts';
import { siteConfig } from '../site.config';
import { NotFoundPage } from './NotFoundPage';

export function TagPage() {
  const { tag = '', page: pageParam } = useParams();
  const matching = postsByTag(tag);
  // A tag no listed post carries has no page in the build, so the address
  // gets the same answer as any other that names nothing.
  if (matching.length === 0) return <NotFoundPage what="tag" />;
  const label = displayTag(tag) ?? tag;
  const requested = pageParam ? Number(pageParam) : 1;

  const { items, page, totalPages } = paginate(matching, requested, siteConfig.postsPerPage);
  if (pageParam && (page !== requested || page === 1)) {
    return <Navigate to={page === 1 ? `/tags/${tag}` : `/tags/${tag}/page/${page}`} replace />;
  }

  return (
    <>
      <h1>Tagged “{label}”</h1>
      <p className="lede">
        {matching.length} post{matching.length === 1 ? '' : 's'} ·{' '}
        {page > 1 ? `page ${page} of ${totalPages} · ` : null}
        <FeedLink path={`/tags/${tag}/feed.xml`} label="Feed for this tag" />
      </p>
      <PostList posts={items} />
      <Pagination
        page={page}
        totalPages={totalPages}
        hrefFor={(n) => (n === 1 ? `/tags/${tag}` : `/tags/${tag}/page/${n}`)}
      />
    </>
  );
}
