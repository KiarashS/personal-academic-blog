import { describe, expect, it } from 'vitest';
import { uniqueIds } from '../../plugins/mermaid';

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
