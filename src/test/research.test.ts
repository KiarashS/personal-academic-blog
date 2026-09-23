import { describe, expect, it } from 'vitest';
import { orderedAreas, peopleOn, researchWarnings } from '../lib/research';
import { siteConfig } from '../site.config';
import { authors } from '../content/authors';
import { researchAreas } from '../content/research';
import { allRoutes, metaFor } from '../lib/route-meta';
import { navFor } from '../lib/features';
import type { ResearchArea } from '../lib/types';

const area = (overrides: Partial<ResearchArea> = {}): ResearchArea => ({
  title: 'Segmentation under shift',
  summary: 'What happens to a model when the scanner changes.',
  ...overrides,
});

describe('orderedAreas', () => {
  it('puts current work first and keeps the order the file gives', () => {
    const areas = [
      area({ title: 'one' }),
      area({ title: 'old', status: 'past' }),
      area({ title: 'two', status: 'current' }),
    ];
    const { current, past } = orderedAreas(areas);
    expect(current.map((a) => a.title)).toEqual(['one', 'two']);
    expect(past.map((a) => a.title)).toEqual(['old']);
  });

  it('treats an area with no status as current, which is what most are', () => {
    expect(orderedAreas([area()]).current).toHaveLength(1);
  });
});

describe('peopleOn', () => {
  it('resolves ids against the author records', () => {
    const [first] = Object.values(authors);
    expect(peopleOn(area({ people: [first.id] }))).toEqual([{ id: first.id, name: first.name }]);
  });

  it('drops a name nobody has a record for, rather than rendering a blank', () => {
    expect(peopleOn(area({ people: ['nobody'] }))).toEqual([]);
    expect(peopleOn(area())).toEqual([]);
  });
});

describe('researchWarnings', () => {
  const enabled = { ...siteConfig.features };

  it('says nothing while the feature is off, since no page is written', () => {
    if (siteConfig.features.research) return;
    expect(researchWarnings([area({ tags: ['not-a-tag'] })])).toEqual([]);
  });

  it('catches an area with nothing to say', () => {
    siteConfig.features.research = true;
    try {
      expect(researchWarnings([area({ summary: '  ' })])[0]).toContain('no summary');
      expect(researchWarnings([area({ title: '' })])[0]).toContain('no title');
    } finally {
      Object.assign(siteConfig.features, enabled);
    }
  });

  it('catches a tag no post carries, a person who is not an author, and a bad link', () => {
    siteConfig.features.research = true;
    try {
      const problems = researchWarnings([
        area({
          tags: ['definitely-not-a-tag'],
          people: ['nobody'],
          links: [{ label: 'Paper', href: 'papers/x.pdf' }],
        }),
      ]);
      expect(problems).toHaveLength(3);
      expect(problems.join(' ')).toContain('definitely-not-a-tag');
      expect(problems.join(' ')).toContain('nobody');
      expect(problems.join(' ')).toContain('papers/x.pdf');
    } finally {
      Object.assign(siteConfig.features, enabled);
    }
  });

  it('accepts a path of the site and a URL alike', () => {
    siteConfig.features.research = true;
    try {
      expect(
        researchWarnings([
          area({
            links: [
              { label: 'Paper', href: '/papers/x.pdf' },
              { label: 'Code', href: 'https://github.com/example/repo' },
            ],
          }),
        ]),
      ).toEqual([]);
    } finally {
      Object.assign(siteConfig.features, enabled);
    }
  });

  it('has nothing to say about the areas that ship', () => {
    siteConfig.features.research = true;
    try {
      expect(researchWarnings(researchAreas)).toEqual([]);
    } finally {
      Object.assign(siteConfig.features, enabled);
    }
  });
});

describe('the route', () => {
  it('exists, is titled and is in the nav exactly when the flag says so', () => {
    const on = siteConfig.features.research;
    expect(allRoutes().includes('/research')).toBe(on);
    expect(navFor('header').some((item) => item.to === '/research')).toBe(on);
    expect(metaFor('/research').title).toBe(
      on ? `Research — ${siteConfig.title}` : `Not found — ${siteConfig.title}`,
    );
  });
});
