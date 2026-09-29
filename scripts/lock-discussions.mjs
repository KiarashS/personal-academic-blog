import { createHash } from 'node:crypto';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

/*
 * Locks the GitHub Discussion of every `readonly` post that has one.
 *
 * `readonly` hides giscus's comment box on the page, which is presentation:
 * anyone who opened the discussion on GitHub could still reply there. The
 * lock is what closes it. A `readonly` post with no discussion is left
 * without one, since there is then nothing on GitHub to reply to, and giscus
 * shows an empty thread with no box.
 *
 * This never creates a discussion. giscus opens one when the first comment is
 * posted, and until then its search for the thread answers 404 in the
 * console; that is how giscus is meant to work. Creating a thread for every
 * post in advance filled the repository's Discussions tab with empty,
 * bot-written threads and sent a notification to anyone watching the
 * repository for each post published.
 *
 * The thread is matched as giscus matches it in strict mode, by the
 * `<!-- sha1: … -->` line giscus writes into the discussion's body, the SHA-1
 * of the post's term (`commentTerm` in src/lib/comments.ts).
 *
 * Runs in the deploy workflow with its GITHUB_TOKEN, which needs
 * `discussions: write`. With no token (a local build) it does nothing, and a
 * failure is a warning rather than a failed deploy.
 */

const token = process.env.GITHUB_TOKEN;
if (!token) {
  console.log('discussions: no GITHUB_TOKEN, skipped');
  process.exit(0);
}

const serverEntry = pathToFileURL(join(resolve('dist-server'), 'entry-server.js')).href;
const { allPosts, siteConfig, commentTerm, commentsConfigured } = await import(serverEntry);

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
  const closed = allPosts.filter((post) => post.comments === 'readonly');
  let locked = 0;

  for (const post of closed) {
    const term = commentTerm(post.slug);
    const thread = threads.get(sha1(term));
    if (!thread || thread.locked) continue;
    await lock(thread.id);
    locked += 1;
    console.log(`discussions: locked "${term}"`);
  }

  console.log(`discussions: ${closed.length} readonly posts, ${locked} threads locked`);
} catch (error) {
  // GitHub's annotation syntax, so it shows on the run's summary page.
  console.log(`::warning::discussions: not checked (${error.message})`);
}
