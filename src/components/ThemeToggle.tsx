import { ThemeIcon } from './ThemeIcon';
import { useTheme } from './ThemeProvider';

/**
 * Three states, cycled in order. Which icon and label show is decided by CSS
 * from the `data-theme` attribute, not by React: the markup is then identical
 * on the server and on first render, and already correct before hydration.
 * Only the visible span is announced, since the others are `display: none`.
 *
 * The chip around it is the one the profile links and the author cards use.
 * This is the only control in the header that changes anything, and it used to
 * be the faintest thing in it: a 12px character in a lot of padding, inside a
 * border at 1.28:1 against the page, beside a solid black menu button.
 */
export function ThemeToggle() {
  const { cycle } = useTheme();

  return (
    <button type="button" className="icon-chip theme-toggle" onClick={cycle}>
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
