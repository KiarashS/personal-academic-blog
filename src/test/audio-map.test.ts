import { describe, expect, it } from 'vitest';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkRehype from 'remark-rehype';
import rehypeStringify from 'rehype-stringify';
import { rehypeVideo } from '../../plugins/video';
import { rehypeFigures } from '../../plugins/figures';
import { rehypeCaptions } from '../../plugins/captions';
import { formatPlace, isAudio, mapEmbedUrl, placeOf } from '../../src/lib/media';

const render = (markdown: string, base = '/'): string =>
  String(
    unified()
      .use(remarkParse)
      .use(remarkRehype)
      .use(rehypeVideo, { base })
      .use(rehypeFigures, { publicDir: 'public', base })
      .use(rehypeCaptions)
      .use(rehypeStringify)
      .processSync(markdown),
  );

describe('audio', () => {
  it('knows a sound file by its extension', () => {
    expect(isAudio('/a/talk.mp3')).toBe(true);
    expect(isAudio('/a/talk.wav?v=2')).toBe(true);
    expect(isAudio('/a/clip.mp4')).toBe(false);
  });

  it('plays one written as an image, named by its alt text, with a download inside', () => {
    const html = render('![An interview](/posts/x/talk.mp3)', '/site/');
    expect(html).toContain(
      '<audio src="/site/posts/x/talk.mp3" controls preload="metadata" aria-label="An interview">',
    );
    expect(html).toContain('<a href="/site/posts/x/talk.mp3" download>download the recording</a>');
  });

  it('is numbered by a caption like any figure', () => {
    const html = render('![An interview](/posts/x/talk.mp3)\n\nCaption: Ten minutes in.');
    expect(html).toContain('<span class="caption__label">Figure 1.</span>');
  });
});

describe('maps', () => {
  it('reads a geo URI and an OpenStreetMap link', () => {
    expect(placeOf('geo:35.6997,51.3380?z=15')).toEqual({ lat: 35.6997, lon: 51.338, zoom: 15 });
    expect(placeOf('https://www.openstreetmap.org/#map=12/35.7/51.4')).toEqual({
      lat: 35.7,
      lon: 51.4,
      zoom: 12,
    });
    expect(
      placeOf('https://www.openstreetmap.org/?mlat=35.69&mlon=51.33#map=16/35.7/51.4'),
    ).toEqual({ lat: 35.69, lon: 51.33, zoom: 16 });
    expect(placeOf('geo:135,0')).toBeUndefined();
    expect(placeOf('https://example.org/#map=12/35.7/51.4')).toBeUndefined();
  });

  it('frames the place in a box centred on it, with a marker', () => {
    const url = new URL(mapEmbedUrl({ lat: 0, lon: 0, zoom: 10 }));
    const [west, south, east, north] = url.searchParams.get('bbox')!.split(',').map(Number);
    expect(west + east).toBeCloseTo(0, 6);
    expect(south + north).toBeCloseTo(0, 6);
    expect(east - west).toBeCloseTo(((696 / 256) * 360) / 1024, 5);
    expect(url.searchParams.get('marker')).toBe('0,0');
  });

  it('writes the coordinates the way a reader expects them', () => {
    expect(formatPlace({ lat: 35.6997, lon: 51.338, zoom: 15 })).toBe('35.6997° N, 51.3380° E');
    expect(formatPlace({ lat: -33.8568, lon: -151.2153, zoom: 15 })).toBe(
      '33.8568° S, 151.2153° W',
    );
  });

  it('draws a card that links to the map and loads it only when asked', () => {
    const html = render('![Azadi Tower](geo:35.6997,51.3380?z=15)\n\nCaption: Where we meet.');
    expect(html).toContain('class="media-frame map-frame"');
    expect(html).toContain(
      'href="https://www.openstreetmap.org/?mlat=35.6997&#x26;mlon=51.338#map=15/35.6997/51.338"',
    );
    expect(html).toContain('data-embed="https://www.openstreetmap.org/export/embed.html?bbox=');
    expect(html).toContain('<span class="map-frame__place">Azadi Tower</span>');
    expect(html).not.toContain('<iframe');
    expect(html).toContain('<span class="caption__label">Figure 1.</span>');
  });
});
