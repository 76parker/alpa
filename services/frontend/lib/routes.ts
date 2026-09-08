export type AtlasRoute =
  | { kind: 'overview' }
  | { kind: 'workspaces' }
  | { kind: 'products' }
  | { kind: 'product-create' }
  | { kind: 'product'; productKey: string; tab?: 'architecture' | 'threat-model' }
  | { kind: 'component'; productKey: string; componentId: string; tab?: 'security' }
  | { kind: 'component-check'; productKey: string; componentId: string; checkType: string }
  | { kind: 'templates' }
  | { kind: 'teams' }
  | { kind: 'team'; teamId: string }
  | { kind: 'settings' };

const encode = (segment: string) => encodeURIComponent(segment);

export function parseRoute(pathname: string): AtlasRoute {
  let segments: string[];
  try {
    segments = pathname.split('/').filter(Boolean).map(decodeURIComponent);
  } catch {
    return { kind: 'overview' };
  }
  if (segments.length === 0) return { kind: 'overview' };
  if (segments.length === 1 && segments[0] === 'workspaces') return { kind: 'workspaces' };
  if (segments[0] === 'products') {
    if (segments.length === 1) return { kind: 'products' };
    if (segments.length === 2 && segments[1] === 'new') return { kind: 'product-create' };
    const [, productKey, third, componentId, fifth, checkType] = segments;
    if (!productKey) return { kind: 'products' };
    if (segments.length === 2) return { kind: 'product', productKey };
    if (segments.length === 3 && (third === 'architecture' || third === 'threat-model')) return { kind: 'product', productKey, tab: third };
    if (third === 'components' && componentId) {
      if (segments.length === 4) return { kind: 'component', productKey, componentId };
      if (segments.length === 5 && fifth === 'security') return { kind: 'component', productKey, componentId, tab: 'security' };
      if (segments.length === 6 && fifth === 'security' && checkType) return { kind: 'component-check', productKey, componentId, checkType };
    }
  }
  if (segments.length === 1 && segments[0] === 'templates') return { kind: 'templates' };
  if (segments.length === 1 && segments[0] === 'teams') return { kind: 'teams' };
  if (segments.length === 2 && segments[0] === 'teams') return { kind: 'team', teamId: segments[1] };
  if (segments.length === 1 && segments[0] === 'settings') return { kind: 'settings' };
  return { kind: 'overview' };
}

export function serializeRoute(route: AtlasRoute): string {
  switch (route.kind) {
    case 'overview': return '/';
    case 'workspaces': return '/workspaces';
    case 'products': return '/products';
    case 'product-create': return '/products/new';
    case 'product': return `/products/${encode(route.productKey)}${route.tab ? `/${route.tab}` : ''}`;
    case 'component': return `/products/${encode(route.productKey)}/components/${encode(route.componentId)}${route.tab ? '/security' : ''}`;
    case 'component-check': return `/products/${encode(route.productKey)}/components/${encode(route.componentId)}/security/${encode(route.checkType)}`;
    case 'templates': return '/templates';
    case 'teams': return '/teams';
    case 'team': return `/teams/${encode(route.teamId)}`;
    case 'settings': return '/settings';
  }
}
