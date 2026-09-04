import { describe, expect, it } from 'vitest';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkRehype from 'remark-rehype';
import rehypeSlug from 'rehype-slug';
import rehypeStringify from 'rehype-stringify';
import { rehypeHeadingAnchors } from '../../plugins/heading-anchors';

const render = (markdown: string): string =>
  String(
    unified()
      .use(remarkParse)
      .use(remarkRehype)
      .use(rehypeSlug)
      .use(rehypeHeadingAnchors)
      .use(rehypeStringify)
      .processSync(markdown),
  );

describe('rehypeHeadingAnchors', () => {
  it('links a heading to its own id', () => {
    expect(render('## Sampling the estimator')).toContain(
      '<a class="heading-anchor" href="#sampling-the-estimator"',
    );
  });

  it('draws the link icon as SVG, hidden from the accessibility tree', () => {
    const html = render('## Setup');
    expect(html).toContain('<svg class="heading-anchor__icon"');
    expect(html).toContain('viewBox="0 0 24 24"');
    expect(html).toContain('aria-hidden="true"');
    expect(html).toContain('stroke="currentColor"');
  });

  it('names the section in the accessible name, since the icon says nothing', () => {
    expect(render('## Setup')).toContain('aria-label="Copy a link to “Setup”"');
  });

  it('anchors h2 to h4 and leaves h1 and h5 alone', () => {
    const html = render('# One\n\n## Two\n\n### Three\n\n#### Four\n\n##### Five');
    expect(html.match(/class="heading-anchor"/g)).toHaveLength(3);
  });

  it('skips a heading with no id to link to', () => {
    const html = String(
      unified()
        .use(remarkParse)
        .use(remarkRehype)
        .use(rehypeHeadingAnchors)
        .use(rehypeStringify)
        .processSync('## No slug plugin ran'),
    );
    expect(html).not.toContain('heading-anchor');
  });
});
