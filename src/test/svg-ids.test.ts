import { describe, expect, it } from 'vitest';
import { reprefix, uniqueIds } from '../lib/svg-ids';

const ids = (svg: string): string[] => [...svg.matchAll(/\sid="([^"]*)"/g)].map((m) => m[1]);

describe('uniqueIds', () => {
  it('leaves a diagram whose ids are already distinct exactly as it was', () => {
    const svg =
      '<svg id="d-a-light"><g id="d-a-light-node_0"><path id="d-a-light-shape"/></g></svg>';
    expect(uniqueIds(svg, new Set())).toBe(svg);
  });

  it('numbers the repeat that Mermaid puts on a mindmap node and its path', () => {
    // The shape the failing build produced: one `node_0` on the `g`, another
    // on the `path` inside it.
    const svg =
      '<svg id="d-a-light"><g id="d-a-light-node_0"><path id="d-a-light-node_0"/></g></svg>';
    expect(ids(uniqueIds(svg, new Set()))).toEqual([
      'd-a-light',
      'd-a-light-node_0',
      'd-a-light-node_0-2',
    ]);
  });

  it('keeps the first use, so every reference in the SVG still resolves', () => {
    const svg =
      '<svg id="d-a"><marker id="d-a-arrow"/><path id="d-a-arrow" marker-end="url(#d-a-arrow)"/></svg>';
    const out = uniqueIds(svg, new Set());
    expect(out).toContain('<marker id="d-a-arrow"/>');
    expect(out).toContain('url(#d-a-arrow)');
  });

  it('carries the set across two copies of one diagram on a page', () => {
    const seen = new Set<string>();
    const svg = '<svg id="d-a"><g id="d-a-node_0"/></svg>';
    expect(ids(uniqueIds(svg, seen))).toEqual(['d-a', 'd-a-node_0']);
    expect(ids(uniqueIds(svg, seen))).toEqual(['d-a-2', 'd-a-node_0-2']);
    expect(ids(uniqueIds(svg, seen))).toEqual(['d-a-3', 'd-a-node_0-3']);
  });

  it('does not mistake another attribute ending in id for an id', () => {
    const svg = '<svg id="d-a"><g data-id="d-a" aria-describedby="d-a"/></svg>';
    expect(uniqueIds(svg, new Set())).toBe(svg);
  });

  it('survives a newline between the attributes', () => {
    const svg = '<svg id="d-a">\n<g\n  id="d-a"/></svg>';
    expect(ids(uniqueIds(svg, new Set()))).toEqual(['d-a', 'd-a-2']);
  });
});

describe('reprefix', () => {
  const svg = (id: string) =>
    `<svg id="${id}"><style>#${id} .node{fill:#eee}</style>` +
    `<marker id="${id}-arrow"/><g id="${id}-node_0" marker-end="url(#${id}-arrow)"/></svg>`;

  it('renames the root and everything Mermaid derived from it', () => {
    const out = reprefix(svg('d-abc-light'), 'v2');
    expect(out).toContain('<svg id="d-abc-light-v2">');
    expect(out).toContain('id="d-abc-light-v2-arrow"');
    expect(out).toContain('id="d-abc-light-v2-node_0"');
  });

  it('carries the style block with it, which is the part that renders', () => {
    // Renaming the root and leaving the selector behind is why a copy came out
    // as black shapes: it matched nothing and lost every fill.
    expect(reprefix(svg('d-abc-light'), 'v2')).toContain('#d-abc-light-v2 .node{fill:#eee}');
  });

  it('keeps the references inside the copy pointing at the copy', () => {
    expect(reprefix(svg('d-abc-light'), 'v2')).toContain('url(#d-abc-light-v2-arrow)');
  });

  it('namespaces the light and dark copies separately', () => {
    const out = reprefix(`${svg('d-abc-light')}${svg('d-abc-dark')}`, 'v2');
    expect(out).toContain('<svg id="d-abc-light-v2">');
    expect(out).toContain('<svg id="d-abc-dark-v2">');
    expect(out).not.toContain('d-abc-light-v2-v2');
  });

  it('leaves a fragment with no SVG in it alone', () => {
    expect(reprefix('<p>No diagram here</p>', 'v2')).toBe('<p>No diagram here</p>');
  });

  it('does not collide with the original, whatever the token', () => {
    const original = svg('d-abc-light');
    const copy = reprefix(original, 'v2');
    const ids = (s: string) => new Set([...s.matchAll(/\sid="([^"]*)"/g)].map((m) => m[1]));
    for (const id of ids(copy)) expect(ids(original).has(id)).toBe(false);
  });
});
