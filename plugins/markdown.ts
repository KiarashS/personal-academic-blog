import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { Plugin } from 'vite';
import type { Element, Root } from 'hast';
import { toString } from 'hast-util-to-string';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import remarkRehype from 'remark-rehype';
import rehypeRaw from 'rehype-raw';
import rehypeSlug from 'rehype-slug';
import rehypeHighlight from 'rehype-highlight';
import rehypeKatex from 'rehype-katex';
import rehypeStringify from 'rehype-stringify';
import rehypeCitation from 'rehype-citation';
import { buildPost, todayUtc } from '../src/lib/post-builder';
import type { Heading } from '../src/lib/types';
import { loadDiagramCache, rehypeMermaid, type DiagramCache } from './mermaid';
import { rehypeCodeBlocks } from './code-blocks';
import { rehypeContentTweaks } from './content-tweaks';
import { rehypeHeadingAnchors } from './heading-anchors';
import { rehypeFigures } from './figures';

const MARKDOWN = /\.md(\?(meta|text))?$/;

interface Compiled {
  html: string;
  headings: Heading[];
}

/** Pulls the ids rehype-slug assigned, for the post's contents list. */
function collectHeadings() {
  return (tree: Root, file: { data: Record<string, unknown> }) => {
    const headings: Heading[] = [];
    const walk = (node: Root | Element) => {
      for (const child of 'children' in node ? node.children : []) {
        if (child.type !== 'element') continue;
        const depth = child.tagName === 'h2' ? 2 : child.tagName === 'h3' ? 3 : 0;
        const id = typeof child.properties?.id === 'string' ? child.properties.id : '';
        if (depth && id) headings.push({ id, text: toString(child), depth: depth });
        walk(child);
      }
    };
    walk(tree);
    file.data.headings = headings;
  };
}

export interface MarkdownPluginOptions {
  /** Where `scripts/render-diagrams.mjs` writes its rendered SVG pairs. */
  diagramCachePath?: string;
  /** BibTeX file that `[@key]` references resolve against. */
  bibliography?: string;
}

export function markdown(options: MarkdownPluginOptions = {}): Plugin {
  const root = process.cwd();
  const cachePath = resolve(root, options.diagramCachePath ?? '.cache/diagrams.json');
  // rehype-citation resolves this against its `path` option, so it stays relative.
  const bibliography = options.bibliography ?? 'src/content/references.bib';

  let building = false;
  let base = '/';
  let cache: DiagramCache = {};
  const compiled = new Map<string, Compiled>();
  const missingDiagrams = new Set<string>();
  const missingImages = new Set<string>();

  async function compile(raw: string, body: string, file: string): Promise<Compiled> {
    const key = `${base}:${file}:${raw.length}:${body.length}:${body}`;
    const hit = compiled.get(key);
    if (hit) return hit;

    // Order matters: raw HTML is parsed first, headings get ids, citations are
    // resolved, diagrams are swapped in before the highlighter can touch them,
    // and KaTeX runs last on a finished tree.
    const processor = unified()
      .use(remarkParse)
      .use(remarkGfm)
      .use(remarkMath)
      .use(remarkRehype, { allowDangerousHtml: true })
      .use(rehypeRaw)
      .use(rehypeSlug)
      .use(collectHeadings)
      .use(rehypeCitation, { bibliography, linkCitations: true, path: root })
      .use(rehypeMermaid, {
        cache,
        onMissing: (source) => missingDiagrams.add(source),
      })
      .use(rehypeHighlight, { detect: false, ignoreMissing: true })
      .use(rehypeKatex, { strict: false, throwOnError: false })
      // After KaTeX: display math arrives as `pre > code.language-math`, and
      // wrapping that in code-block chrome puts a copy button over an equation.
      .use(rehypeCodeBlocks)
      .use(rehypeContentTweaks)
      .use(rehypeHeadingAnchors)
      .use(rehypeFigures, {
        publicDir: resolve(root, 'public'),
        base,
        onWarn: (message: string) => missingImages.add(message),
      })
      .use(rehypeStringify, { allowDangerousHtml: true });

    const result = await processor.process(body);
    const value: Compiled = {
      html: String(result),
      headings: (result.data.headings as Heading[] | undefined) ?? [],
    };
    compiled.set(key, value);
    return value;
  }

  return {
    name: 'academic-markdown',
    enforce: 'pre',

    configResolved(config) {
      building = config.command === 'build';
      base = config.base;
    },

    buildStart() {
      cache = loadDiagramCache(cachePath);
      compiled.clear();
      missingDiagrams.clear();
      missingImages.clear();
    },

    async transform(_code, id) {
      const [path, query] = id.split('?');
      if (!MARKDOWN.test(id) || !path.endsWith('.md')) return null;

      const raw = readFileSync(path, 'utf8');
      const built = buildPost({ path, raw });

      // A draft or a future-dated post is filtered out of the post list, but
      // its module would still be emitted as a fetchable chunk. In a build its
      // text is dropped entirely, so unpublished writing never ships.
      const unpublished =
        building && (built.meta.draft || (built.meta.date && built.meta.date > todayUtc()));

      if (unpublished) {
        if (query === 'meta') {
          // A stub, not the real metadata: the title and summary of something
          // unpublished should not be readable in the bundle either.
          const stub = {
            slug: '',
            title: '',
            date: '',
            tags: [],
            authorIds: [],
            summary: '',
            readingMinutes: 1,
            draft: true,
            headings: [],
          };
          return { code: `export default ${JSON.stringify(stub)};`, map: null };
        }
        if (query === 'text') {
          return {
            code: `export default ${JSON.stringify({ slug: built.meta.slug, plainText: '' })};`,
            map: null,
          };
        }
        return { code: 'export const html = "";', map: null };
      }

      if (query === 'text') {
        return {
          code: `export default ${JSON.stringify({ slug: built.meta.slug, plainText: built.plainText })};`,
          map: null,
        };
      }

      const { html, headings } = await compile(raw, built.body, path);

      if (query === 'meta') {
        return {
          code: `export default ${JSON.stringify({ ...built.meta, headings })};`,
          map: null,
        };
      }

      return { code: `export const html = ${JSON.stringify(html)};`, map: null };
    },

    buildEnd() {
      for (const message of missingImages) this.warn(message);

      if (missingDiagrams.size > 0) {
        this.warn(
          `${missingDiagrams.size} Mermaid diagram(s) had no prerendered SVG and will render in the browser. ` +
            'Run `npm run diagrams` to render them at build time.',
        );
      }
    },
  };
}
