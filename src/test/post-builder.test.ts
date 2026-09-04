import { describe, expect, it } from 'vitest';
import {
  buildPost,
  featuredFirst,
  selectPosts,
  seriesParts,
  slugFromPath,
  tableOfContents,
} from '../lib/post-builder';
import { toPlainText, readingMinutes } from '../lib/markdown-text';
import type { Heading, PostMeta } from '../lib/types';

const post = (path: string, raw: string) => ({ path, raw });
const options = { includeUnpublished: false, today: '2026-06-01' };

function meta(overrides: Partial<PostMeta>): PostMeta {
  return {
    slug: 'x',
    title: 'X',
    date: '2026-01-01',
    revisions: [],
    tags: [],
    authorIds: [],
    summary: '',
    readingMinutes: 1,
    draft: false,
    featured: false,
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

describe('featuredFirst', () => {
  // As `selectPosts` leaves it: newest first.
  const list = [
    meta({ slug: 'newest', date: '2026-03-01' }),
    meta({ slug: 'pinned-newer', date: '2026-02-15', featured: true }),
    meta({ slug: 'older', date: '2026-02-01' }),
    meta({ slug: 'pinned', date: '2026-01-01', featured: true }),
  ];

  it('lifts featured posts to the front, keeping date order within each group', () => {
    expect(featuredFirst(list).map((post) => post.slug)).toEqual([
      'pinned-newer',
      'pinned',
      'newest',
      'older',
    ]);
  });

  it('leaves a list with nothing pinned exactly as it was', () => {
    const plain = list.map((post) => ({ ...post, featured: false }));
    expect(featuredFirst(plain)).toEqual(plain);
  });

  it('does not touch the list it is given', () => {
    const before = [...list];
    featuredFirst(list);
    expect(list).toEqual(before);
  });
});

describe('revisions', () => {
  const withRevisions = (yaml: string) =>
    buildPost(post('posts/2026-01-05-x.md', `---\ntitle: X\ndate: 2026-01-05\n${yaml}---\n\nBody.`))
      .meta;

  it('reads a dated changelog and puts the newest entry first', () => {
    const meta = withRevisions(
      [
        'revisions:',
        '  - date: 2026-02-19',
        '    note: Corrected the variance.',
        '  - date: 2026-03-02',
        '    note: Added the notebook.',
        '',
      ].join('\n'),
    );

    expect(meta.revisions).toEqual([
      { date: '2026-03-02', note: 'Added the notebook.' },
      { date: '2026-02-19', note: 'Corrected the variance.' },
    ]);
  });

  it('derives `updated` from the newest revision', () => {
    const meta = withRevisions(
      [
        'revisions:',
        '  - date: 2026-02-19',
        '    note: One.',
        '  - date: 2026-03-02',
        '    note: Two.',
        '',
      ].join('\n'),
    );
    expect(meta.updated).toBe('2026-03-02');
  });

  it('keeps an explicit `updated` over the revision dates', () => {
    const meta = withRevisions(
      ['updated: 2026-04-01', 'revisions:', '  - date: 2026-03-02', '    note: One.', ''].join(
        '\n',
      ),
    );
    expect(meta.updated).toBe('2026-04-01');
  });

  it('drops an entry with no date, which there is nothing to show for', () => {
    const meta = withRevisions(
      ['revisions:', '  - note: Undated.', '  - date: 2026-03-02', ''].join('\n'),
    );
    expect(meta.revisions).toEqual([{ date: '2026-03-02', note: '' }]);
  });

  it('is empty, not undefined, when the post has no history', () => {
    expect(withRevisions('').revisions).toEqual([]);
    expect(withRevisions('').updated).toBeUndefined();
  });

  it('ignores a `revisions` field that is not a list', () => {
    expect(withRevisions('revisions: yesterday\n').revisions).toEqual([]);
  });
});

describe('seriesParts', () => {
  const member = (slug: string, date: string, series?: string, part?: number) => ({
    slug,
    date,
    series,
    part,
  });

  const list = [
    member('three', '2026-03-01', 'Bootstrap', 3),
    member('one', '2026-01-01', 'Bootstrap', 1),
    member('elsewhere', '2026-02-01', 'Other', 1),
    member('two', '2026-02-01', 'Bootstrap', 2),
    member('loose', '2026-04-01'),
  ];

  it('keeps only the named series, in part order', () => {
    expect(seriesParts(list, 'Bootstrap').map((post) => post.slug)).toEqual([
      'one',
      'two',
      'three',
    ]);
  });

  it('falls back to date order when nothing is numbered', () => {
    const undated = [
      member('later', '2026-05-01', 'Notes'),
      member('earlier', '2026-01-01', 'Notes'),
    ];
    expect(seriesParts(undated, 'Notes').map((post) => post.slug)).toEqual(['earlier', 'later']);
  });

  it('puts numbered parts before unnumbered ones rather than interleaving', () => {
    const mixed = [
      member('unnumbered', '2026-01-01', 'Notes'),
      member('second', '2026-05-01', 'Notes', 2),
      member('first', '2026-06-01', 'Notes', 1),
    ];
    expect(seriesParts(mixed, 'Notes').map((post) => post.slug)).toEqual([
      'first',
      'second',
      'unnumbered',
    ]);
  });

  it('is empty for a series nobody wrote', () => {
    expect(seriesParts(list, 'Nothing')).toEqual([]);
  });
});

describe('series frontmatter', () => {
  const meta = (yaml: string) =>
    buildPost(post('posts/2026-01-05-x.md', `---\ntitle: X\ndate: 2026-01-05\n${yaml}---\n\nBody.`))
      .meta;

  it('reads the name and the part', () => {
    const built = meta('series: Running this blog\npart: 2\n');
    expect(built.series).toBe('Running this blog');
    expect(built.part).toBe(2);
  });

  it('treats a blank series as no series', () => {
    expect(meta('series: "   "\n').series).toBeUndefined();
  });

  it('ignores a part that is not a number', () => {
    expect(meta('series: X\npart: second\n').part).toBeUndefined();
  });
});
