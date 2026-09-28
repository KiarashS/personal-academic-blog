import { Fragment } from 'react';
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { getCategory } from '../lib/categories';
import { formatDate, isoDate } from '../lib/format';
import { siteOwner } from '../lib/profiles';
import type { Post } from '../lib/types';

interface PostMetaProps {
  post: Post;
  dateStyle?: 'long' | 'short';
  showReadingTime?: boolean;
}

/**
 * The line under a title in a list: category, date, authors, reading time.
 *
 * The authors are left out when the only one is the site's owner. On a
 * personal blog that is nearly every post, and the same underlined name on
 * every card was the loudest thing in each line while saying nothing the
 * header had not; a post written with someone else still names everyone,
 * owner included, so a byline now means the post is not the owner's alone.
 */
export function PostMeta({ post, dateStyle = 'short', showReadingTime = true }: PostMetaProps) {
  const category = getCategory(post.category);
  const soleOwner = post.authors.length === 1 && post.authors[0].id === siteOwner().id;
  const byline = soleOwner ? [] : post.authors;

  const parts: ReactNode[] = [];
  if (category) {
    parts.push(
      <Link className="category-chip" to={`/categories/${category.slug}`}>
        {category.label}
      </Link>,
    );
  }
  parts.push(<time dateTime={isoDate(post.date)}>{formatDate(post.date, dateStyle)}</time>);
  if (byline.length > 0) {
    parts.push(
      <span>
        {byline.map((author, index) => (
          <Fragment key={author.id}>
            {index > 0 ? ', ' : ''}
            <Link to={`/authors/${author.id}`}>{author.name}</Link>
          </Fragment>
        ))}
      </span>,
    );
  }
  if (showReadingTime) parts.push(<span>{post.readingMinutes} min read</span>);

  // Each separator travels with the item after it. As flex items of their
  // own, a line could end on one: on a phone the co-authored card read
  // "Co-author Name ·" with "3 min read" alone underneath.
  return (
    <p className="meta">
      {parts.map((part, index) =>
        index === 0 ? (
          <Fragment key={index}>{part}</Fragment>
        ) : (
          <span className="meta__item" key={index}>
            <span className="meta__sep">·</span>
            {part}
          </span>
        ),
      )}
    </p>
  );
}
