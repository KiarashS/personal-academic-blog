import { authors } from '../content/authors';
import { people } from '../content/people';
import { isEnabled, isExternal } from './features';
import { profileLinksFor } from './profiles';
import type { ProfileLink } from './profiles';
import type { Author, Member, MemberRole } from './types';

/** The order the groups appear in, current members first; alumni come last. */
export const ROLE_ORDER: MemberRole[] = [
  'pi',
  'management',
  'researcher',
  'postdoc',
  'phd',
  'masters',
  'bachelors',
];

/** What each role is called: one person, and the group's heading. */
const ROLE_NAMES: Record<MemberRole, { one: string; group: string; groupOfOne?: string }> = {
  pi: {
    one: 'Principal investigator',
    group: 'Principal investigators',
    groupOfOne: 'Principal investigator',
  },
  management: { one: 'Management', group: 'Management team' },
  researcher: { one: 'Researcher', group: 'Researchers' },
  postdoc: { one: 'Postdoctoral researcher', group: 'Postdoctoral researchers' },
  phd: { one: 'PhD student', group: 'PhD students' },
  masters: { one: 'Master’s student', group: 'Master’s students' },
  bachelors: { one: 'Bachelor’s student', group: 'Bachelor’s students' },
};

export const roleName = (role: MemberRole): string => ROLE_NAMES[role]?.one ?? role;

/** The page exists when its flag is on; an empty list still says so. */
export function peoplePageEnabled(): boolean {
  return isEnabled('people');
}

/** Anyone with a `left` year is alumni, whatever their role was. */
export const isAlumnus = (member: Member): boolean => Boolean(member.left?.trim());

export interface MemberGroup {
  key: MemberRole | 'alumni';
  label: string;
  members: Member[];
}

/**
 * The page's sections: each role with anyone in it, in `ROLE_ORDER`, then the
 * alumni. Within a role the file's order stands, since who is listed first
 * among the PhD students is a decision the person keeping the file has made.
 * Alumni are newest first, by the year they left, because the list only grows
 * and the people a reader is looking for are usually the recent ones; a tie
 * keeps the file's order.
 */
export function memberGroups(members: Member[] = people): MemberGroup[] {
  const current = members.filter((member) => !isAlumnus(member));
  const groups: MemberGroup[] = ROLE_ORDER.map((role) => {
    const inRole = current.filter((member) => member.role === role);
    const names = ROLE_NAMES[role];
    return {
      key: role,
      label: inRole.length === 1 && names.groupOfOne ? names.groupOfOne : names.group,
      members: inRole,
    };
  }).filter((group) => group.members.length > 0);

  const alumni = members
    .map((member, index) => ({ member, index }))
    .filter(({ member }) => isAlumnus(member))
    .sort((a, b) => (b.member.left ?? '').localeCompare(a.member.left ?? '') || a.index - b.index)
    .map(({ member }) => member);
  if (alumni.length > 0) groups.push({ key: 'alumni', label: 'Alumni', members: alumni });

  return groups;
}

/** "7 people in the group, and 2 alumni." One former member is not "1 alumni". */
export function headcount(current: number, alumni: number): string {
  const former = alumni === 1 ? '1 former member' : `${alumni} alumni`;
  if (current === 0) return `${former[0].toUpperCase()}${former.slice(1)}.`;
  const here = `${current} ${current === 1 ? 'person' : 'people'} in the group`;
  return alumni > 0 ? `${here}, and ${former}.` : `${here}.`;
}

/**
 * Up to two letters for a card with no photo: the first and last words of the
 * name, so "Ada King Lovelace" is AL and "Hypatia" is H.
 */
export function initials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return '?';
  const first = words[0][0];
  const last = words.length > 1 ? words[words.length - 1][0] : '';
  return `${first}${last}`.toUpperCase();
}

