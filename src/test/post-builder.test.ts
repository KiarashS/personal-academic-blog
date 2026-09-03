import { describe, expect, it } from 'vitest';
import { buildPost, selectPosts, slugFromPath, tableOfContents } from '../lib/post-builder';
import { toPlainText, readingMinutes } from '../lib/markdown-text';
import type { Heading, PostMeta } from '../lib/types';

const post = (path: string, raw: string) => ({ path, raw });
const options = { includeUnpublished: false, today: '2026-06-01' };

function meta(overrides: Partial<PostMeta>): PostMeta {
  return {
    slug: 'x',
    title: 'X',
    date: '2026-01-01',
    tags: [],
    authorIds: [],
    summary: '',
    readingMinutes: 1,
    draft: false,
    headings: [],
    ...overrides,
  };
}

describe('slugFromPath', () => {
  it('strips the directory, extension and date prefix', () => {
    expect(slugFromPath('../content/posts/2026-08-19-bootstrap.md')).toBe('bootstrap');
  });

  it('leaves undated filenames alone', () => {
    expect(slugFromPath('notes.md')).toBe('notes');
  });
});

describe('buildPost', () => {
  it('falls back to the filename for date and slug', () => {
    const { meta: built } = buildPost(
      post('posts/2026-05-04-a-title.md', '---\ntitle: A title\n---\nbody'),
    );
    expect(built.slug).toBe('a-title');
    expect(built.date).toBe('2026-05-04');
  });

  it('keeps author ids and defaults the summary to an excerpt', () => {
    const { meta: built } = buildPost(
      post('posts/x.md', '---\ntitle: X\nauthors: [you]\n---\nA sentence of prose.'),
    );
    expect(built.authorIds).toEqual(['you']);
    expect(built.summary).toBe('A sentence of prose.');
  });

  it('separates the body from the frontmatter', () => {
    const built = buildPost(post('posts/x.md', '---\ntitle: X\n---\n# Heading\n\ntext'));
    expect(built.body).toBe('# Heading\n\ntext');
    expect(built.plainText).toBe('Heading text');
  });
});

describe('selectPosts', () => {
  const posts = [
    meta({ slug: 'old', title: 'Old', date: '2026-01-01' }),
    meta({ slug: 'new', title: 'New', date: '2026-05-01' }),
    meta({ slug: 'hidden', title: 'Hidden', date: '2026-04-01', draft: true }),
    meta({ slug: 'later', title: 'Later', date: '2026-09-01' }),
  ];

  it('sorts newest first and drops drafts and future dates in a build', () => {
    expect(selectPosts(posts, options).map((p) => p.title)).toEqual(['New', 'Old']);
  });

  it('keeps drafts and future posts in development', () => {
    expect(
      selectPosts(posts, { ...options, includeUnpublished: true }).map((p) => p.title),
    ).toEqual(['Later', 'New', 'Hidden', 'Old']);
  });

  it('publishes a post on its own date, not the day after', () => {
    const today = [meta({ slug: 'today', title: 'Today', date: options.today })];
    expect(selectPosts(today, options)).toHaveLength(1);
  });

  it('drops a duplicate slug rather than rendering two posts at one URL', () => {
    const dupes = [
      meta({ slug: 'same', title: 'First', date: '2026-01-01' }),
      meta({ slug: 'same', title: 'Second', date: '2026-02-01' }),
    ];
    expect(selectPosts(dupes, options).map((p) => p.title)).toEqual(['Second']);
  });
});

describe('tableOfContents', () => {
  const heading = (id: string): Heading => ({ id, text: id, depth: 2 });

  it('is empty when a post has too few sections to navigate', () => {
    expect(tableOfContents([heading('a'), heading('b')])).toEqual([]);
  });

  it('lists the headings once there are enough', () => {
    const headings = [heading('a'), heading('b'), heading('c')];
    expect(tableOfContents(headings)).toEqual(headings);
  });
});

describe('toPlainText', () => {
  it('removes code, math and link targets', () => {
    const text = toPlainText(
      'See `x` and $a^2$ and\n\n```js\nconst y = 1;\n```\n\n[docs](http://e.org).',
    );
    expect(text).toBe('See and and docs.');
  });

  it('drops display math blocks whole', () => {
    expect(toPlainText('before\n\n$$\n\\int_0^1 x\\,dx\n$$\n\nafter')).toBe('before after');
  });

  it('never reports less than a minute of reading', () => {
    expect(readingMinutes('')).toBe(1);
    expect(readingMinutes('word '.repeat(440).trim())).toBe(2);
  });
});
