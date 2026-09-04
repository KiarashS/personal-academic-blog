import { Link } from 'react-router-dom';
import { PostMeta } from './PostMeta';
import { TagList } from './TagList';
import type { Post } from '../lib/types';

export function PostList({ posts }: { posts: Post[] }) {
  if (posts.length === 0) {
    return <p className="empty">No posts here yet.</p>;
  }

  return (
    <ul className="post-list">
      {posts.map((post) => (
        <li key={post.slug}>
          <article>
            <h2 className="post-card__title">
              <Link to={`/posts/${post.slug}`}>{post.title}</Link>
              {post.featured ? <span className="post-card__pin">Featured</span> : null}
            </h2>
            <PostMeta post={post} />
            <p className="post-card__summary">{post.summary}</p>
            <TagList tags={post.tags} />
          </article>
        </li>
      ))}
    </ul>
  );
}
