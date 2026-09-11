const STORAGE_KEY = 'theorema.theme';

export function initializeTheme({ document, storage, prefersDark = false }) {
  const saved = storage?.getItem(STORAGE_KEY);
  const theme = saved === 'dark' || saved === 'light' ? saved : (prefersDark ? 'dark' : 'light');
  document.documentElement.dataset.theme = theme;
  return theme;
}

export function toggleTheme({ document, storage }) {
  const theme = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
  document.documentElement.dataset.theme = theme;
  storage?.setItem(STORAGE_KEY, theme);
  return theme;
}
