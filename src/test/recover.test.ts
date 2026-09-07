import { describe, expect, it } from 'vitest';
import { looksLikeMissingChunk, shouldAttempt } from '../lib/recover';

describe('looksLikeMissingChunk', () => {
  it('recognises what each engine says when a chunk has gone', () => {
    // Chrome, Safari and Firefox each word this differently.
    const messages = [
      'Failed to fetch dynamically imported module: https://example.org/assets/HomePage-abc.js',
      'Importing a module script failed.',
      'error loading dynamically imported module: /assets/x.js',
    ];
    for (const message of messages) {
      expect(looksLikeMissingChunk(new Error(message))).toBe(true);
    }
  });

  it('leaves an ordinary rendering error alone', () => {
    expect(looksLikeMissingChunk(new TypeError('post.title is undefined'))).toBe(false);
    expect(looksLikeMissingChunk('something else entirely')).toBe(false);
  });
});

describe('shouldAttempt', () => {
  const now = 1_000_000;

  it('tries when nothing has been tried', () => {
    expect(shouldAttempt(null, now)).toBe(true);
  });

  it('does not try twice in a row, which would loop on a chunk that stays gone', () => {
    expect(shouldAttempt(String(now - 1_000), now)).toBe(false);
  });

  it('tries again after the cooldown, so a later deploy is still recoverable', () => {
    expect(shouldAttempt(String(now - 61_000), now)).toBe(true);
  });

  it('treats an unreadable value as never tried', () => {
    expect(shouldAttempt('not-a-number', now)).toBe(true);
  });
});
