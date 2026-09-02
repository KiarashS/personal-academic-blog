import { Link } from 'react-router-dom';
import { tagSlug } from '../lib/format';

interface TagListProps {
  tags: string[];
  activeTag?: string;
  counts?: Record<string, number>;
}

export function TagList({ tags, activeTag, counts }: TagListProps) {
  if (tags.length === 0) return null;
  const active = activeTag ? tagSlug(activeTag) : undefined;

  return (
    <ul className="tag-list">
      {tags.map((tag) => {
        const slug = tagSlug(tag);
        return (
          <li key={slug}>
            <Link
              className={`tag${slug === active ? ' tag--active' : ''}`}
              to={`/tags/${slug}`}
              {...(slug === active ? { 'aria-current': 'page' as const } : {})}
            >
              {tag}
              {counts?.[slug] !== undefined ? (
                <span className="tag__count">{counts[slug]}</span>
              ) : null}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
