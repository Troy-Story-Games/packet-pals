import { useSyncExternalStore } from 'react';

/**
 * Tiny hash router. Hash URLs work identically on GitHub Pages (sub-path),
 * in Electron (file://) and on any static host without server rewrites.
 */

export type Route =
  | { name: 'home' }
  | { name: 'missions' }
  | { name: 'mission'; id: string }
  | { name: 'sandbox'; shared: string | null }
  | { name: 'book' }
  | { name: 'trophies' }
  | { name: 'credits' };

export function parseRoute(hash: string): Route {
  const [path, query = ''] = hash.replace(/^#\/?/, '').split('?');
  const [first, second] = path.split('/');
  switch (first) {
    case 'missions':
      return second ? { name: 'mission', id: second } : { name: 'missions' };
    case 'sandbox':
      return { name: 'sandbox', shared: new URLSearchParams(query).get('net') };
    case 'book':
    case 'trophies':
    case 'credits':
      return { name: first };
    default:
      return { name: 'home' };
  }
}

export function navigate(path: string): void {
  window.location.hash = `#/${path.replace(/^\//, '')}`;
}

function subscribe(callback: () => void): () => void {
  window.addEventListener('hashchange', callback);
  return () => window.removeEventListener('hashchange', callback);
}

export function useRoute(): Route {
  const hash = useSyncExternalStore(subscribe, () => window.location.hash);
  return parseRoute(hash);
}
