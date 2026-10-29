import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join, relative, resolve, sep } from 'node:path';
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
// Chemistry, `\ce{H2O}` and `\pu{123 kJ/mol}`: registers its macros with the
// same KaTeX that rehype-katex renders with, so maths and notebooks both have it.
import 'katex/contrib/mhchem';
import rehypeStringify from 'rehype-stringify';
import rehypeCitation from 'rehype-citation';
import { rehypeSectionFonts } from './fonts';
import {
  bannerWarnings,
  buildPost,
  dateProblems,
  todayUtc,
  citeWarnings,
  shareWarnings,
  tagWarnings,
  fontWarnings as postFontWarnings,
  unlistedWarnings,
} from '../src/lib/post-builder';
import { commentWarnings } from '../src/lib/comments';
import { blogEnabled } from '../src/lib/features';
import { siteConfig } from '../src/site.config';
import type { FeatureName } from '../src/site.config';
import { parseFrontmatter } from '../src/lib/frontmatter';
import type { Heading, PostFrontmatter } from '../src/lib/types';
import { loadDiagramCache, rehypeMermaid, type DiagramCache } from './mermaid';
import { rehypeCodeBlocks } from './code-blocks';
import { remarkCodeMeta } from './code-meta';
import { rehypeContentTweaks } from './content-tweaks';
import { FOOTNOTE_HEADING, rehypeHeadingAnchors } from './heading-anchors';
import { rehypeFigures } from './figures';
import { rehypeVideo } from './video';
import { rehypeCaptions } from './captions';
import { rehypeNotebook } from './notebook';
import { rehypeEquations } from './equations';
import { rehypeColorSwatches } from './color-swatches';
import { rehypeFeatureLinks } from './feature-links';
import { rehypeAlerts } from './alerts';
import { rehypeTheorems } from './theorems';
import { rehypeCrossRefs } from './crossrefs';
import { rehypeAlgorithms } from './algorithms';
import { rehypeSidenotes } from './sidenotes';
import { loadChartCache, rehypeCharts, type ChartCache } from './charts';
import { loadTikzCache, rehypeTikz, saveTikzCache, type TikzCache } from './tikz';
import { rehypeReservedIds } from './reserved-ids';
import { emojify, remarkEmoji } from './emoji';
import { mathMacros } from './math-macros';
import { rehypeSectionNumbers } from './section-numbers';
import { rehypeSmartQuotes, smarten } from './smart-quotes';
import { rehypePostLinks } from './post-links';
import { loadLock, saveLock, type RemoteLock } from './remote-code';
import { postPath } from '../src/lib/routes';

const MARKDOWN = /\.md(\?(meta|text))?$/;

/** Whether a post is set with curly quotes: its own `smartQuotes:`, else the site's. */
const smartQuotesFor = (frontmatter: Partial<PostFrontmatter>): boolean =>
  typeof frontmatter.smartQuotes === 'boolean'
    ? frontmatter.smartQuotes
    : siteConfig.typography.smartQuotes;

/** A title or summary as the reader sees it: emoji drawn, and quotes curled if the post's are. */
const shownTitle = (text: string, frontmatter: Partial<PostFrontmatter>): string => {
  const drawn = emojify(text);
  return smartQuotesFor(frontmatter) ? smarten(drawn, ' ') : drawn;
};

interface Compiled {
  html: string;
  headings: Heading[];
}

