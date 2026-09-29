import { afterEach, describe, expect, it } from 'vitest';
import {
  initials,
  memberCard,
  memberGroups,
  memberPhotos,
  peopleWarnings,
  tenure,
} from '../lib/people';
import { siteConfig } from '../site.config';
import type { Member } from '../lib/types';

const enabled = { ...siteConfig.features };
afterEach(() => {
  Object.assign(siteConfig.features, enabled);
});

const members: Member[] = [
  { name: 'Ada Student', role: 'phd' },
  { name: 'Lee Lead', role: 'pi' },
  { name: 'Old One', role: 'masters', joined: '2015', left: '2017' },
  { name: 'Bo Student', role: 'phd' },
  { name: 'Recent One', role: 'phd', joined: '2019', left: '2024', now: 'Somewhere' },
  { name: 'Also Recent', role: 'postdoc', left: '2024' },
];

describe('memberGroups', () => {
  it('orders the roles, drops the empty ones and puts alumni last', () => {
    expect(memberGroups(members).map((group) => group.key)).toEqual(['pi', 'phd', 'alumni']);
  });

  it('keeps the file order within a role', () => {
    const phd = memberGroups(members).find((group) => group.key === 'phd');
    expect(phd?.members.map((member) => member.name)).toEqual(['Ada Student', 'Bo Student']);
  });

  it('lists alumni newest first, a tie in the file order', () => {
    const alumni = memberGroups(members).find((group) => group.key === 'alumni');
    expect(alumni?.members.map((member) => member.name)).toEqual([
      'Recent One',
      'Also Recent',
      'Old One',
    ]);
  });

  it('calls one PI by the singular, two by the plural', () => {
    expect(memberGroups(members)[0].label).toBe('Principal investigator');
    const two = [...members, { name: 'Second Lead', role: 'pi' as const }];
    expect(memberGroups(two)[0].label).toBe('Principal investigators');
  });

  it('is empty for nobody', () => {
    expect(memberGroups([])).toEqual([]);
  });
});

describe('initials', () => {
  it('takes the first and last words', () => {
    expect(initials('Ada King Lovelace')).toBe('AL');
    expect(initials('hypatia')).toBe('H');
    expect(initials('  ')).toBe('?');
  });
});

describe('tenure', () => {
  it('says what is known', () => {
    expect(tenure({ name: 'a', role: 'phd', joined: '2019', left: '2024' })).toBe('2019–2024');
    expect(tenure({ name: 'a', role: 'phd', joined: '2023' })).toBe('Since 2023');
    expect(tenure({ name: 'a', role: 'phd', left: '2021' })).toBe('Until 2021');
    expect(tenure({ name: 'a', role: 'phd', joined: '2022', left: '2022' })).toBe('2022');
    expect(tenure({ name: 'a', role: 'phd' })).toBe('');
  });
});

describe('memberCard', () => {
  it('falls back to the author record for what the member leaves out', () => {
    const card = memberCard({ name: 'Co-author Name', role: 'researcher', author: 'coauthor' });
    expect(card.authorId).toBe('coauthor');
    expect(card.bio).toMatch(/several authors/);
    expect(card.interests).toEqual(['First subject', 'Second subject']);
  });

  it('prefers what is written on the member', () => {
    const card = memberCard({
      name: 'Co-author Name',
      role: 'researcher',
      author: 'coauthor',
      bio: 'Own bio.',
      interests: [' One ', ''],
    });
    expect(card.bio).toBe('Own bio.');
    expect(card.interests).toEqual(['One']);
  });

  it('titles a member by role unless a title is given', () => {
    expect(memberCard({ name: 'a', role: 'postdoc' }).title).toBe('Postdoctoral researcher');
    expect(memberCard({ name: 'a', role: 'postdoc', title: 'Fellow' }).title).toBe('Fellow');
  });

  it('marks alumni and links nobody without an author record', () => {
    const card = memberCard({ name: 'Old One', role: 'masters', left: '2017' });
    expect(card.alumnus).toBe(true);
    expect(card.authorId).toBeUndefined();
  });
});

describe('memberPhotos', () => {
  it('lists local photos once, and nothing with the page off', () => {
    const list: Member[] = [
      { name: 'a', role: 'phd', photo: '/people/a.jpg' },
      { name: 'b', role: 'phd', photo: '/people/a.jpg' },
      { name: 'c', role: 'phd', photo: 'https://example.org/c.jpg' },
      { name: 'd', role: 'phd' },
    ];
    siteConfig.features.people = false;
    expect(memberPhotos(list)).toEqual([]);
    siteConfig.features.people = true;
    expect(memberPhotos(list)).toEqual(['/people/a.jpg']);
  });
});

describe('peopleWarnings', () => {
  it('says nothing with the page off', () => {
    siteConfig.features.people = false;
    expect(peopleWarnings([{ name: '', role: 'phd' }])).toEqual([]);
  });

  it('names each problem', () => {
    siteConfig.features.people = true;
    const warnings = peopleWarnings([
      { name: '', role: 'phd' },
      { name: 'Wrong Role', role: 'professor' as Member['role'] },
      { name: 'No Author', role: 'phd', author: 'nobody' },
      { name: 'Still Here', role: 'phd', now: 'Elsewhere' },
      { name: 'Bad Year', role: 'phd', joined: 'Fall 2020' },
      { name: 'Bad Photo', role: 'phd', photo: 'people/x.jpg' },
    ]);
    expect(warnings).toHaveLength(6);
    expect(warnings[0]).toMatch(/has no name/);
    expect(warnings[1]).toMatch(/professor/);
    expect(warnings[2]).toMatch(/nobody/);
    expect(warnings[3]).toMatch(/no `left`/);
    expect(warnings[4]).toMatch(/Fall 2020/);
    expect(warnings[5]).toMatch(/people\/x\.jpg/);
  });

  it('passes the placeholder file', () => {
    siteConfig.features.people = true;
    expect(peopleWarnings()).toEqual([]);
  });
});
