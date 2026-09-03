import { Link } from 'react-router-dom';
import { PostMeta } from './PostMeta';
import type { Post } from '../lib/types';

export function RelatedPosts({ posts }: { posts: Post[] }) {
  if (posts.length === 0) return null;

  return (
    <section className="related">
      <h2 className="section-heading">Related posts</h2>
      <ul className="related__list">
        {posts.map((post) => (
          <li key={post.slug}>
            <Link to={`/posts/${post.slug}`}>{post.title}</Link>
            <PostMeta post={post} showReadingTime={false} />
          </li>
        ))}
      </ul>
    </section>
  );
}
