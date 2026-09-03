import { useCallback, useState } from 'react';

interface CopyButtonProps {
  text: string;
  label?: string;
  className?: string;
}

/** Copies `text` and says so briefly. Used for BibTeX blocks. */
export function CopyButton({ text, label = 'to clipboard', className }: CopyButtonProps) {
  const [copied, setCopied] = useState(false);

  const copy = useCallback(() => {
    navigator.clipboard?.writeText(text).then(
      () => {
        setCopied(true);
        window.setTimeout(() => setCopied(false), 1500);
      },
      () => setCopied(false),
    );
  }, [text]);

  return (
    <button
      type="button"
      className={`code-block__copy code-block__copy--static${className ? ` ${className}` : ''}`}
      onClick={copy}
    >
      {copied ? 'copied' : 'copy'}
      <span className="visually-hidden"> {label}</span>
    </button>
  );
}
