import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkRehype from 'remark-rehype';
import rehypeHighlight from 'rehype-highlight';
import rehypeStringify from 'rehype-stringify';
import { remarkCodeMeta } from '../../plugins/code-meta';
import { rehypeCodeBlocks } from '../../plugins/code-blocks';
import {
  fetchText,
  loadLock,
  remoteFile,
  saveLock,
  sha256,
  type Fetch,
  type RemoteLock,
} from '../../plugins/remote-code';

const SHA = '3f2c1a9b8d7e6f5a4b3c2d1e0f9a8b7c6d5e4f3a';
const SOURCE = [
  'import numpy as np',
  '',
  'def fit(X, y):',
  '    return np.linalg.lstsq(X, y)[0]',
  '',
].join('\n');

/** A stand-in for the network: answers with SOURCE, and counts the calls. */
function fakeFetch(): Fetch & { calls: string[] } {
  const calls: string[] = [];
  const fn = ((url: string) => {
    calls.push(url);
    return Promise.resolve(
      new Response(url.includes('missing') ? 'Not Found' : SOURCE, {
        status: url.includes('missing') ? 404 : 200,
      }),
    );
  }) as Fetch & { calls: string[] };
  fn.calls = calls;
  return fn;
}

async function render(
  markdown: string,
  lock: RemoteLock,
  fetcher: Fetch,
  warnings: string[] = [],
): Promise<string> {
  return String(
    await unified()
      .use(remarkParse)
      .use(remarkCodeMeta, {
        remote: { lock, fetch: fetcher },
        onWarn: (message: string) => warnings.push(message),
      })
      .use(remarkRehype)
      .use(rehypeHighlight, { detect: false, ignoreMissing: true })
      .use(rehypeCodeBlocks)
      .use(rehypeStringify)
      .process(markdown),
  );
}

describe('remoteFile', () => {
  it('reads a GitHub page link and fetches its raw text', () => {
    const file = remoteFile(`https://github.com/you/repo/blob/${SHA}/src/fit.py`)!;
    expect(file.raw).toBe(`https://raw.githubusercontent.com/you/repo/${SHA}/src/fit.py`);
    expect(file.page).toBe(`https://github.com/you/repo/blob/${SHA}/src/fit.py`);
    expect(file.name).toBe('fit.py');
    expect(file.pinned).toBe(true);
    expect(file.lines!(3, 4)).toBe('#L3-L4');
  });

  it('reads a raw GitHub link and links back to the page', () => {
    const file = remoteFile(`https://raw.githubusercontent.com/you/repo/main/fit.py`)!;
    expect(file.page).toBe('https://github.com/you/repo/blob/main/fit.py');
    expect(file.pinned).toBe(false);
  });

  it('reads GitLab, nested groups and all', () => {
    const file = remoteFile(`https://gitlab.com/lab/team/repo/-/blob/${SHA}/a/fit.py`)!;
    expect(file.raw).toBe(`https://gitlab.com/lab/team/repo/-/raw/${SHA}/a/fit.py`);
    expect(file.lines!(3, 4)).toBe('#L3-4');
    expect(file.pinned).toBe(true);
  });

  it('takes any other https address as it is, and refuses plain http', () => {
    const other = remoteFile('https://example.org/code/fit.py')!;
    expect(other).toMatchObject({ raw: 'https://example.org/code/fit.py', name: 'fit.py' });
    expect(other.pinned).toBeUndefined();
    expect(remoteFile('http://example.org/fit.py')).toBeUndefined();
  });
});

describe('remote file fences', () => {
  const url = `https://github.com/you/repo/blob/${SHA}/fit.py`;
  const raw = `https://raw.githubusercontent.com/you/repo/${SHA}/fit.py`;

  it('fetches the file once, keeps it in the lock, and links to its lines', async () => {
    const lock: RemoteLock = {};
    const fetcher = fakeFetch();
    const html = await render(`\`\`\`file=${url} lines=3-4\n\`\`\``, lock, fetcher);
    expect(fetcher.calls).toEqual([raw]);
    expect(lock[raw]).toMatchObject({ sha256: sha256(SOURCE), text: SOURCE });
    expect(html).toContain('class="hljs language-python"');
    expect(html).toContain(`href="${url}#L3-L4"`);
    expect(html).toContain('>fit.py, from line 3</a>');
    expect(html).toContain('style="counter-reset: line 2"');

    await render(`\`\`\`file=${url}\n\`\`\``, lock, fetcher);
    expect(fetcher.calls).toHaveLength(1);
  });

  it('builds from the lock alone, with no network at all', async () => {
    const lock: RemoteLock = {
      [raw]: { sha256: sha256(SOURCE), fetched: '2026-10-29', text: SOURCE },
    };
    const offline: Fetch = () => Promise.reject(new Error('offline'));
    const html = await render(`\`\`\`python file=${url}\n\`\`\``, lock, offline);
    expect(html).toContain('lstsq');
  });

  it('reports a branch link, and a file it could not fetch', async () => {
    const warnings: string[] = [];
    await render(
      '```file=https://github.com/you/repo/blob/main/fit.py\n```\n\n```file=https://example.org/missing.py\n```',
      {},
      fakeFetch(),
      warnings,
    );
    expect(warnings.some((w) => /names a branch or a tag/.test(w))).toBe(true);
    expect(warnings.some((w) => /could not be fetched \(the server answered 404\)/.test(w))).toBe(
      true,
    );
  });

  it('stays synchronous for a post that quotes no remote file', () => {
    const html = String(
      unified()
        .use(remarkParse)
        .use(remarkCodeMeta)
        .use(remarkRehype)
        .use(rehypeStringify)
        .processSync('```js\nx\n```'),
    );
    expect(html).toContain('language-js');
  });
});

describe('the lock file', () => {
  it('is written sorted, and read back', () => {
    const path = join(mkdtempSync(join(tmpdir(), 'lock-')), 'remote-code.lock.json');
    saveLock(path, {
      'https://b.example/x.py': { sha256: 'b', fetched: '2026-10-29', text: 'b' },
      'https://a.example/x.py': { sha256: 'a', fetched: '2026-10-29', text: 'a' },
    });
    expect(Object.keys(JSON.parse(readFileSync(path, 'utf8')) as object)).toEqual([
      'https://a.example/x.py',
      'https://b.example/x.py',
    ]);
    expect(loadLock(path)['https://a.example/x.py'].text).toBe('a');
  });

  it('refuses a file that is not text', async () => {
    const binary: Fetch = () => Promise.resolve(new Response('a\u0000b'));
    await expect(fetchText('https://example.org/x', binary)).rejects.toThrow(/not text/);
  });
});
