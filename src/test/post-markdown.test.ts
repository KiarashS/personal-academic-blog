import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { postMarkdown } from '../../plugins/post-markdown';

const publicDir = mkdtempSync(join(tmpdir(), 'post-markdown-'));
writeFileSync(join(publicDir, 'fit.py'), 'import numpy\n\ndef fit():\n    return 1\n');

const frontmatter = '---\ntitle: A post\nsummary: Words.\n---\n';
const body = [
  'As [](#fig-loss) shows, and [](/blog/other) agrees.',
  '',
  'See [](#sec).',
  '',
  '> [!SOLUTION] to [](#ex)',
  '> Done.',
  '',
  '![A plot](/posts/a/plot.png#wide "Loss")',
  '',
  'Caption: The loss. {#fig-loss}',
  '',
  '*[SGD]: stochastic gradient descent',
  '',
  'We use SGD.',
  '',
  '```python file=/fit.py lines=3-4',
  '```',
  '',
  '```notebook',
  '/posts/a/run.ipynb#invert',
  '```',
  '',
  '<iframe src="/projects/x/" title="X"></iframe>',
  '',
  'Code keeps `[](#fig-loss)` and:',
  '',
  '```markdown',
  'As [](#fig-loss) shows {#keep}',
  '```',
  '',
].join('\n');

const html =
  '<p>As <a href="#fig-loss" class="xref">Figure 1</a> shows</p>' +
  '<summary>Solution to <span class="xref" data-ref="ex">Exercise 2.3</span></summary>' +
  '<p>See <a href="#sec" class="xref">The loss <span class="katex"><span class="katex-mathml"><math><semantics><mrow></mrow><annotation encoding="application/x-tex">\\mathcal{L}</annotation></semantics></math></span><span class="katex-html">L</span></span></a></p>';

const out = postMarkdown({
  raw: frontmatter + body,
  body,
  html,
  pageUrl: 'https://example.org/blog/a/',
  absolute: (path) => `https://example.org${path}`,
  titles: new Map([['/blog/other', 'Another post']]),
  code: { publicDir },
});

describe('postMarkdown', () => {
  it('keeps the frontmatter as written', () => {
    expect(out.startsWith(frontmatter.trimEnd() + '\n\n')).toBe(true);
  });

  it('fills a reference with the words the page gives it, and links to the place', () => {
    expect(out).toContain('As [Figure 1](https://example.org/blog/a/#fig-loss) shows');
  });

  it('fills a reference the page writes without a link, in a collapsible’s title', () => {
    expect(out).toContain('> [!SOLUTION] to [Exercise 2.3](https://example.org/blog/a/#ex)');
  });

  it('gives maths in a reference back as TeX', () => {
    expect(out).toContain('See [The loss $\\mathcal{L}$](https://example.org/blog/a/#sec).');
  });

  it('gives a link to another post its title, at its full address', () => {
    expect(out).toContain('[Another post](https://example.org/blog/other)');
  });

  it('makes a figure address absolute and drops the site’s flags', () => {
    expect(out).toContain('![A plot](https://example.org/posts/a/plot.png "Loss")');
  });

  it('takes labels out of captions', () => {
    expect(out).toContain('Caption: The loss.\n');
    expect(out).not.toMatch(/Caption: The loss\. \{#/);
  });

  it('moves abbreviations to a list at the end', () => {
    expect(out).not.toContain('*[SGD]');
    expect(
      out.trimEnd().endsWith('## Abbreviations\n\n- **SGD**: stochastic gradient descent'),
    ).toBe(true);
  });

  it('writes the code a file= fence shows into it', () => {
    expect(out).toContain('```python\ndef fit():\n    return 1\n```');
  });

  it('turns a notebook into a link to it', () => {
    expect(out).toContain('[run.ipynb](https://example.org/posts/a/run.ipynb)');
  });

  it('makes root-relative addresses in HTML absolute', () => {
    expect(out).toContain('<iframe src="https://example.org/projects/x/" title="X"></iframe>');
  });

  it('leaves code alone', () => {
    expect(out).toContain('Code keeps `[](#fig-loss)` and:');
    expect(out).toContain('As [](#fig-loss) shows {#keep}');
  });
});
