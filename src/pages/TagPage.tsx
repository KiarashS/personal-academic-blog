import { Navigate, useParams } from 'react-router-dom';
import { Pagination } from '../components/Pagination';
import { PostList } from '../components/PostList';
import { paginate } from '../lib/pagination';
import { displayTag, postsByTag } from '../lib/posts';
import { siteConfig } from '../site.config';

export function TagPage() {
  const { tag = '', page: pageParam } = useParams();
  const matching = postsByTag(tag);
  const label = displayTag(tag) ?? tag;
  const requested = pageParam ? Number(pageParam) : 1;

  const { items, page, totalPages } = paginate(matching, requested, siteConfig.postsPerPage);
  if (pageParam && page !== requested) {
    return <Navigate to={page === 1 ? `/tags/${tag}` : `/tags/${tag}/page/${page}`} replace />;
  }

  return (
    <>
      <h1>Tagged “{label}”</h1>
      <p className="lede">
        {matching.length} post{matching.length === 1 ? '' : 's'}.
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
