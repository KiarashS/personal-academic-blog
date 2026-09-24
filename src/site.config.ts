import type { ProfileLinkKey } from './lib/types';
import type { AlertType } from './lib/alerts';

/**
 * Where a nav entry writes "the blog index" without knowing where that is:
 * `visibleNav` resolves it, because the answer depends on the `home` feature.
 * It lives here rather than in `lib/routes.ts` so the config can name it
 * without the two modules importing each other.
 */
export const BLOG_INDEX = '@blog';

/**
 * Whether a post takes comments.
 *
 * `readonly` keeps the thread on the page and takes the box away, for a post
 * whose discussion has run its course but is worth reading. It is presentation
 * and not enforcement: giscus has no read-only mode, so the box is hidden with
 * a stylesheet of the site's own, and anyone who goes to the discussion on
 * GitHub can still post there. Locking the discussion is what actually closes
 * it, and the two go together — this says so on the page, that makes it true.
 */
export type CommentState = 'on' | 'off' | 'readonly';

export interface GiscusConfig {
  repo: `${string}/${string}`;
  repoId: string;
  category: string;
  categoryId: string;
  mapping: 'pathname' | 'url' | 'title' | 'og:title';
  reactionsEnabled: boolean;
  lang: string;
  /**
   * What a post gets when its frontmatter says nothing. `comments:` on the
   * post overrides it either way, so `off` here is how a blog that takes
   * comments on a few posts and not the rest is run.
   */
  comments: CommentState;
}

/** Optional parts of the site that can be switched off wholesale. */
export type FeatureName =
  | 'home'
  | 'about'
  | 'publications'
  | 'archive'
  | 'categories'
  | 'projects'
  | 'research'
  | 'slides'
  | 'contact'
  | 'news';

/**
 * Where a nav entry is shown. The header is the default because that is what a
 * nav is; the footer is for the ones worth reaching but not worth a slot in the
 * top row, and `both` for the few that earn a place in each.
 */
export type NavPlace = 'header' | 'footer' | 'both';

/**
 * How the front page's row of profile links is written: the service's mark and
 * its name, the mark alone, or the name alone. Marks alone are a row of eleven
 * small pictures if the record is full, so what this really controls is
 * whether a reader can tell arXiv from Semantic Scholar at a glance.
 */
export type ProfileLinkStyle = 'both' | 'icon' | 'label';

/**
 * The three places an author's profile links are rendered: the front page's
 * row, the contact page's list, and the card under every post the author wrote.
 */
export type ProfileSurface = 'home' | 'contact' | 'authorCard';

/** Where the site notice can appear. `blog` is the index and its numbered pages. */
export type NoticeSurface = 'home' | 'blog' | 'post';

/** Which end of a page's content the notice stands at. */
export type NoticePlace = 'top' | 'bottom';

/**
 * One message the site wants every visitor to see — a call for students, a
 * move, a deadline — set apart from the page in the same box a
 * `> [!IMPORTANT]` makes inside a post.
 */
export interface NoticeConfig {
  /**
   * The sentence. Empty is off, which is how this ships.
   *
   * `[words](target)` links those words, as many times as the sentence needs,
   * and a target can be a page of the site (`/about`), a file under `public/`
   * (`/cv.pdf`), an address (`mailto:`) or a URL somewhere else — an external
   * one opens in its own tab. Emoji shortcodes are read: `:mortar_board:` is
   * 🎓, and `npm run emoji <term>` searches the names.
   */
  text: string;
  /**
   * Which of the five alert kinds it is drawn as, which decides its colour and
   * its icon. `important` is the one whose mark is a speech bubble — the author
   * talking directly to the reader — and is what a call for students wants.
   */
  kind: AlertType;
  /** Where it appears. Empty shows it nowhere, and the build says so. */
  on: NoticeSurface[];
  /**
   * Which end of each surface it stands at. Per surface, because the right
   * answer differs by page.
   *
   * `bottom` on the front page reads well on a desktop — it closes the page
   * rather than interrupting the greeting — but that page is built to fill the
   * window, so on a phone anything after the banner starts below the fold.
   * Measured at 380x820, a bottom notice begins 40px past it. For something
   * that has to be read, `home: 'top'` is the safe answer; `blog` and `post`
   * have no centred banner and are fine either way.
   */
  place: Record<NoticeSurface, NoticePlace>;
  /**
   * The day it stops showing itself, `YYYY-MM-DD`, read in UTC. Empty never
   * retires it.
   *
   * Worth setting on anything with an end. A call for students that closed in
   * March is the kind of decay nobody catches on their own site, because they
   * are not the one arriving at it — so this is the same bargain
   * `home.newsFreshMonths` makes: the page drops it and the build explains why,
   * at the moment its owner is looking.
   */
  until: string;
}

