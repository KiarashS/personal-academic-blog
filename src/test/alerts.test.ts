import { describe, expect, it } from 'vitest';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';
import remarkRehype from 'remark-rehype';
import rehypeStringify from 'rehype-stringify';
import { ALERT_TYPES, rehypeAlerts } from '../../plugins/alerts';

const render = (markdown: string): string =>
  String(
    unified()
      .use(remarkParse)
      .use(remarkGfm)
      .use(remarkRehype)
      .use(rehypeAlerts)
      .use(rehypeStringify)
      .processSync(markdown),
  );

describe('rehypeAlerts', () => {
  it('renders each of the five GitHub types', () => {
    for (const type of ALERT_TYPES) {
      const html = render(`> [!${type.toUpperCase()}]\n> Body.`);
      const label = type.charAt(0).toUpperCase() + type.slice(1);
      expect(html).toContain(`class="alert alert--${type}"`);
      expect(html).toContain(`<p class="alert__label">`);
      expect(html).toContain(`${label}</p>`);
      expect(html).toContain('Body.');
      expect(html).not.toContain('blockquote');
    }
  });

  it('takes the marker off and leaves the rest of the paragraph', () => {
    const html = render('> [!NOTE]\n> **Key Takeaway:** labels are expensive.');
    expect(html).toContain('<strong>Key Takeaway:</strong> labels are expensive.');
    expect(html).not.toContain('[!NOTE]');
  });

  it('accepts the marker as a paragraph of its own', () => {
    const html = render('> [!TIP]\n>\n> Body in its own paragraph.');
    expect(html).toContain('class="alert alert--tip"');
    expect(html).toContain('<p>Body in its own paragraph.</p>');
    expect(html).not.toContain('[!TIP]');
    // The empty marker paragraph goes with it, rather than leaving a gap.
    expect(html).not.toMatch(/<p><\/p>/);
  });

  it('matches the marker whatever its case, as GitHub does', () => {
    expect(render('> [!note]\n> Body.')).toContain('alert--note');
    expect(render('> [!Warning]\n> Body.')).toContain('alert--warning');
  });

  it('carries an icon that is hidden from the accessibility tree', () => {
    const html = render('> [!CAUTION]\n> Body.');
    expect(html).toContain('class="alert__icon"');
    expect(html).toContain('aria-hidden="true"');
  });

  it('keeps several blocks inside one alert', () => {
    const html = render('> [!IMPORTANT]\n> First.\n>\n> - one\n> - two');
    expect(html).toContain('<p>First.</p>');
    expect(html).toContain('<li>one</li>');
  });

  it('leaves an ordinary blockquote alone', () => {
    const html = render('> Just a quotation.');
    expect(html).toContain('<blockquote>');
    expect(html).not.toContain('alert');
  });

  it('leaves a blockquote whose marker is not one of the five', () => {
    const html = render('> [!ASIDE]\n> Body.');
    expect(html).toContain('<blockquote>');
    expect(html).toContain('[!ASIDE]');
  });

  it('needs the marker on a line of its own, not mid-sentence', () => {
    const html = render('> See [!NOTE] in the docs.');
    expect(html).toContain('<blockquote>');
    expect(html).not.toContain('class="alert');
  });

  it('handles an alert nested inside a blockquote', () => {
    const html = render('> Quoted:\n>\n> > [!TIP]\n> > Nested body.');
    expect(html).toContain('<blockquote>');
    expect(html).toContain('class="alert alert--tip"');
  });
});
