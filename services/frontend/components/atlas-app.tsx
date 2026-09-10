import { useEffect, useState } from 'react';
import { parseRoute, serializeRoute, type AtlasRoute } from '../lib/routes';
import { InventoryApp } from './inventory/inventory-app';
import { InventoryProvider } from './inventory/inventory-context';

const navigationEvent = 'atlas:navigate';

export function AtlasApp() {
  const [route, setRoute] = useState<AtlasRoute>({ kind: 'overview' });
  const [routeReady, setRouteReady] = useState(false);

  useEffect(() => {
    const syncRoute = () => {
      setRoute(parseRoute(window.location.pathname));
      setRouteReady(true);
    };
    syncRoute();
    window.addEventListener('popstate', syncRoute);
    window.addEventListener(navigationEvent, syncRoute);
    return () => {
      window.removeEventListener('popstate', syncRoute);
      window.removeEventListener(navigationEvent, syncRoute);
    };
  }, []);

  function navigate(next: AtlasRoute) {
    const path = serializeRoute(next);
    if (window.location.pathname !== path) window.history.pushState({}, '', path);
    setRoute(next);
    window.dispatchEvent(new Event(navigationEvent));
  }

  if (!routeReady) return <div className="atlas-app final-app" aria-busy="true" />;
  return <InventoryProvider><InventoryApp route={route} navigate={navigate} /></InventoryProvider>;
}
