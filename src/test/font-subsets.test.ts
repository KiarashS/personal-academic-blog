import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { SUBSET_RANGES, fontSubsetsFor, serifText } from '../lib/font-subsets';

describe('fontSubsetsFor', () => {
  it('asks for nothing when the text is basic Latin', () => {
    expect(fontSubsetsFor('<p>Café, naïve — “quoted” – 3 × 4</p>')).toEqual([]);
  });

  it('finds extended Latin in a name', () => {
    expect(fontSubsetsFor('<p>After Łukasiewicz and Erdős.</p>')).toEqual(['latin-ext']);
  });

  it('finds Greek typed as a word', () => {
    expect(fontSubsetsFor('<p>The α level was fixed.</p>')).toEqual(['greek']);
  });

  it('lists both, in a fixed order', () => {
    expect(fontSubsetsFor('<p>σ for Dvořák</p>')).toEqual(['latin-ext', 'greek']);
  });

  it('reads numeric entities', () => {
    expect(fontSubsetsFor('<p>&#x141;&#243;d&#378;</p>')).toEqual(['latin-ext']);
  });

  it('leaves out maths, which KaTeX sets in its own face', () => {
    const math =
      '<p>Let <span class="katex"><span class="katex-mathml"><math><mi>α</mi></math></span>' +
      '<span class="katex-html" aria-hidden="true"><span class="base"><span class="mord">α</span>' +
      '</span></span></span> vary.</p>';
    expect(fontSubsetsFor(math)).toEqual([]);
    expect(serifText(math)).toContain('vary.');
  });

  it('keeps the text after a nested span it removed', () => {
    const html = '<span class="katex"><span><span>β</span></span></span><p>Łódź</p>';
    expect(fontSubsetsFor(html)).toEqual(['latin-ext']);
  });

  it('does not take a class that merely starts with katex for maths', () => {
    expect(fontSubsetsFor('<span class="katex-like">α</span>')).toEqual(['greek']);
  });

  it('leaves out code and diagrams', () => {
    expect(fontSubsetsFor('<pre><code>let λ = 1;</code></pre><code>ł</code>')).toEqual([]);
    expect(fontSubsetsFor('<svg><text>Ω</text><g><svg><text>ş</text></svg></g></svg>')).toEqual([]);
  });
});

describe('the ranges', () => {
  // The stylesheet decides which file a character comes from and this module
  // decides which file is preloaded; if they drift, a page preloads a file it
  // never uses or misses the one it does.
  const css = readFileSync(new URL('../styles/fonts.css', import.meta.url), 'utf8');
  const declared = (subset: string): string[] => {
    const faces = css.split('@font-face').filter((face) => face.includes(`-${subset}-wght-`));
    expect(faces.length).toBe(2);
    return faces.map(
      (face) => /unicode-range:([^;]+);/.exec(face)?.[1].replace(/\s+/g, '').toUpperCase() ?? '',
    );
  };

  it.each(Object.entries(SUBSET_RANGES))('%s matches fonts.css', (subset, ranges) => {
    for (const range of declared(subset)) expect(range).toBe(ranges.toUpperCase());
  });
});
