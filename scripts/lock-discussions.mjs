import { createHash } from 'node:crypto';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

/*
 * Keeps each post's GitHub Discussion locked or unlocked to match its
 * `comments:` setting: a `readonly` post's thread is locked, and an `on`
 * post's thread is unlocked, so setting a post back to `on` reopens it.
 * `off` changes nothing, since the page no longer shows that thread at all.
 *
 * `readonly` hides giscus's comment box on the page, which is presentation:
 * anyone who opened the discussion on GitHub could still reply there. The
 * lock is what closes it. A `readonly` post with no discussion is left
 * without one, since there is then nothing on GitHub to reply to, and giscus
 * shows an empty thread with no box.
 *
 * The script locks with the reason "resolved", and only unlocks a thread
 * locked as resolved or with no reason given. A lock given as spam, off
 * topic or too heated is moderation, set by hand on GitHub, and a deploy
 * leaves it where it is whatever the post says.
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
const { allPosts, siteConfig, commentTerm, commentsConfigured, blogEnabled } = await import(
  serverEntry
);

// Without a blog there are no posts to match, and a thread's lock is left as
// the last deploy with a blog set it.
if (!blogEnabled()) {
  console.log('discussions: the blog is off, skipped');
  process.exit(0);
}

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
                activeLockReason
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
    for (const { id, locked, activeLockReason, body } of nodes) {
      for (const [, hash] of body.matchAll(/<!-- sha1: ([0-9a-f]{40}) -->/g)) {
        threads.set(hash, { id, locked, reason: activeLockReason });
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
        lockLockable(input: { lockableId: $id, lockReason: RESOLVED }) {
          lockedRecord {
            locked
          }
        }
      }
    `,
    { id },
  );
}

async function unlock(id) {
  await graphql(
    `
      mutation ($id: ID!) {
        unlockLockable(input: { lockableId: $id }) {
          unlockedRecord {
            locked
          }
        }
      }
    `,
    { id },
  );
}

// Locks this script may undo: its own, and one given no reason, which is how
// every lock it made before it gave one was recorded.
const OURS = new Set(['RESOLVED', null, undefined]);

try {
  const threads = await existingThreads();
  let locked = 0;
  let unlocked = 0;
  let kept = 0;

  for (const post of allPosts) {
    if (post.comments !== 'readonly' && post.comments !== 'on') continue;
    const term = commentTerm(post.slug);
    const thread = threads.get(sha1(term));
    if (!thread) continue;

    if (post.comments === 'readonly' && !thread.locked) {
      await lock(thread.id);
      locked += 1;
      console.log(`discussions: locked "${term}"`);
    } else if (post.comments === 'on' && thread.locked) {
      if (!OURS.has(thread.reason)) {
        kept += 1;
        console.log(
          `discussions: "${term}" is on, but its thread was locked as ` +
            `${thread.reason.toLowerCase().replace('_', ' ')} on GitHub, so it stays locked`,
        );
        continue;
      }
      await unlock(thread.id);
      unlocked += 1;
      console.log(`discussions: unlocked "${term}"`);
    }
  }

  const readonly = allPosts.filter((post) => post.comments === 'readonly').length;
  console.log(
    `discussions: ${readonly} readonly post${readonly === 1 ? '' : 's'}; ` +
      `${locked} locked, ${unlocked} unlocked` +
      (kept ? `, ${kept} left locked by hand` : ''),
  );
} catch (error) {
  // GitHub's annotation syntax, so it shows on the run's summary page.
  console.log(`::warning::discussions: not checked (${error.message})`);
}
