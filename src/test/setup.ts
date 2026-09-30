import { siteConfig } from '../site.config';

/*
 * Runs before every test file, ahead of the modules under test. The suite is
 * written against a site with a blog in it: tests look up real posts, tags and
 * their pages. `posts.ts` settles which posts exist when it is first imported,
 * so a site whose own config has `blog: false` would otherwise run every file
 * with no posts at all, and flipping the flag inside a test comes too late.
 * The blog-off behaviour has tests of its own in blog-flag.test.ts.
 */
siteConfig.features.blog = true;
