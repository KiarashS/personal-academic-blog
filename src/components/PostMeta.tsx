import { Fragment } from 'react';
import { Link } from 'react-router-dom';
import { getCategory } from '../lib/categories';
import { formatDate, isoDate } from '../lib/format';
import type { Post } from '../lib/types';

interface PostMetaProps {
  post: Post;
  dateStyle?: 'long' | 'short';
  showReadingTime?: boolean;
}

export function PostMeta({ post, dateStyle = 'short', showReadingTime = true }: PostMetaProps) {
  const category = getCategory(post.category);

  return (
    <p className="meta">
      {category ? (
        <>
          <Link className="category-chip" to={`/categories/${category.slug}`}>
            {category.label}
          </Link>
          <span className="meta__sep">·</span>
        </>
      ) : null}
      <time dateTime={isoDate(post.date)}>{formatDate(post.date, dateStyle)}</time>
      {post.authors.length > 0 ? (
        <>
          <span className="meta__sep">·</span>
          <span>
            {post.authors.map((author, index) => (
              <Fragment key={author.id}>
                {index > 0 ? ', ' : ''}
                <Link to={`/authors/${author.id}`}>{author.name}</Link>
              </Fragment>
            ))}
          </span>
        </>
      ) : null}
      {showReadingTime ? (
        <>
          <span className="meta__sep">·</span>
          <span>{post.readingMinutes} min read</span>
        </>
      ) : null}
    </p>
  );
}
