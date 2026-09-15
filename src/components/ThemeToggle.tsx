import { ThemeIcon } from './ThemeIcon';
import { useTheme } from './ThemeProvider';

/**
 * Three states, cycled in order. Which icon and label show is decided by CSS
 * from the `data-theme` attribute, not by React: the markup is then identical
 * on the server and on first render, and already correct before hydration.
 * Only the visible span is announced, since the others are `display: none`.
 *
 * No box around it. It sits in a row of words, where a border would make it
 * the loudest thing in the line; what it needed was not an edge but a mark
 * worth looking at and a target worth aiming at, and it has both now.
 */
export function ThemeToggle() {
  const { cycle } = useTheme();

  return (
    <button type="button" className="header-icon theme-toggle" onClick={cycle}>
      <span className="theme-toggle__auto">
        <ThemeIcon of="auto" />
        <span className="visually-hidden">Theme follows your system. Switch to light.</span>
      </span>
      <span className="theme-toggle__light">
        <ThemeIcon of="light" />
        <span className="visually-hidden">Theme is light. Switch to dark.</span>
      </span>
      <span className="theme-toggle__dark">
        <ThemeIcon of="dark" />
        <span className="visually-hidden">Theme is dark. Follow your system instead.</span>
      </span>
    </button>
  );
}
