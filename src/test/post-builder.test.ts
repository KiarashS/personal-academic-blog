import { describe, expect, it } from 'vitest';
import { buildPost, buildPosts, slugFromPath } from '../lib/post-builder';
import { toPlainText, readingMinutes } from '../lib/markdown-text';

const post = (path: string, raw: string) => ({ path, raw });

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
    const built = buildPost(post('posts/2026-05-04-a-title.md', '---\ntitle: A title\n---\nbody'));
    expect(built.slug).toBe('a-title');
    expect(built.date).toBe('2026-05-04');
  });

  it('resolves author ids and defaults the summary to an excerpt', () => {
    const built = buildPost(
      post('posts/x.md', '---\ntitle: X\nauthors: [kiarash]\n---\nA sentence of prose.'),
    );
    expect(built.authors[0]?.name).toBe('Kiarash S.');
    expect(built.summary).toBe('A sentence of prose.');
  });

  it('keeps an unknown author id visible rather than dropping the byline', () => {
    const built = buildPost(post('posts/x.md', '---\ntitle: X\nauthors: [nobody]\n---\nbody'));
    expect(built.authors).toEqual([{ id: 'nobody', name: 'nobody' }]);
  });
});

describe('buildPosts', () => {
  const files = [
    post('posts/2026-01-01-old.md', '---\ntitle: Old\n---\nbody'),
    post('posts/2026-06-01-new.md', '---\ntitle: New\n---\nbody'),
    post('posts/2026-07-01-hidden.md', '---\ntitle: Hidden\ndraft: true\n---\nbody'),
  ];

  it('sorts newest first and drops drafts in a build', () => {
    expect(buildPosts(files, false).map((p) => p.title)).toEqual(['New', 'Old']);
  });

  it('keeps drafts when asked', () => {
    expect(buildPosts(files, true).map((p) => p.title)).toEqual(['Hidden', 'New', 'Old']);
  });

  it('drops a duplicate slug rather than rendering two posts at one URL', () => {
    const dupes = [
      post('posts/2026-01-01-same.md', '---\ntitle: First\n---\nbody'),
      post('posts/2026-02-01-same.md', '---\ntitle: Second\n---\nbody'),
    ];
    expect(buildPosts(dupes, false).map((p) => p.title)).toEqual(['Second']);
  });
});

describe('toPlainText', () => {
  it('removes code, math and link targets', () => {
    const text = toPlainText('See `x` and $a^2$ and\n\n```js\nconst y = 1;\n```\n\n[docs](http://e.org).');
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
