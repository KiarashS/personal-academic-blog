import { Link } from 'react-router-dom';
import { PostMeta } from './PostMeta';
import type { Post } from '../lib/types';
import { postPath } from '../lib/routes';

/**
 * A short list of other posts at the foot of one: those like it ("Related
 * posts"), or those that link to it ("Mentioned in", `mentionedIn`).
 */
export function RelatedPosts({
  posts,
  title = 'Related posts',
}: {
  posts: Post[];
  title?: string;
}) {
  if (posts.length === 0) return null;

  return (
    <section className="related">
      <h2 className="section-heading">{title}</h2>
      <ul className="related__list">
        {posts.map((post) => (
          <li key={post.slug}>
            <Link to={postPath(post.slug)}>{post.title}</Link>
            <PostMeta post={post} showReadingTime={false} />
          </li>
        ))}
      </ul>
    </section>
  );
}
