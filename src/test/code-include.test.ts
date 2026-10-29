import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkRehype from 'remark-rehype';
import rehypeHighlight from 'rehype-highlight';
import rehypeStringify from 'rehype-stringify';
import { dedent, remarkCodeMeta } from '../../plugins/code-meta';
import { rehypeCodeBlocks } from '../../plugins/code-blocks';

const publicDir = mkdtempSync(join(tmpdir(), 'code-include-'));
mkdirSync(join(publicDir, 'code'));
writeFileSync(
  join(publicDir, 'code', 'fit.py'),
  [
    'import numpy as np',
    '',
    'class Model:',
    '    def fit(self, X, y):',
    '        self.w = np.linalg.lstsq(X, y)[0]',
    '        return self',
    '',
  ].join('\n'),
);

const render = (markdown: string, warnings: string[] = []): string =>
  String(
    unified()
      .use(remarkParse)
      .use(remarkCodeMeta, { publicDir, onWarn: (message: string) => warnings.push(message) })
      .use(remarkRehype)
      .use(rehypeHighlight, { detect: false, ignoreMissing: true })
      .use(rehypeCodeBlocks)
      .use(rehypeStringify)
      .processSync(markdown),
  );

describe('code from a file', () => {
  it('reads the whole file under public/, its language from the extension', () => {
    const html = render('```file=/code/fit.py\n```');
    expect(html).toContain('class="hljs language-python"');
    expect(html).toContain('<span class="hljs-keyword">import</span> numpy');
    expect(html).toContain('<a class="code-block__source" href="/code/fit.py">fit.py</a>');
  });

  it('takes a range of lines, dedented, numbered as the file numbers them', () => {
    const html = render('```python file=/code/fit.py lines=4-6 {5}\n```');
    expect(html).toContain('style="counter-reset: line 3"');
    expect(html).toContain('fit.py, from line 4');
    expect(html).not.toContain('import');
    // The mark names the file's line 5, the second line shown.
    const lines = html.match(/<span class="code-line[^"]*"/g) ?? [];
    expect(lines).toHaveLength(3);
    expect(lines[1]).toContain('code-line--mark');
    expect(html).toMatch(/<span class="code-line[^"]*"><span class="hljs-keyword">def<\/span>/);
  });

  it('warns about a missing file or a range outside it, and leaves the fence', () => {
    const warnings: string[] = [];
    render('```python file=/code/nope.py\nx = 1\n```', warnings);
    render('```python file=/code/fit.py lines=40-50\n```', warnings);
    expect(warnings[0]).toMatch(/no such file/);
    expect(warnings[1]).toMatch(/outside the file's 6 lines/);
  });

  it('dedents by the indent every line shares', () => {
    expect(dedent(['    a', '      b', '', '    c'])).toEqual(['a', '  b', '', 'c']);
  });
});

describe('code callouts', () => {
  const fence = [
    '```python',
    'model = Model()  # <1>',
    'model.fit(X, y)  # fit it <2>',
    'print(model.w)',
    '```',
    '',
    'Caption: Fitting.',
    '',
    '1. Make the model.',
    '2. Fit it.',
  ].join('\n');

  it('turns markers into circles that link to the list after the block', () => {
    const html = render(fence);
    expect(html).toContain(
      '<a class="code-callout" href="#co-1-1" data-callout="1" aria-label="Note 1"></a>',
    );
    expect(html).toContain('<ol class="code-callouts">');
    expect(html).toContain('<li id="co-1-2" data-callout="2">Fit it.</li>');
  });

  it('drops a comment that held only the marker and keeps one that said more', () => {
    const html = render(fence);
    expect(html).not.toMatch(/# <1>|&#x3C;1>/);
    expect(html).toContain('# fit it');
    expect(html).not.toContain('fit it &#x3C;2>');
  });

  it('numbers a one-line block that carries a callout', () => {
    const html = render('```js\nrun(); // <1>\n```\n\n1. Runs.');
    expect(html).toContain('class="numbered"');
    expect(html).toContain('href="#co-1-1"');
  });
});
