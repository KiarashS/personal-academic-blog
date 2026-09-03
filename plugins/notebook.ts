import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { Element, Root } from 'hast';
import { toString } from 'hast-util-to-string';

interface NotebookOutput {
  output_type: string;
  text?: string[] | string;
  name?: string;
  data?: Record<string, string[] | string>;
  ename?: string;
  evalue?: string;
  traceback?: string[];
  execution_count?: number | null;
}

interface NotebookCell {
  cell_type: string;
  source: string[] | string;
  execution_count?: number | null;
  outputs?: NotebookOutput[];
}

interface Notebook {
  cells?: NotebookCell[];
  metadata?: { kernelspec?: { language?: string; display_name?: string } };
}

const text = (value: string[] | string | undefined): string =>
  Array.isArray(value) ? value.join('') : (value ?? '');

/** Terminal colour codes survive in tracebacks and are noise in a web page. */
// eslint-disable-next-line no-control-regex -- ESC is exactly what is being stripped.
const stripAnsi = (value: string): string => value.replace(/\u001B\[[0-9;]*[A-Za-z]/g, '');

const escapeHtml = (value: string): string =>
  value.replace(
    /[&<>"]/g,
    (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[char] ?? char,
  );

function raw(value: string): Element {
  return { type: 'raw', value } as unknown as Element;
}

function prompt(count: number | null | undefined): string {
  return `<span class="nb-prompt" aria-hidden="true">[${count ?? ' '}]</span>`;
}

function renderOutput(output: NotebookOutput): string {
  if (output.output_type === 'stream') {
    const stream = output.name === 'stderr' ? ' nb-output--stderr' : '';
    return `<pre class="nb-output${stream}" tabindex="0">${escapeHtml(text(output.text))}</pre>`;
  }

  if (output.output_type === 'error') {
    const body =
      stripAnsi((output.traceback ?? []).join('\n')) || `${output.ename}: ${output.evalue}`;
    return `<pre class="nb-output nb-output--error" tabindex="0">${escapeHtml(body)}</pre>`;
  }

  const data = output.data ?? {};

  for (const mime of ['image/png', 'image/jpeg'] as const) {
    if (data[mime]) {
      const encoded = text(data[mime]).replace(/\s+/g, '');
      return `<img class="nb-image" alt="Output of the cell above" src="data:${mime};base64,${encoded}" />`;
    }
  }

  if (data['image/svg+xml']) return `<div class="nb-image">${text(data['image/svg+xml'])}</div>`;

  // The notebook is the author's own file, so its HTML is treated the same way
  // as the raw HTML they may already write in a post.
  if (data['text/html']) {
    return `<div class="nb-output nb-output--html">${text(data['text/html'])}</div>`;
  }

  if (data['text/plain']) {
    return `<pre class="nb-output" tabindex="0">${escapeHtml(text(data['text/plain']))}</pre>`;
  }

  return '';
}

export interface NotebookOptions {
  /** Directory that notebook paths resolve against, i.e. `public`. */
  publicDir: string;
  /** Renders a markdown cell with the site's own pipeline. */
  renderMarkdown: (markdown: string) => string;
  onWarn?: (message: string) => void;
}

function renderNotebook(book: Notebook, language: string, render: (md: string) => string): string {
  const parts: string[] = [];

  for (const cell of book.cells ?? []) {
    const source = text(cell.source);
    if (!source.trim()) continue;

    if (cell.cell_type === 'markdown') {
      parts.push(`<div class="nb-markdown">${render(source)}</div>`);
      continue;
    }

    if (cell.cell_type !== 'code') continue;

    parts.push(
      `<div class="nb-cell">${prompt(cell.execution_count)}` +
        `<pre><code class="language-${language}">${escapeHtml(source)}</code></pre></div>`,
    );

    const outputs = (cell.outputs ?? []).map(renderOutput).filter(Boolean);
    if (outputs.length > 0) parts.push(`<div class="nb-outputs">${outputs.join('')}</div>`);
  }

  return parts.join('\n');
}

/**
 * Replaces a ```notebook fence, whose body is the path to an .ipynb under
 * public/, with the notebook rendered into the post: markdown cells as prose,
 * code cells with their execution counts, and outputs including streams,
 * tables, images and errors.
 */
export function rehypeNotebook(options: NotebookOptions) {
  return (tree: Root) => {
    const walk = (parent: Root | Element) => {
      const children = 'children' in parent ? parent.children : [];

      children.forEach((child, index) => {
        if (child.type !== 'element') return;
        if (child.tagName !== 'pre') {
          walk(child);
          return;
        }

        const code = child.children.find(
          (node): node is Element => node.type === 'element' && node.tagName === 'code',
        );
        if (!code) return;

        const classes = code.properties?.className;
        const list = Array.isArray(classes) ? classes.map(String) : [String(classes ?? '')];
        if (!list.includes('language-notebook')) return;

        const path = toString(code).trim();
        const file = join(options.publicDir, path.replace(/^\//, ''));
        if (!existsSync(file)) {
          options.onWarn?.(`Notebook not found in public/: ${path}`);
          return;
        }

        let book: Notebook;
        try {
          book = JSON.parse(readFileSync(file, 'utf8')) as Notebook;
        } catch (cause) {
          options.onWarn?.(`Notebook is not valid JSON: ${path} - ${String(cause)}`);
          return;
        }

        const language = book.metadata?.kernelspec?.language ?? 'python';
        // An element wrapping raw children, so the caption step can see it.
        children[index] = {
          type: 'element',
          tagName: 'div',
          properties: { className: ['notebook'], 'data-source': path },
          children: [raw(renderNotebook(book, language, options.renderMarkdown))],
        };
      });
    };

    walk(tree);
  };
}
