import { useCallback, useState } from 'react';
import type { ReactNode } from 'react';

interface CodeBlockProps {
  language?: string;
  source: string;
  children: ReactNode;
}

export function CodeBlock({ language, source, children }: CodeBlockProps) {
  const [copied, setCopied] = useState(false);

  const copy = useCallback(() => {
    navigator.clipboard
      ?.writeText(source)
      .then(() => {
        setCopied(true);
        window.setTimeout(() => setCopied(false), 1500);
      })
      .catch(() => setCopied(false));
  }, [source]);

  return (
    <div className="code-block">
      {language ? <span className="code-block__lang" aria-hidden="true">{language}</span> : null}
      <button type="button" className="code-block__copy" onClick={copy}>
        {copied ? 'copied' : 'copy'}
        <span className="visually-hidden"> code to clipboard</span>
      </button>
      <pre>{children}</pre>
    </div>
  );
}
