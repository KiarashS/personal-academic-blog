import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { Code, Root } from 'mdast';
import { fetchText, remoteFile, sha256, type Fetch, type RemoteLock } from './remote-code';

/**
 * What a fence says after its language, read while the tree is still Markdown.
 *
 *     ```ts {2,4-6}          lines 2 and 4 to 6 highlighted
 *     ```diff-ts             a change, each line marked + or -, highlighted as TypeScript
 *     ```python tab="Python" one tab of a set; the fences that follow it join it
 *     ```python file=/code/fit.py lines=10-24
 *                            the code is read from a file under public/
 *
 * The fence's own words are carried to the HTML as data attributes on the
 * `code` element, because the meta string itself does not survive the raw-HTML
 * pass, and `rehypeCodeBlocks` reads them once the code is highlighted.
 *
 * A `diff-` fence loses its markers here, so the highlighter sees the code it
 * is highlighting and not a column of plus signs. Which lines were added and
 * which removed goes along as one character per line.
 */

/** `{1,3-5}` anywhere in the meta. */
const LINES = /\{([\d,\s-]+)\}/;
/** `tab="Python"`, `tab='Python'` or `tab=Python`. */
const TAB = /\btab=(?:"([^"]*)"|'([^']*)'|(\S+))/;
/** `file=/code/fit.py`, quoted or not. */
const FILE = /\bfile=(?:"([^"]*)"|'([^']*)'|(\S+))/;
/** `lines=10-24`, or one line, `lines=12`. */
const FILE_LINES = /\blines=(\d+)(?:-(\d+))?/;

/** The language a file's extension names, for a fence that names none. */
const EXTENSIONS: Record<string, string> = {
  bash: 'bash',
  c: 'c',
  cpp: 'cpp',
  cs: 'csharp',
  css: 'css',
  go: 'go',
  h: 'c',
  hs: 'haskell',
  html: 'html',
  java: 'java',
  jl: 'julia',
  js: 'javascript',
  json: 'json',
  jsx: 'jsx',
  kt: 'kotlin',
  lua: 'lua',
  m: 'matlab',
  md: 'markdown',
  mjs: 'javascript',
  php: 'php',
  pl: 'perl',
  py: 'python',
  r: 'r',
  rb: 'ruby',
  rs: 'rust',
  scala: 'scala',
  sh: 'bash',
  sql: 'sql',
  swift: 'swift',
  tex: 'latex',
  toml: 'toml',
  ts: 'typescript',
  tsx: 'tsx',
  yaml: 'yaml',
  yml: 'yaml',
};

/** Lines with the indent they all share taken off, so a method reads from the left edge. */
export function dedent(lines: string[]): string[] {
  const indents = lines
    .filter((line) => line.trim())
    .map((line) => /^[ \t]*/.exec(line)?.[0].length ?? 0);
  const common = indents.length > 0 ? Math.min(...indents) : 0;
  return lines.map((line) => line.slice(common));
}

export interface CodeMetaOptions {
  /** Where `file=` paths resolve, i.e. `public`. */
  publicDir?: string;
  /**
   * The copies of remote files kept with the site (plugins/remote-code.ts).
   * Without one, a `file=` that names a URL is reported and left as written.
   */
  remote?: {
    lock: RemoteLock;
    /** Called after a file is fetched and added, so the lock can be written. */
    onFetched?: () => void;
    fetch?: Fetch;
  };
  onWarn?: (message: string) => void;
}

const today = (): string => new Date().toISOString().slice(0, 10);

/** The `file=` a fence names, if it names one. */
function filePath(meta: string): string {
  const file = FILE.exec(meta);
  return file ? (file[1] ?? file[2] ?? file[3] ?? '').trim() : '';
}

const isUrl = (path: string): boolean => /^[a-z][a-z0-9+.-]*:/i.test(path);

/**
 * A fence's meta, with ```file=…``` that names no language moved out of the
 * language, where CommonMark put it.
 */
function metaOf(code: Code): string {
  let meta = code.meta ?? '';
  if (code.lang && /^(?:file|lines)=/.test(code.lang)) {
    meta = `${code.lang} ${meta}`;
    code.lang = null;
    code.meta = meta;
  }
  return meta;
}

/**
 * The code of a `file=` fence, read from under `public/`, so the listing in
 * the post is the file a reader can download and the one you ran, and cannot
 * drift from it. `lines=10-24` takes those lines only, with their shared
 * indent removed, and numbers them as the file does.
 */
function readSource(
  code: Code,
  meta: string,
  options: CodeMetaOptions,
): { start: number; source: string; name: string } | undefined {
  const path = filePath(meta);
  if (!path) return undefined;
  const warn = (message: string) => options.onWarn?.(`file=${path}: ${message}`);

  let text: string;
  let link = path;
  let name = path.split('/').pop() ?? path;
  let lineAnchor: ((start: number, end: number) => string) | undefined;
  if (isUrl(path)) {
    const remote = remoteFile(path);
    if (!remote) {
      warn('a file read from elsewhere must be an https address');
      return undefined;
    }
    const entry = options.remote?.lock[remote.raw];
    // Fetched before this pass, or reported as it failed.
    if (!entry) return undefined;
    text = entry.text;
    link = remote.page;
    name = remote.name;
    lineAnchor = remote.lines;
  } else {
    if (!path.startsWith('/')) {
      warn('the path should start at public/, as /code/fit.py does, or be an https address');
      return undefined;
    }
    const full = join(options.publicDir ?? 'public', path);
    if (!existsSync(full)) {
      warn('no such file in public/');
      return undefined;
    }
    text = readFileSync(full, 'utf8');
  }

  const all = text.replace(/\r\n?/g, '\n').replace(/\n$/, '').split('\n');
  const range = FILE_LINES.exec(meta);
  let start = 1;
  let lines = all;
  if (range) {
    start = Number(range[1]);
    const end = Math.min(range[2] ? Number(range[2]) : start, all.length);
    if (start < 1 || start > all.length || end < start) {
      warn(`lines=${range[0].slice(6)} is outside the file's ${all.length} lines`);
      return undefined;
    }
    lines = dedent(all.slice(start - 1, end));
    if (lineAnchor) link += lineAnchor(start, end);
  }
  if (code.value.trim()) warn('the fence has code of its own, which the file replaces');

  const extension = name.split('.').pop()?.toLowerCase() ?? '';
  if (!code.lang) code.lang = EXTENSIONS[extension];
  code.value = lines.join('\n');
  return { start, source: link, name };
}

