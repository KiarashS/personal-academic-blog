/**
 * Reduces markdown to prose for search indexing, reading time and excerpts.
 * Deliberately crude: it drops the constructs that would otherwise pollute a
 * search index (code, math, URLs) rather than trying to be a parser.
 */
export function toPlainText(markdown: string): string {
  return markdown
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/~~~[\s\S]*?~~~/g, ' ')
    .replace(/\$\$[\s\S]*?\$\$/g, ' ')
    .replace(/\$[^$\n]+\$/g, ' ')
    .replace(/`[^`]*`/g, ' ')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/<[^>]+>/g, ' ')
    .replace(/^\s{0,3}#{1,6}\s+/gm, '')
    .replace(/^\s{0,3}>\s?/gm, '')
    .replace(/^\s{0,3}([-*+]|\d+\.)\s+/gm, '')
    .replace(/[*_~]{1,3}/g, '')
    .replace(/\|/g, ' ')
    .replace(/^\s*[-:]{3,}\s*$/gm, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const WORDS_PER_MINUTE = 220;

export function readingMinutes(plainText: string): number {
  const words = plainText ? plainText.split(/\s+/).length : 0;
  return Math.max(1, Math.round(words / WORDS_PER_MINUTE));
}

export function excerpt(plainText: string, maxChars = 220): string {
  if (plainText.length <= maxChars) return plainText;
  const cut = plainText.slice(0, maxChars);
  const lastSpace = cut.lastIndexOf(' ');
  return `${cut.slice(0, lastSpace > 0 ? lastSpace : maxChars).trimEnd()}…`;
}
