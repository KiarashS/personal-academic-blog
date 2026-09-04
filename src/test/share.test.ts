import { describe, expect, it } from 'vitest';
import { shareTargets } from '../lib/share';

const title = 'Bootstrapping & the “plug-in” rule';
const url = 'https://example.org/blog/posts/bootstrap';

const target = (label: string) => shareTargets(title, url).find((entry) => entry.label === label)!;

describe('shareTargets', () => {
  it('offers the five destinations, copy aside', () => {
    expect(shareTargets(title, url).map((entry) => entry.label)).toEqual([
      'LinkedIn',
      'X',
      'Bluesky',
      'Email',
    ]);
  });

  it('escapes the title and the URL in every target', () => {
    for (const entry of shareTargets(title, url)) {
      expect(entry.href).not.toContain(' ');
      expect(entry.href).not.toContain('&amp;');
      expect(entry.href).toContain(encodeURIComponent(url).slice(0, 20));
    }
  });

  it('sends LinkedIn the URL alone, which is all it reads', () => {
    expect(target('LinkedIn').href).toBe(
      `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`,
    );
  });

  it('gives X the title and the URL in separate fields', () => {
    const href = target('X').href;
    expect(href.startsWith('https://x.com/intent/post?text=')).toBe(true);
    expect(href).toContain(`&url=${encodeURIComponent(url)}`);
  });

  it('folds the URL into the text for Bluesky, which has no url field', () => {
    expect(target('Bluesky').href).toBe(
      `https://bsky.app/intent/compose?text=${encodeURIComponent(`${title} ${url}`)}`,
    );
  });

  it('writes an email with the title as the subject', () => {
    const href = target('Email').href;
    expect(href.startsWith('mailto:?subject=')).toBe(true);
    expect(href).toContain(encodeURIComponent(`${title}\n${url}`));
  });
});
