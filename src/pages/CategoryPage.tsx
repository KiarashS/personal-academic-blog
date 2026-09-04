import { Navigate, useParams } from 'react-router-dom';
import { FeedLink } from '../components/FeedLink';
import { Pagination } from '../components/Pagination';
import { PostList } from '../components/PostList';
import { getCategory, postsInCategory } from '../lib/categories';
import { paginate } from '../lib/pagination';
import { siteConfig } from '../site.config';
import { NotFoundPage } from './NotFoundPage';

export function CategoryPage() {
  const { category: slug = '', page: pageParam } = useParams();
  const category = getCategory(slug);
  if (!category) return <NotFoundPage what="category" />;

  const matching = postsInCategory(slug);
  const requested = pageParam ? Number(pageParam) : 1;
  const { items, page, totalPages } = paginate(matching, requested, siteConfig.postsPerPage);

  if (pageParam && page !== requested) {
    return (
      <Navigate
        to={page === 1 ? `/categories/${slug}` : `/categories/${slug}/page/${page}`}
        replace
      />
    );
  }

  return (
    <>
      <h1>{category.label}</h1>
      <p className="lede">
        {category.description ? `${category.description} ` : ''}
        {matching.length} post{matching.length === 1 ? '' : 's'} ·{' '}
        <FeedLink path={`/categories/${slug}/feed.xml`} label="Feed for this category" />
      </p>
      <PostList posts={items} />
      <Pagination
        page={page}
        totalPages={totalPages}
        hrefFor={(n) => (n === 1 ? `/categories/${slug}` : `/categories/${slug}/page/${n}`)}
      />
    </>
  );
}
