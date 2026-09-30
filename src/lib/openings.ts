import { openings } from '../content/openings';
import { isEnabled, isExternal } from './features';
import { isoDate } from './format';
import { todayUtc } from './post-builder';
import { withBase } from './urls';
import type { Opening, OpeningKind } from './types';

const KIND_NAMES: Record<OpeningKind, string> = {
  phd: 'PhD position',
  postdoc: 'Postdoc',
  masters: 'Master’s project',
  bachelors: 'Bachelor’s project',
  researcher: 'Research position',
  engineer: 'Engineering position',
  intern: 'Internship',
  other: 'Position',
};

export const kindName = (kind: OpeningKind): string => KIND_NAMES[kind] ?? KIND_NAMES.other;

/** The page exists when its flag is on; with nothing open it says so. */
export function openingsPageEnabled(): boolean {
  return isEnabled('openings');
}

const DATE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Whether a deadline is a day that exists, written `YYYY-MM-DD`. The shape is
 * not enough: `2027-02-30` has it, and a date parser quietly reads it as
 * 2 March.
 */
export function validDeadline(deadline: string | undefined): boolean {
  const value = deadline?.trim() ?? '';
  return DATE.test(value) && isoDate(value) === value;
}

/**
 * Whether a position is still taking applications on `today`. Listed through
 * the deadline day itself; one with no deadline is open until it is removed.
 *
 * `today` is the day the page is rendered, in UTC, at build time and again
 * in the reader's browser, as the news and the notice are. A deadline that
 * passes between two deploys drops off for a reader as soon as their browser
 * runs, and off the prerendered page at the next deploy.
 */
export function isOpen(opening: Opening, today: string = todayUtc()): boolean {
  const deadline = opening.deadline?.trim();
  return !deadline || !DATE.test(deadline) || deadline >= today;
}

/** The positions to list, in the file's order. */
export function openOpenings(list: Opening[] = openings, today: string = todayUtc()): Opening[] {
  return list.filter((opening) => isOpen(opening, today));
}

/**
 * Where "Apply" goes: the portal if there is one, else a mail with the
 * subject filled in, so the applications arrive with something to sort by.
 */
export function applyHref(opening: Opening): string | undefined {
  const { url, email, subject } = opening.apply ?? {};
  // A form kept under `public/` needs the deployment's base, as any file does.
  if (url?.trim()) return isExternal(url.trim()) ? url.trim() : withBase(url.trim());
  if (email?.trim()) {
    const query = subject?.trim() ? `?subject=${encodeURIComponent(subject.trim())}` : '';
    return `mailto:${email.trim()}${query}`;
  }
  return undefined;
}

/** What the build should say about the Openings page. */
export function openingsWarnings(list: Opening[] = openings, today: string = todayUtc()): string[] {
  if (!openingsPageEnabled()) return [];

  const problems: string[] = [];
  for (const opening of list) {
    const where = `openings: “${opening.title || '(no title)'}”`;
    if (!opening.title?.trim()) problems.push('openings: a position has no title.');
    if (!opening.summary?.trim()) problems.push(`${where} has no summary.`);
    if (!applyHref(opening)) {
      problems.push(`${where} has no way to apply: give \`apply\` a \`url\` or an \`email\`.`);
    }
    if (!(opening.kind in KIND_NAMES)) {
      problems.push(
        `${where} has the kind “${opening.kind}”, which is not one of ` +
          `${Object.keys(KIND_NAMES).join(', ')}; its badge says “Position”.`,
      );
    }
    const url = opening.apply?.url?.trim();
    if (url && !isExternal(url) && !url.startsWith('/')) {
      problems.push(
        `${where}: the apply link “${url}” is neither a URL nor a path of the site. ` +
          'Give it https://, or write it from the root: /openings/apply.pdf.',
      );
    }
    const deadline = opening.deadline?.trim();
    if (deadline && !validDeadline(deadline)) {
      problems.push(
        `${where}: the deadline “${deadline}” is not a date, so the position never closes. ` +
          'Write it as 2027-01-31.',
      );
    } else if (deadline && deadline < today) {
      // Said out loud because the page drops it without a trace, and the one
      // person who will not notice is the one who posted it.
      problems.push(
        `${where} closed on ${deadline} and is no longer shown. Remove it from openings.ts.`,
      );
    }
    if (opening.details && !isExternal(opening.details) && !opening.details.startsWith('/')) {
      problems.push(
        `${where}: “${opening.details}” is neither a URL nor a path of the site. ` +
          'Write it from the root: /openings/phd-2027.pdf.',
      );
    }
  }
  return problems;
}