/**
 * How an installed copy of the site opens. `standalone` is its own window with
 * no browser chrome; `minimal-ui` keeps back, forward and reload, which on a
 * site that is mostly links between its own pages is the more honest of the
 * two. Both are installable — `browser`, the third value a manifest allows,
 * is not offered because it tells the browser not to bother.
 */
export type PwaDisplay = 'standalone' | 'minimal-ui';

/**
 * The two page colours, as the manifest needs them: outside CSS, where
 * `--light-bg` and `--dark-bg` cannot be read. Keep them in step with
 * `src/styles/global.css` and with the `theme-color` tags in `index.html`.
 */
export const THEME_COLORS = { light: '#fdfdfc', dark: '#14140f' } as const;

/**
 * Installing the site: a web app manifest, a service worker that keeps visited
 * pages readable offline, and the browser's offer to add it to a home screen
 * or a launcher.
 */
export interface PwaConfig {
  /**
   * On ships the manifest, the worker and the registration. Off writes none of
   * them and, on the next visit, tears down the worker and caches a reader
   * already has — a site that stops serving `sw.js` does not stop being a PWA
   * on its own, because a worker that fails to update keeps running.
   */
  enabled: boolean;
  /** Its own window, or one that keeps the back button. */
  display: PwaDisplay;
  /**
   * Which theme the installed window is dressed in: its title bar, and the
   * colour held on screen while it starts.
   *
   * One value, not two. A manifest has no media query and browsers read these
   * once at install, so a reader who installs the app gets this regardless of
   * what their system is set to. The pages inside still follow the system.
   */
  theme: 'light' | 'dark';
  /**
   * The menu a long press on the installed icon opens, as paths of the site.
   *
   * Empty takes the first three links of the header nav, which is zero-config
   * and cannot name a page that is switched off. A written list replaces them,
   * in the order given; the build says so if one names a route the site does
   * not have. Android shows four at most, and other platforms fewer.
   */
  shortcuts: string[];
}

/**
 * What a post's contents look like on a screen wide enough for a rail beside
 * the column — 80rem and up, measured below.
 *
 * `inline` is the collapsed list at the top of the post and nothing else,
 * which is how the site worked before this setting existed. `rail` moves it
 * into the margin and takes the collapsed one away. `both` keeps the collapsed
 * list where it is and puts the rail beside it, which is two navigations of
 * the same nine headings; it is offered because on a long post the one at the
 * top is a map and the one in the margin is a position, and some people want
 * both.
 *
 * Below 80rem there is no choice to make: the column is fixed at 46rem, so the
 * margin is whatever the window has spare. Measured against the built site,
 * 1280px leaves 272px each side, which holds a 13rem rail and a gap; 1194px
 * leaves 229px and is tight; 1024px leaves 144px and has no room at all. So a
 * narrow window always gets the collapsed list, whatever this says.
 */
export type ContentsStyle = 'inline' | 'rail' | 'both';

/** Which margin the rail stands in. */
export type ContentsSide = 'left' | 'right';

