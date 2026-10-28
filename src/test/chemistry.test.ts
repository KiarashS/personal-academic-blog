import { describe, expect, it } from 'vitest';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkMath from 'remark-math';
import remarkRehype from 'remark-rehype';
import rehypeKatex from 'rehype-katex';
import rehypeStringify from 'rehype-stringify';
// What plugins/markdown.ts imports, so the posts get the same KaTeX.
import 'katex/contrib/mhchem';

const render = (markdown: string): string =>
  String(
    unified()
      .use(remarkParse)
      .use(remarkMath)
      .use(remarkRehype)
      .use(rehypeKatex, { throwOnError: false, strict: false })
      .use(rehypeStringify)
      .processSync(markdown),
  );

describe('mhchem', () => {
  it('renders formulas, reactions and units', () => {
    const html = render('$\\ce{2H2 + O2 -> 2H2O}$, $\\ce{SO4^2-}$ and $\\pu{123 kJ/mol}$');
    expect(html).not.toContain('katex-error');
    expect(html.match(/class="katex"/g)).toHaveLength(3);
  });
});
