import { useLayoutEffect, useState } from 'react';

export type Theme = 'light' | 'dark';
export const THEME_KEY = 'classcode.theme.v1';

export function useTheme() {
  const [theme, setTheme] = useState<Theme>(() => {
    try {
      const saved = localStorage.getItem(THEME_KEY);
      if (saved === 'light' || saved === 'dark') return saved;
    } catch {
      /* A theme switch also works without storage. */
    }
    return 'dark';
  });
  useLayoutEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme = theme;
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute('content', theme === 'dark' ? '#101321' : '#f7f8fc');
    try {
      localStorage.setItem(THEME_KEY, theme);
    } catch {
      /* Keep the in-memory preference. */
    }
  }, [theme]);
  return { theme, toggleTheme: () => setTheme((t) => (t === 'dark' ? 'light' : 'dark')) };
}
