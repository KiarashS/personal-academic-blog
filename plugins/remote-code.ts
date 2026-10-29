import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';

/**
 * Code read from a file somewhere else, for `file=` fences that name a URL:
 *
 *     ```python file=https://github.com/you/repo/blob/3f2c1a9/src/fit.py lines=16-23
 *     ```
 *
 * A link to a file on GitHub or GitLab, its page or its raw text, is read
 * from the raw text and shown with a link back to the page, at the lines the
 * post quotes. Any other `https` address is read and linked as it is.
 *
 * The point of quoting a file is that the post shows the code that ran, so a
 * link should name a commit, not a branch: a branch moves, and the post would
 * change under its readers without anyone editing it. A GitHub or GitLab link
 * to a branch or a tag is reported.
 *
 * Every file read is kept in a lock file committed with the site,
 * `src/content/remote-code.lock.json`, with its SHA-256, and the build reads
 * from there. So a build needs no network once a file has been fetched, a
 * repository that is deleted or made private costs the post nothing, and even
 * a branch link shows the same text until its entry is deleted to fetch it
 * afresh.
 */

export interface RemoteFile {
  /** Where the text is fetched from. */
  raw: string;
  /** The page a reader is sent to, before any line anchor. */
  page: string;
  /** The file's name, for the code bar. */
  name: string;
  /** Whether the URL names a commit, when the host is one this can tell for. */
  pinned?: boolean;
  /** The anchor a host uses for a range of lines. */
  lines?: (start: number, end: number) => string;
}

const COMMIT = /^[0-9a-f]{7,40}$/i;

const nameOf = (path: string): string => decodeURIComponent(path.split('/').pop() ?? path);

/** What a `file=` URL is: where to fetch it, where to link, and whether it is pinned. */
export function remoteFile(url: string): RemoteFile | undefined {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return undefined;
  }
  if (parsed.protocol !== 'https:') return undefined;
  const parts = parsed.pathname.split('/').filter(Boolean);

  // raw.githubusercontent.com/owner/repo/ref/path…
  if (parsed.hostname === 'raw.githubusercontent.com' && parts.length >= 4) {
    const [owner, repo, ref, ...path] = parts;
    return {
      raw: url.replace(/#.*$/, ''),
      page: `https://github.com/${owner}/${repo}/blob/${ref}/${path.join('/')}`,
      name: nameOf(path.join('/')),
      pinned: COMMIT.test(ref),
      lines: (start, end) => (start === end ? `#L${start}` : `#L${start}-L${end}`),
    };
  }

  // github.com/owner/repo/blob/ref/path…
  if (parsed.hostname === 'github.com' && parts[2] === 'blob' && parts.length >= 5) {
    const [owner, repo, , ref, ...path] = parts;
    return {
      raw: `https://raw.githubusercontent.com/${owner}/${repo}/${ref}/${path.join('/')}`,
      page: `https://github.com/${owner}/${repo}/blob/${ref}/${path.join('/')}`,
      name: nameOf(path.join('/')),
      pinned: COMMIT.test(ref),
      lines: (start, end) => (start === end ? `#L${start}` : `#L${start}-L${end}`),
    };
  }

  // gitlab.com/group/…/repo/-/blob|raw/ref/path…
  const dash = parts.indexOf('-');
  if (
    parsed.hostname === 'gitlab.com' &&
    dash > 1 &&
    (parts[dash + 1] === 'blob' || parts[dash + 1] === 'raw') &&
    parts.length >= dash + 4
  ) {
    const project = parts.slice(0, dash).join('/');
    const ref = parts[dash + 2];
    const path = parts.slice(dash + 3).join('/');
    return {
      raw: `https://gitlab.com/${project}/-/raw/${ref}/${path}`,
      page: `https://gitlab.com/${project}/-/blob/${ref}/${path}`,
      name: nameOf(path),
      pinned: COMMIT.test(ref),
      lines: (start, end) => (start === end ? `#L${start}` : `#L${start}-${end}`),
    };
  }

  return {
    raw: url.replace(/#.*$/, ''),
    page: url.replace(/#.*$/, ''),
    name: nameOf(parsed.pathname) || parsed.hostname,
  };
}

export interface LockEntry {
  sha256: string;
  /** The day it was fetched, YYYY-MM-DD. */
  fetched: string;
  text: string;
}

export type RemoteLock = Record<string, LockEntry>;

export const sha256 = (text: string): string => createHash('sha256').update(text).digest('hex');

export function loadLock(path: string): RemoteLock {
  if (!existsSync(path)) return {};
  try {
    return JSON.parse(readFileSync(path, 'utf8')) as RemoteLock;
  } catch {
    return {};
  }
}

/** Written sorted, so a new entry is one hunk in a diff and not a reshuffle. */
export function saveLock(path: string, lock: RemoteLock): void {
  const sorted = Object.fromEntries(
    Object.keys(lock)
      .sort()
      .map((key) => [key, lock[key]]),
  );
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(sorted, null, 2)}\n`, 'utf8');
}

/** A megabyte: past that, a listing is not something a post quotes. */
const MAX_BYTES = 1024 * 1024;
const TIMEOUT = 15_000;

export type Fetch = (url: string, init?: { signal?: AbortSignal }) => Promise<Response>;

/** The text of a remote file, or why it could not be had. */
export async function fetchText(url: string, fetcher: Fetch = fetch): Promise<string> {
  const response = await fetcher(url, { signal: AbortSignal.timeout(TIMEOUT) });
  if (!response.ok) throw new Error(`the server answered ${response.status}`);
  const declared = Number(response.headers.get('content-length') ?? 0);
  if (declared > MAX_BYTES) throw new Error('the file is larger than a megabyte');
  const text = await response.text();
  if (text.length > MAX_BYTES) throw new Error('the file is larger than a megabyte');
  if (text.includes('\u0000')) throw new Error('the file is not text');
  return text;
}
