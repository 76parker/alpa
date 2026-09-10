import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import type { Component, ListResponse, Product, Workspace } from '../lib/inventory/contracts';
import { AtlasApp } from './atlas-app';

const workspace: Workspace = { id: 7, name: 'Payments' };
const baseProducts: Product[] = [{
  id: 12, workspace_id: 7, product_code: 'GCPAY',
  name: 'Global Checkout and Payment Orchestration Platform',
  criticality: 'MISSION-CRITICAL', description: 'Coordinates global checkout and payments.',
}];
const components: Component[] = [{
  id: 101, product_id: 12, name: 'Checkout API', type: 'Backend Service',
  description: 'Accepts checkout requests.',
  details: { language: 'Go', language_version: '1.25', framework: 'Gin' },
  apis: [{ id: 201, name: 'Checkout REST API', api_type: 'REST', network_exposure: 'internet', role: 'provider' }],
}];

let requests: string[];
let products: Product[];

beforeEach(() => {
  requests = [];
  products = [...baseProducts];
  const storage = new Map<string, string>();
  Object.defineProperty(window, 'localStorage', {
    configurable: true,
    value: {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => storage.set(key, value),
      removeItem: (key: string) => storage.delete(key),
      clear: () => storage.clear(),
    },
  });
  vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    requests.push(url);
    if (url.includes('/workspaces?')) return response<ListResponse<Workspace>>({ data: [workspace], pagination: { limit: 100, offset: 0 } });
    if (url.includes('/workspaces/7/products') && init?.method === 'POST') {
      const payload = JSON.parse(String(init.body)) as Omit<Product, 'id' | 'workspace_id'>;
      const created: Product = { id: 44, workspace_id: 7, ...payload };
      products.push(created);
      return response(created, 201);
    }
    if (url.includes('/workspaces/7/products')) return response<ListResponse<Product>>({ data: products, pagination: { limit: 100, offset: 0 } });
    if (url.includes('/products/12/components')) return response<ListResponse<Component>>({ data: components, pagination: { limit: 100, offset: 0 } });
    throw new Error(`Unexpected request: ${url}`);
  }));
  window.history.replaceState({}, '', '/products/GCPAY');
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

it('restores a direct server product URL and sets its document title', async () => {
  render(<AtlasApp />);
  await waitFor(() => expect(document.title).toBe('Global Checkout and Payment Orchestration Platform · Alpa'));
  expect(window.location.pathname).toBe('/products/GCPAY');
});

it('pushes inventory navigation and restores route-backed development notices on popstate', async () => {
  window.history.replaceState({}, '', '/');
  const user = userEvent.setup();
  render(<AtlasApp />);

  await user.click(await screen.findByRole('button', { name: 'Products' }));
  await waitFor(() => expect(window.location.pathname).toBe('/products'));

  window.history.replaceState({}, '', '/products/GCPAY/components/101/security');
  window.dispatchEvent(new PopStateEvent('popstate'));
  expect(await screen.findByRole('heading', { name: 'Security checks are in development' })).toBeTruthy();
  expect(document.title).toBe('Security checks · Alpa');

  window.history.replaceState({}, '', '/teams/identity-team');
  window.dispatchEvent(new PopStateEvent('popstate'));
  expect(await screen.findByRole('heading', { name: 'Teams are in development' })).toBeTruthy();
  expect(document.title).toBe('Teams · Alpa');
});

it('creates a remote product without storing server entities in localStorage', async () => {
  window.history.replaceState({}, '', '/products/new');
  const user = userEvent.setup();
  render(<AtlasApp />);

  await user.type(await screen.findByRole('textbox', { name: 'Product code' }), 'FRAUD');
  await user.type(screen.getByRole('textbox', { name: 'Product name' }), 'Fraud Rules');
  await user.selectOptions(screen.getByRole('combobox', { name: 'Criticality' }), 'BUSINESS-CRITICAL');
  await user.click(screen.getByRole('button', { name: 'Create product' }));

  await waitFor(() => expect(window.location.pathname).toBe('/products'));
  expect(screen.getByText('Fraud Rules').closest('tr')?.className).not.toContain('recently-created');
  expect(screen.getByRole('status').textContent).toContain('Product created');
  expect(window.localStorage.getItem('appsec-atlas-active-workspace-v1')).toBe('7');
  expect(window.localStorage.getItem('appsec-atlas-demo-v4')).toBeNull();
});

