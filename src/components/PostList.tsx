import { Link } from 'react-router-dom';
import { PostMeta } from './PostMeta';
import { TagList } from './TagList';
import type { Post } from '../lib/types';
import { postPath } from '../lib/routes';
import { siteConfig } from '../site.config';

/**
 * The dashes that make the light round a Featured pill, in shares of its
 * outline (each pattern is 100 long). All of them end at the head, 30 along;
 * the first runs the whole length of the tail and each after it starts one
 * step nearer the head, so a point on the tail is under more of them the
 * nearer the head it is. Each one's opacity is chosen so that what they add up
 * to climbs as the square of the distance from the tip: from nearly nothing at
 * the tip, where the tail used to stop at a fifth of the colour in a visible
 * edge, to all of it at the head.
 */
const TAIL = 30;
const STEPS = 10;
const RUNS = Array.from({ length: STEPS }, (_, index) => {
  const reached = (k: number) => (k / STEPS) ** 2;
  const before = reached(index);
  const opacity = index === STEPS - 1 ? 1 : 1 - (1 - reached(index + 1)) / (1 - before);
  const start = (index * TAIL) / STEPS;
  return {
    opacity: Number(opacity.toFixed(3)),
    strokeDasharray: `0 ${start} ${TAIL - start} ${100 - TAIL}`,
  };
});

/** A light runs round its border; see `.post-card__pin-ring` in global.css. */
function FeaturedPin() {
  return (
    <span className="post-card__pin">
      Featured
      <span aria-hidden="true" className="post-card__pin-ring">
        <svg focusable="false">
          {RUNS.map((run) => (
            <rect key={run.strokeDasharray} pathLength={100} style={run} />
          ))}
        </svg>
      </span>
    </span>
  );
}

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
              {post.featured && siteConfig.showFeatured ? <FeaturedPin /> : null}
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
