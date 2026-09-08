import { describe, expect, it } from 'vitest';
import { parseRoute, serializeRoute } from './routes';

describe('Atlas routes', () => {
  const canonicalRoutes = [
    ['/', { kind: 'overview' }],
    ['/workspaces', { kind: 'workspaces' }],
    ['/products', { kind: 'products' }],
    ['/products/new', { kind: 'product-create' }],
    ['/products/GCPAY', { kind: 'product', productKey: 'GCPAY' }],
    ['/products/GCPAY/architecture', { kind: 'product', productKey: 'GCPAY', tab: 'architecture' }],
    ['/products/GCPAY/threat-model', { kind: 'product', productKey: 'GCPAY', tab: 'threat-model' }],
    ['/products/GCPAY/components/orders-api', { kind: 'component', productKey: 'GCPAY', componentId: 'orders-api' }],
    ['/products/GCPAY/components/orders-api/security', { kind: 'component', productKey: 'GCPAY', componentId: 'orders-api', tab: 'security' }],
    ['/products/GCPAY/components/orders-api/security/SAST', { kind: 'component-check', productKey: 'GCPAY', componentId: 'orders-api', checkType: 'SAST' }],
    ['/templates', { kind: 'templates' }],
    ['/teams', { kind: 'teams' }],
    ['/teams/identity-team', { kind: 'team', teamId: 'identity-team' }],
    ['/settings', { kind: 'settings' }],
  ] as const;

  it.each(canonicalRoutes)('parses %s', (path, expected) => {
    expect(parseRoute(path)).toEqual(expected);
  });

  it.each(canonicalRoutes)('round-trips every canonical path through the serializer', (path) => {
    expect(serializeRoute(parseRoute(path))).toBe(path);
  });

  it('round-trips encoded identifiers and contains malformed percent encoding', () => {
    const path = '/products/GCPAY%2FINT/components/orders%20api/security/SAST%2Fcustom';
    expect(serializeRoute(parseRoute(path))).toBe(path);
    expect(parseRoute('/products/%E0%A4%A')).toEqual({ kind: 'overview' });
  });
});
