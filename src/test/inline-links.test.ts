import { describe, expect, it } from 'vitest';
import { isSafeHref, parseInlineLinks, plainText, unsafeHrefs } from '../lib/inline-links';
import { newsLinkProblems } from '../lib/news';

describe('parseInlineLinks', () => {
  it('leaves a plain line as one run', () => {
    expect(parseInlineLinks('Paper accepted at MICCAI 2026')).toEqual([
      { text: 'Paper accepted at MICCAI 2026' },
    ]);
  });

  it('splits the text around a link', () => {
    expect(parseInlineLinks('Talk at the [Zurich meetup](https://example.org/)')).toEqual([
      { text: 'Talk at the ' },
      { text: 'Zurich meetup', href: 'https://example.org/' },
    ]);
  });

  it('takes as many links as the sentence has', () => {
    const segments = parseInlineLinks('[A](/a) and [B](/b), then more');
    expect(segments).toEqual([
      { text: 'A', href: '/a' },
      { text: ' and ' },
      { text: 'B', href: '/b' },
      { text: ', then more' },
    ]);
  });

  it('keeps the text on either side of a link in the middle', () => {
    expect(parseInlineLinks('Wrote up [the method](/blog/post) last week')).toEqual([
      { text: 'Wrote up ' },
      { text: 'the method', href: '/blog/post' },
      { text: ' last week' },
    ]);
  });

  it('drops the target of a link the page cannot make, keeping the words', () => {
    expect(parseInlineLinks('See [the paper](doi.org/10.0000/x)')).toEqual([
      { text: 'See ' },
      { text: 'the paper' },
    ]);
  });

  it('refuses a scheme that is not a link', () => {
    expect(parseInlineLinks('Click [here](javascript:alert(1))')).toEqual([
      { text: 'Click ' },
      { text: 'here' },
    ]);
  });

  it('keeps a target that has parentheses of its own', () => {
    expect(
      parseInlineLinks('On [the distribution](https://en.wikipedia.org/wiki/Cauchy_(x))'),
    ).toEqual([
      { text: 'On ' },
      { text: 'the distribution', href: 'https://en.wikipedia.org/wiki/Cauchy_(x)' },
    ]);
  });

  it('leaves brackets that are not a link alone', () => {
    expect(parseInlineLinks('The result [sic] stands')).toEqual([
      { text: 'The result [sic] stands' },
    ]);
  });

  it('never returns nothing, even for an empty line', () => {
    expect(parseInlineLinks('')).toEqual([{ text: '' }]);
  });
});

describe('isSafeHref', () => {
  it('takes a URL, a mailto, a path and a fragment', () => {
    expect(
      ['https://example.org/', 'mailto:a@b.c', '/blog/post', '#section'].every(isSafeHref),
    ).toBe(true);
  });

  it('turns down a bare host, a relative path and anything executable', () => {
    const refused = ['doi.org/10.0000/x', 'blog/post', 'javascript:alert(1)', 'data:text/html,x'];
    expect(refused.filter(isSafeHref)).toEqual([]);
  });
});

describe('plainText', () => {
  it('reads the sentence as written, without its markup', () => {
    expect(plainText('Talk at the [Zurich meetup](https://example.org/) in May')).toBe(
      'Talk at the Zurich meetup in May',
    );
  });
});

describe('unsafeHrefs', () => {
  it('names each target the page will not link', () => {
    expect(unsafeHrefs('[a](doi.org/x) and [b](/fine) and [c](javascript:x)')).toEqual([
      'doi.org/x',
      'javascript:x',
    ]);
  });
});

describe('newsLinkProblems', () => {
  it('says which entry the bad link is in, and what to do', () => {
    const [message] = newsLinkProblems([
      { date: '2026-03-12', text: 'See [the paper](doi.org/10.0000/x)' },
    ]);
    expect(message).toContain('doi.org/10.0000/x');
    expect(message).toContain('2026-03-12');
    expect(message).toContain('https://');
  });

  it('says nothing about entries whose links are fine', () => {
    expect(
      newsLinkProblems([
        { date: '2026-03-12', text: 'Read [the post](/blog/post)', href: 'https://example.org/' },
        { date: '2026-02-02', text: 'Nothing linked here' },
      ]),
    ).toEqual([]);
  });
});
