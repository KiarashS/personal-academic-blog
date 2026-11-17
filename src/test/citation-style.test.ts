import { describe, expect, it } from 'vitest';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkRehype from 'remark-rehype';
import rehypeCitation from 'rehype-citation';
import rehypeStringify from 'rehype-stringify';
import { rehypeCitationNumbers } from '../../plugins/citation-numbers';
import { citationStyle } from '../../plugins/markdown';
import type { CitationStyle } from '../site.config';

const root = process.cwd();

async function cite(style: CitationStyle): Promise<string> {
  const file = await unified()
    .use(remarkParse)
    .use(remarkRehype)
    .use(rehypeCitation, {
      bibliography: 'src/content/references.bib',
      csl: citationStyle(style),
      linkCitations: true,
      path: root,
    })
    .use(rehypeCitationNumbers)
    .use(rehypeStringify)
    .process('As shown [@knuth1984literate], and [@white1982maximum; @knuth1984literate].');
  return String(file);
}

describe('citations.style', () => {
  it('cites by author and year in APA', async () => {
    const html = await cite('apa');
    expect(html).toContain('Knuth, 1984');
  });

  it('cites by number in IEEE, from the copy kept in plugins/csl', async () => {
    const html = await cite('ieee');
    expect(html).toMatch(/>\[1\]</);
    expect(html).toMatch(/>\[2\]</);
    expect(html).not.toContain('Knuth, 1984');
    expect(html).toContain('D. E. Knuth');
  });

  it('links each number to the entry that has it, whatever order the keys were typed in', async () => {
    const html = await cite('ieee');
    expect(html).toContain(
      '[<a href="#bib-knuth1984literate">1</a>], [<a href="#bib-white1982maximum">2</a>]',
    );
    expect(html).not.toContain('<a href="#bib-white1982maximum">1</a>');
  });

  it('takes a CSL file from the repository', () => {
    expect(citationStyle('./styles/nature.csl')).toBe('styles/nature.csl');
    expect(citationStyle('vancouver')).toBe('vancouver');
  });
});
