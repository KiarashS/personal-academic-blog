import { toBibtex } from '../lib/bibtex';
import { canonicalUrl } from '../lib/urls';
import { CopyButton } from './CopyButton';
import type { Post } from '../lib/types';

/** BibTeX for the post itself, so nobody has to reconstruct the fields. */
export function CiteBlock({ post }: { post: Post }) {
  const bibtex = toBibtex(post, canonicalUrl(`/posts/${post.slug}`));

  return (
    <details className="cite">
      <summary>Cite this post</summary>
      <div className="code-block">
        <div className="code-block__bar">
          <CopyButton text={bibtex} label="BibTeX to clipboard" />
        </div>
        <pre tabIndex={0}>
          <code>{bibtex}</code>
        </pre>
      </div>
    </details>
  );
}
