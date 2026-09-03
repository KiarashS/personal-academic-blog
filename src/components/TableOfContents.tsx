import type { Heading } from '../lib/types';

/**
 * Collapsed by default: a long post's contents list would otherwise push the
 * opening paragraph off the screen. `details` needs no JavaScript, so it works
 * in the prerendered page before the bundle loads.
 */
export function TableOfContents({ headings }: { headings: Heading[] }) {
  if (headings.length === 0) return null;

  return (
    <details className="toc">
      <summary>
        Contents<span className="toc__count">{headings.length} sections</span>
      </summary>
      <nav aria-label="Contents">
        <ol>
          {headings.map((heading) => (
            <li key={heading.id} className={heading.depth === 3 ? 'toc__sub' : undefined}>
              <a href={`#${heading.id}`}>{heading.text}</a>
            </li>
          ))}
        </ol>
      </nav>
    </details>
  );
}
