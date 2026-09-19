import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { emojify } from '../lib/emoji';
import { emojiTable } from '../../plugins/emoji-content';
import { allNews } from '../lib/news';

const TABLE = { tada: '🎉', rocket: '🚀', mortar_board: '🎓', '+1': '👍' };

describe('emojify', () => {
  it('swaps a shortcode the build found', () => {
    expect(emojify('Accepted :tada:', TABLE)).toBe('Accepted 🎉');
  });

  it('takes as many as the line has, anywhere in it', () => {
    expect(emojify(':rocket: out, :tada: in', TABLE)).toBe('🚀 out, 🎉 in');
  });

  it('takes the punctuation-shaped names', () => {
    expect(emojify(':+1:', TABLE)).toBe('👍');
  });

  it('is case-insensitive about the name, as GitHub is', () => {
    expect(emojify(':TADA:', TABLE)).toBe('🎉');
  });

  it('leaves a name the build did not find exactly as written', () => {
    // The table holds what the content uses, so a name nobody wrote is not in
    // it. Printing it raw is the right answer: the alternative is guessing.
    expect(emojify('see :microscope: here', TABLE)).toBe('see :microscope: here');
  });

  it('leaves the colons that are not shortcodes alone', () => {
    for (const text of ['at 12:30:45 today', 'a 16:9 ratio', 'Note: a thing', '::']) {
      expect(emojify(text, TABLE)).toBe(text);
    }
  });

  it('does nothing to a line with no colon in it', () => {
    expect(emojify('nothing to do here', TABLE)).toBe('nothing to do here');
  });

  it('does not carry `lastIndex` from one call into the next', () => {
    // The pattern is global and shared with the build's scan, so a leftover
    // offset would make the second of two identical calls disagree.
    expect(emojify(':tada: :tada:', TABLE)).toBe('🎉 🎉');
    expect(emojify(':tada:', TABLE)).toBe('🎉');
  });
});

describe('emojiTable', () => {
  it('finds the names a file uses, and only those', () => {
    expect(emojiTable("text: 'Shipped :rocket: today'")).toEqual({ rocket: '🚀' });
  });

  it('keeps one entry however often a name appears', () => {
    expect(emojiTable(':tada: :tada: :tada:')).toEqual({ tada: '🎉' });
  });

  it('ignores a name gemoji does not know, so the table stays small', () => {
    expect(emojiTable(':not_an_emoji: :rocket:')).toEqual({ rocket: '🚀' });
  });

  it('ignores the colons that are not shortcodes', () => {
    expect(emojiTable("href: 'https://example.org/a', time: '12:30:45'")).toEqual({});
  });

  it('is empty for a file with no emoji in it, which is the usual case', () => {
    expect(emojiTable("{ date: '2026-03-12', text: 'Paper accepted' }")).toEqual({});
  });
});

describe('the news the site ships', () => {
  it('leaves no shortcode unread in any entry', () => {
    // Whatever `news.ts` writes, the table the build emits covers it: scan the
    // rendered entries for anything still wrapped in colons that gemoji knows.
    const source = readFileSync(new URL('../content/news.ts', import.meta.url), 'utf8');
    const table = emojiTable(source);
    for (const item of allNews()) {
      for (const name of Object.keys(table)) {
        expect(item.text, `:${name}: survived in ${item.date}`).not.toContain(`:${name}:`);
      }
    }
  });
});
