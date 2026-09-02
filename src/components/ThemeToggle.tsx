import { useTheme } from './ThemeProvider';

/**
 * The icon is chosen by CSS rather than by React so that the markup is
 * identical on the server and on first render, and so it is already correct
 * before hydration.
 */
export function ThemeToggle() {
  const { toggle } = useTheme();

  return (
    <button type="button" className="theme-toggle" onClick={toggle} title="Switch theme">
      <span className="theme-toggle__light" aria-hidden="true">
        ☀
      </span>
      <span className="theme-toggle__dark" aria-hidden="true">
        ☾
      </span>
      <span className="visually-hidden">Switch between light and dark theme</span>
    </button>
  );
}
