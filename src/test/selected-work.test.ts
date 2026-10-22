import { describe, expect, it } from 'vitest';
import type { BibEntry } from '../lib/bib-parse';
import { selectedField } from '../lib/publication-media';
import { selectedWork, selectedWorkWarnings } from '../lib/selected-work';
import type { SelectedWorkConfig } from '../site.config';

const entry = (key: string, year: string, extra: Partial<BibEntry> = {}): BibEntry => ({
  key,
  type: 'article',
  fields: { title: `Title ${key}`, journal: 'Journal', year, doi: `10.1/${key}` },
  ...extra,
});

const entries: BibEntry[] = [
  entry('old', '2015', { selected: true }),
  entry('new', '2023', { selected: true }),
  entry('plain', '2020'),
  entry('middle', '2019', { selected: true }),
];

const config: SelectedWorkConfig = {
  enabled: true,
  title: 'Selected work',
  count: 4,
  keys: [],
  allLabel: 'All publications',
};

describe('selectedWork', () => {
  it('takes the entries marked selected, newest first', () => {
    expect(selectedWork(entries, config).map((card) => card.key)).toEqual(['new', 'middle', 'old']);
  });

  it('takes the keys it is given instead, in their order, selected or not', () => {
    const keys = ['plain', 'old'];
    expect(selectedWork(entries, { ...config, keys }).map((card) => card.key)).toEqual(keys);
  });

  it('shows at most count, and nothing when off', () => {
    expect(selectedWork(entries, { ...config, count: 2 })).toHaveLength(2);
    expect(selectedWork(entries, { ...config, enabled: false })).toEqual([]);
    expect(selectedWork(entries, { ...config, count: 0 })).toEqual([]);
  });

  it('gives each card its title, venue, year and paper', () => {
    expect(selectedWork(entries, config)[0]).toEqual({
      key: 'new',
      title: 'Title new',
      venue: 'Journal',
      year: 2023,
      url: 'https://doi.org/10.1/new',
    });
  });
});

describe('selectedWorkWarnings', () => {
  it('names a key that is not in the file, and an empty row', () => {
    expect(selectedWorkWarnings(entries, { ...config, keys: ['nope'] })).toEqual([
      'home.selectedWork.keys names "nope", which is not in src/content/publications.bib.',
      expect.stringContaining('has nothing to show'),
    ]);
    expect(selectedWorkWarnings([entry('plain', '2020')], config)[0]).toContain(
      'selected = {true}',
    );
  });

  it('says nothing when all is well or the row is off', () => {
    expect(selectedWorkWarnings(entries, config)).toEqual([]);
    expect(selectedWorkWarnings([], { ...config, enabled: false })).toEqual([]);
  });
});

describe('selectedField', () => {
  it('reads the yes and no BibTeX has to spell out', () => {
    for (const yes of ['true', 'Yes', '1', ' TRUE '])
      expect(selectedField('k', yes).selected).toBe(true);
    for (const no of ['false', 'no', '0', '']) expect(selectedField('k', no).selected).toBe(false);
    expect(selectedField('k', undefined)).toEqual({ selected: false });
  });

  it('reports anything else and reads it as no', () => {
    const { selected, problem } = selectedField('k', 'maybe');
    expect(selected).toBe(false);
    expect(problem).toContain('selected = {maybe} is not true or false');
  });
});
