import { describe, expect, it } from 'vitest';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';
import remarkRehype from 'remark-rehype';
import rehypeRaw from 'rehype-raw';
import rehypeStringify from 'rehype-stringify';
import { rehypeAlerts } from '../../plugins/alerts';
import { rehypeSidenotes } from '../../plugins/sidenotes';

const render = (markdown: string): string =>
  String(
    unified()
      .use(remarkParse)
      .use(remarkGfm)
      .use(remarkRehype, { allowDangerousHtml: true })
      .use(rehypeRaw)
      .use(rehypeAlerts)
      .use(rehypeSidenotes)
      .use(rehypeStringify, { allowDangerousHtml: true })
      .processSync(markdown),
  );

describe('rehypeSidenotes', () => {
  it('copies a plain footnote in beside its reference and keeps it at the foot', () => {
    const html = render('A claim.[^a]\n\n[^a]: The *evidence*.');
    expect(html).toMatch(
      /<\/sup><span class="sidenote" id="sidenote-user-content-fn-a" tabindex="-1"><span class="sidenote__number">1<\/span> The <em>evidence<\/em>\.<\/span>/,
    );
    expect(html).toContain('<li id="user-content-fn-a" value="1" class="footnote--sidenoted">');
    expect(html).toContain('class="footnotes footnotes--sidenoted"');
  });

  it('joins paragraphs with a break and leaves the back link out', () => {
    const html = render('A.[^a]\n\n[^a]: One.\n\n    Two.');
    expect(html).toContain('One.<span class="sidenote__break"></span>Two.');
    const note = html.slice(html.indexOf('class="sidenote"'), html.indexOf('</p>'));
    expect(note).not.toContain('data-footnote-backref');
  });

  it('keeps a note with a list in it at the foot only, numbered as it was', () => {
    const html = render('A.[^a] B.[^b]\n\n[^a]: Plain.\n\n[^b]: A list:\n\n    - one\n    - two');
    expect(html.match(/class="sidenote"/g)).toHaveLength(1);
    expect(html).toContain('<li id="user-content-fn-b" value="2">');
    expect(html).not.toContain('footnotes--sidenoted');
  });

  it('leaves a note cited from a table or an alert at the foot', () => {
    const table = render('| a |\n| - |\n| x[^a] |\n\n[^a]: Note.');
    const alert = render('> [!NOTE]\n> Careful.[^a]\n\n[^a]: Note.');
    expect(table).not.toContain('class="sidenote"');
    expect(alert).not.toContain('class="sidenote"');
  });

  it('puts a note beside its first reference only', () => {
    const html = render('One.[^a] Two.[^a]\n\n[^a]: Note.');
    expect(html.match(/class="sidenote"/g)).toHaveLength(1);
  });
});
