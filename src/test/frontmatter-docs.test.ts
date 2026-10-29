import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

/*
 * The README's "Writing a post" opens with a post's frontmatter, every field
 * of it, which is where an author looks first. These hold that list to the
 * type the build reads, so a field added to `PostFrontmatter` and not to the
 * README, or the other way round, fails here rather than going unnoticed.
 */

const types = readFileSync('src/lib/types.ts', 'utf8');
const readme = readFileSync('README.md', 'utf8');

/** The members of an interface in types.ts, by name. */
function fieldsOf(name: string): string[] {
  const body = new RegExp(`export interface ${name} \\{([\\s\\S]*?)\\n\\}`).exec(types)?.[1];
  if (!body) throw new Error(`no interface ${name} in src/lib/types.ts`);
  return [...body.matchAll(/^ {2}(\w+)\??:/gm)].map((match) => match[1]);
}

/** The frontmatter block the "Writing a post" section opens with. */
function documented(): string {
  const section = readme.slice(readme.indexOf('## Writing a post'));
  const block = /```markdown\n---\n([\s\S]*?)\n---\n/.exec(section)?.[1];
  if (!block) throw new Error('no frontmatter block under "Writing a post" in README.md');
  return block;
}

describe('the frontmatter reference in the README', () => {
  it('lists every field a post can have', () => {
    const block = documented();
    const top = new Set([...block.matchAll(/^(\w+):/gm)].map((match) => match[1]));
    const missing = fieldsOf('PostFrontmatter').filter((field) => !top.has(field));
    expect(missing, 'add these to the block under "Writing a post"').toEqual([]);
  });

  it('lists nothing a post cannot have', () => {
    const fields = new Set(fieldsOf('PostFrontmatter'));
    const block = documented();
    const extra = [...block.matchAll(/^(\w+):/gm)]
      .map((match) => match[1])
      .filter((field) => !fields.has(field));
    expect(extra).toEqual([]);
  });

  it("lists every field of a publication, and the banner's long form names all of its own", () => {
    const block = documented();
    const nested = new Set([...block.matchAll(/^ {2}(\w+):/gm)].map((match) => match[1]));
    expect(fieldsOf('Publication').filter((field) => !nested.has(field))).toEqual([]);
    const banner = /```yaml\nbanner:\n([\s\S]*?)```/.exec(readme)?.[1] ?? '';
    const written = new Set([...banner.matchAll(/^ {2}(\w+):/gm)].map((match) => match[1]));
    expect(fieldsOf('Banner').filter((field) => !written.has(field))).toEqual([]);
  });
});
