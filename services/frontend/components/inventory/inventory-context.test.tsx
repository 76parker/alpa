import { act, cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import type { ListResponse, Product, Workspace } from '../../lib/inventory/contracts';
import { InventoryProvider, useInventory } from './inventory-context';

const storage = new Map<string, string>();

beforeEach(() => {
  storage.clear();
  Object.defineProperty(window, 'localStorage', {
    configurable: true,
    value: {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => storage.set(key, value),
      removeItem: (key: string) => storage.delete(key),
      clear: () => storage.clear(),
    },
  });
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

function jsonResponse<T>(value: T) {
  return new Response(JSON.stringify(value), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  });
}

function Harness() {
  const inventory = useInventory();
  return <div>
    <span data-testid="workspace">{inventory.activeWorkspace?.name ?? 'none'}</span>
    <span data-testid="products">{inventory.products.map((product) => product.name).join(',')}</span>
    <button type="button" onClick={() => inventory.selectWorkspace(2)}>Select second</button>
  </div>;
}

it('restores the saved workspace and persists no server entities', async () => {
  storage.set('appsec-atlas-active-workspace-v1', '2');
  vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL) => {
    const url = String(input);
    if (url.includes('/workspaces?')) return jsonResponse<ListResponse<Workspace>>({
      data: [{ id: 1, name: 'First' }, { id: 2, name: 'Saved' }],
      pagination: { limit: 100, offset: 0 },
    });
    return jsonResponse<ListResponse<Product>>({ data: [], pagination: { limit: 100, offset: 0 } });
  }));

  render(<InventoryProvider><Harness /></InventoryProvider>);

  await waitFor(() => expect(screen.getByTestId('workspace').textContent).toBe('Saved'));
  expect([...storage.entries()]).toEqual([['appsec-atlas-active-workspace-v1', '2']]);
});

it('selects the default workspace on first entry before falling back to list order', async () => {
  const requested: string[] = [];
  vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL) => {
    const url = String(input);
    requested.push(url);
    if (url.includes('/workspaces?')) return jsonResponse<ListResponse<Workspace>>({
      data: [{ id: 1, name: 'Platform' }, { id: 2, name: 'default' }],
      pagination: { limit: 100, offset: 0 },
    });
    return jsonResponse<ListResponse<Product>>({ data: [], pagination: { limit: 100, offset: 0 } });
  }));

  render(<InventoryProvider><Harness /></InventoryProvider>);

  await waitFor(() => expect(screen.getByTestId('workspace').textContent).toBe('default'));
  expect(storage.get('appsec-atlas-active-workspace-v1')).toBe('2');
  await waitFor(() => expect(requested.some((url) => url.includes('/workspaces/2/products'))).toBe(true));
});

it('keeps products from the latest workspace when an older response arrives late', async () => {
  storage.set('appsec-atlas-active-workspace-v1', '1');
  let resolveFirst: ((response: Response) => void) | undefined;
  vi.stubGlobal('fetch', vi.fn((input: RequestInfo | URL) => {
    const url = String(input);
    if (url.includes('/workspaces?')) return Promise.resolve(jsonResponse<ListResponse<Workspace>>({
      data: [{ id: 1, name: 'First' }, { id: 2, name: 'Second' }],
      pagination: { limit: 100, offset: 0 },
    }));
    if (url.includes('/workspaces/1/products')) {
      return new Promise<Response>((resolve) => { resolveFirst = resolve; });
    }
    return Promise.resolve(jsonResponse<ListResponse<Product>>({
      data: [{ id: 22, workspace_id: 2, product_code: 'TWO', name: 'Second product', criticality: 'business-critical' }],
      pagination: { limit: 100, offset: 0 },
    }));
  }));

  const user = userEvent.setup();
  render(<InventoryProvider><Harness /></InventoryProvider>);
  await waitFor(() => expect(screen.getByTestId('workspace').textContent).toBe('First'));

  await user.click(screen.getByRole('button', { name: 'Select second' }));
  await waitFor(() => expect(screen.getByTestId('products').textContent).toBe('Second product'));

  await act(async () => {
    resolveFirst?.(jsonResponse<ListResponse<Product>>({
      data: [{ id: 11, workspace_id: 1, product_code: 'ONE', name: 'Stale product', criticality: 'mission-critical' }],
      pagination: { limit: 100, offset: 0 },
    }));
  });
  expect(screen.getByTestId('products').textContent).toBe('Second product');
  expect(storage.get('appsec-atlas-active-workspace-v1')).toBe('2');
});
