import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import type { ListResponse, Product, Workspace } from './lib/inventory/contracts';
import { AtlasApp } from './components/atlas-app';

beforeEach(() => {
  const storage = new Map<string, string>();
  Object.defineProperty(window, 'localStorage', { configurable: true, value: {
    getItem: (key: string) => storage.get(key) ?? null,
    setItem: (key: string, value: string) => storage.set(key, value),
    removeItem: (key: string) => storage.delete(key),
    clear: () => storage.clear(),
  } });
  vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL) => {
    const url = String(input);
    if (url.includes('/workspaces?')) return response<ListResponse<Workspace>>({ data: [{ id: 7, name: 'Payments' }], pagination: { limit: 100, offset: 0 } });
    if (url.includes('/workspaces/7/products')) return response<ListResponse<Product>>({ data: [{ id: 12, workspace_id: 7, product_code: 'GCPAY', name: 'Global Checkout and Payment Orchestration Platform', criticality: 'MISSION-CRITICAL' }], pagination: { limit: 100, offset: 0 } });
    if (url.includes('/products/12/components')) return response({ data: [], pagination: { limit: 100, offset: 0 } });
    throw new Error(`Unexpected request: ${url}`);
  }));
  window.history.replaceState({}, '', '/products/GCPAY');
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

it('renders the server product surface on a direct non-root SPA refresh', async () => {
  render(<AtlasApp />);
  await waitFor(() => expect(document.title).toBe('Global Checkout and Payment Orchestration Platform · Alpa'));
  expect(screen.getByRole('heading', { name: 'Global Checkout and Payment Orchestration Platform' })).toBeTruthy();
});

function response<T>(value: T) {
  return new Response(JSON.stringify(value), { status: 200, headers: { 'content-type': 'application/json' } });
}
