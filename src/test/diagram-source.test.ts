import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
// A plain script module, imported here so its one piece of string handling is
// covered by the suite the rest of the site uses. Types in the `.d.mts` beside it.
import {
  DIAGRAM_THEMES,
  MERMAID_THEMES,
  withoutPinnedTheme as strip,
} from '../../scripts/diagram-source.mjs';

describe('withoutPinnedTheme', () => {
  it('leaves a diagram with no frontmatter exactly as it was', () => {
    const source = 'sequenceDiagram\n    a->>b: hello';
    expect(strip(source)).toEqual({ source, theme: undefined });
  });

  it('leaves frontmatter that pins no theme alone', () => {
    const source = '---\ntitle: A chart\nconfig:\n  look: neo\n---\nflowchart TD\n  a-->b';
    expect(strip(source)).toEqual({ source, theme: undefined });
  });

  it('takes the theme out and reports it', () => {
    const out = strip('---\nconfig:\n  theme: neo\n  look: neo\n---\nsequenceDiagram\n  a->>b: hi');
    expect(out.theme).toBe('neo');
    expect(out.source).toBe('---\nconfig:\n  look: neo\n---\nsequenceDiagram\n  a->>b: hi');
  });

  it('keeps the rest of the frontmatter, including the title', () => {
    const out = strip(
      "---\ntitle: Tenses\nconfig:\n    theme: 'default'\n    layout: elk\n---\nmindmap\n  root",
    );
    expect(out.theme).toBe('default');
    expect(out.source).toContain('title: Tenses');
    expect(out.source).toContain('layout: elk');
    expect(out.source).not.toContain('theme:');
  });

  it('drops a config block that has nothing left in it', () => {
    const out = strip('---\nconfig:\n  theme: forest\n---\nflowchart TD\n  a-->b');
    expect(out.source).toBe('flowchart TD\n  a-->b');
  });

  it('keeps a config block that still has something in it', () => {
    const out = strip('---\nconfig:\n  theme: forest\n  layout: elk\n---\nflowchart TD\n  a-->b');
    expect(out.source).toBe('---\nconfig:\n  layout: elk\n---\nflowchart TD\n  a-->b');
  });

  it('leaves a top-level theme alone, which is not where mermaid reads one', () => {
    const source = '---\ntheme: forest\n---\nflowchart TD\n  a-->b';
    expect(strip(source)).toEqual({ source, theme: undefined });
  });

  it('does not touch the word theme inside the diagram itself', () => {
    const source = 'flowchart TD\n  a["theme: neo"]-->b';
    expect(strip(source)).toEqual({ source, theme: undefined });
  });

  it('unquotes the theme it reports', () => {
    expect(strip('---\nconfig:\n  theme: "dark"\n---\ngraph TD\n a-->b').theme).toBe('dark');
    expect(strip("---\nconfig:\n  theme: 'dark'\n---\ngraph TD\n a-->b").theme).toBe('dark');
  });
});

describe('MERMAID_THEMES', () => {
  /*
   * Read off mermaid rather than written down here. A hand-kept list went
   * stale across an upgrade and the build told an author that `neo`, a real
   * theme, was not one — so the list is now checked against the package that
   * decides.
   */
  const declared = () => {
    const types = readFileSync('node_modules/mermaid/dist/config.type.d.ts', 'utf8');
    const union = /^\s*theme\?:\s*([^;]+);/m.exec(types);
    if (!union) throw new Error('mermaid no longer declares `theme` as a union of names');
    return [...union[1].matchAll(/'([^']+)'/g)].map((m) => m[1]).filter((name) => name !== 'null');
  };

  it('is every theme mermaid declares', () => {
    expect([...MERMAID_THEMES].sort()).toEqual(declared().sort());
  });

  it('does not include a look', () => {
    expect(MERMAID_THEMES).not.toContain('handDrawn');
    expect(MERMAID_THEMES).not.toContain('classic');
  });
});

describe('DIAGRAM_THEMES', () => {
  it('draws each page theme in a theme mermaid has', () => {
    expect(MERMAID_THEMES).toContain(DIAGRAM_THEMES.light);
    expect(MERMAID_THEMES).toContain(DIAGRAM_THEMES.dark);
  });

  it('draws the two page themes differently', () => {
    expect(DIAGRAM_THEMES.light).not.toBe(DIAGRAM_THEMES.dark);
  });
});
