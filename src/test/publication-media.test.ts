import { afterEach, describe, expect, it } from 'vitest';
import { footerCredit } from '../lib/credit';
import { bibFieldsOnly, publicationMedia } from '../lib/publication-media';
import { siteConfig } from '../site.config';

const size = () => ({ width: 800, height: 500 });

describe('publicationMedia', () => {
  it('is nothing without a teaser', () => {
    expect(publicationMedia('k', { title: 'x' })).toEqual({ problems: [] });
  });

  it('reads an image, measured, with its description', () => {
    expect(publicationMedia('k', { teaser: '/p/a.gif', teaseralt: ' A plot ' }, size)).toEqual({
      media: { kind: 'image', src: '/p/a.gif', alt: 'A plot', width: 800, height: 500 },
      problems: [],
    });
  });

  it('reads a video with its still, and leaves it unmeasured', () => {
    const { media, problems } = publicationMedia(
      'k',
      { teaser: '/p/clip.mp4', teaserposter: '/p/clip.jpg' },
      size,
    );
    expect(media).toEqual({ kind: 'video', src: '/p/clip.mp4', alt: '', poster: '/p/clip.jpg' });
    expect(problems).toEqual([]);
  });

  it('takes a URL as it is, without measuring it', () => {
    const { media, problems } = publicationMedia('k', { teaser: 'https://example.org/a.png' });
    expect(media?.src).toBe('https://example.org/a.png');
    expect(media?.width).toBeUndefined();
    expect(problems).toEqual([]);
  });

  it('names a teaser it cannot show, a path with no root and a missing file', () => {
    expect(publicationMedia('k', { teaser: '/p/paper.pdf' }).problems[0]).toMatch(/not an image/);
    expect(publicationMedia('k', { teaser: 'p/a.png' }).problems[0]).toMatch(/from the root/);
    expect(publicationMedia('k', { teaser: '/p/gone.png' }).problems[0]).toMatch(/no file/);
    expect(
      publicationMedia('k', { teaser: '/p/a.png', teaserposter: '/p/b.jpg' }, size).problems[0],
    ).toMatch(/only applies to a video/);
  });
});

describe('bibFieldsOnly', () => {
  it('keeps the BibTeX and drops the site’s own fields', () => {
    expect(
      bibFieldsOnly({
        title: 'T',
        year: '1984',
        teaser: '/a.png',
        teaseralt: 'a',
        teaserposter: '/b',
      }),
    ).toEqual({ title: 'T', year: '1984' });
  });
});

describe('footerCredit', () => {
  const credit = { ...siteConfig.credit };
  const about = siteConfig.features.about;
  afterEach(() => {
    Object.assign(siteConfig.credit, credit);
    siteConfig.features.about = about;
  });

  it('is nothing when the text is empty', () => {
    siteConfig.credit.text = ' ';
    expect(footerCredit()).toBeUndefined();
  });

  it('names the owner, links the About page by default, and takes a link written', () => {
    siteConfig.credit.text = 'Built with care by';
    siteConfig.credit.href = '';
    siteConfig.features.about = true;
    expect(footerCredit()).toMatchObject({ text: 'Built with care by', href: '/about' });
    siteConfig.features.about = false;
    expect(footerCredit()?.href).toBeUndefined();
    siteConfig.credit.href = 'https://example.org';
    expect(footerCredit()?.href).toBe('https://example.org');
  });
});
