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
import { bannerWarnings, buildPost, todayUtc } from '../src/lib/post-builder';
import { commentWarnings } from '../src/lib/comments';
import { siteConfig } from '../src/site.config';
import type { FeatureName } from '../src/site.config';
import { parseFrontmatter } from '../src/lib/frontmatter';
import type { Heading, PostFrontmatter } from '../src/lib/types';
import { loadDiagramCache, rehypeMermaid, type DiagramCache } from './mermaid';
import { rehypeCodeBlocks } from './code-blocks';
import { rehypeContentTweaks } from './content-tweaks';
import { FOOTNOTE_HEADING, rehypeHeadingAnchors } from './heading-anchors';
import { rehypeFigures } from './figures';
import { rehypeVideo } from './video';
import { rehypeCaptions } from './captions';
import { rehypeNotebook } from './notebook';
import { rehypeEquations } from './equations';
import { rehypeFeatureLinks } from './feature-links';
import { rehypeAlerts } from './alerts';
import { rehypeReservedIds } from './reserved-ids';
import { emojify, remarkEmoji } from './emoji';

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
        if (depth && id && id !== FOOTNOTE_HEADING) {
          headings.push({ id, text: toString(child), depth: depth });
        }
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
  const equationWarnings = new Set<string>();
  const featureLinkWarnings = new Set<string>();
  // Frontmatter that says something the renderer cannot act on.
  const bannerProblems = new Set<string>();

  // The pages a flag can take away. Prose that points at one of them degrades
  // to plain words rather than shipping a link to a 404.
  const FEATURE_PATHS: Record<string, FeatureName> = {
    '/about': 'about',
    '/publications': 'publications',
    '/archive': 'archive',
    '/categories': 'categories',
    '/slides': 'slides',
    '/contact': 'contact',
  };
  const disabledPaths = Object.entries(FEATURE_PATHS)
    .filter(([, feature]) => siteConfig.features[feature] !== true)
    .map(([path]) => path);

  const cellProcessor = unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkEmoji)
    .use(remarkMath)
    .use(remarkRehype, { allowDangerousHtml: true })
    .use(rehypeRaw)
    .use(rehypeKatex, { strict: false, throwOnError: false })
    .use(rehypeStringify, { allowDangerousHtml: true });

  const renderCell = (markdown: string): string => String(cellProcessor.processSync(markdown));

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
      // On the parsed tree, so a shortcode inside a fence or a `code` span is
      // left as written and a post can explain the syntax it is using.
      .use(remarkEmoji)
      .use(remarkMath)
      .use(remarkRehype, { allowDangerousHtml: true })
      .use(rehypeRaw)
      .use(rehypeSlug)
      // Between the two: rehype-slug has just made the ids, and the
      // contents list should record the one the reader will land on.
      .use(rehypeReservedIds)
      .use(collectHeadings)
      // Before anything that reads the tree for meaning: an alert is a
      // blockquote until this runs, and the citation and caption passes below
      // should see the shape the reader gets.
      .use(rehypeAlerts)
      .use(rehypeCitation, { bibliography, linkCitations: true, path: root })
      .use(rehypeNotebook, {
        publicDir: resolve(root, 'public'),
        renderMarkdown: renderCell,
        onWarn: (message: string) => missingImages.add(message),
      })
      .use(rehypeMermaid, {
        cache,
        onMissing: (source) => missingDiagrams.add(source),
      })
      .use(rehypeHighlight, { detect: false, ignoreMissing: true })
      // Before KaTeX: it numbers the labelled equations by rewriting their TeX,
      // and KaTeX renders the `\tag` it leaves behind.
      .use(rehypeEquations, { onWarn: (message: string) => equationWarnings.add(message) })
      .use(rehypeKatex, { strict: false, throwOnError: false })
      // After KaTeX: display math arrives as `pre > code.language-math`, and
      // wrapping that in code-block chrome puts a copy button over an equation.
      .use(rehypeCodeBlocks)
      .use(rehypeFeatureLinks, {
        disabled: disabledPaths,
        onWarn: (message: string) => featureLinkWarnings.add(message),
      })
      .use(rehypeContentTweaks, { base })
      .use(rehypeHeadingAnchors)
      // Before the image pass: a `src` that turns out to be a video is a
      // player, not a picture, and the image pass would measure a file it
      // cannot read and wrap the poster in a link to itself.
      .use(rehypeVideo, { base })
      .use(rehypeFigures, {
        publicDir: resolve(root, 'public'),
        base,
        onWarn: (message: string) => missingImages.add(message),
      })
      .use(rehypeCaptions)
      .use(rehypeStringify, { allowDangerousHtml: true });

    const result = await processor.process(body);
    const value: Compiled = {
      html: String(result),
      headings: (result.data.headings as Heading[] | undefined) ?? [],
    };
    compiled.set(key, value);
    return value;
  }

  const known = new Set(siteConfig.categories.map((category) => category.slug));

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
      equationWarnings.clear();
      featureLinkWarnings.clear();
      bannerProblems.clear();
    },

    async transform(_code, id) {
      const [path, query] = id.split('?');
      if (!MARKDOWN.test(id) || !path.endsWith('.md')) return null;

      const raw = readFileSync(path, 'utf8');
      const built = buildPost({ path, raw });

      // A banner is the part of a post its author sees least — it is above
      // the fold, so they scroll past it — and a `src` with a typo leaves a
      // gap rather than an error.
      const { data: frontmatter } = parseFrontmatter<PostFrontmatter>(raw);
      for (const message of [
        ...bannerWarnings(built.meta.slug, frontmatter.banner),
        ...commentWarnings(built.meta.slug, frontmatter.comments),
      ]) {
        bannerProblems.add(message);
      }

      // The frontmatter is YAML rather than markdown, so it never reaches the
      // pipeline above. These two are the strings a reader sees outside the
      // post — the tab, the card, the feed, the social image, the `headline` in
      // the structured data — and a title reading ":rocket: Shipping it" in a
      // search result is the one place a shortcode must not survive.
      built.meta.title = emojify(built.meta.title);
      built.meta.summary = emojify(built.meta.summary);

      // A category the site does not define is a typo, and a silent one: the
      // post would simply file itself nowhere. With no shelves configured at
      // all there is nothing to check against, so the check stands down.
      if (known.size > 0 && built.meta.category && !known.has(built.meta.category)) {
        this.warn(
          `${path}: category "${built.meta.category}" is not in siteConfig.categories ` +
            `(${[...known].join(', ') || 'none configured'})`,
        );
      }

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
            revisions: [],
            readingMinutes: 1,
            draft: true,
            featured: false,
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
      for (const message of equationWarnings) this.warn(message);
      for (const message of featureLinkWarnings) this.warn(message);
      for (const message of bannerProblems) this.warn(message);

      if (missingDiagrams.size > 0) {
        this.warn(
          `${missingDiagrams.size} Mermaid diagram(s) had no prerendered SVG and will render in the browser. ` +
            'Run `npm run diagrams` to render them at build time.',
        );
      }
    },
  };
}
