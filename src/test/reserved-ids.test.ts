import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkRehype from 'remark-rehype';
import rehypeRaw from 'rehype-raw';
import rehypeSlug from 'rehype-slug';
import rehypeStringify from 'rehype-stringify';
import { rehypeReservedIds } from '../../plugins/reserved-ids';
import { rehypeHeadingAnchors } from '../../plugins/heading-anchors';
import { RESERVED_IDS } from '../lib/reserved-ids';

const render = (markdown: string): string =>
  String(
    unified()
      .use(remarkParse)
      .use(remarkRehype, { allowDangerousHtml: true })
      .use(rehypeRaw)
      .use(rehypeSlug)
      .use(rehypeReservedIds)
      .use(rehypeHeadingAnchors)
      .use(rehypeStringify, { allowDangerousHtml: true })
      .processSync(markdown),
  );

describe('rehypeReservedIds', () => {
  it('moves a heading off an id the page chrome owns', () => {
    const html = render('## Revisions');
    expect(html).toContain('id="revisions-1"');
    expect(html).not.toContain('id="revisions"');
  });

  it('points the heading permalink at the renamed id', () => {
    expect(render('## Comments')).toContain('href="#comments-1"');
  });

  it('leaves every other heading where rehype-slug put it', () => {
    const html = render('## Frontmatter\n\n### Dates');
    expect(html).toContain('id="frontmatter"');
    expect(html).toContain('id="dates"');
  });

  it('steps past a suffix the post has already used', () => {
    // Two `## Comments` headings: rehype-slug numbers the second `comments-1`,
    // so the first has to land on `comments-2`.
    const html = render('## Comments\n\n## Comments');
    expect(html).toContain('id="comments-2"');
    expect(html).toContain('id="comments-1"');
    expect(html).not.toContain('id="comments"');
  });

  it('renames an id written by hand in the post, not only a slugged heading', () => {
    expect(render('<div id="main">Raw.</div>')).toContain('id="main-1"');
  });

  it('lists every id the app renders, so nothing new collides unnoticed', () => {
    // The reserved list is written by hand; this is what keeps it honest.
    const sources = [
      'src/components/Layout.tsx',
      'src/components/Comments.tsx',
      'src/components/Revisions.tsx',
      'src/components/SeriesNav.tsx',
      'src/components/ShareLinks.tsx',
      'src/components/KeyboardShortcuts.tsx',
      'src/pages/SearchPage.tsx',
    ];
    const rendered = new Set<string>();
    for (const source of sources) {
      for (const [, id] of readFileSync(source, 'utf8').matchAll(/\bid="([^"{]+)"/g)) {
        rendered.add(id);
      }
    }
    expect([...rendered].sort()).toEqual([...RESERVED_IDS].sort());
  });
});