export interface ContentsConfig {
  wide: ContentsStyle;
  /**
   * `left` by default. The rail is a map of the page and a page is read from
   * the left, so the margin the eye returns to is the left one; a right rail
   * reads as a sidebar of extras, which is what it is not.
   */
  side: ContentsSide;
}

export interface NavItem {
  label: string;
  /**
   * A path, or `BLOG_INDEX` for wherever the blog index currently is. A group
   * has none: it is a label with a list under it rather than a link itself.
   */
  to?: string;
  /** When set, the entry and its route only exist if that feature is on. */
  feature?: FeatureName;
  /**
   * Where it is shown; the header if unset. Placement is not the same question
   * as whether the page exists — that is `feature` — so moving an entry to the
   * footer leaves its route, its feed and every link to it alone.
   *
   * A group cannot go in the footer. It is a label with a popover under it, and
   * a line of footer links has nowhere to put one.
   */
  place?: NavPlace;
  /**
   * Entries shown under this one — a popover on a wide screen, an indented list
   * in the menu on a narrow one. A group whose entries have all been gated away
   * is dropped along with them.
   *
   * These are links out of the app: a page of your own under `public/`, or
   * another site. They are ordinary anchors and load as documents, which is
   * what a page React does not render needs. `npm run links` still checks the
   * internal ones, so a folder you have not added yet fails the build.
   */
  items?: NavItem[];
}

export interface AnalyticsConfig {
  /**
   * Cloudflare Web Analytics site token. Empty means no analytics script is
   * emitted at all — the tag is absent from the built HTML, not merely inert.
   */
  cloudflareToken: string;
}

/**
 * A category is the coarse shelf a post sits on, above its tags: a post has one
 * category and any number of tags. The list is fixed here rather than taken
 * from whatever posts happen to say, so the set stays small, the navigation has
 * an order to follow, and a misspelled name is caught by the build.
 */
export interface Category {
  /** What the URL says: `/categories/<slug>`. */
  slug: string;
  label: string;
  /** A sentence for the categories index. */
  description?: string;
}

export interface HomeConfig {
  /** Runs into the name: "Hi, I am" then whoever you are. Empty for no lead-in. */
  greeting: string;
  /**
   * The line under the name on the front page. The site's `tagline` describes
   * the writing and sits under the title in the header everywhere else; this is
   * the front page's own, which is usually about you rather than about the
   * posts. Empty falls back to the site's, so one string still covers both.
   */
  tagline: string;
  /**
   * What a link to the front page says about itself when it is shared: the
   * Open Graph and search-result description. The site's `description` is about
   * the writing, and the front page is about the person, so a preview built
   * from it describes the wrong thing. Empty falls back to the site's.
   */
  description: string;
  /**
   * A row of profile links under the lines — ORCID, Google Scholar, GitHub,
   * whatever the owner's record in `src/content/authors.ts` fills in, in the
   * order `profileLinks` puts them. Off leaves the front page as words alone.
   */
  profileLinks: boolean;
  /**
   * What each of those links looks like. `both` is the mark beside the name,
   * `label` the name alone, `icon` the mark alone with the name kept for
   * screen readers and as a tooltip.
   *
   * `icon` is the quieter row and the right answer for a short set of marks
   * everyone knows — GitHub, ORCID, LinkedIn, an envelope. It stops being the
   * right answer somewhere around arXiv and Semantic Scholar, whose marks a
   * reader has to hover to identify, and at a globe standing for "website".
   */
  profileLinkStyle: ProfileLinkStyle;
  /**
   * Draw `src/content/signature.svg` in place of the name. It is inlined
   * rather than loaded as an image so its ink follows the site's theme,
   * including a manual light/dark choice, which an `img` cannot. Off renders
   * the name as type.
   */
  signature: boolean;
  /** Degrees to tilt the signature, the way a signed page is never quite square. */
  signatureTilt: number;
  /**
   * A portrait beside the introduction, as a path under `public/` —
   * `/avatar.jpg` — or a URL. It is cropped to a circle with a highlight that
   * travels around the rim. Empty leaves the front page as words alone.
   *
   * It centres against the name, the tagline, the lines and the profile links,
   * and not against the news under them, so a busy month does not drag it down
   * the page.
   */
  avatar: string;
  /**
   * How many entries from `src/content/news.ts` the front page lists under the
   * profile links, newest first. 0 leaves the page as words alone.
   *
   * Three is the number that fits: the block is the page's quietest register
   * and the banner is centred in the window, so at three nothing else moves.
   * At six you have rebuilt the blog index on the page that was a greeting.
   */
  news: number;
  /**
   * How many of those entries stand in the block at once, whole. Past this the
   * list keeps its height and scrolls, so a front page with ten entries on it
   * is the same height as one with three. 0 lets the block grow to fit.
   *
   * The height is measured rather than counted in lines, so an entry whose
   * sentence wraps still counts as one and is shown in full.
   */
  newsRows: number;
  /**
   * Months of silence after which the front page stops showing the list, and
   * the build says so. 0 shows it however old it is.
   *
   * A news list that stopped two years ago says something worse about a site
   * than no news list does, and it is the decay nobody catches on their own
   * site, because they are not the one arriving at it.
   */
  newsFreshMonths: number;
}

