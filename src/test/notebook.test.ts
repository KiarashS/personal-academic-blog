import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkRehype from 'remark-rehype';
import rehypeRaw from 'rehype-raw';
import rehypeStringify from 'rehype-stringify';
import { rehypeNotebook } from '../../plugins/notebook';
import { rehypeCaptions } from '../../plugins/captions';

const publicDir = mkdtempSync(join(tmpdir(), 'notebook-'));

/** The ESC byte that opens a terminal colour code. */
const esc = '\u001B';

const book = {
  cells: [
    { cell_type: 'markdown', source: ['## Setup\n', '\n', 'A *note* before the code.'] },
    {
      cell_type: 'code',
      execution_count: 3,
      source: ['print("hi")\n'],
      outputs: [{ output_type: 'stream', name: 'stdout', text: ['hi\n'] }],
    },
    {
      cell_type: 'code',
      execution_count: 4,
      source: ['1 / 0\n'],
      outputs: [
        {
          output_type: 'error',
          ename: 'ZeroDivisionError',
          evalue: 'division by zero',
          traceback: [`${esc}[0;31mZeroDivisionError${esc}[0m: division by zero`],
        },
      ],
    },
    {
      cell_type: 'code',
      execution_count: 5,
      source: ['plot()\n'],
      outputs: [{ output_type: 'display_data', data: { 'image/png': ['iVBORw0KGgo=\n'] } }],
    },
    { cell_type: 'code', execution_count: 6, source: ['   \n'] },
  ],
  metadata: { kernelspec: { language: 'python' } },
};

writeFileSync(join(publicDir, 'demo.ipynb'), JSON.stringify(book));

const warnings: string[] = [];

const render = (markdown: string): string =>
  String(
    unified()
      .use(remarkParse)
      .use(remarkRehype, { allowDangerousHtml: true })
      .use(rehypeRaw)
      .use(rehypeNotebook, {
        publicDir,
        renderMarkdown: (md: string) => `<md>${md.trim()}</md>`,
        onWarn: (message: string) => warnings.push(message),
      })
      .use(rehypeCaptions)
      .use(rehypeStringify, { allowDangerousHtml: true })
      .processSync(markdown),
  );

describe('rehypeNotebook', () => {
  const html = render('```notebook\n/demo.ipynb\n```');

  it('renders markdown cells through the site pipeline', () => {
    expect(html).toContain('<md>## Setup');
  });

  it('keeps execution counts with their code', () => {
    expect(html).toContain('[3]');
    expect(html).toContain('<code class="language-python">');
    expect(html).toContain('print(');
  });

  it('shows stream output', () => {
    expect(html).toContain('<pre class="nb-output" tabindex="0">hi\n</pre>');
  });

  it('strips ANSI codes from a traceback', () => {
    expect(html).toContain('ZeroDivisionError: division by zero');
    expect(html).not.toContain(`${esc}[0;31m`);
  });

  it('inlines an image output', () => {
    expect(html).toContain('src="data:image/png;base64,iVBORw0KGgo="');
  });

  it('skips an empty cell', () => {
    expect(html).not.toContain('[6]');
  });

  it('takes a caption like any other figure', () => {
    const captioned = render('```notebook\n/demo.ipynb\n```\n\nCaption: The sampler.');
    expect(captioned).toContain('Figure 1.</span> The sampler.');
  });

  it('warns instead of failing when the file is missing', () => {
    const missing = render('```notebook\n/nope.ipynb\n```');
    expect(missing).toContain('/nope.ipynb');
    expect(warnings.some((message) => message.includes('/nope.ipynb'))).toBe(true);
  });
});
