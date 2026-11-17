import type { Element } from 'hast';
import { toString } from 'hast-util-to-string';

/**
 * Numbering within sections, `numberWithin: section` in a post's frontmatter:
 * equations, figures, tables, listings, notebooks, algorithms and theorems are
 * counted afresh in each top-level section and carry its number, (2.1),
 * Figure 2.1, as LaTeX's `\numberwithin` sets them. Each numbering pass keeps
 * its own counter and asks this one at every element it walks past.
 *
 * Only on a post whose sections are numbered (`numbered: true`): a number like
 * 2.1 says "in section 2", which means something only beside a heading that
 * says "2". Whatever comes before the first section is counted plainly, 1, 2.
 */
export class SectionCounter {
  private section: string | undefined;
  private count = 0;

  constructor(private readonly bySection: boolean) {}

  /**
   * Whether `node` opens a top-level section, in which case the count starts
   * again under its number. The number is the one rehypeSectionNumbers wrote
   * into the heading, so the two always agree.
   */
  enter(node: Element): boolean {
    if (!this.bySection || node.tagName !== 'h2') return false;
    const mark = node.children.find(
      (child): child is Element =>
        child.type === 'element' &&
        Array.isArray(child.properties?.className) &&
        child.properties.className.includes('section-number'),
    );
    if (!mark) return false;
    this.section = toString(mark).trim();
    this.count = 0;
    return true;
  }

  /** The next number, "3" or "2.3". */
  next(): string {
    this.count += 1;
    return this.label(this.count);
  }

  /** The number the next call to `next` would give, without taking it. */
  peek(): string {
    return this.label(this.count + 1);
  }

  /** How many have been counted in the current section. */
  get current(): number {
    return this.count;
  }

  private label(count: number): string {
    return this.section ? `${this.section}.${count}` : String(count);
  }
}

/** A number as an id's last part: `fig-2-1` rather than `fig-2.1`, which a CSS selector would have to escape. */
export const idPart = (number: string): string => number.replace(/\./g, '-');
