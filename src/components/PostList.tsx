import { Link } from 'react-router-dom';
import { PostMeta } from './PostMeta';
import { TagList } from './TagList';
import type { Post } from '../lib/types';
import { postPath } from '../lib/routes';

/**
 * A list of post cards. `level` is the cards' heading level: `h2` where the
 * list is the page's main content, `h3` under a heading of its own, as on the
 * blog index's first page when its Featured section stands above it.
 */
export function PostList({ posts, level = 2 }: { posts: Post[]; level?: 2 | 3 }) {
  const Title = level === 3 ? 'h3' : 'h2';
  if (posts.length === 0) {
    return <p className="empty">No posts here yet.</p>;
  }

  return (
    <ul className="post-list">
      {posts.map((post) => (
        <li key={post.slug}>
          <article>
            <Title className="post-card__title">
              <Link to={postPath(post.slug)}>{post.title}</Link>
              {post.featured ? <span className="post-card__pin">Featured</span> : null}
            </Title>
            <PostMeta post={post} />
            <p className="post-card__summary">{post.summary}</p>
            <TagList tags={post.tags} />
          </article>
        </li>
      ))}
    </ul>
  );
}
