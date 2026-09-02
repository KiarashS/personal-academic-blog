import { describe, expect, it } from 'vitest';
import { parseFrontmatter } from '../lib/frontmatter';

describe('parseFrontmatter', () => {
  it('splits frontmatter from body', () => {
    const { data, content } = parseFrontmatter<{ title: string; tags: string[] }>(
      '---\ntitle: A post\ntags: [one, two]\n---\n\nBody text.\n',
    );
    expect(data.title).toBe('A post');
    expect(data.tags).toEqual(['one', 'two']);
    expect(content).toBe('Body text.');
  });

  it('keeps dates as written instead of localising them', () => {
    const { data } = parseFrontmatter<{ date: string }>('---\ndate: 2026-03-01\n---\nx');
    expect(data.date).toBe('2026-03-01');
  });

  it('returns the whole file when there is no frontmatter', () => {
    const { data, content } = parseFrontmatter('# Title\n\ntext');
    expect(data).toEqual({});
    expect(content).toBe('# Title\n\ntext');
  });

  it('handles CRLF line endings and a BOM', () => {
    const { data, content } = parseFrontmatter<{ title: string }>(
      '﻿---\r\ntitle: Windows\r\n---\r\nbody\r\n',
    );
    expect(data.title).toBe('Windows');
    expect(content).toBe('body');
  });

  it('ignores a --- rule that is not at the start of the file', () => {
    const { data, content } = parseFrontmatter('intro\n\n---\ntitle: no\n---\n');
    expect(data).toEqual({});
    expect(content.startsWith('intro')).toBe(true);
  });
});
