import { citations } from '../lib/citations';
import { canonicalUrl } from '../lib/urls';
import { siteConfig } from '../site.config';
import { CopyButton } from './CopyButton';
import type { Post } from '../lib/types';

/**
 * How to cite the post, in the four forms a reader is likely to want, each
 * with its own copy button. All four are rendered rather than switched between
 * with tabs: the block is collapsed until someone opens it, and a tab strip
 * would need JavaScript to do what four labelled paragraphs already do.
 */
export function CiteBlock({ post }: { post: Post }) {
  const url = canonicalUrl(`/posts/${post.slug}`);

  return (
    <details className="cite">
      <summary>Cite this post</summary>
      {citations(post, url, siteConfig.title).map((citation) => (
        <div className={`cite__format cite__format--${citation.id}`} key={citation.id}>
          <div className="code-block__bar">
            <span className="code-block__lang">{citation.label}</span>
            <CopyButton text={citation.text} label={`the ${citation.label} citation`} />
          </div>
          <pre className="cite__text" tabIndex={0}>
            <code>{citation.text}</code>
          </pre>
        </div>
      ))}
    </details>
  );
}