export interface SiteConfig {
  title: string;
  /** Under a home-screen icon, where a full name will not fit. */
  shortName: string;
  /**
   * Draw `src/content/logo-mark.svg` beside the site's name in the header.
   *
   * The flat mark rather than the frosted logo, and inlined rather than loaded
   * as an image, so it takes the ink of the title next to it and follows a
   * manual light or dark choice — the same reason the signature is inlined.
   *
   * Off by default. The name is already set there in type, and on a site whose
   * front page opens with a signature the geometric K and the script one invite
   * a comparison neither wins. It is also a row that fits about seven entries:
   * with the mark in it, the nav wraps onto a second line sooner.
   */
  headerLogo: boolean;
  tagline: string;
  description: string;
  url: string;
  postsPerPage: number;
  /**
   * Switching a feature off removes its nav entry, its route and its
   * prerendered page — it is absent from the built site, not merely hidden.
   */
  features: Record<FeatureName, boolean>;
  /**
   * The author this site belongs to, whose profile links the contact page is
   * built from. An id from `src/content/authors.ts`; the first record is used
   * if it names one that does not exist.
   */
  owner: string;
  /** The front page, when the `home` feature is on. */
  home: HomeConfig;
  /**
   * The shelves themselves. The `categories` feature flag switches them on and
   * off; an empty list here does the same, since there would be nothing to show.
   */
  categories: Category[];
  nav: NavItem[];
  /**
   * Which of an author's profile links each surface shows, and in what order.
   *
   * Empty means all of them, in the order `profileLinks` gives them, which is
   * what an unconfigured site gets. Name keys and those are the row, written in
   * the order you want them read:
   *
   *     profileLinkKeys: {
   *       home: ['github', 'orcid', 'email'],
   *       contact: [],
   *       authorCard: ['orcid', 'scholar'],
   *     }
   *
   * The keys are the services in `src/content/authors.ts` plus `cv` and
   * `email`, which come from fields of their own. A key an author has no value
   * for is skipped, so one list can cover a co-author with half your profiles.
   *
   * This is display, not identity. The record stays whole: the `sameAs` array
   * in the page's structured data still names every profile, because that is
   * what ties the accounts to one person for a search engine, and a front page
   * kept to two marks should not cost you that.
   */
  profileLinkKeys: Record<ProfileSurface, ProfileLinkKey[]>;
  /** One message set apart from the page; see `NoticeConfig`. Empty text is off. */
  notice: NoticeConfig;
  /** How a post shows its contents on a wide screen; see `ContentsConfig`. */
  contents: ContentsConfig;
  /**
   * A CV for the site's owner, shown in the navigation. A path under `public/`
   * — `/cv.pdf` — or a URL if it lives elsewhere. Empty means no link at all.
   */
  cv: string;
  /**
   * Comments are rendered with giscus (GitHub Discussions). Fill these in from
   * https://giscus.app after enabling Discussions on the repository. Leave
   * `repoId` empty to turn comments off site-wide.
   */
  giscus: GiscusConfig;
  /**
   * Cloudflare Web Analytics: no cookies and no cross-site identifiers.
   *
   * Which setup applies depends on how the domain is served. A domain proxied
   * through Cloudflare wants the automatic setup: enable Web Analytics for the
   * zone and the edge injects the beacon itself, so the token stays empty here.
   * A domain that is not behind Cloudflare wants the manual snippet, and its
   * token goes below.
   *
   * Setting a token on a proxied domain is the one combination that fails, and
   * it fails loudly: the manual beacon posts cross-origin to
   * cloudflareinsights.com, which answers 404 with no CORS header, so every
   * page load reports an access-control error in the console.
   */
  analytics: AnalyticsConfig;
  /** Installing the site to a home screen or a launcher; see `PwaConfig`. */
  pwa: PwaConfig;
}

