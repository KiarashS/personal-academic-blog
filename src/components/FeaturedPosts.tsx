import { Link } from 'react-router-dom';
import { formatDate, isoDate } from '../lib/format';
import { postPath } from '../lib/routes';
import type { Post } from '../lib/types';

/**
 * The posts an author marked `featured: true`, in a section of their own
 * above the blog index's list, on its first page (`featuredPosts` in the
 * site config says how many). A different shape from the list's cards, a
 * title and what the post is about, so the section reads as a choice and the
 * list under it as the record, newest first.
 */
export function FeaturedPosts({ posts }: { posts: Post[] }) {
  if (posts.length === 0) return null;

  return (
    <section aria-labelledby="featured-heading" className="featured-posts">
      <h2 className="section-heading" id="featured-heading">
        Featured
      </h2>
      <ul className="featured-posts__list">
        {posts.map((post) => (
          <li className="featured-card" key={post.slug}>
            <h3 className="featured-card__title">
              <Link to={postPath(post.slug)}>{post.title}</Link>
            </h3>
            <p className="featured-card__summary">{post.summary}</p>
            <p className="featured-card__meta">
              <time dateTime={isoDate(post.date)}>{formatDate(post.date, 'short')}</time>
              <span aria-hidden="true"> · </span>
              {post.readingMinutes} min read
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
}
