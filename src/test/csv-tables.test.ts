import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkRehype from 'remark-rehype';
import rehypeStringify from 'rehype-stringify';
import { remarkCodeMeta } from '../../plugins/code-meta';
import { parseDelimited, rehypeCsvTables } from '../../plugins/csv-tables';
import { rehypeCaptions } from '../../plugins/captions';
import { rehypeContentTweaks } from '../../plugins/content-tweaks';

const publicDir = mkdtempSync(join(tmpdir(), 'csv-'));
mkdirSync(join(publicDir, 'data'));
writeFileSync(
  join(publicDir, 'data', 'results.csv'),
  'model,accuracy,note\nLogistic,0.86,"fast, simple"\nForest,0.89,\n',
);
writeFileSync(join(publicDir, 'data', 'runs.tsv'), 'run\tloss\na\t1.5\nb\t1.2\n');
writeFileSync(
  join(publicDir, 'data', 'long.csv'),
  ['step,loss', ...Array.from({ length: 30 }, (_, i) => `${i},${(1 / (i + 1)).toFixed(3)}`)].join(
    '\n',
  ),
);

const render = (markdown: string, warnings: string[] = []): string =>
  String(
    unified()
      .use(remarkParse)
      .use(remarkCodeMeta, { publicDir })
      .use(remarkRehype)
      .use(rehypeCsvTables, { onWarn: (message: string) => warnings.push(message) })
      .use(rehypeContentTweaks, { base: '/' })
      .use(rehypeCaptions)
      .use(rehypeStringify)
      .processSync(markdown),
  );

describe('parseDelimited', () => {
  it('reads quoted cells with commas, quotes and line breaks', () => {
    expect(parseDelimited('a,b\n"x, y","say ""hi""\nthere"\n', ',')).toEqual([
      ['a', 'b'],
      ['x, y', 'say "hi"\nthere'],
    ]);
  });

  it('reads Windows line ends and drops blank lines', () => {
    expect(parseDelimited('a,b\r\n1,2\r\n\r\n', ',')).toEqual([
      ['a', 'b'],
      ['1', '2'],
    ]);
  });
});

describe('tables from data', () => {
  it('turns a file under public/ into a table, numbers right-aligned', () => {
    const html = render('```table file=/data/results.csv\n```');
    expect(html).toContain('<div class="table-wrap"><table><thead><tr><th scope="col">model</th>');
    expect(html).toContain('<th scope="col" class="numeric">accuracy</th>');
    expect(html).toContain('<td class="numeric">0.86</td>');
    expect(html).toContain('<td>fast, simple</td>');
    expect(html).not.toContain('<pre');
    expect(html.match(/class="table-wrap"/g)).toHaveLength(1);
  });

  it('reads rows written in the fence, and tabs in a .tsv', () => {
    expect(render('```table\nname,score\na,1\n```')).toContain('<td class="numeric">1</td>');
    expect(render('```table file=/data/runs.tsv\n```')).toContain('<td class="numeric">1.5</td>');
  });

  it('is numbered as a table by a caption above it', () => {
    const html = render('```table file=/data/results.csv\n```\n\nCaption: Accuracy. {#tbl-acc}');
    expect(html).toContain('id="tbl-acc"');
    expect(html).toMatch(
      /<figcaption class="caption"><span class="caption__label">Table 1\.<\/span>/,
    );
  });

  it('lets a long table scroll in its own box', () => {
    expect(render('```table file=/data/long.csv\n```')).toContain(
      'class="table-wrap table-wrap--scroll"',
    );
  });

  it('fills out a short row, and says so', () => {
    const warnings: string[] = [];
    const html = render('```table\na,b,c\n1,2\n```', warnings);
    expect(html).toContain('<td class="numeric">2</td><td></td>');
    expect(warnings[0]).toMatch(/rows of more or fewer cells than its 3 headings/);
  });

  it('leaves a csv fence, which shows CSV as code, alone', () => {
    expect(render('```csv\na,b\n```')).toContain('<pre><code class="language-csv">');
  });
});
