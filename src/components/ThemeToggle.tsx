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
 *
 * The tooltip goes on each state's span rather than on the button, because
 * which state shows is a CSS decision here and an attribute on the button
 * could not follow it. Only one span is ever displayed, so only one tooltip
 * can appear; each says exactly what its hidden label says, so a screen reader
 * has nothing extra to read.
 */
export function ThemeToggle() {
  const { cycle } = useTheme();

  return (
    <button type="button" className="header-icon theme-toggle" onClick={cycle}>
      <span className="theme-toggle__auto" title="Theme follows your system. Switch to light.">
        <ThemeIcon of="auto" />
        <span className="visually-hidden">Theme follows your system. Switch to light.</span>
      </span>
      <span className="theme-toggle__light" title="Theme is light. Switch to dark.">
        <ThemeIcon of="light" />
        <span className="visually-hidden">Theme is light. Switch to dark.</span>
      </span>
      <span className="theme-toggle__dark" title="Theme is dark. Follow your system instead.">
        <ThemeIcon of="dark" />
        <span className="visually-hidden">Theme is dark. Follow your system instead.</span>
      </span>
    </button>
  );
}
