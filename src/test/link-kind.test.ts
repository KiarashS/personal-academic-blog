import { describe, expect, it } from 'vitest';
import { linkKind } from '../lib/link-kind';

describe('linkKind', () => {
  it('opens a URL somewhere else in its own tab', () => {
    for (const href of [
      'https://example.org',
      'http://example.org/a',
      'https://example.org/x.pdf',
    ]) {
      expect(linkKind(href), href).toBe('external');
    }
  });

  it('hands an address or a number to another application, in this tab', () => {
    // These are schemes, so they read as external, and nothing navigates when
    // they are followed — a new tab would open and sit there empty.
    for (const href of ['mailto:a@b.c', 'tel:+441234567890', 'sms:+441234567890']) {
      expect(linkKind(href), href).toBe('handoff');
    }
  });

  it('treats a path with an extension as a file under public/', () => {
    for (const href of ['/cv.pdf', '/posts/x/figure.png', '/data/set.csv']) {
      expect(linkKind(href), href).toBe('file');
    }
  });

  it('treats everything else as a page of the site', () => {
    for (const href of ['/about', '/blog/writing-a-post', '/tags/guide', '#section']) {
      expect(linkKind(href), href).toBe('route');
    }
  });

  it('reads the scheme before the extension, so a mailto is never a file', () => {
    // `mailto:someone@example.co.uk` ends in something the file pattern would
    // otherwise take for an extension.
    expect(linkKind('mailto:someone@example.co.uk')).toBe('handoff');
  });
});
