import { inlineKeptWhenWide } from '../lib/contents';
import type { Heading } from '../lib/types';

/**
 * Collapsed by default: a long post's contents list would otherwise push the
 * opening paragraph off the screen. `details` needs no JavaScript, so it works
 * in the prerendered page before the bundle loads.
 *
 * It stays in the document whatever `contents.wide` says, because it is what a
 * narrow window shows and what a reader with no JavaScript gets. With the rail
 * set to replace it, CSS takes it away above 80rem and nothing else changes.
 */
export function TableOfContents({ headings }: { headings: Heading[] }) {
  if (headings.length === 0) return null;

  return (
    <details className={inlineKeptWhenWide() ? 'toc' : 'toc toc--narrow-only'}>
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
