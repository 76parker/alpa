import { useLayoutEffect, useState } from 'react';
import { Switch } from '@patternfly/react-core';

export type AppTheme = 'light' | 'one-dark-pro';

export const themeStorageKey = 'alpa:theme';

function storedTheme(): AppTheme {
  if (typeof document !== 'undefined' && document.documentElement.dataset.alpaTheme === 'one-dark-pro') return 'one-dark-pro';
  if (typeof window === 'undefined') return 'light';
  try {
    return window.localStorage.getItem(themeStorageKey) === 'one-dark-pro' ? 'one-dark-pro' : 'light';
  } catch {
    return 'light';
  }
}

export function applyTheme(theme: AppTheme) {
  const root = document.documentElement;
  root.dataset.alpaTheme = theme;
  root.classList.toggle('pf-v6-theme-dark', theme === 'one-dark-pro');
}

export function ThemeToggle() {
  const [theme, setTheme] = useState<AppTheme>(storedTheme);

  useLayoutEffect(() => applyTheme(theme), [theme]);

  const dark = theme === 'one-dark-pro';
  return <div className="theme-toggle">
    <Switch
      id="alpa-theme-toggle"
      aria-label="Use One Dark Pro theme"
      label="One Dark Pro"
      isChecked={dark}
      onChange={(_event, checked) => {
        const next: AppTheme = checked ? 'one-dark-pro' : 'light';
        setTheme(next);
        try { window.localStorage.setItem(themeStorageKey, next); } catch { /* Theme still works for this session. */ }
      }}
    />
  </div>;
}