/** A heading's words, without the section number `rehypeSectionNumbers` put in front. */
function headingWords(node: Element): string {
  return node.children
    .filter(
      (child) =>
        !(
          child.type === 'element' &&
          Array.isArray(child.properties?.className) &&
          child.properties.className.includes('section-number')
        ),
    )
    .map((child) => toString(child))
    .join('')
    .trim();
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
          const number = child.properties?.dataSectionNumber;
          headings.push({
            id,
            text: headingWords(child),
            depth,
            ...(typeof number === 'string' ? { number } : {}),
          });
        }
        if (child.properties) delete child.properties.dataSectionNumber;
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
  const chartCachePath = resolve(root, '.cache/charts.json');
  let chartCache: ChartCache = {};
  let missingCharts = 0;
  const tikzCachePath = resolve(root, '.cache/tikz.json');
  let tikzCache: TikzCache = {};
  // Every post's path and the title it is shown with, for links that write
  // their own text; and the paths of posts the build will not publish.
  const postTitles = new Map<string, string>();
  // Copies of the files `file=` fences read from elsewhere, committed with the
  // site so a build needs no network for a file it has read once.
  const remoteLockPath = resolve(root, 'src/content/remote-code.lock.json');
  let remoteLock: RemoteLock = {};
  const unpublishedPosts = new Set<string>();
  const compiled = new Map<string, Compiled>();
  const missingDiagrams = new Set<string>();
  const missingImages = new Set<string>();
  const equationWarnings = new Set<string>();
  const referenceWarnings = new Set<string>();
  const fontWarnings = new Set<string>();
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
    .use(rehypeKatex, {
      strict: false,
      throwOnError: false,
      macros: mathMacros(siteConfig.math.macros, undefined),
    })
    .use(rehypeStringify, { allowDangerousHtml: true });

  const renderCell = (markdown: string): string => String(cellProcessor.processSync(markdown));

  async function compile(raw: string, body: string, file: string): Promise<Compiled> {
    // The whole file, frontmatter included: a post's `macros:` or
    // `numbered:` changes what its body renders to.
    const key = `${base}:${file}:${raw}`;
    const hit = compiled.get(key);
    if (hit) return hit;

    const { data: frontmatter } = parseFrontmatter<PostFrontmatter>(raw);
    const warn = (message: string) => referenceWarnings.add(`${relative(root, file)}: ${message}`);
    const macros = mathMacros(siteConfig.math.macros, frontmatter.macros, warn);

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
      // A fence's line marks, diff and tab, before the raw-HTML pass drops the
      // meta string they are written in; and a `file=` fence's code.
      .use(remarkCodeMeta, {
        publicDir: resolve(root, 'public'),
        remote: { lock: remoteLock, onFetched: () => saveLock(remoteLockPath, remoteLock) },
        onWarn: warn,
      })
      .use(remarkRehype, { allowDangerousHtml: true })
      .use(rehypeRaw)
      // Straight after the HTML is parsed: `font="…"` is an attribute on an
      // element the author wrote, and nothing later needs to see it.
      .use(rehypeSectionFonts, {
        onWarn: (message: string) => fontWarnings.add(`${relative(root, file)}: ${message}`),
      })
      .use(rehypeSlug)
      // Between the two: rehype-slug has just made the ids, and the
      // contents list should record the one the reader will land on.
      .use(rehypeReservedIds)
      // After the ids, so a heading's id is the same numbered or not.
      .use(rehypeSectionNumbers, { enabled: frontmatter.numbered === true })
      // Before the contents list reads the headings, so it shows them as
      // the page does; after the ids, which stay as they were typed. Every
      // fence and maths span is still `code` here, and is left alone.
      .use(rehypeSmartQuotes, { enabled: smartQuotesFor(frontmatter) })
      .use(collectHeadings)
      // Before anything that reads the tree for meaning: an alert is a
      // blockquote until this runs, and the citation and caption passes below
      // should see the shape the reader gets.
      .use(rehypeAlerts)
      // Also a blockquote with a marker, and numbered in reading order before
      // anything can move blocks about.
      .use(rehypeTheorems, {
        onWarn: (message: string) => referenceWarnings.add(`${relative(root, file)}: ${message}`),
      })
      .use(rehypeCitation, { bibliography, linkCitations: true, path: root })
      .use(rehypeNotebook, {
        publicDir: resolve(root, 'public'),
        renderMarkdown: renderCell,
        onWarn: (message: string) => missingImages.add(message),
      })
      // Before the highlighter, which would otherwise colour the TeX.
      .use(rehypeAlgorithms, {
        onWarn: (message: string) => referenceWarnings.add(`${relative(root, file)}: ${message}`),
      })
      .use(rehypeTikz, {
        cache: tikzCache,
        onRendered: () => saveTikzCache(tikzCachePath, tikzCache),
        onWarn: (message: string) => referenceWarnings.add(`${relative(root, file)}: ${message}`),
      })
      .use(rehypeCharts, {
        cache: chartCache,
        publicDir: resolve(root, 'public'),
        onWarn: (message: string) => referenceWarnings.add(`${relative(root, file)}: ${message}`),
        onMissing: () => {
          missingCharts += 1;
        },
      })
      .use(rehypeMermaid, {
        cache,
        onMissing: (source) => missingDiagrams.add(source),
      })
      .use(rehypeHighlight, { detect: false, ignoreMissing: true })
      // Inline code only: a span that holds a colour and nothing else gets a
      // swatch of it.
      .use(rehypeColorSwatches)
      // Before KaTeX: it numbers the equations by rewriting their TeX, and
      // KaTeX renders the `\tag` it leaves behind.
      .use(rehypeEquations, {
        numbering: siteConfig.math.numbering,
        onWarn: (message: string) => equationWarnings.add(message),
      })
      .use(rehypeKatex, { strict: false, throwOnError: false, macros })
      // After KaTeX: display math arrives as `pre > code.language-math`, and
      // wrapping that in code-block chrome puts a copy button over an equation.
      .use(rehypeCodeBlocks)
      .use(rehypeFeatureLinks, {
        disabled: disabledPaths,
        onWarn: (message: string) => featureLinkWarnings.add(message),
      })
      // Before the base path is added, so it compares the path as written.
      .use(rehypePostLinks, { titles: postTitles, unpublished: unpublishedPosts, onWarn: warn })
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
      // Last of all: every number in the post is settled by now.
      .use(rehypeCrossRefs, {
        onWarn: (message: string) => referenceWarnings.add(`${relative(root, file)}: ${message}`),
      })
      // After the references are written, since a note is copied into the margin.
      .use(rehypeSidenotes)
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

  /**
   * The posts' titles by path, for `[](/blog/a-post)`. Read from the files
   * rather than from the posts already compiled, since a post can link to one
   * that comes after it. In a build, a draft or a post dated in the future is
   * not published, and a link to it is reported; `npm run dev` shows them all.
   */
  function indexPosts() {
    postTitles.clear();
    unpublishedPosts.clear();
    const dir = resolve(root, 'src/content/posts');
    if (!existsSync(dir)) return;
    const today = process.env.BUILD_DATE ?? todayUtc();
    for (const name of readdirSync(dir).filter((file) => file.endsWith('.md'))) {
      const path = join(dir, name);
      const raw = readFileSync(path, 'utf8');
      const { meta } = buildPost({ path, raw });
      const { data } = parseFrontmatter<PostFrontmatter>(raw);
      const at = postPath(meta.slug);
      const published = !building || (blogEnabled() && !meta.draft && !(meta.date > today));
      if (published) postTitles.set(at, shownTitle(meta.title, data));
      else unpublishedPosts.add(at);
    }
  }

  return {
    name: 'academic-markdown',
    enforce: 'pre',

    configResolved(config) {
      building = config.command === 'build';
      base = config.base;
    },

    buildStart() {
      indexPosts();
      remoteLock = loadLock(remoteLockPath);
      cache = loadDiagramCache(cachePath);
      chartCache = loadChartCache(chartCachePath);
      tikzCache = loadTikzCache(tikzCachePath);
      missingCharts = 0;
      compiled.clear();
      missingDiagrams.clear();
      missingImages.clear();
      equationWarnings.clear();
      referenceWarnings.clear();
      fontWarnings.clear();
      featureLinkWarnings.clear();
      bannerProblems.clear();
    },

    async transform(_code, id) {
      const [path, query] = id.split('?');
      if (!MARKDOWN.test(id) || !path.endsWith('.md')) return null;

      const raw = readFileSync(path, 'utf8');
      const isPost = /[\\/]content[\\/]posts[\\/]/.test(path);

      // A post the build cannot date stops the build here, naming the file,
      // rather than at the feed with an error that names neither. Only on the
      // `?meta` import, which every post has (src/lib/posts.ts): the page and
      // the search text are the same file again, and would say it twice more.
      if (isPost && query === 'meta') {
        const problems = dateProblems(
          relative(root, path).split(sep).join('/'),
          raw,
          process.env.BUILD_DATE ?? todayUtc(),
        );
        if (problems.length > 0) this.error(problems.join('\n'));
      }

      const built = buildPost({ path, raw });

      // A banner is the part of a post its author sees least — it is above
      // the fold, so they scroll past it — and a `src` with a typo leaves a
      // gap rather than an error.
      const { data: frontmatter } = parseFrontmatter<PostFrontmatter>(raw);
      for (const message of [
        ...bannerWarnings(built.meta.slug, frontmatter.banner),
        ...commentWarnings(built.meta.slug, frontmatter.comments),
        ...unlistedWarnings(built.meta.slug, frontmatter.unlisted, frontmatter.featured),
        ...shareWarnings(built.meta.slug, frontmatter.share),
        ...citeWarnings(built.meta.slug, frontmatter.cite),
        ...tagWarnings(built.meta.slug, frontmatter.tags),
        ...postFontWarnings(built.meta.slug, frontmatter.font),
      ]) {
        bannerProblems.add(message);
      }

      // The frontmatter is YAML rather than markdown, so it never reaches the
      // pipeline above. These two are the strings a reader sees outside the
      // post — the tab, the card, the feed, the social image, the `headline` in
      // the structured data — and a title reading ":rocket: Shipping it" in a
      // search result is the one place a shortcode must not survive.
      built.meta.title = shownTitle(built.meta.title, frontmatter);
      built.meta.summary = shownTitle(built.meta.summary, frontmatter);

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
      // BUILD_DATE, when set, is the day `vite.config.ts` gives the pages, so
      // what is stubbed here and what they list agree across midnight.
      // With the blog switched off, every post is unpublished the same way:
      // the pages that would show them are not built, and their text should
      // not ship in a chunk nothing links to. Only posts: the site's own pages
      // (about.md, openings.md) come through here too.
      const today = process.env.BUILD_DATE ?? todayUtc();
      const post = isPost;
      const unpublished =
        building &&
        ((post && !blogEnabled()) ||
          built.meta.draft ||
          (built.meta.date && built.meta.date > today));

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
            unlisted: false,
            share: false,
            cite: false,
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
        // Search is a list too. The results already leave an unlisted post
        // out, but its prose would still ship in the search chunk for anyone
        // who opened it; the page itself is the only place it is published.
        const plainText = built.meta.unlisted ? '' : built.plainText;
        return {
          code: `export default ${JSON.stringify({ slug: built.meta.slug, plainText })};`,
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
      for (const message of referenceWarnings) this.warn(message);
      for (const message of fontWarnings) this.warn(message);
      for (const message of featureLinkWarnings) this.warn(message);
      for (const message of bannerProblems) this.warn(message);

      if (missingCharts > 0) {
        this.warn(
          `${missingCharts} chart(s) had no prerendered SVG and will be drawn in the browser. ` +
            'Run `npm run diagrams` to draw them at build time.',
        );
      }

      if (missingDiagrams.size > 0) {
        this.warn(
          `${missingDiagrams.size} Mermaid diagram(s) had no prerendered SVG and will render in the browser. ` +
            'Run `npm run diagrams` to render them at build time.',
        );
      }
    },
  };
}
