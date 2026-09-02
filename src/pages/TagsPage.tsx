import { PageMeta } from '../components/PageMeta';
import { TagList } from '../components/TagList';
import { tagCounts } from '../lib/posts';
import { tagSlug } from '../lib/format';

export function TagsPage() {
  const counts = tagCounts();
  const countBySlug = Object.fromEntries(counts.map(({ tag, count }) => [tagSlug(tag), count]));

  return (
    <>
      <PageMeta title="Tags" description="Every tag used across the posts." />
      <h1>Tags</h1>
      <p className="lede">
        {counts.length} tag{counts.length === 1 ? '' : 's'} across the archive.
      </p>
      {counts.length === 0 ? (
        <p className="empty">Nothing tagged yet.</p>
      ) : (
        <TagList tags={counts.map((entry) => entry.tag)} counts={countBySlug} />
      )}
    </>
  );
}
