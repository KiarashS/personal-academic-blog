import { useTheme } from './ThemeProvider';

/**
 * Three states, cycled in order. Which icon and label show is decided by CSS
 * from the `data-theme` attribute, not by React: the markup is then identical
 * on the server and on first render, and already correct before hydration.
 * Only the visible span is announced, since the others are `display: none`.
 */
export function ThemeToggle() {
  const { cycle } = useTheme();

  return (
    <button type="button" className="theme-toggle" onClick={cycle}>
      <span className="theme-toggle__auto">
        <span aria-hidden="true">◐</span>
        <span className="visually-hidden">Theme follows your system. Switch to light.</span>
      </span>
      <span className="theme-toggle__light">
        <span aria-hidden="true">☀</span>
        <span className="visually-hidden">Theme is light. Switch to dark.</span>
      </span>
      <span className="theme-toggle__dark">
        <span aria-hidden="true">☾</span>
        <span className="visually-hidden">Theme is dark. Follow your system instead.</span>
      </span>
    </button>
  );
}
