/*
 * One-off: deletes the four empty discussions the deploy opened in advance on
 * 29 September 2026, before that was stopped. Run once by hand from
 * .github/workflows/delete-prefilled-discussions.yml, then removed with it.
 *
 * Deletes a discussion only if all three hold: its title is one of the four
 * post terms it opened, the workflow's own bot wrote it, and it has no
 * comments. Anything else is listed and left alone.
 */

const token = process.env.GITHUB_TOKEN;
if (!token) throw new Error('No GITHUB_TOKEN.');

const OWNER = 'KiarashS';
const NAME = 'personal-academic-blog';
const TITLES = new Set([
  'blog/publishing',
  'blog/code-tables-and-notes',
  'blog/math-and-citations',
  'blog/writing-a-post',
]);
const BOTS = new Set(['github-actions', 'github-actions[bot]']);

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

const data = await graphql(
  `
    query ($owner: String!, $name: String!) {
      repository(owner: $owner, name: $name) {
        discussions(first: 100) {
          nodes {
            id
            number
            title
            author {
              login
            }
            comments {
              totalCount
            }
          }
        }
      }
    }
  `,
  { owner: OWNER, name: NAME },
);

let deleted = 0;
for (const discussion of data.repository.discussions.nodes) {
  const author = discussion.author?.login ?? '(none)';
  const label = `#${discussion.number} "${discussion.title}" by ${author}, ${discussion.comments.totalCount} comments`;
  if (!TITLES.has(discussion.title) || !BOTS.has(author) || discussion.comments.totalCount > 0) {
    console.log(`kept    ${label}`);
    continue;
  }
  await graphql(
    `
      mutation ($id: ID!) {
        deleteDiscussion(input: { id: $id }) {
          discussion {
            id
          }
        }
      }
    `,
    { id: discussion.id },
  );
  deleted += 1;
  console.log(`deleted ${label}`);
}
console.log(`${deleted} deleted`);
