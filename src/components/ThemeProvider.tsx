import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';

/** What the reader picked. `system` follows the operating system. */
export type ThemeChoice = 'system' | 'light' | 'dark';
/** What that resolves to right now. */
export type Theme = 'light' | 'dark';

const ORDER: ThemeChoice[] = ['system', 'light', 'dark'];
const STORAGE_KEY = 'theme';

interface ThemeContextValue {
  choice: ThemeChoice;
  theme: Theme;
  /** Steps through system → light → dark → system. */
  cycle: () => void;
  setChoice: (choice: ThemeChoice) => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  choice: 'system',
  theme: 'light',
  cycle: () => {},
  setChoice: () => {},
});

function storedChoice(): ThemeChoice {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'light' || stored === 'dark' || stored === 'system') return stored;
  } catch {
    // Private browsing modes throw on access; fall through to the default.
  }
  return 'system';
}

function systemTheme(): Theme {
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  // Deliberately deterministic: pages are prerendered, so the first client
  // render has to match the server's. The real choice is adopted on mount, and
  // the inline script in index.html has already painted the right colours.
  const [choice, setChoiceState] = useState<ThemeChoice>('system');
  const [systemPreference, setSystemPreference] = useState<Theme>('light');
  const [adopted, setAdopted] = useState(false);

  useEffect(() => {
    setChoiceState(storedChoice());
    setSystemPreference(systemTheme());
    setAdopted(true);
  }, []);

  // Watched regardless of the current choice, so switching back to `system`
  // does not need a page load to catch up with the OS.
  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = (event: MediaQueryListEvent) =>
      setSystemPreference(event.matches ? 'dark' : 'light');
    media.addEventListener('change', onChange);
    return () => media.removeEventListener('change', onChange);
  }, []);

  useEffect(() => {
    if (!adopted) return;

    // `system` leaves the attribute off entirely, which is what lets the
    // stylesheet's prefers-color-scheme rules apply — to the page and to the
    // toggle's own icon.
    if (choice === 'system') delete document.documentElement.dataset.theme;
    else document.documentElement.dataset.theme = choice;

    try {
      localStorage.setItem(STORAGE_KEY, choice);
    } catch {
      // The choice still applies for this page view.
    }
  }, [choice, adopted]);

  const setChoice = useCallback((next: ThemeChoice) => setChoiceState(next), []);
  const cycle = useCallback(
    () => setChoiceState((current) => ORDER[(ORDER.indexOf(current) + 1) % ORDER.length]),
    [],
  );

  const theme: Theme = choice === 'system' ? systemPreference : choice;
  const value = useMemo(
    () => ({ choice, theme, cycle, setChoice }),
    [choice, theme, cycle, setChoice],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  return useContext(ThemeContext);
}
