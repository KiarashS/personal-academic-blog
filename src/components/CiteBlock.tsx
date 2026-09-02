import { useCallback, useState } from 'react';
import { toBibtex } from '../lib/bibtex';
import { canonicalUrl } from '../lib/urls';
import type { Post } from '../lib/types';

/** BibTeX for the post itself, so nobody has to reconstruct the fields. */
export function CiteBlock({ post }: { post: Post }) {
  const [copied, setCopied] = useState(false);
  const bibtex = toBibtex(post, canonicalUrl(`/posts/${post.slug}`));

  const copy = useCallback(() => {
    navigator.clipboard?.writeText(bibtex).then(
      () => {
        setCopied(true);
        window.setTimeout(() => setCopied(false), 1500);
      },
      () => setCopied(false),
    );
  }, [bibtex]);

  return (
    <details className="cite">
      <summary>Cite this post</summary>
      <div className="code-block">
        <button type="button" className="code-block__copy code-block__copy--static" onClick={copy}>
          {copied ? 'copied' : 'copy'}
          <span className="visually-hidden"> BibTeX to clipboard</span>
        </button>
        <pre>
          <code>{bibtex}</code>
        </pre>
      </div>
    </details>
  );
}
