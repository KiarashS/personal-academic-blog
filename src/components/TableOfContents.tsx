import type { Heading } from '../lib/types';

/** Shown only when a post has enough sections to be worth jumping around. */
export function TableOfContents({ headings }: { headings: Heading[] }) {
  if (headings.length === 0) return null;

  return (
    <nav className="toc" aria-label="Contents">
      <h2 className="section-heading">Contents</h2>
      <ol>
        {headings.map((heading) => (
          <li key={heading.id} className={heading.depth === 3 ? 'toc__sub' : undefined}>
            <a href={`#${heading.id}`}>{heading.text}</a>
          </li>
        ))}
      </ol>
    </nav>
  );
}
