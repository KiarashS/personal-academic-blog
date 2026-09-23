import { researchAreas } from '../content/research';
import { authors } from '../content/authors';
import { isEnabled, isExternal } from './features';
import { postsByTag } from './posts';
import type { ResearchArea } from './types';

/** Whether the page exists: the flag, and something for it to say. */
export function researchPageEnabled(areas: ResearchArea[] = researchAreas): boolean {
  // Unlike the news page, an empty list is not the same as nothing to show:
  // `research.md` carries the overview, and a page that is one paragraph about
  // what you work on is a page worth having.
  return isEnabled('research') && Array.isArray(areas);
}

/**
 * The areas in the order they are rendered: current work first, then what it
 * grew out of. Within each group the order in the file is kept, because that
 * is an editorial decision the author has already made.
 */
export function orderedAreas(areas: ResearchArea[] = researchAreas): {
  current: ResearchArea[];
  past: ResearchArea[];
} {
  return {
    current: areas.filter((area) => area.status !== 'past'),
    past: areas.filter((area) => area.status === 'past'),
  };
}

/** The people on an area, resolved against `authors.ts`; unknown ids are dropped. */
export function peopleOn(area: ResearchArea): { id: string; name: string }[] {
  return (area.people ?? [])
    .map((id) => authors[id])
    .filter((person) => person !== undefined)
    .map((person) => ({ id: person.id, name: person.name }));
}

/**
 * What the build should say about the research page.
 *
 * The same reasoning as the notice and the banner: a tag that no longer
 * matches any post, or a name that is not in `authors.ts`, renders as a link
 * to an empty page or as nothing at all, and its author is the one person who
 * will not notice — they know what it was meant to say.
 */
export function researchWarnings(areas: ResearchArea[] = researchAreas): string[] {
  if (!isEnabled('research')) return [];

  const problems: string[] = [];
  for (const area of areas) {
    const where = `research: “${area.title}”`;
    if (!area.title.trim()) problems.push('research: an area has no title.');
    if (!area.summary.trim()) problems.push(`${where} has no summary.`);

    for (const tag of area.tags ?? []) {
      if (postsByTag(tag).length === 0) {
        problems.push(`${where} names the tag “${tag}”, which no published post carries.`);
      }
    }
    for (const id of area.people ?? []) {
      if (!authors[id]) {
        problems.push(`${where} names “${id}”, who is not in src/content/authors.ts.`);
      }
    }
    for (const link of area.links ?? []) {
      if (!isExternal(link.href) && !link.href.startsWith('/')) {
        problems.push(
          `${where}: “${link.href}” is neither a URL nor a path of the site. ` +
            'Give it a scheme (https://) or write it from the root (/papers/x.pdf).',
        );
      }
    }
  }
  return problems;
}
