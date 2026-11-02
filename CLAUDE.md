# Notes for working on this repository

## The frontmatter reference

The frontmatter block at the top of "Writing a post" in `README.md` lists every
field a post's frontmatter can hold. Whenever a field is added, renamed,
removed or changes what it accepts, update that block in the same change: the
field, an example value, and a short comment naming the README section that
explains it. The writing guide, `src/content/posts/2026-01-05-writing-a-post.md`,
opens its Frontmatter section with the same list; update it in the same change.
`src/test/frontmatter-docs.test.ts` fails when either block and the
`PostFrontmatter`, `Publication` or `Banner` types in `src/lib/types.ts` disagree.
