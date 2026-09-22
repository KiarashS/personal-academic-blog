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
