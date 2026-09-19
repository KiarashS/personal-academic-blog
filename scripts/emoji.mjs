import { gemoji, nameToEmoji, emojiToName } from 'gemoji';

/*
 * Looks up the emoji shortcodes a post can use.
 *
 *   npm run emoji rocket      names, tags and descriptions matching "rocket"
 *   npm run emoji 🚀          the shortcode for a character you already have
 *   npm run emoji             what there is, by category
 *
 * It reads `gemoji`, which is the same table `plugins/emoji.ts` reads when it
 * compiles a post, so what this prints and what the build renders cannot drift
 * apart. That is the whole reason it exists rather than a link to a website:
 * 1,913 names is more than anyone remembers, and a list kept somewhere else is
 * a list that is wrong the next time the package moves.
 */

const term = process.argv.slice(2).join(' ').trim();

/** The widest name in a set, so the emoji line up in a column. */
const pad = (rows) => Math.max(0, ...rows.map((row) => row.name.length));

const show = (rows) => {
  const width = pad(rows);
  for (const row of rows) {
    const code = `:${row.name}:`.padEnd(width + 2);
    // The description repeats the name often enough that printing both is
    // noise; the tags are what turn a guess into a find.
    const extra = [row.description === row.name ? '' : row.description, ...row.tags]
      .filter(Boolean)
      .join(', ');
    console.log(`  ${code}  ${row.emoji}${extra ? `  ${extra}` : ''}`);
  }
};

if (!term) {
  const byCategory = new Map();
  for (const entry of gemoji) {
    byCategory.set(entry.category, (byCategory.get(entry.category) ?? 0) + entry.names.length);
  }
  console.log(
    `${Object.keys(nameToEmoji).length} shortcodes over ${gemoji.length} emoji, ` +
      `the list GitHub publishes:\n`,
  );
  for (const [category, count] of [...byCategory].sort((a, b) => b[1] - a[1])) {
    console.log(`  ${String(count).padStart(5)}  ${category}`);
  }
  console.log('\nSearch them: npm run emoji <term>, or npm run emoji <emoji> to go the other way.');
  process.exit(0);
}

// A character rather than a word: answer the question actually being asked,
// which is "what do I type to get this".
const known = emojiToName[term] ?? emojiToName[`${term}️`];
if (known) {
  const entry = gemoji.find((candidate) => candidate.names.includes(known));
  console.log(
    `\n${term}  is  :${known}:${entry?.names.length > 1 ? `  (also :${entry.names.slice(1).join(':, :')}:)` : ''}\n`,
  );
  process.exit(0);
}

const needle = term.toLowerCase();
const rows = [];
for (const entry of gemoji) {
  for (const name of entry.names) {
    const haystack = [name, entry.description, ...entry.tags].join(' ').toLowerCase();
    if (haystack.includes(needle)) {
      rows.push({ name, emoji: entry.emoji, description: entry.description, tags: entry.tags });
    }
  }
}

if (rows.length === 0) {
  console.log(`\nNothing matches "${term}".\n`);
  console.log("Names are GitHub's, so they are sometimes not the obvious word:");
  console.log(
    '  :pencil2: is the pencil, :pencil: is a note, :mortar_board: is the graduation cap.',
  );
  console.log('Try a broader term — npm run emoji write, npm run emoji science.\n');
  process.exit(1);
}

// Exact name first, then names that start with the term, then the rest: the
// thing you asked for should not be the fortieth line.
const rank = (row) => (row.name === needle ? 0 : row.name.startsWith(needle) ? 1 : 2);
rows.sort((a, b) => rank(a) - rank(b) || a.name.localeCompare(b.name));

console.log(`\n${rows.length} match${rows.length === 1 ? '' : 'es'} for "${term}":\n`);
show(rows);
console.log('');
