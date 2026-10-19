# mdxcn

The figures from [mdxcn](https://mdxcn.dev), MIT licensed (`LICENSE`), for use
in Markdown. The README's "mdxcn figures" section says how to write them and
how they are rendered; this file is for keeping the copy up to date.

| Path                       | What it is                                                                                                                                                                          |
| -------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `registry/default/`        | mdxcn's components, as `shadcn add https://mdxcn.dev/r/all.json` writes them, without `graph-comark`, `graph-knap`, `mdx` and `index.ts`, which this site does not use. Not edited. |
| `lib/utils.ts`             | The `cn` they import as `@/lib/utils`.                                                                                                                                              |
| `motion.ts`                | `motion/react` as they see it, with `useReducedMotion` true while a figure is drawn still.                                                                                          |
| `mdxcn.css`                | The Tailwind source for their styles, and mdxcn's colour tokens mapped to the site's.                                                                                               |
| `names.ts`                 | The 46 tags and their folders.                                                                                                                                                      |
| `figure.tsx`               | One figure: the component, its props, its Markdown children as React.                                                                                                               |
| `server.tsx`, `client.tsx` | Drawing figures into shadow roots on the server, and bringing them to life in the browser.                                                                                          |

The `@/registry/` and `@/lib/utils` imports resolve through `vite.config.ts`
and `tsconfig.json`. ESLint and Prettier skip `registry/`, so a copy can be
replaced wholesale; `npm run typecheck` still covers it.

## Updating

1. Download `https://mdxcn.dev/r/all.json` and write each entry of `files` to
   its `path`, under this directory. Leave out the four folders above.
2. If a component was added or renamed, update `names.ts`. The test in
   `src/test/mdxcn.test.ts` checks every name has a folder.
3. If `cssVars` or `css` in `all.json` changed, carry the change into
   `mdxcn.css`, mapping a new colour to a site token rather than copying the
   oklch value.
4. Run `npm run build` and `npm run verify`, and look at
   `/blog/mdxcn-figures` on a phone and on a desktop, in both themes.
