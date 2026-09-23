import { describe, expect, it } from 'vitest';
import {
  mediaKind,
  startSeconds,
  youtubeEmbedUrl,
  youtubeId,
  youtubeThumbUrl,
  youtubeWatchUrl,
} from '../lib/media';
import { bannerFrom, bannerWarnings } from '../lib/post-builder';

describe('youtubeId', () => {
  it('reads every address YouTube hands out', () => {
    for (const url of [
      'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      'https://youtube.com/watch?v=dQw4w9WgXcQ&t=90',
      'https://www.youtube.com/watch?list=PL123&v=dQw4w9WgXcQ',
      'https://youtu.be/dQw4w9WgXcQ',
      'https://youtu.be/dQw4w9WgXcQ?t=1m30s',
      'https://www.youtube.com/embed/dQw4w9WgXcQ',
      'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ',
      'https://www.youtube.com/shorts/dQw4w9WgXcQ',
      'https://m.youtube.com/watch?v=dQw4w9WgXcQ',
    ]) {
      expect(youtubeId(url), url).toBe('dQw4w9WgXcQ');
    }
  });

  it('is not fooled by a lookalike host', () => {
    expect(youtubeId('https://notyoutube.com/watch?v=dQw4w9WgXcQ')).toBeUndefined();
    expect(youtubeId('https://example.org/youtu.be/dQw4w9WgXcQ')).toBeUndefined();
  });
});

describe('mediaKind', () => {
  it('tells the three kinds apart', () => {
    expect(mediaKind('/figures/rig.jpg')).toBe('image');
    expect(mediaKind('/figures/rig.SVG')).toBe('image');
    expect(mediaKind('/posts/x/clip.mp4')).toBe('video');
    expect(mediaKind('https://cdn.example.org/clip.webm?v=2')).toBe('video');
    expect(mediaKind('https://youtu.be/dQw4w9WgXcQ')).toBe('youtube');
  });

  it('answers for nothing it cannot show, rather than guessing', () => {
    for (const src of ['', '   ', '/notes.pdf', 'https://example.org/a-page']) {
      expect(mediaKind(src), src).toBeUndefined();
    }
  });
});

describe('startSeconds', () => {
  it('reads the three ways YouTube writes a timestamp', () => {
    expect(startSeconds('https://youtu.be/dQw4w9WgXcQ?t=90')).toBe(90);
    expect(startSeconds('https://youtu.be/dQw4w9WgXcQ?t=1m30s')).toBe(90);
    expect(startSeconds('https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=1h2m3s')).toBe(3723);
    expect(startSeconds('https://www.youtube.com/embed/dQw4w9WgXcQ?start=42')).toBe(42);
  });

  it('is nothing when there is no timestamp to read', () => {
    expect(startSeconds('https://youtu.be/dQw4w9WgXcQ')).toBeUndefined();
    expect(startSeconds('https://youtu.be/dQw4w9WgXcQ?t=soon')).toBeUndefined();
  });
});

describe('youtubeEmbedUrl', () => {
  it('embeds from the domain that holds off on the cookie', () => {
    expect(youtubeEmbedUrl('https://youtu.be/dQw4w9WgXcQ')).toMatch(
      /^https:\/\/www\.youtube-nocookie\.com\/embed\/dQw4w9WgXcQ\?/,
    );
  });

  it('keeps the moment the link was copied at', () => {
    expect(youtubeEmbedUrl('https://youtu.be/dQw4w9WgXcQ?t=1m30s')).toContain('start=90');
  });

  it('never asks for an autoplay a browser would block', () => {
    const url = youtubeEmbedUrl('https://youtu.be/dQw4w9WgXcQ', { autoplay: true });
    expect(url).toContain('autoplay=1');
    expect(url).toContain('mute=1');
  });

  it('is empty for anything that is not a YouTube link', () => {
    expect(youtubeEmbedUrl('/clip.mp4')).toBe('');
    expect(youtubeWatchUrl('/clip.mp4')).toBe('');
    expect(youtubeThumbUrl('/clip.mp4')).toBe('');
  });
});

describe('bannerFrom', () => {
  it('takes a bare path and fills in the rest', () => {
    expect(bannerFrom('/figures/rig.jpg')).toEqual({
      src: '/figures/rig.jpg',
      alt: '',
      title: '',
      poster: undefined,
      autoplay: false,
      ratio: '3 / 1',
    });
  });

  it('crops a picture harder than a video, because a picture can spare it', () => {
    expect(bannerFrom('/figures/rig.jpg')?.ratio).toBe('3 / 1');
    expect(bannerFrom('/clip.mp4')?.ratio).toBe('16 / 9');
    expect(bannerFrom('https://youtu.be/dQw4w9WgXcQ')?.ratio).toBe('16 / 9');
  });

  it('honours the longer form', () => {
    expect(
      bannerFrom({
        src: '/clip.mp4',
        alt: 'A run',
        title: 'Recorded in the lab, March 2026',
        autoplay: true,
        ratio: '21 / 9',
      }),
    ).toEqual({
      src: '/clip.mp4',
      alt: 'A run',
      title: 'Recorded in the lab, March 2026',
      poster: undefined,
      autoplay: true,
      ratio: '21 / 9',
    });
  });

  it('will not autoplay a picture, whatever the frontmatter says', () => {
    expect(bannerFrom({ src: '/figures/rig.jpg', autoplay: true })?.autoplay).toBe(false);
  });

  it('is nothing when there is nothing it could render', () => {
    for (const value of [undefined, null, '', '  ', '/notes.pdf', {}, { src: 42 }, 7]) {
      expect(bannerFrom(value), JSON.stringify(value)).toBeUndefined();
    }
  });
});

describe('bannerWarnings', () => {
  it('says nothing about a post with no banner, or a good one', () => {
    expect(bannerWarnings('a-post', undefined)).toEqual([]);
    expect(bannerWarnings('a-post', '/figures/rig.jpg')).toEqual([]);
    expect(bannerWarnings('a-post', { src: 'https://youtu.be/dQw4w9WgXcQ' })).toEqual([]);
  });

  it('catches a src nothing can be made of', () => {
    const problems = bannerWarnings('a-post', '/figures/rig');
    expect(problems).toHaveLength(1);
    expect(problems[0]).toContain('/figures/rig');
  });

  it('catches a banner block with no src at all', () => {
    expect(bannerWarnings('a-post', { alt: 'A rig' })[0]).toContain('no `src`');
  });

  it('catches video settings written on a picture', () => {
    const problems = bannerWarnings('a-post', {
      src: '/figures/rig.jpg',
      autoplay: true,
      poster: '/figures/still.jpg',
    });
    expect(problems).toHaveLength(2);
    expect(problems.join(' ')).toContain('autoplay');
    expect(problems.join(' ')).toContain('poster');
  });
});

describe('the banner’s two labels', () => {
  it('keeps alt and title apart, and leaves both empty by default', () => {
    // A tooltip that repeats the alt is read twice by some screen readers and
    // never shown at all on a touch screen, so it is never filled in for you.
    const banner = bannerFrom({ src: '/figures/rig.jpg', alt: 'The rig, side on' });
    expect(banner?.alt).toBe('The rig, side on');
    expect(banner?.title).toBe('');
  });

  it('takes a title on any of the three kinds', () => {
    for (const src of ['/figures/rig.jpg', '/clip.mp4', 'https://youtu.be/dQw4w9WgXcQ']) {
      expect(bannerFrom({ src, title: 'Photo: someone else' })?.title, src).toBe(
        'Photo: someone else',
      );
    }
  });
});
