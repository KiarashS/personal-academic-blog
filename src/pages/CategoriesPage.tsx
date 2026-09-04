import { Link } from 'react-router-dom';
import { categoryCounts } from '../lib/categories';

/**
 * The shelves, with what is on each. Categories are few and deliberate, so they
 * get a page that can carry a sentence about each one — which is what a tag
 * cloud cannot do.
 */
export function CategoriesPage() {
  const counts = categoryCounts();

  return (
    <>
      <h1>Categories</h1>
      <p className="lede">
        {counts.length} categor{counts.length === 1 ? 'y' : 'ies'}, above the tags.
      </p>
      {counts.length === 0 ? (
        <p className="empty">Nothing filed yet.</p>
      ) : (
        <ul className="category-list">
          {counts.map(({ category, count }) => (
            <li key={category.slug}>
              <h2 className="category-list__title">
                <Link to={`/categories/${category.slug}`}>{category.label}</Link>
                <span className="category-list__count">
                  {count} post{count === 1 ? '' : 's'}
                </span>
              </h2>
              {category.description ? (
                <p className="category-list__description">{category.description}</p>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