export const siteConfig: SiteConfig = {
  title: 'Kiarash Soleimanzadeh',
  headerLogo: false,
  shortName: 'Kiarash S.',
  tagline: 'Working notes, drafts, and summaries of what I have been reading.',
  description: 'A personal research notebook: working notes, drafts and reading summaries.',
  // Origin only; the deployment's base path is added by `canonicalUrl`.
  // Canonical links, Open Graph tags, the feed and BibTeX are all built from it.
  url: 'https://blog.kiarashs.ir',
  // Low on purpose while the archive is small, so the pagination is visible
  // in the sample site. Ten or so is a better number for a real one.
  postsPerPage: 4,
  features: {
    // Off: the blog is the whole site and its index is the front page. On: the
    // front page is the site's own and the blog moves to /blog. See the README.
    home: true,
    about: true,
    publications: false,
    archive: true,
    categories: false,
    // On once `nav`'s Projects group lists work of yours rather than the
    // example that ships with it.
    projects: true,
    // The page at /research: the overview in research.md, then the areas in
    // research.ts. On once both say something of yours.
    research: false,
    slides: false,
    contact: false,
    // The page at /news and its nav entry. The front page lists the newest few
    // whatever this says; with no entries yet the page says there are none.
    news: true,
  },
  owner: 'you',
  home: {
    greeting: 'Hi, I am',
    tagline: 'A curious mind working on AI for health',
    description: 'Kiarash Soleimanzadeh: a curious mind working on AI for health.',
    profileLinks: true,
    profileLinkStyle: 'icon', //both, icon, label
    signature: true,
    signatureTilt: -3,
    avatar: '/avatar.jpg',
    news: 5,
    newsRows: 3,
    newsFreshMonths: 12,
  },
  cv: '',
  categories: [
    {
      slug: 'ai-in-healthcare',
      label: 'AI in Healthcare',
      description: 'Clinical data, models that touch patients, and what it takes to trust one.',
    },
    {
      slug: 'machine-learning',
      label: 'Machine Learning',
      description: 'Methods, training runs and the parts of them that did not work.',
    },
    {
      slug: 'research-notes',
      label: 'Research Notes',
      description: 'Working notes, reading summaries and unfinished arguments.',
    },
    {
      slug: 'tutorials',
      label: 'Tutorials',
      description: 'How something is done, start to finish.',
    },
    {
      slug: 'mathematics',
      label: 'Mathematics',
      description: 'Derivations, proofs and the notation they need.',
    },
  ],
  profileLinkKeys: {
    // Every link the record has, everywhere. Name keys to narrow a row.
    home: [],
    contact: [],
    authorCard: [],
  },
  notice: {
    /*
     * Off: empty text shows nothing, wherever the rest of this says.
     *
     * A real one, which is what the fields below are set up for:
     *
     *   text:
     *     ':mortar_board: I am recruiting PhD students for 2027. ' +
     *     '[How to apply](/about), [email me](mailto:you@example.edu), or see ' +
     *     'the [call](https://example.org/phd).',
     *
     * Write it as you would a news entry. `[words](target)` links those words,
     * and the target decides the rest: a page of the site navigates, a file
     * under `public/` gets the base path, an address stays in this tab and a
     * URL somewhere else opens in its own. Emoji shortcodes are read, and
     * `npm run emoji <term>` searches the names.
     *
     * Say nothing here that is not true. A notice is the loudest thing on the
     * page and it is a claim about its owner — the one person who would never
     * think to check it is the one it is about.
     */
    text: '',
    kind: 'important',
    on: ['home'],
    place: { home: 'top', blog: 'bottom', post: 'bottom' },
    // Worth setting whenever the message has an end: the page drops it that
    // day and the build says why, rather than leaving a closed call up for a
    // year. Empty never retires it.
    until: '',
  },
  contents: {
    // The collapsed list at the top, plus the rail in the margin from 80rem up.
    // 'inline' is the collapsed list alone; 'rail' is the margin alone.
    wide: 'both',
    side: 'left',
  },
  nav: [
    { label: 'Home', to: '/', feature: 'home' },
    { label: 'Blog', to: BLOG_INDEX },
    { label: 'Research', to: '/research', feature: 'research' },
    { label: 'Publications', to: '/publications', feature: 'publications' },
    { label: 'Slides', to: '/slides', feature: 'slides' },
    { label: 'News', to: '/news', feature: 'news' },
    { label: 'Archive', to: '/archive', feature: 'archive', place: 'footer' },
    { label: 'Categories', to: '/categories', feature: 'categories' },
    {
      // A label with a list under it rather than a link: standalone pages of
      // your own kept in `public/projects/<name>/`, and work that lives
      // somewhere else. Replace these two with your own and turn the flag on.
      label: 'Projects',
      feature: 'projects',
      items: [
        { label: 'An example project', to: '/projects/example/' },
        { label: 'Something hosted elsewhere', to: 'https://example.org/a-project' },
      ],
    },
    { label: 'Tags', to: '/tags', place: 'both' },
    { label: 'Search', to: '/search', place: 'both' },
    { label: 'About', to: '/about', feature: 'about', place: 'both' },
    { label: 'Contact', to: '/contact', feature: 'contact' },
  ],
  giscus: {
    repo: 'KiarashS/personal-academic-blog',
    repoId: 'R_kgDOUMUy0Q',
    category: 'Comments',
    categoryId: 'DIC_kwDOUMUy0c4DE8gX',
    mapping: 'pathname',
    reactionsEnabled: true,
    lang: 'en',
    // Every post takes comments unless it says otherwise. `comments: false` or
    // `comments: readonly` in a post's frontmatter is the override.
    comments: 'on',
  },
  analytics: {
    // Empty: blog.kiarashs.ir is proxied through Cloudflare, so the beacon is
    // the zone's to inject. Enable Web Analytics for the zone rather than
    // pasting a token here.
    cloudflareToken: '',
  },
  pwa: {
    // On: the build writes site.webmanifest and sw.js, and a browser offers to
    // install the site. Off writes neither and retires the worker a returning
    // reader still has. See the README.
    enabled: true,
    // The back button is worth keeping on a site made of links to its own
    // pages; 'standalone' drops it for a plain window.
    display: 'minimal-ui',
    // Light, because that is the theme the signature and the avatar were drawn
    // against and what most readers arrive in.
    theme: 'light',
    // Empty: the first three header links. Name paths to choose your own,
    // e.g. ['/blog', '/news', '/about'].
    shortcuts: [],
  },
};
