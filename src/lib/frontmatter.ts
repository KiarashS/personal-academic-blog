import { load, JSON_SCHEMA } from 'js-yaml';

const FRONTMATTER = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/;

export interface ParsedFile<T> {
  data: Partial<T>;
  content: string;
}

/**
 * Splits a markdown file into its YAML frontmatter block and body.
 *
 * The JSON schema is used on purpose: it leaves `date: 2024-03-01` as the
 * string it looks like instead of turning it into a Date in the local
 * timezone, which is how off-by-one-day post dates happen.
 */
export function parseFrontmatter<T>(raw: string): ParsedFile<T> {
  const text = raw.replace(/^﻿/, '');
  const match = FRONTMATTER.exec(text);
  if (!match) return { data: {}, content: text.trim() };

  const parsed = load(match[1], { schema: JSON_SCHEMA });
  const data =
    parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? (parsed as Partial<T>) : {};

  return { data, content: text.slice(match[0].length).trim() };
}
