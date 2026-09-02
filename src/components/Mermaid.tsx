import { useEffect, useId, useRef, useState } from 'react';
import { useTheme } from './ThemeProvider';

interface MermaidProps {
  chart: string;
}

/**
 * Mermaid is ~500 kB, so it is imported only when a post actually contains a
 * diagram, and re-rendered when the reader flips the theme.
 */
export function Mermaid({ chart }: MermaidProps) {
  const { theme } = useTheme();
  const reactId = useId();
  const containerRef = useRef<HTMLElement>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const graphId = `mermaid-${reactId.replace(/[^a-zA-Z0-9]/g, '')}`;

    (async () => {
      try {
        const { default: mermaid } = await import('mermaid');
        mermaid.initialize({
          startOnLoad: false,
          securityLevel: 'strict',
          suppressErrorRendering: true,
          theme: theme === 'dark' ? 'dark' : 'neutral',
          fontFamily: 'var(--sans)',
        });
        const { svg } = await mermaid.render(graphId, chart);
        if (cancelled || !containerRef.current) return;
        containerRef.current.innerHTML = svg;
        setError(null);
      } catch (cause) {
        if (cancelled) return;
        if (containerRef.current) containerRef.current.innerHTML = '';
        setError(cause instanceof Error ? cause.message : String(cause));
      }
    })();

    return () => {
      cancelled = true;
      document.getElementById(`d${graphId}`)?.remove();
    };
  }, [chart, theme, reactId]);

  if (error) {
    return (
      <div className="mermaid-error" role="note">
        <strong>Diagram could not be rendered.</strong>
        <pre>{error}</pre>
        <pre>{chart}</pre>
      </div>
    );
  }

  return <figure className="mermaid-figure" ref={containerRef} aria-label="Diagram" />;
}
