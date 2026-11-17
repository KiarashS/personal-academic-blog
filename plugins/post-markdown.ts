import type { Element, ElementContent, Root as HastRoot } from 'hast';
import { fromHtml } from 'hast-util-from-html';
import type { Link, Nodes } from 'mdast';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import remarkParse from 'remark-parse';
import { unified } from 'unified';
import { fileFenceCode } from './code-meta';
import type { CodeMetaOptions } from './code-meta';

/**
 * A post as Markdown, written beside its page (`/blog/a-post/index.md`) for
 * anyone who wants the text without the page: a reader's tool, a language
 * model the site's `llms.txt` points at, someone quoting a passage.
 *
 * It is the source as written, frontmatter and all, so the maths, the code and
 * the diagrams' sources are exactly what the author typed. What only this
 * site's build understands is tidied, because a copy read anywhere else would
 * show it raw:
 *
 * - a reference with no text, `[](#fig-loss)`, gets the words the page shows,
 *   "Figure 2", and a link to that place on the page;
 * - a link to another post with no text gets the post's title;
 * - `{#name}` labels are taken out;
 * - a `file=` fence gets the code it shows on the page, and a `table` fence
 *   reading a CSV gets the CSV;
 * - a notebook fence becomes a link to the notebook;
 * - `*[MCMC]: …` definitions move to a list at the end;
 * - addresses from the site's root, `/posts/…`, become full URLs, and a
 *   figure's `#wide`-style flags come off its address.
 *
 * Each change replaces the span of source it covers and nothing else, so the
 * rest keeps the author's own formatting.
 */

export interface PostMarkdownOptions {
  /** The post's file, frontmatter included. */
  raw: string;
  /** Its body, the part after the frontmatter. */
  body: string;
  /** The page the build made of it, for the words references were given. */
  html: string;
  /** The page's absolute address, e.g. `https://example.org/blog/a-post/`. */
  pageUrl: string;
  /** Makes a root-relative path absolute. */
  absolute: (path: string) => string;
  /** Posts' titles by path, `/blog/a-post`. */
  titles: Map<string, string>;
  /** Where `file=` fences read. */
  code: Pick<CodeMetaOptions, 'publicDir' | 'remote'>;
}

interface Edit {
  start: number;
  end: number;
  text: string;
}

