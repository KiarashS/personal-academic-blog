import { bibUrl, bibVenue, bibYear, type BibEntry } from './bib-parse';
import type { PublicationMedia } from './publication-media';
import type { SelectedWorkConfig } from '../site.config';

/** One card in the front page's selected work. */
export interface WorkCard {
  key: string;
  title: string;
  venue: string;
  year: number;
  /** The paper: its DOI, arXiv page or `url`. Absent when the entry has none. */
  url?: string;
  media?: PublicationMedia;
}

const card = (entry: BibEntry): WorkCard => ({
  key: entry.key,
  title: entry.fields.title ?? entry.key,
  venue: bibVenue(entry),
  year: bibYear(entry),
  ...(bibUrl(entry) ? { url: bibUrl(entry) } : {}),
  ...(entry.media ? { media: entry.media } : {}),
});

/**
 * The cards, in order: the entries `keys` names, in its order, or every entry
 * marked `selected = {true}`, newest first. At most `count`, and none when the
 * row is switched off.
 */
export function selectedWork(entries: readonly BibEntry[], config: SelectedWorkConfig): WorkCard[] {
  if (!config.enabled || config.count <= 0) return [];
  const chosen =
    config.keys.length > 0
      ? config.keys.flatMap((key) => entries.filter((entry) => entry.key === key))
      : entries.filter((entry) => entry.selected).sort((a, b) => bibYear(b) - bibYear(a));
  return chosen.slice(0, Math.floor(config.count)).map(card);
}

/** What the build should say: a key that is not in the file, or a row with nothing in it. */
export function selectedWorkWarnings(
  entries: readonly BibEntry[],
  config: SelectedWorkConfig,
): string[] {
  if (!config.enabled) return [];
  const known = new Set(entries.map((entry) => entry.key));
  const missing = config.keys.filter((key) => !known.has(key));
  const warnings = missing.map(
    (key) => `home.selectedWork.keys names "${key}", which is not in src/content/publications.bib.`,
  );
  if (selectedWork(entries, config).length === 0) {
    warnings.push(
      'home.selectedWork is on but has nothing to show: mark entries in ' +
        'src/content/publications.bib with selected = {true}, or list their keys.',
    );
  }
  return warnings;
}