/**
 * Fetches every remote file the tree names that the lock does not yet have,
 * and adds it. A GitHub or GitLab link to a branch rather than a commit is
 * reported whether or not it is fetched, since it is what the author should
 * change.
 */
async function fetchRemote(codes: Code[], options: CodeMetaOptions): Promise<void> {
  const remote = options.remote;
  const wanted = new Map<string, string>();
  for (const code of codes) {
    const path = filePath(metaOf(code));
    if (!path || !isUrl(path)) continue;
    const file = remoteFile(path);
    if (!file) continue;
    if (file.pinned === false) {
      options.onWarn?.(
        `file=${path}: names a branch or a tag, not a commit, so the file can change ` +
          'under the post; the copy in src/content/remote-code.lock.json is what it shows',
      );
    }
    if (!remote) {
      options.onWarn?.(`file=${path}: files from elsewhere are not read here`);
      continue;
    }
    if (!remote.lock[file.raw]) wanted.set(file.raw, path);
  }
  if (!remote || wanted.size === 0) return;

  await Promise.all(
    [...wanted].map(async ([raw, path]) => {
      try {
        const text = await fetchText(raw, remote.fetch);
        remote.lock[raw] = { sha256: sha256(text), fetched: today(), text };
        remote.onFetched?.();
      } catch (cause) {
        const why = cause instanceof Error ? cause.message : String(cause);
        options.onWarn?.(
          `file=${path}: could not be fetched (${why}); the fence is left as written`,
        );
      }
    }),
  );
}

/** The line numbers a `{…}` names, counted from 1, in order and without repeats. */
export function parseLineRanges(spec: string): number[] {
  const lines = new Set<number>();
  for (const part of spec.split(',')) {
    const [from, to] = part
      .trim()
      .split('-')
      .map((n) => Number.parseInt(n, 10));
    if (!Number.isFinite(from) || from < 1) continue;
    const end = Number.isFinite(to) && to >= from ? to : from;
    for (let line = from; line <= Math.min(end, from + 10_000); line += 1) lines.add(line);
  }
  return [...lines].sort((a, b) => a - b);
}

/**
 * The marker each line of a diff starts with, and the line without it. A line
 * with no marker is unchanged, as a hunk header or a blank line is.
 */
export function splitDiff(value: string): { kinds: string; code: string } {
  const kinds: string[] = [];
  const code = value
    .split('\n')
    .map((line) => {
      const sign = line[0];
      if (sign === '+' || sign === '-') {
        kinds.push(sign);
        return line.slice(1);
      }
      kinds.push(' ');
      return sign === ' ' ? line.slice(1) : line;
    })
    .join('\n');
  return { kinds: kinds.join(''), code };
}

export function remarkCodeMeta(options: CodeMetaOptions = {}) {
  const apply = (code: Code) => {
    const props: Record<string, string> = {};
    // ```file=/code/fit.py``` names no language, so CommonMark reads the
    // first word as one; it is the meta's.
    const meta = metaOf(code);

    const included = readSource(code, meta, options);
    if (included) {
      props.dataSource = included.source;
      props.dataSourceName = included.name;
      if (included.start > 1) props.dataStart = String(included.start);
    }

    if (code.lang?.startsWith('diff-') && code.lang.length > 5) {
      const { kinds, code: stripped } = splitDiff(code.value);
      code.lang = code.lang.slice(5);
      code.value = stripped;
      props.dataDiff = kinds;
    }

    const lines = LINES.exec(meta);
    if (lines) {
      // A listing taken from the middle of a file is numbered as the
      // file is, and its marks name the file's lines.
      const offset = (included?.start ?? 1) - 1;
      const marked = parseLineRanges(lines[1])
        .map((line) => line - offset)
        .filter((line) => line > 0);
      if (marked.length > 0) props.dataMark = marked.join(',');
    }
    const tab = TAB.exec(meta);
    const tabLabel = tab ? (tab[1] ?? tab[2] ?? tab[3] ?? '').trim() : '';
    if (tabLabel) props.dataTab = tabLabel;

    if (Object.keys(props).length > 0) {
      code.data = {
        ...code.data,
        hProperties: { ...(code.data?.hProperties ?? {}), ...props },
      };
    }
  };

  return (tree: Root): void | Promise<void> => {
    const codes: Code[] = [];
    const visit = (node: { type: string; children?: unknown[] }) => {
      if (node.type === 'code') codes.push(node as Code);
      for (const child of node.children ?? [])
        visit(child as { type: string; children?: unknown[] });
    };
    visit(tree);

    // Synchronous unless a remote file has to be fetched, so a post that
    // quotes none still renders with `processSync`.
    const remote = codes.some((code) => {
      const path = filePath(metaOf(code));
      return isUrl(path);
    });
    if (!remote) {
      codes.forEach(apply);
      return;
    }
    return fetchRemote(codes, options).then(() => codes.forEach(apply));
  };
}
