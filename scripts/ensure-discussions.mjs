import { createHash } from 'node:crypto';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

/*
 * Makes sure every post that takes comments has its GitHub Discussion before a
 * reader gets there.
 *
 * giscus finds a post's thread by searching the repository, and when there is
 * none yet the search answers 404, twice (the newest comments and the
 * oldest), and the browser logs both from inside giscus's frame, where the
 * page cannot quiet them. Every post without a comment did that for every
 * reader. giscus only creates the discussion when someone posts the first
 * comment; this creates it at deploy time instead, in the exact shape giscus
 * would (`discussionBody` in src/lib/comments.ts), so the thread giscus later
 * finds is indistinguishable from one it made.
 *
 * A `readonly` post gets its thread too, and the thread is locked: the page
 * hides the comment box, and a lock is what stops anyone posting on GitHub
 * instead. A post whose comments are off gets nothing; giscus never loads.
 *
 * Runs in the deploy workflow with its GITHUB_TOKEN, which needs
 * `discussions: write`. With no token (a local build) it does nothing, and a
 * failure is a warning rather than a failed deploy: the site works without
 * it, the console is just noisier.
 */

const token = process.env.GITHUB_TOKEN;
if (!token) {
  console.log('discussions: no GITHUB_TOKEN, skipped');
  process.exit(0);
}

const serverEntry = pathToFileURL(join(resolve('dist-server'), 'entry-server.js')).href;
const {
  allPosts,
  siteConfig,
  postPath,
  canonicalUrl,
  metaFor,
  commentTerm,
  commentsConfigured,
  discussionBody,
} = await import(serverEntry);

const { giscus } = siteConfig;
if (!commentsConfigured(giscus)) {
  console.log('discussions: giscus is not configured, skipped');
  process.exit(0);
}

const [owner, name] = giscus.repo.split('/');
const sha1 = (text) => createHash('sha1').update(text).digest('hex');

async function graphql(query, variables) {
  const response = await fetch('https://api.github.com/graphql', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, variables }),
  });
  const json = await response.json();
  if (!response.ok || json.errors) {
    throw new Error(json.errors?.map((error) => error.message).join('; ') ?? response.statusText);
  }
  return json.data;
}

/** Every discussion already in the category, by the SHA-1 line in its body. */
async function existingThreads() {
  const threads = new Map();
  let after = null;
  do {
    const data = await graphql(
      `
        query ($owner: String!, $name: String!, $category: ID!, $after: String) {
          repository(owner: $owner, name: $name) {
            discussions(first: 100, after: $after, categoryId: $category) {
              nodes {
                id
                locked
                body
              }
              pageInfo {
                hasNextPage
                endCursor
              }
            }
          }
        }
      `,
      { owner, name, category: giscus.categoryId, after },
    );
    const { nodes, pageInfo } = data.repository.discussions;
    for (const { id, locked, body } of nodes) {
      for (const [, hash] of body.matchAll(/<!-- sha1: ([0-9a-f]{40}) -->/g)) {
        threads.set(hash, { id, locked });
      }
    }
    after = pageInfo.hasNextPage ? pageInfo.endCursor : null;
  } while (after);
  return threads;
}

async function create(post, term, hash) {
  const route = postPath(post.slug);
  const data = await graphql(
    `
      mutation ($repo: ID!, $category: ID!, $title: String!, $body: String!) {
        createDiscussion(
          input: { repositoryId: $repo, categoryId: $category, title: $title, body: $body }
        ) {
          discussion {
            id
          }
        }
      }
    `,
    {
      repo: giscus.repoId,
      category: giscus.categoryId,
      title: term,
      body: discussionBody(term, metaFor(route).description ?? '', canonicalUrl(route), hash),
    },
  );
  return { id: data.createDiscussion.discussion.id, locked: false };
}

async function lock(id) {
  await graphql(
    `
      mutation ($id: ID!) {
        lockLockable(input: { lockableId: $id }) {
          lockedRecord {
            locked
          }
        }
      }
    `,
    { id },
  );
}

try {
  const threads = await existingThreads();
  const wanted = allPosts.filter((post) => post.comments === 'on' || post.comments === 'readonly');
  let created = 0;
  let locked = 0;

  for (const post of wanted) {
    const term = commentTerm(post.slug);
    const hash = sha1(term);
    let thread = threads.get(hash);
    if (!thread) {
      thread = await create(post, term, hash);
      threads.set(hash, thread);
      created += 1;
      console.log(`discussions: created "${term}"`);
    }
    if (post.comments === 'readonly' && !thread.locked) {
      await lock(thread.id);
      thread.locked = true;
      locked += 1;
      console.log(`discussions: locked "${term}"`);
    }
  }

  console.log(
    `discussions: ${wanted.length} posts show comments, ${created} threads created, ${locked} locked`,
  );
} catch (error) {
  // GitHub's annotation syntax, so it shows on the run's summary page.
  console.log(`::warning::discussions: not checked (${error.message})`);
}
