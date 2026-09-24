import { describe, expect, it } from 'vitest';
// A plain script module, imported here so its one piece of string handling is
// covered by the suite the rest of the site uses. Types in the `.d.mts` beside it.
import { MERMAID_THEMES, withoutPinnedTheme as strip } from '../../scripts/diagram-source.mjs';

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
  it('is the set a warning can name, and does not include the looks', () => {
    expect(MERMAID_THEMES).toEqual(['base', 'dark', 'default', 'forest', 'neutral']);
    expect(MERMAID_THEMES).not.toContain('neo');
  });
});