/** "2019–2024", "Since 2023", "Until 2021", or nothing. */
export function tenure(member: Member): string {
  const joined = member.joined?.trim();
  const left = member.left?.trim();
  if (joined && left) return joined === left ? joined : `${joined}–${left}`;
  if (left) return `Until ${left}`;
  if (joined) return `Since ${joined}`;
  return '';
}

/** A member with everything their card shows filled in. */
export interface MemberCard {
  name: string;
  /** Their author page, when they have one. */
  authorId?: string;
  title: string;
  photo?: string;
  initials: string;
  pronouns?: string;
  affiliation?: string;
  bio?: string;
  interests: string[];
  links: ProfileLink[];
  alumnus: boolean;
  tenure: string;
  now?: string;
  nowUrl?: string;
  thesis?: { title: string; url?: string };
}

/**
 * The card for one member. A field written on the member wins; one left out
 * falls back to their author record, so someone who writes posts keeps one
 * photo, one bio and one set of links for both pages.
 *
 * An alumnus's title is what they were here, "PhD student", unless one was
 * written: the line under their name says where they have been, and `now`
 * says where they are.
 */
export function memberCard(member: Member): MemberCard {
  const record: Author | undefined = member.author ? authors[member.author] : undefined;
  const person: Author = {
    id: member.author ?? member.name,
    name: member.name,
    email: member.email ?? record?.email,
    cv: member.cv ?? record?.cv,
    links: { ...record?.links, ...member.links },
  };
  const interests = (member.interests ?? record?.interests ?? [])
    .map((interest) => interest.trim())
    .filter(Boolean);

  return {
    name: member.name,
    authorId: record ? record.id : undefined,
    title: member.title?.trim() || roleName(member.role),
    photo: member.photo ?? record?.avatar,
    initials: initials(member.name),
    pronouns: member.pronouns,
    affiliation: member.affiliation,
    bio: member.bio ?? record?.bio,
    interests,
    links: profileLinksFor('people', person),
    alumnus: isAlumnus(member),
    tenure: tenure(member),
    now: member.now,
    nowUrl: member.nowUrl,
    thesis: member.thesis,
  };
}

/** Every photo the page shows that lives under `public/`, for the build to size. */
export function memberPhotos(members: Member[] = people): string[] {
  if (!peoplePageEnabled()) return [];
  const photos = members
    .map((member) => memberCard(member).photo)
    .filter((photo): photo is string => Boolean(photo) && !isExternal(photo ?? ''));
  return [...new Set(photos)];
}

/**
 * What the build should say about the People page. Each of these renders as
 * something quietly wrong — a name that links nowhere, a card with no role, a
 * "now" on someone still here — and the person keeping the file is the one
 * least likely to see it, because they know what it was meant to say.
 */
export function peopleWarnings(members: Member[] = people): string[] {
  if (!peoplePageEnabled()) return [];

  const problems: string[] = [];
  for (const member of members) {
    const where = `people: “${member.name || '(no name)'}”`;
    if (!member.name?.trim()) problems.push('people: a member has no name.');
    if (!ROLE_ORDER.includes(member.role)) {
      problems.push(
        `${where} has the role “${member.role}”, which is not one of ${ROLE_ORDER.join(', ')}.`,
      );
    }
    if (member.author && !authors[member.author]) {
      problems.push(
        `${where} names the author “${member.author}”, who is not in src/content/authors.ts.`,
      );
    }
    if ((member.now || member.nowUrl) && !isAlumnus(member)) {
      problems.push(
        `${where} has \`now\` but no \`left\`, so the card shows them as a current member.`,
      );
    }
    for (const year of [member.joined, member.left]) {
      if (year && !/^\d{4}$/.test(year.trim())) {
        problems.push(`${where}: “${year}” is not a year; write it as 2024.`);
      }
    }
    if (member.photo && !isExternal(member.photo) && !member.photo.startsWith('/')) {
      problems.push(
        `${where}: the photo “${member.photo}” is neither a URL nor a path of the site. ` +
          'Write it from the root: /people/name.jpg.',
      );
    }
  }
  return problems;
}
