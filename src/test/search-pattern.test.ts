import { describe, expect, it } from 'vitest';
import { toPattern } from '../lib/search';

describe('toPattern', () => {
  it('requires short tokens to match literally', () => {
    expect(toPattern('seed')).toBe("'seed");
  });

  it('leaves longer tokens fuzzy so typos still find the post', () => {
    expect(toPattern('notation')).toBe('notation');
  });

  it('treats each word separately', () => {
    expect(toPattern('bayes shrinkage')).toBe("'bayes shrinkage");
  });

  it('strips fuse operators typed by the reader', () => {
    expect(toPattern('!^=priors')).toBe('priors');
  });
});