const ABBREVIATION = /^\*\[([^\]\n]+)\]:[ \t]*(\S.*)$/;
const LABEL = /[ \t]*\{#[\w-]+\}/g;

const classesOf = (node: Element): string[] => {
  const value = node.properties?.className;
  return Array.isArray(value) ? value.map(String) : [];
};

/** The words of a filled-in reference, maths given back as its TeX. */
function referenceWords(content: ElementContent[]): string {
  const words = (node: ElementContent): string => {
    if (node.type === 'text') return node.value;
    if (node.type !== 'element') return '';
    if (classesOf(node).includes('katex')) {
      const tex = findAnnotation(node);
      return tex === undefined ? '' : `$${tex}$`;
    }
    return node.children.map(words).join('');
  };
  return content.map(words).join('').replace(/\s+/g, ' ').trim();
}

function findAnnotation(node: Element): string | undefined {
  for (const child of node.children) {
    if (child.type !== 'element') continue;
    if (child.tagName === 'annotation') {
      const text = child.children.find((c) => c.type === 'text');
      return text?.type === 'text' ? text.value : undefined;
    }
    const found = findAnnotation(child);
    if (found !== undefined) return found;
  }
  return undefined;
}

/** What each `[](#id)` reads on the page, by id. */
function referenceLabels(html: string): Map<string, string> {
  const labels = new Map<string, string>();
  const walk = (node: HastRoot | Element) => {
    for (const child of node.children) {
      if (child.type !== 'element') continue;
      const href = child.properties?.href;
      // A reference in a collapsible's title is a span, its target kept aside.
      const target =
        typeof href === 'string' && href.startsWith('#')
          ? decodeURIComponent(href.slice(1))
          : typeof child.properties?.dataRef === 'string'
            ? child.properties.dataRef
            : undefined;
      if (classesOf(child).includes('xref') && target !== undefined) {
        const id = target;
        if (!labels.has(id)) labels.set(id, referenceWords(child.children));
        continue;
      }
      walk(child);
    }
  };
  walk(fromHtml(html, { fragment: true }));
  return labels;
}

const isEmptyLink = (node: Link) =>
  node.children.every((child) => child.type === 'text' && child.value.trim() === '');

const visit = (node: Nodes, enter: (node: Nodes) => void) => {
  enter(node);
  if ('children' in node) for (const child of node.children) visit(child, enter);
};

export function postMarkdown(options: PostMarkdownOptions): string {
  const { body, raw } = options;
  const tree = unified().use(remarkParse).use(remarkGfm).use(remarkMath).parse(body);
  const labels = referenceLabels(options.html);
  const edits: Edit[] = [];
  const abbreviations: [string, string][] = [];

  const span = (node: Nodes): [number, number] | undefined => {
    const start = node.position?.start.offset;
    const end = node.position?.end.offset;
    return start === undefined || end === undefined ? undefined : [start, end];
  };
  const replace = (node: Nodes, text: string) => {
    const at = span(node);
    if (at) edits.push({ start: at[0], end: at[1], text });
  };
  /** The source of a link's or image's words, as typed. */
  const inner = (node: Link): string => {
    const first = node.children[0]?.position?.start.offset;
    const last = node.children[node.children.length - 1]?.position?.end.offset;
    return first === undefined || last === undefined ? '' : body.slice(first, last);
  };
  const pathOf = (url: string) => url.replace(/[?#].*$/, '').replace(/\/+$/, '') || '/';
  const rootRelative = (url: string) => url.startsWith('/') && !url.startsWith('//');

  visit(tree, (node) => {
    if (node.type === 'link') {
      const url = node.url;
      if (url.startsWith('#') && isEmptyLink(node)) {
        const id = decodeURIComponent(url.slice(1));
        const words = labels.get(id) ?? id;
        replace(node, `[${words}](${options.pageUrl}${url})`);
      } else if (rootRelative(url)) {
        const words = isEmptyLink(node) ? (options.titles.get(pathOf(url)) ?? url) : inner(node);
        const title = node.title ? ` "${node.title}"` : '';
        replace(node, `[${words}](${options.absolute(url)}${title})`);
      }
      return;
    }

    if (node.type === 'image') {
      const image = node;
      if (!rootRelative(image.url)) return;
      // `#wide`, `#invert` and the rest are for this site's figures.
      const url = options.absolute(image.url.replace(/#.*$/, ''));
      const title = image.title ? ` "${image.title.replace(/"/g, '\\"')}"` : '';
      replace(image, `![${image.alt ?? ''}](${url}${title})`);
      return;
    }

    if (node.type === 'code') {
      const code = node;
      if (code.lang === 'notebook') {
        const path = code.value.trim().replace(/#.*$/, '');
        const name = path.split('/').pop() ?? path;
        replace(code, `[${name}](${rootRelative(path) ? options.absolute(path) : path})`);
        return;
      }
      const read = fileFenceCode(code.lang, code.meta, options.code);
      if (!read) return;
      const lang = code.lang === 'table' ? 'csv' : (read.lang ?? '');
      // A fence long enough not to be closed by one in the code.
      const ticks = '`'.repeat(
        Math.max(3, ...[...read.code.matchAll(/`+/g)].map((m) => m[0].length + 1)),
      );
      replace(code, `${ticks}${lang}\n${read.code}\n${ticks}`);
      return;
    }

    if (node.type === 'html') {
      const html = node;
      const rewritten = html.value.replace(
        /\b(src|href|poster)="(\/(?!\/)[^"]*)"/g,
        (_, name: string, path: string) => `${name}="${options.absolute(path)}"`,
      );
      if (rewritten !== html.value) replace(html, rewritten);
      return;
    }

    if (node.type === 'paragraph') {
      const paragraph = node;
      const text = paragraph.children.every((child) => child.type === 'text')
        ? paragraph.children.map((child) => child.value).join('')
        : undefined;
      const lines = text?.split('\n').map((line) => ABBREVIATION.exec(line.trim()));
      if (lines?.length && lines.every(Boolean)) {
        for (const match of lines) abbreviations.push([match![1].trim(), match![2].trim()]);
        replace(paragraph, '');
      }
      return;
    }

    if (node.type === 'text') {
      // A label, in a caption or after a theorem's title. Edited in the
      // source, which for plain text is the same characters.
      const at = span(node);
      if (!at) return;
      const source = body.slice(at[0], at[1]);
      for (const match of source.matchAll(LABEL)) {
        edits.push({
          start: at[0] + match.index,
          end: at[0] + match.index + match[0].length,
          text: '',
        });
      }
    }
  });

  // The outermost of overlapping edits wins (a removed paragraph over a label
  // inside it); then they are applied from the end, so earlier offsets hold.
  edits.sort((a, b) => a.start - b.start || b.end - a.end);
  const kept: Edit[] = [];
  for (const edit of edits) {
    const last = kept[kept.length - 1];
    if (!last || edit.start >= last.end) kept.push(edit);
  }
  let out = body;
  for (const edit of kept.reverse()) {
    out = out.slice(0, edit.start) + edit.text + out.slice(edit.end);
  }
  out = out.replace(/\n{3,}/g, '\n\n').trim();

  if (abbreviations.length > 0) {
    out +=
      '\n\n## Abbreviations\n\n' +
      abbreviations.map(([term, meaning]) => `- **${term}**: ${meaning}`).join('\n');
  }

  const frontmatter = /^---\r?\n[\s\S]*?\r?\n---[ \t]*(?:\r?\n|$)/.exec(raw)?.[0].trimEnd() ?? '';
  return `${frontmatter ? `${frontmatter}\n\n` : ''}${out}\n`;
}
