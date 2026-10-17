/**
 * Colour theme preference, chosen in Settings (dark by default). Shared by the layout and
 * the Settings page; remembered per browser. Storage failures (private mode) keep dark.
 *
 * State and change notification live on `window` (not in module scope), so every copy of
 * this module — e.g. after a hot reload during development — sees the same value.
 */
import { useSyncExternalStore } from 'react';

export type ThemeMode = 'dark' | 'light';

const KEY = 'pavement-pinn.theme';
const EVENT = 'pavement-pinn:theme';
export const DEFAULT_THEME: ThemeMode = 'dark';

type ThemeWindow = Window & { __pavementPinnTheme?: ThemeMode };

function read(): ThemeMode {
  if (typeof window === 'undefined') return DEFAULT_THEME;
  const w = window as ThemeWindow;
  if (!w.__pavementPinnTheme) {
    try {
      w.__pavementPinnTheme = localStorage.getItem(KEY) === 'light' ? 'light' : DEFAULT_THEME;
    } catch {
      w.__pavementPinnTheme = DEFAULT_THEME;
    }
  }
  return w.__pavementPinnTheme;
}

export function setThemePreference(mode: ThemeMode): void {
  (window as ThemeWindow).__pavementPinnTheme = mode;
  try {
    localStorage.setItem(KEY, mode);
  } catch {
    // Not persisted; the choice still applies for this session.
  }
  window.dispatchEvent(new Event(EVENT));
}

function subscribe(onChange: () => void): () => void {
  window.addEventListener(EVENT, onChange);
  return () => window.removeEventListener(EVENT, onChange);
}

export function useThemePreference(): [ThemeMode, (mode: ThemeMode) => void] {
  const mode = useSyncExternalStore(subscribe, read, () => DEFAULT_THEME);
  return [mode, setThemePreference];
}
