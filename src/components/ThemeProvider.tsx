import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useSyncExternalStore,
} from 'react';
import type { ReactNode } from 'react';

/** What the reader picked. `system` follows the operating system. */
export type ThemeChoice = 'system' | 'light' | 'dark';
/** What that resolves to right now. */
export type Theme = 'light' | 'dark';

const ORDER: ThemeChoice[] = ['system', 'light', 'dark'];
const STORAGE_KEY = 'theme';
const DARK_QUERY = '(prefers-color-scheme: dark)';

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

/*
 * The reader's choice and the OS preference are both external state, so they
 * are read with useSyncExternalStore rather than copied into React state in an
 * effect. That also gives the prerendered markup a deterministic value to
 * hydrate against: `system` and `light`, matching what the server rendered.
 */

const listeners = new Set<() => void>();
let cachedChoice: ThemeChoice | null = null;

function readChoice(): ThemeChoice {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'light' || stored === 'dark' || stored === 'system') return stored;
  } catch {
    // Private browsing modes throw on access; fall through to the default.
  }
  return 'system';
}

function subscribeChoice(onChange: () => void): () => void {
  const invalidate = () => {
    cachedChoice = null;
    onChange();
  };
  listeners.add(invalidate);
  window.addEventListener('storage', invalidate);
  return () => {
    listeners.delete(invalidate);
    window.removeEventListener('storage', invalidate);
  };
}

function getChoice(): ThemeChoice {
  cachedChoice ??= readChoice();
  return cachedChoice;
}

function writeChoice(next: ThemeChoice): void {
  cachedChoice = next;
  try {
    localStorage.setItem(STORAGE_KEY, next);
  } catch {
    // The choice still applies for this page view.
  }
  for (const listener of [...listeners]) listener();
}

function subscribeSystem(onChange: () => void): () => void {
  const media = window.matchMedia(DARK_QUERY);
  media.addEventListener('change', onChange);
  return () => media.removeEventListener('change', onChange);
}

function getSystem(): Theme {
  return window.matchMedia(DARK_QUERY).matches ? 'dark' : 'light';
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const choice = useSyncExternalStore(subscribeChoice, getChoice, () => 'system' as ThemeChoice);
  const systemPreference = useSyncExternalStore(subscribeSystem, getSystem, () => 'light' as Theme);

  useEffect(() => {
    // `system` leaves the attribute off entirely, which is what lets the
    // stylesheet's prefers-color-scheme rules apply — to the page and to the
    // toggle's own icon.
    if (choice === 'system') delete document.documentElement.dataset.theme;
    else document.documentElement.dataset.theme = choice;
  }, [choice]);

  const setChoice = useCallback((next: ThemeChoice) => writeChoice(next), []);
  const cycle = useCallback(
    () => writeChoice(ORDER[(ORDER.indexOf(getChoice()) + 1) % ORDER.length]),
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