it('shows explicit Products no-results guidance for a local search', async () => {
  window.history.replaceState({}, '', '/products');
  const user = userEvent.setup();
  render(<AtlasApp />);

  await user.type(await screen.findByLabelText('Search products'), 'no matching product');
  expect(await screen.findByText('No matching products')).toBeTruthy();
});

it('opens the product create route from the Products page', async () => {
  window.history.replaceState({}, '', '/products');
  const user = userEvent.setup();
  render(<AtlasApp />);

  const createButton = await screen.findByRole('button', { name: 'Create product' });
  await user.click(createButton);

  expect(window.location.pathname).toBe('/products/new');
  expect(await screen.findByRole('heading', { name: 'Create product' })).toBeTruthy();
});

it('keeps Dashboard as an in-development route after leaving Workspace', async () => {
  window.history.replaceState({}, '', '/workspaces');
  const user = userEvent.setup();
  render(<AtlasApp />);

  await screen.findByRole('heading', { name: 'Workspace' });
  await user.click(screen.getByRole('button', { name: 'Dashboard' }));

  await waitFor(() => expect(window.location.pathname).toBe('/'));
  expect(await screen.findByRole('heading', { name: 'Dashboard is in development' })).toBeTruthy();
  expect(screen.getByRole('button', { name: 'Workspace Payments' })).toBeTruthy();
  expect(screen.queryByText('Acme Global Commerce and Payments')).toBeNull();
});

it('opens the route-backed Workspace page from the Dashboard sidebar', async () => {
  window.history.replaceState({}, '', '/');
  const user = userEvent.setup();
  render(<AtlasApp />);

  await user.click(await screen.findByRole('button', { name: 'Workspace' }));

  await waitFor(() => expect(window.location.pathname).toBe('/workspaces'));
  expect(await screen.findByRole('heading', { name: 'Workspace' })).toBeTruthy();
});

it('keeps product rows non-interactive and exposes a named product button', async () => {
  window.history.replaceState({}, '', '/products');
  render(<AtlasApp />);

  const productButton = await screen.findByRole('button', { name: 'Global Checkout and Payment Orchestration Platform' });
  const row = productButton.closest('tr');
  expect(row).not.toBeNull();
  expect(row?.getAttribute('onclick')).toBeNull();
});

it('shows route-backed development notices with Back navigation', async () => {
  window.history.replaceState({}, '', '/products/GCPAY/architecture');
  const user = userEvent.setup();
  render(<AtlasApp />);

  expect(await screen.findByRole('heading', { name: 'Architecture map is in development' })).toBeTruthy();
  expect(document.title).toBe('Architecture map · Alpa');
  await user.click(screen.getByRole('button', { name: 'Back' }));
  await waitFor(() => expect(window.location.pathname).toBe('/products/GCPAY'));
  expect(await screen.findByRole('heading', { name: 'Global Checkout and Payment Orchestration Platform' })).toBeTruthy();
});

it('validates the server product contract without owner or team fields', async () => {
  window.history.replaceState({}, '', '/products/new');
  const user = userEvent.setup();
  render(<AtlasApp />);

  await user.click(await screen.findByRole('button', { name: 'Create product' }));
  expect(screen.getByText('Use 1–10 uppercase letters')).toBeTruthy();
  expect(screen.getByText('Product name is required')).toBeTruthy();
  const productCode = screen.getByRole('textbox', { name: 'Product code' });
  expect(productCode.getAttribute('aria-invalid')).toBe('true');
  expect(document.activeElement).toBe(productCode);
  expect(screen.queryByLabelText(/Product Owner/i)).toBeNull();
  expect(screen.queryByLabelText(/Owning team/i)).toBeNull();
});

function response<T>(value: T, status = 200) {
  return new Response(JSON.stringify(value), { status, headers: { 'content-type': 'application/json' } });
}
