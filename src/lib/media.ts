/**
 * What a `src` turns out to be: a picture, a video file the browser plays
 * itself, or a YouTube video someone else hosts.
 *
 * This is shared by the two places media arrives — a post's `banner:`
 * frontmatter and an image written in its body — so both answer the question
 * the same way, and so `![](clip.mp4)` stops producing a broken `<img>`.
 */
export type MediaKind = 'image' | 'video' | 'youtube';

const IMAGE = /\.(?:avif|gif|jpe?g|png|svg|webp)(?:[?#].*)?$/i;
const VIDEO = /\.(?:m4v|mov|mp4|ogv|webm)(?:[?#].*)?$/i;

/**
 * The eleven characters YouTube identifies a video by, out of the addresses it
 * hands out: a watch link, a share link, an embed, or a short.
 */
const YOUTUBE =
  /^(?:https?:)?\/\/(?:www\.|m\.)?(?:youtube(?:-nocookie)?\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/|live\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/;

export function youtubeId(src: string): string | undefined {
  return YOUTUBE.exec(src.trim())?.[1];
}

/**
 * `#frame` on the end of a picture's path asks for a hairline border round it:
 * for a screenshot or a photo whose own edge disappears into the page, a white
 * window on the light theme above all. Read in the same two places as
 * `mediaKind`, a figure in a post and a publication's teaser, and taken off
 * before the path is used, so the file is still found and measured.
 *
 * Only the exact fragment counts, so a remote picture whose URL carries a real
 * fragment keeps it.
 */
const FRAME = '#frame';

export function withoutFrame(src: string): { src: string; framed: boolean } {
  return src.endsWith(FRAME)
    ? { src: src.slice(0, -FRAME.length), framed: true }
    : { src, framed: false };
}

/** A picture, a video file, a YouTube link, or nothing we know how to show. */
export function mediaKind(src: string): MediaKind | undefined {
  const value = src.trim();
  if (!value) return undefined;
  if (youtubeId(value)) return 'youtube';
  if (VIDEO.test(value)) return 'video';
  if (IMAGE.test(value)) return 'image';
  return undefined;
}

/**
 * A start time, in seconds, from `t=` or `start=`. YouTube writes it three
 * ways — `90`, `1m30s`, `1h2m3s` — and a link copied from the player at a
 * particular moment carries one, which is usually the moment that was worth
 * linking to.
 */
export function startSeconds(src: string): number | undefined {
  const value = /[?&](?:t|start)=([^&#]+)/.exec(src)?.[1];
  if (!value) return undefined;

  if (/^\d+$/.test(value)) return Number(value);

  const parts = /^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?$/.exec(value);
  if (!parts || !parts.slice(1).some(Boolean)) return undefined;
  const [hours, minutes, seconds] = parts.slice(1).map((part) => Number(part ?? 0) || 0);
  return hours * 3600 + minutes * 60 + seconds;
}

export interface EmbedOptions {
  /** Start playing as soon as the frame loads. Muted, because browsers insist. */
  autoplay?: boolean;
}

/**
 * The player address.
 *
 * `youtube-nocookie.com` is the domain that holds off on the advertising
 * cookie until the video is played, which is the most a site can do about
 * an embed it does not host. `rel=0` keeps the videos suggested at the end to
 * the same channel rather than opening the whole of YouTube on top of a post.
 */
export function youtubeEmbedUrl(src: string, { autoplay = false }: EmbedOptions = {}): string {
  const id = youtubeId(src);
  if (!id) return '';

  const params = new URLSearchParams({ rel: '0' });
  const start = startSeconds(src);
  if (start) params.set('start', String(start));
  if (autoplay) {
    params.set('autoplay', '1');
    // An unmuted autoplay is blocked outright by every current browser, so
    // asking for one is asking for a player that sits there doing nothing.
    params.set('mute', '1');
  }
  return `https://www.youtube-nocookie.com/embed/${id}?${params}`;
}

/** Where the video can be watched on YouTube itself, for a reader without JS. */
export function youtubeWatchUrl(src: string): string {
  const id = youtubeId(src);
  return id ? `https://www.youtube.com/watch?v=${id}` : '';
}

/**
 * The still YouTube keeps for a video.
 *
 * `maxresdefault` is the only size worth putting across a text column, and the
 * one YouTube does not always have: videos uploaded below 720p have no
 * `maxres`. A `poster:` of your own is the answer to that, and it is also the
 * answer to the request this makes to Google before the reader has asked for
 * anything.
 */
export function youtubeThumbUrl(src: string): string {
  const id = youtubeId(src);
  return id ? `https://i.ytimg.com/vi/${id}/maxresdefault.jpg` : '';
}

const AUDIO = /\.(?:aac|flac|m4a|mp3|oga|ogg|opus|wav)(?:[?#].*)?$/i;

/**
 * A sound file, which a post writes the way it writes a picture,
 * `![An interview](/posts/x/interview.mp3)`, and which plays in the browser's
 * own player. Kept out of `mediaKind`, whose other callers, a banner and a
 * publication's teaser, have nothing to show for a sound.
 */
export function isAudio(src: string): boolean {
  return AUDIO.test(src.trim());
}

export interface Place {
  lat: number;
  lon: number;
  zoom: number;
}

const inRange = (lat: number, lon: number): boolean =>
  Number.isFinite(lat) && Number.isFinite(lon) && Math.abs(lat) <= 90 && Math.abs(lon) <= 180;

/**
 * A place on a map, from the two ways one is written down: a `geo:` URI,
 * `geo:35.6997,51.3380?z=15` (RFC 5870, with the `z` that Android and most
 * map apps read for the zoom), or an OpenStreetMap link copied from the
 * address bar, `https://www.openstreetmap.org/#map=15/35.6997/51.3380`, which
 * may also carry `mlat` and `mlon` for a marker.
 */
export function placeOf(src: string): Place | undefined {
  const value = src.trim();
  const clampZoom = (zoom: number) => Math.min(19, Math.max(1, Math.round(zoom)));

  const geo = /^geo:(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)(?:,[^;?]*)?(?:;[^?]*)?(?:\?(.*))?$/i.exec(
    value,
  );
  if (geo) {
    const lat = Number(geo[1]);
    const lon = Number(geo[2]);
    const zoom = Number(/(?:^|&)z=(\d+(?:\.\d+)?)/.exec(geo[3] ?? '')?.[1] ?? 15);
    return inRange(lat, lon) ? { lat, lon, zoom: clampZoom(zoom) } : undefined;
  }

  if (!/^https?:\/\/(?:www\.)?openstreetmap\.org\//i.test(value)) return undefined;
  const view = /#map=(\d+(?:\.\d+)?)\/(-?\d+(?:\.\d+)?)\/(-?\d+(?:\.\d+)?)/.exec(value);
  const mlat = /[?&]mlat=(-?\d+(?:\.\d+)?)/.exec(value)?.[1];
  const mlon = /[?&]mlon=(-?\d+(?:\.\d+)?)/.exec(value)?.[1];
  const lat = Number(mlat ?? view?.[2]);
  const lon = Number(mlon ?? view?.[3]);
  const zoom = Number(view?.[1] ?? 15);
  return inRange(lat, lon) ? { lat, lon, zoom: clampZoom(zoom) } : undefined;
}

/**
 * OpenStreetMap's embeddable map of a place, with a marker on it. The embed
 * takes a bounding box rather than a zoom, so the box is the area a 696 by
 * 435 pixel frame shows at that zoom: OpenStreetMap's tiles are 256 pixels
 * wide and cover 360 degrees of longitude at zoom 0, and a degree of latitude
 * is longer than one of longitude by 1 / cos(latitude).
 */
export function mapEmbedUrl({ lat, lon, zoom }: Place): string {
  const lonSpan = ((696 / 256) * 360) / 2 ** zoom;
  const latSpan = lonSpan * (435 / 696) * Math.cos((lat * Math.PI) / 180);
  const round = (n: number) => Number(n.toFixed(6));
  const bbox = [lon - lonSpan / 2, lat - latSpan / 2, lon + lonSpan / 2, lat + latSpan / 2]
    .map(round)
    .join(',');
  const params = new URLSearchParams({
    bbox,
    layer: 'mapnik',
    marker: `${round(lat)},${round(lon)}`,
  });
  return `https://www.openstreetmap.org/export/embed.html?${params}`;
}

/** The place on OpenStreetMap itself, marked, for a reader without JavaScript. */
export function mapLinkUrl({ lat, lon, zoom }: Place): string {
  return `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lon}#map=${zoom}/${lat}/${lon}`;
}

/** "35.6997° N, 51.3380° E". */
export function formatPlace({ lat, lon }: Place): string {
  const part = (value: number, positive: string, negative: string) =>
    `${Math.abs(value).toFixed(4)}° ${value >= 0 ? positive : negative}`;
  return `${part(lat, 'N', 'S')}, ${part(lon, 'E', 'W')}`;
}
