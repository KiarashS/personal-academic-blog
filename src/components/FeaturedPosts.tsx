import { Link } from 'react-router-dom';
import { formatDate } from '../lib/format';
import { postPath } from '../lib/routes';
import type { Post } from '../lib/types';

/**
 * The posts an author marked `featured: true`, in a section of their own
 * above the blog index's list, on its first page (`featuredPosts` in the
 * site config says how many). One tinted panel with a row per post and its
 * title alone, nothing of the list's cards, so the section is a short line of
 * recommendations and the list under it starts on the first screen, on a
 * phone as well. Each row is one link, and its tooltip says when the post was
 * written and how long it takes to read; the post is also in the list below,
 * with both, for a reader with no pointer to rest.
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
          <li className="featured-row" key={post.slug}>
            <h3 className="featured-row__title">
              <Link
                title={`${formatDate(post.date, 'short')} · ${post.readingMinutes} min read`}
                to={postPath(post.slug)}
              >
                {post.title}
              </Link>
            </h3>
          </li>
        ))}
      </ul>
    </section>
  );
}
