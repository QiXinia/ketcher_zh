export type KetcherThemeName = 'light' | 'dark';

const THEME_STORAGE_KEY = 'ketcher-theme';
const THEME_QUERY_PARAM = 'theme';
const THEME_MESSAGE_EVENT = 'theme:change';

type ThemeMessage = {
  eventType?: unknown;
  data?: unknown;
};

type ThemePayload = {
  theme?: unknown;
};

const isKetcherTheme = (theme: unknown): theme is KetcherThemeName =>
  theme === 'light' || theme === 'dark';

const getThemePayload = (message: ThemeMessage): ThemePayload | undefined => {
  if (!message.data || typeof message.data !== 'object') return undefined;

  return message.data as ThemePayload;
};

const getThemeFromQuery = (): KetcherThemeName | null => {
  const theme = new URLSearchParams(window.location.search).get(
    THEME_QUERY_PARAM,
  );

  return isKetcherTheme(theme) ? theme : null;
};

const getStoredTheme = (): KetcherThemeName | null => {
  try {
    const theme = window.localStorage.getItem(THEME_STORAGE_KEY);

    return isKetcherTheme(theme) ? theme : null;
  } catch {
    return null;
  }
};

const getSystemTheme = (): KetcherThemeName =>
  window.matchMedia?.('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : 'light';

export const getCurrentKetcherTheme = (): KetcherThemeName => {
  const theme = document.documentElement.dataset.theme;

  return isKetcherTheme(theme) ? theme : 'light';
};

export const applyKetcherTheme = (
  theme: KetcherThemeName,
  { persist = false }: { persist?: boolean } = {},
) => {
  document.documentElement.dataset.theme = theme;
  document.documentElement.style.colorScheme = theme;

  if (!persist) return;

  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {}
};

export const initializeKetcherTheme = () => {
  applyKetcherTheme(
    getThemeFromQuery() ?? getStoredTheme() ?? getSystemTheme(),
  );
};

export const subscribeToKetcherThemeMessages = () => {
  const handleThemeMessage = (event: MessageEvent) => {
    const message = event.data as ThemeMessage;

    if (!message || message.eventType !== THEME_MESSAGE_EVENT) return;

    const theme = getThemePayload(message)?.theme;

    if (isKetcherTheme(theme)) {
      applyKetcherTheme(theme);
    }
  };

  window.addEventListener('message', handleThemeMessage);

  return () => window.removeEventListener('message', handleThemeMessage);
};
