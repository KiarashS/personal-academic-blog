import { useTheme } from './ThemeProvider';

export function ThemeToggle() {
  const { theme, toggle } = useTheme();
  const next = theme === 'dark' ? 'light' : 'dark';

  return (
    <button type="button" className="theme-toggle" onClick={toggle} title={`Switch to ${next} theme`}>
      <span aria-hidden="true">{theme === 'dark' ? '☾' : '☀'}</span>
      <span className="visually-hidden"> Switch to {next} theme</span>
    </button>
  );
}
