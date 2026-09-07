import { describe, expect, it } from 'vitest';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkRehype from 'remark-rehype';
import rehypeStringify from 'rehype-stringify';
import { rehypeFeatureLinks } from '../../plugins/feature-links';

const render = (markdown: string, disabled: string[], onWarn?: (m: string) => void): string =>
  String(
    unified()
      .use(remarkParse)
      .use(remarkRehype)
      .use(rehypeFeatureLinks, { disabled, onWarn })
      .use(rehypeStringify)
      .processSync(markdown),
  );

describe('rehypeFeatureLinks', () => {
  it('keeps the words and drops the link to a page that is switched off', () => {
    const html = render('Read more [about me](/about) or [contact me](/contact)', ['/contact']);
    expect(html).toContain('<a href="/about">about me</a>');
    expect(html).toContain('or contact me');
    expect(html).not.toContain('href="/contact"');
  });

  it('says which link it dropped, so the line can be revisited', () => {
    const said: string[] = [];
    render('[contact me](/contact)', ['/contact'], (m) => said.push(m));
    expect(said).toEqual(["link to /contact was dropped: that page's feature is off"]);
  });

  it('treats a trailing slash as the same page', () => {
    expect(render('[x](/contact/)', ['/contact'])).not.toContain('href');
  });

  it('leaves a link to a page that is on', () => {
    expect(render('[x](/contact)', ['/archive'])).toContain('href="/contact"');
  });

  it('leaves external links alone, whatever they point at', () => {
    const html = render('[x](https://example.org/contact)', ['/contact']);
    expect(html).toContain('href="https://example.org/contact"');
  });

  it('does not touch a deeper path under a disabled page', () => {
    expect(render('[x](/contact/form)', ['/contact'])).toContain('href="/contact/form"');
  });

  it('keeps markup inside the link it unwraps', () => {
    expect(render('[**contact** me](/contact)', ['/contact'])).toContain(
      '<strong>contact</strong> me',
    );
  });

  it('does nothing when every feature is on', () => {
    expect(render('[x](/contact)', [])).toContain('href="/contact"');
  });
});
