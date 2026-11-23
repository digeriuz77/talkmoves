// Assisted-by: Antigravity:gemini-4-neon (2026-11-23)
import { useCallback, useEffect, useState } from 'react';

export type AppRoute =
  | { name: 'welcome' }
  | { name: 'home' }
  | { name: 'play' }
  | { name: 'game'; gameId: string }
  | { name: 'live' }
  | { name: 'primer' }
  | { name: 'plan' }
  | { name: 'lesson' };

const VISITED_KEY = 'dialogic-has-visited-v1';
const LAST_TAB_KEY = 'dialogic-last-tab-v1';

type TopLevelTab = 'home' | 'play' | 'live' | 'primer' | 'plan' | 'lesson';

function isTopLevelTab(value: string | null): value is TopLevelTab {
  return (
    value === 'home' ||
    value === 'play' ||
    value === 'live' ||
    value === 'primer' ||
    value === 'plan' ||
    value === 'lesson'
  );
}

function readHasVisited(): boolean {
  try {
    return window.localStorage.getItem(VISITED_KEY) === '1';
  } catch {
    return false;
  }
}

function readLastTab(): TopLevelTab {
  try {
    const stored = window.localStorage.getItem(LAST_TAB_KEY);
    if (isTopLevelTab(stored)) return stored;
  } catch {
    // storage unavailable
  }
  return 'home';
}

export function routeToHash(route: AppRoute): string {
  switch (route.name) {
    case 'welcome':
      return '#/welcome';
    case 'home':
      return '#/home';
    case 'play':
      return '#/play';
    case 'game':
      return `#/play/${encodeURIComponent(route.gameId)}`;
    case 'live':
      return '#/live';
    case 'primer':
      return '#/primer';
    case 'plan':
      return '#/plan';
    case 'lesson':
      return '#/lesson';
  }
}

export function parseHash(hash: string, hasVisited: boolean): AppRoute {
  const cleaned = hash.replace(/^#\/?/, '').trim();
  if (!cleaned) {
    return hasVisited ? { name: readLastTab() } : { name: 'welcome' };
  }
  const [segment, ...rest] = cleaned.split('/');
  if (segment === 'welcome') return { name: 'welcome' };
  if (segment === 'home') return { name: 'home' };
  if (segment === 'live') return { name: 'live' };
  if (segment === 'primer') return { name: 'primer' };
  if (segment === 'plan') return { name: 'plan' };
  if (segment === 'lesson') return { name: 'lesson' };
  if (segment === 'play') {
    const rawId = rest.join('/');
    if (rawId) {
      return { name: 'game', gameId: decodeURIComponent(rawId) };
    }
    return { name: 'play' };
  }
  return { name: 'home' };
}

export function useAppRoute() {
  const [route, setRoute] = useState<AppRoute>(() =>
    parseHash(window.location.hash, readHasVisited()),
  );

  useEffect(() => {
    const handleHashChange = () => {
      setRoute(parseHash(window.location.hash, readHasVisited()));
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const navigate = useCallback((next: AppRoute, options?: { replace?: boolean }) => {
    const nextHash = routeToHash(next);
    if (next.name !== 'welcome') {
      try {
        window.localStorage.setItem(VISITED_KEY, '1');
        if (next.name !== 'game') {
          window.localStorage.setItem(LAST_TAB_KEY, next.name);
        }
      } catch {
        // storage unavailable
      }
    }
    if (window.location.hash !== nextHash) {
      if (options?.replace) {
        window.history.replaceState(null, '', nextHash);
      } else {
        window.location.hash = nextHash;
      }
    }
    setRoute(next);
    window.scrollTo({ top: 0, behavior: 'auto' });
  }, []);

  return { route, navigate };
}
