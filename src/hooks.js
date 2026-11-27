// Small React hooks: hash routing.
import { useEffect, useState } from 'react';

/** Current hash route, e.g. "#/setup" → ["setup"]. Defaults to ["plan"]. */
export function parseHash(hash) {
  const path = (hash || '').replace(/^#\/?/, '');
  const parts = path.split('/').filter(Boolean);
  return parts.length ? parts : ['plan'];
}

export function useHashRoute() {
  const [route, setRoute] = useState(() => parseHash(window.location.hash));
  useEffect(() => {
    const onChange = () => setRoute(parseHash(window.location.hash));
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);
  return route;
}

export function navigate(path) {
  window.location.hash = `#/${path}`;
}
