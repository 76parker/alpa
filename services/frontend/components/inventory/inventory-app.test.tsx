import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { AtlasRoute } from '../../lib/routes';
import type { Component, ListResponse, Product, Workspace } from '../../lib/inventory/contracts';
import { InventoryProvider } from './inventory-context';
import { buildComponentInput, InventoryApp, relationshipCandidates } from './inventory-app';

beforeEach(() => {
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
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

function response<T>(value: T, status = 200) {
  return new Response(JSON.stringify(value), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

function StatefulInventory({ initialRoute }: { initialRoute: AtlasRoute }) {
  const [route, setRoute] = useState(initialRoute);
  return <InventoryProvider><InventoryApp route={route} navigate={(next) => setRoute(next)} /></InventoryProvider>;
}

it('renders a route-backed Workspace tab with the active workspace and create action', async () => {
  vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL) => {
    const url = String(input);
    if (url.includes('/workspaces?')) return response<ListResponse<Workspace>>({
      data: [{ id: 7, name: 'default' }, { id: 8, name: 'Platform' }],
      pagination: { limit: 100, offset: 0 },
    });
    return response<ListResponse<Product>>({ data: [], pagination: { limit: 100, offset: 0 } });
  }));
  const user = userEvent.setup();
  render(<StatefulInventory initialRoute={{ kind: 'workspaces' }} />);

  expect(await screen.findByRole('heading', { name: 'Workspace' })).toBeTruthy();
  const navigation = screen.getByRole('navigation', { name: 'Primary navigation' });
  expect(within(navigation).getByRole('button', { name: 'Workspace' }).getAttribute('aria-current')).toBe('page');
  expect(within(screen.getByRole('region', { name: 'Available workspaces' })).getByText('Active workspace')).toBeTruthy();

  await user.click(screen.getByRole('button', { name: 'Create workspace' }));
  expect(screen.getByRole('dialog').classList.contains('workspace-create-dialog')).toBe(true);
  expect(screen.getByRole('button', { name: 'About Workspace name' })).toBeTruthy();
});

it('switches workspaces from the PatternFly menu without opening a chooser dialog', async () => {
  const requests: string[] = [];
  vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL) => {
    const url = String(input);
    requests.push(url);
    if (url.includes('/workspaces?')) return response<ListResponse<Workspace>>({
      data: [{ id: 7, name: 'default' }, { id: 8, name: 'Platform' }],
      pagination: { limit: 100, offset: 0 },
    });
    return response<ListResponse<Product>>({ data: [], pagination: { limit: 100, offset: 0 } });
  }));
  const user = userEvent.setup();
  render(<StatefulInventory initialRoute={{ kind: 'overview' }} />);

  const trigger = await screen.findByRole('button', { name: 'Workspace default' });
  await user.click(trigger);
  expect(screen.queryByRole('dialog')).toBeNull();
  const choices = screen.getByRole('menu', { name: 'Workspace options' });
  await user.click(within(choices).getByRole('menuitem', { name: 'Platform' }));

  await waitFor(() => expect(requests.some((url) => url.includes('/workspaces/8/products'))).toBe(true));
  expect(screen.getByRole('button', { name: 'Workspace Platform' }).getAttribute('aria-expanded')).toBe('false');
});

it('shows Templates as an in-development route', async () => {
  vi.stubGlobal('fetch', vi.fn(async () => { throw new TypeError('API unavailable'); }));
  render(<StatefulInventory initialRoute={{ kind: 'templates' }} />);

  expect(await screen.findByRole('heading', { name: 'Templates are in development' })).toBeTruthy();
  const navigation = screen.getByRole('navigation', { name: 'Primary navigation' });
  expect(within(navigation).getByRole('button', { name: 'Templates' }).getAttribute('aria-current')).toBe('page');
});

it('uses the Alpa brand in navigation and route titles', async () => {
  vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL) => {
    if (String(input).includes('/workspaces?')) return response<ListResponse<Workspace>>({
      data: [{ id: 7, name: 'default' }],
      pagination: { limit: 100, offset: 0 },
    });
    return response<ListResponse<Product>>({ data: [], pagination: { limit: 100, offset: 0 } });
  }));

  render(<StatefulInventory initialRoute={{ kind: 'overview' }} />);

  const brand = await screen.findByRole('button', { name: 'Alpa' });
  expect(brand).toBeTruthy();
  expect(brand.textContent).toBe('Alpa');
  expect(screen.queryByText('AppSec Atlas')).toBeNull();
  await waitFor(() => expect(document.title).toBe('Dashboard · Alpa'));
});

it('shows Dashboard as an in-development route', async () => {
  vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL) => {
    const url = String(input);
    if (url.includes('/workspaces?')) return response<ListResponse<Workspace>>({
      data: [{ id: 7, name: 'default' }],
      pagination: { limit: 100, offset: 0 },
    });
    if (url.includes('/workspaces/7/products')) return response<ListResponse<Product>>({
      data: [
        { id: 1, workspace_id: 7, product_code: 'PAY', name: 'Payments', criticality: 'mission-critical', description: '' },
        { id: 2, workspace_id: 7, product_code: 'CRM', name: 'Customer records', criticality: 'business-critical', description: 'Stores customer records' },
      ],
      pagination: { limit: 100, offset: 0 },
    });
    if (url.includes('/products/1/components')) return response<ListResponse<Component>>({ data: [
      { id: 11, product_id: 1, name: 'Payments API', type: 'backend-service', description: '', details: { language: 'Go', language_version: '', framework: '' }, apis: [
        { id: 100, name: 'Payments', api_type: 'rest', network_exposure: 'internal', role: 'provider' },
        { id: 101, name: 'Identity', api_type: 'rest', network_exposure: 'internal', role: 'consumer' },
      ] },
      { id: 12, product_id: 1, name: 'Payments UI', type: 'frontend-service', description: '', details: { language: 'TypeScript', language_version: '', framework: '' }, apis: [
        { id: 102, name: 'UI API', api_type: 'graphql', network_exposure: 'internet', role: 'provider' },
      ] },
    ], pagination: { limit: 100, offset: 0 } });
    if (url.includes('/products/2/components')) return response<ListResponse<Component>>({ data: [], pagination: { limit: 100, offset: 0 } });
    throw new Error(`Unexpected request: ${url}`);
  }));

  render(<StatefulInventory initialRoute={{ kind: 'overview' }} />);

  expect(await screen.findByRole('heading', { name: 'Dashboard is in development' })).toBeTruthy();
  const main = screen.getByRole('main');
  expect(within(main).getByText(/This area is not available yet/)).toBeTruthy();
  expect(within(main).getByRole('button', { name: 'Back' })).toBeTruthy();
  expect(within(main).queryByRole('region', { name: 'Portfolio metrics' })).toBeNull();
});

it('does not render Recently visited while Dashboard is in development', async () => {
  vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL) => {
    const url = String(input);
    if (url.includes('/workspaces?')) return response<ListResponse<Workspace>>({
      data: [{ id: 7, name: 'default' }],
      pagination: { limit: 100, offset: 0 },
    });
    if (url.includes('/workspaces/7/products')) return response<ListResponse<Product>>({
      data: [{ id: 1, workspace_id: 7, product_code: 'PAY', name: 'Payments', criticality: 'business-critical' }],
      pagination: { limit: 100, offset: 0 },
    });
    if (url.includes('/products/1/components')) return response<ListResponse<Component>>({ data: [], pagination: { limit: 100, offset: 0 } });
    throw new Error(`Unexpected request: ${url}`);
  }));
  render(<StatefulInventory initialRoute={{ kind: 'products' }} />);

  expect(await screen.findByRole('button', { name: 'Payments' })).toBeTruthy();
  expect(screen.queryByText('Recently visited')).toBeNull();
});

it('returns from Dashboard development notice to product creation', async () => {
  vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL) => {
    if (String(input).includes('/workspaces?')) return response<ListResponse<Workspace>>({
      data: [{ id: 7, name: 'default' }],
      pagination: { limit: 100, offset: 0 },
    });
    return response<ListResponse<Product>>({ data: [], pagination: { limit: 100, offset: 0 } });
  }));
  const user = userEvent.setup();
  render(<StatefulInventory initialRoute={{ kind: 'overview' }} />);

  expect(await screen.findByRole('heading', { name: 'Dashboard is in development' })).toBeTruthy();
  await user.click(screen.getByRole('button', { name: 'Back' }));
  expect(await screen.findByText('No products yet')).toBeTruthy();
  await user.click(screen.getByRole('button', { name: 'Create product' }));
  expect(screen.getByRole('heading', { name: 'Create product' })).toBeTruthy();
});

it('shows the first-workspace invitation when the server list is empty', async () => {
  vi.stubGlobal('fetch', vi.fn(async () => response<ListResponse<Workspace>>({
    data: [],
    pagination: { limit: 100, offset: 0 },
  })));

  render(<StatefulInventory initialRoute={{ kind: 'products' }} />);

  expect(await screen.findByRole('heading', { name: 'Create your first workspace' })).toBeTruthy();
  expect(screen.getByRole('button', { name: 'Create workspace' })).toBeTruthy();
});

it('creates, selects, and persists the first workspace', async () => {
  const requests: Array<{ url: string; init?: RequestInit }> = [];
  vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    requests.push({ url, init });
    if (url.includes('/workspaces?')) return response<ListResponse<Workspace>>({
      data: [],
      pagination: { limit: 100, offset: 0 },
    });
    if (url.endsWith('/workspaces') && init?.method === 'POST') return response<Workspace>({ id: 8, name: 'Platform' }, 201);
    if (url.includes('/workspaces/8/products')) return response<ListResponse<Product>>({ data: [], pagination: { limit: 100, offset: 0 } });
    throw new Error(`Unexpected request: ${url}`);
  }));
  const user = userEvent.setup();
  render(<StatefulInventory initialRoute={{ kind: 'products' }} />);

  await user.click(await screen.findByRole('button', { name: 'Create workspace' }));
  expect(screen.getByRole('button', { name: 'About Workspace name' })).toBeTruthy();
  await user.type(screen.getByRole('textbox', { name: 'Workspace name' }), 'Platform');
  await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Create workspace' }));

  await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  expect(await screen.findByText('No products yet')).toBeTruthy();
  expect(window.localStorage.getItem('appsec-atlas-active-workspace-v1')).toBe('8');
  const createRequest = requests.find((item) => item.url.endsWith('/workspaces') && item.init?.method === 'POST');
  expect(JSON.parse(String(createRequest?.init?.body))).toEqual({ name: 'Platform' });
});

it('creates a product with the exact API payload and returns to Products', async () => {
  const requests: Array<{ url: string; init?: RequestInit }> = [];
  vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    requests.push({ url, init });
    if (url.includes('/workspaces?')) return response<ListResponse<Workspace>>({
      data: [{ id: 7, name: 'Payments' }],
      pagination: { limit: 100, offset: 0 },
    });
    if (url.includes('/workspaces/7/products') && init?.method === 'POST') return response<Product>({
      id: 41,
      workspace_id: 7,
      product_code: 'PAY',
      name: 'Payments API',
      criticality: 'business-critical',
      description: 'Processes payments',
    }, 201);
    return response<ListResponse<Product>>({ data: [], pagination: { limit: 100, offset: 0 } });
  }));
  const user = userEvent.setup();
  render(<StatefulInventory initialRoute={{ kind: 'products' }} />);

  await user.click(await screen.findByRole('button', { name: 'Create product' }));
  expect(screen.queryByText('Use the product code in inventory URLs and references.')).toBeNull();
  expect(screen.getByRole('button', { name: 'About Product code' })).toBeTruthy();
  expect(screen.getByRole('button', { name: 'About Product name' })).toBeTruthy();
  expect(screen.getByRole('button', { name: 'About Criticality' })).toBeTruthy();
  expect(screen.getByRole('button', { name: 'About Description' })).toBeTruthy();
  expect(screen.queryByText('Mission or safety impact')).toBeNull();
  expect(screen.queryByText('Severe customer or revenue impact')).toBeNull();
  expect(screen.getByText('Material disruption to operations')).toBeTruthy();
  expect(screen.queryByText('Limited internal productivity impact')).toBeNull();
  await user.type(screen.getByRole('textbox', { name: 'Product code' }), 'PAY');
  await user.type(screen.getByRole('textbox', { name: 'Product name' }), 'Payments API');
  const criticality = screen.getByRole('button', { name: 'Criticality' });
  expect(criticality.textContent).toContain('Business operational');
  await user.click(criticality);
  await user.click(within(screen.getByRole('listbox', { name: 'Criticality options' })).getByRole('option', { name: /Business critical/ }));
  await user.type(screen.getByRole('textbox', { name: 'Description' }), 'Processes payments');
  await user.click(screen.getByRole('button', { name: 'Create product' }));

  expect(await screen.findByRole('heading', { name: 'Products' })).toBeTruthy();
  expect(screen.getByRole('status').textContent).toContain('Product created');
  expect(screen.getByRole('button', { name: 'Payments API' }).closest('tr')?.classList.contains('recently-created')).toBe(false);
  expect(screen.getByText('Processes payments').closest('td')).not.toBeNull();
  const createRequest = requests.find((item) => item.init?.method === 'POST');
  expect(JSON.parse(String(createRequest?.init?.body))).toEqual({
    product_code: 'PAY',
    name: 'Payments API',
    criticality: 'business-critical',
    description: 'Processes payments',
  });
});

it('renders component views with compact controls, typed rows and provider API badges', async () => {
  const components: Component[] = [
    { id: 11, product_id: 9, name: 'Checkout API', type: 'backend-service', description: '', details: { language: 'Go', language_version: '1.25', framework: 'Gin' }, apis: [
      { id: 101, name: 'Checkout REST primary', api_type: 'rest', network_exposure: 'internal', role: 'provider' },
      { id: 102, name: 'Checkout REST admin', api_type: 'rest', network_exposure: 'internal', role: 'provider' },
      { id: 103, name: 'Checkout GraphQL', api_type: 'graphql', network_exposure: 'internet', role: 'provider' },
      { id: 104, name: 'Consumed queue', api_type: 'queue', network_exposure: 'internal', role: 'consumer' },
    ] },
    { id: 12, product_id: 9, name: 'Checkout UI', type: 'frontend-service', description: '', details: { language: 'TypeScript', language_version: '5.9', framework: 'React' }, apis: [
      { id: 105, name: 'UI events', api_type: 'event', network_exposure: 'internal', role: 'provider' },
    ] },
    { id: 14, product_id: 9, name: 'Ledger database', type: 'infrastructure', description: '', details: { system: 'PostgreSQL', system_type: 'sql-database', version: '17', network_address: ['ledger.internal:5432'] }, apis: [
      { id: 106, name: 'Ledger topic', api_type: 'topic', network_exposure: 'internal', role: 'provider' },
    ] },
  ];
  vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL) => {
    const url = String(input);
    if (url.includes('/workspaces?')) return response<ListResponse<Workspace>>({ data: [{ id: 7, name: 'Payments' }], pagination: { limit: 100, offset: 0 } });
    if (url.includes('/workspaces/7/products')) return response<ListResponse<Product>>({ data: [{ id: 9, workspace_id: 7, product_code: 'PAY', name: 'Payments', criticality: 'mission-critical' }], pagination: { limit: 100, offset: 0 } });
    if (url.includes('/products/9/components')) return response<ListResponse<Component>>({ data: components, pagination: { limit: 100, offset: 0 } });
    throw new Error(`Unexpected request: ${url}`);
  }));

  render(<StatefulInventory initialRoute={{ kind: 'product', productKey: 'PAY', tab: 'components' }} />);

  const viewControl = await screen.findByRole('group', { name: 'Component views' });
  const servicesTab = within(viewControl).getByRole('button', { name: /Services 2/ });
  const infrastructureTab = within(viewControl).getByRole('button', { name: /Infrastructure 1/ });
  expect(servicesTab.getAttribute('aria-pressed')).toBe('true');
  expect(infrastructureTab.getAttribute('aria-pressed')).toBe('false');
  expect(within(viewControl).getByRole('button', { name: /Architecture 3/ })).toBeTruthy();

  const services = screen.getByRole('region', { name: 'Services components' });
  expect(within(services).getAllByRole('columnheader').map((header) => header.textContent)).toEqual(['Name', 'Type', 'API']);
  const backendRow = within(services).getByText('Checkout API').closest('tr');
  const frontendRow = within(services).getByText('Checkout UI').closest('tr');
  expect(backendRow).not.toBeNull();
  expect(frontendRow).not.toBeNull();
  expect(within(backendRow!).getByText('Backend')).toBeTruthy();
  expect(within(frontendRow!).getByText('Frontend')).toBeTruthy();
  expect(within(backendRow!).getByText('REST ×2')).toBeTruthy();
  expect(within(backendRow!).getByText('GraphQL')).toBeTruthy();
  expect(within(backendRow!).queryByText('Queue')).toBeNull();
  expect(screen.queryByText('Checkout REST primary')).toBeNull();
  expect(screen.queryByText('Checkout REST admin')).toBeNull();

  const user = userEvent.setup();
  await user.click(infrastructureTab);
  const infrastructure = screen.getByRole('region', { name: 'Infrastructure components' });
  expect(within(infrastructure).getByText('Ledger database')).toBeTruthy();
  expect(within(infrastructure).getByText('SQL Database')).toBeTruthy();
  expect(within(infrastructure).getByText('Topic')).toBeTruthy();
  expect(screen.queryByText('ledger.internal:5432')).toBeNull();

});

it('supports keyboard activation of component views', async () => {
  vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL) => {
    const url = String(input);
    if (url.includes('/workspaces?')) return response<ListResponse<Workspace>>({ data: [{ id: 7, name: 'Payments' }], pagination: { limit: 100, offset: 0 } });
    if (url.includes('/workspaces/7/products')) return response<ListResponse<Product>>({ data: [{ id: 9, workspace_id: 7, product_code: 'PAY', name: 'Payments', criticality: 'mission-critical' }], pagination: { limit: 100, offset: 0 } });
    if (url.includes('/products/9/components')) return response<ListResponse<Component>>({ data: [], pagination: { limit: 100, offset: 0 } });
    throw new Error(`Unexpected request: ${url}`);
  }));
  const user = userEvent.setup();
  render(<StatefulInventory initialRoute={{ kind: 'product', productKey: 'PAY', tab: 'components' }} />);

  const services = await screen.findByRole('button', { name: /Services 0/ });
  const infrastructure = screen.getByRole('button', { name: /Infrastructure 0/ });
  const architecture = screen.getByRole('button', { name: /Architecture 0/ });
  services.focus();
  await user.keyboard('{Tab}{Enter}');
  expect(infrastructure.getAttribute('aria-pressed')).toBe('true');
  expect(document.activeElement).toBe(infrastructure);
  expect(screen.getByText('No infrastructure yet')).toBeTruthy();
  await user.click(services);
  expect(services.getAttribute('aria-pressed')).toBe('true');
  expect(screen.getByText('No services yet')).toBeTruthy();
  await user.click(architecture);
  expect(screen.getByRole('button', { name: /Architecture 0/ }).getAttribute('aria-pressed')).toBe('true');
  expect(screen.getByText('No components yet')).toBeTruthy();
});

it('keeps show-more state independently for each component category', async () => {
  const services: Component[] = Array.from({ length: 7 }, (_, index) => ({
    id: 20 + index,
    product_id: 9,
    name: `Backend ${index + 1}`,
    type: 'backend-service',
    description: '',
    details: { language: 'Go', language_version: '1.25', framework: 'Gin' },
    apis: [],
  }));
  vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL) => {
    const url = String(input);
    if (url.includes('/workspaces?')) return response<ListResponse<Workspace>>({ data: [{ id: 7, name: 'Payments' }], pagination: { limit: 100, offset: 0 } });
    if (url.includes('/workspaces/7/products')) return response<ListResponse<Product>>({ data: [{ id: 9, workspace_id: 7, product_code: 'PAY', name: 'Payments', criticality: 'mission-critical' }], pagination: { limit: 100, offset: 0 } });
    if (url.includes('/products/9/components')) return response<ListResponse<Component>>({ data: services, pagination: { limit: 100, offset: 0 } });
    throw new Error(`Unexpected request: ${url}`);
  }));
  const user = userEvent.setup();
  render(<StatefulInventory initialRoute={{ kind: 'product', productKey: 'PAY', tab: 'components' }} />);

  await screen.findByRole('button', { name: 'Services 7' });
  await user.click(screen.getByRole('button', { name: 'Show 2 more' }));

  expect(screen.getByText('Backend 7')).toBeTruthy();
  await user.click(screen.getByRole('button', { name: 'Show fewer' }));
  expect(screen.queryByText('Backend 7')).toBeNull();
});

describe('component request variants', () => {
  it.each([
    ['backend-service', { language: 'Go', languageVersion: '1.25', framework: 'Gin' }, { language: 'Go', language_version: '1.25', framework: 'Gin' }],
    ['frontend-service', { language: 'TypeScript', languageVersion: '', framework: 'React' }, { language: 'TypeScript', framework: 'React' }],
    ['infrastructure', { system: 'PostgreSQL', systemType: 'sql-database', version: '17', networkAddresses: ['db.internal:5432', 'db-replica.internal:5432'] }, { system: 'PostgreSQL', system_type: 'sql-database', version: '17', network_address: ['db.internal:5432', 'db-replica.internal:5432'] }],
  ] as const)('builds the %s details contract', (type, details, expected) => {
    expect(buildComponentInput(9, {
      name: 'Catalog',
      type,
      description: '',
      details,
    }, [{ name: 'Catalog API', api_type: 'rest', network_exposure: 'internal' }])).toEqual({
      product_id: 9,
      name: 'Catalog',
      type,
      details: expected,
      apis: [{ name: 'Catalog API', api_type: 'rest', network_exposure: 'internal' }],
    });
  });

  it('preserves multiple provided APIs in the creation payload', () => {
    expect(buildComponentInput(9, {
      name: 'Catalog',
      type: 'backend-service',
      description: '',
      details: { language: 'Go', languageVersion: '', framework: '' },
    }, [
      { name: 'Catalog REST', api_type: 'rest', network_exposure: 'internal' },
      { name: 'Catalog events', api_type: 'event', network_exposure: 'internet' },
    ]).apis).toEqual([
      { name: 'Catalog REST', api_type: 'rest', network_exposure: 'internal' },
      { name: 'Catalog events', api_type: 'event', network_exposure: 'internet' },
    ]);
  });
});

it('creates infrastructure components with a system type and multiple network addresses', async () => {
  let createPayload: unknown;
  vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    if (url.includes('/workspaces?')) return response<ListResponse<Workspace>>({
      data: [{ id: 7, name: 'Payments' }],
      pagination: { limit: 100, offset: 0 },
    });
    if (url.includes('/workspaces/7/products')) return response<ListResponse<Product>>({
      data: [{ id: 9, workspace_id: 7, product_code: 'PAY', name: 'Payments', criticality: 'mission-critical' }],
      pagination: { limit: 100, offset: 0 },
    });
    if (url.includes('/products/9/components')) return response<ListResponse<Component>>({
      data: [],
      pagination: { limit: 100, offset: 0 },
    });
    if (url.endsWith('/components') && init?.method === 'POST') {
      createPayload = JSON.parse(String(init.body));
      return response<Component>({
        id: 17,
        product_id: 9,
        name: 'Redis cache',
        type: 'infrastructure',
        description: '',
        details: {
          system: 'Redis',
          system_type: 'nosql-database',
          version: '7',
          network_address: ['cache.internal:6379', 'cache-replica.internal:6379'],
        },
        apis: [],
      }, 201);
    }
    throw new Error(`Unexpected request: ${url}`);
  }));

  const user = userEvent.setup();
  render(<StatefulInventory initialRoute={{ kind: 'product', productKey: 'PAY', tab: 'components' }} />);

  await user.click((await screen.findAllByRole('button', { name: 'Create component' }))[0]);
  await user.click(screen.getByRole('button', { name: 'Component type' }));
  await user.click(within(screen.getByRole('listbox', { name: 'Component type options' })).getByRole('option', { name: /Infrastructure/ }));
  const systemType = screen.getByRole('combobox', { name: 'System type' });
  expect(within(systemType).getByRole('option', { name: 'SQL Database' })).toBeTruthy();
  await user.selectOptions(systemType, 'nosql-database');
  await user.type(screen.getByRole('textbox', { name: 'Component name' }), 'Redis cache');
  await user.type(screen.getByRole('textbox', { name: 'System' }), 'Redis');
  await user.click(screen.getByRole('button', { name: 'Add network address' }));
  await user.type(screen.getByRole('textbox', { name: 'Network address 1' }), 'cache.internal:6379');
  await user.click(screen.getByRole('button', { name: 'Add network address' }));
  await user.type(screen.getByRole('textbox', { name: 'Network address 2' }), 'cache-replica.internal:6379');
  await user.click(screen.getByRole('button', { name: 'Create component' }));

  await waitFor(() => expect(createPayload).toEqual({
    product_id: 9,
    name: 'Redis cache',
    type: 'infrastructure',
    details: {
      system: 'Redis',
      system_type: 'nosql-database',
      network_address: ['cache.internal:6379', 'cache-replica.internal:6379'],
    },
  }));
  expect(await screen.findByRole('heading', { name: 'Redis cache' })).toBeTruthy();
  expect(screen.getByText('NoSQL Database')).toBeTruthy();
});

it('keeps component creation open when the server rejects the request', async () => {
  vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    if (url.includes('/workspaces?')) return response<ListResponse<Workspace>>({
      data: [{ id: 7, name: 'Payments' }],
      pagination: { limit: 100, offset: 0 },
    });
    if (url.includes('/workspaces/7/products')) return response<ListResponse<Product>>({
      data: [{ id: 9, workspace_id: 7, product_code: 'PAY', name: 'Payments', criticality: 'mission-critical' }],
      pagination: { limit: 100, offset: 0 },
    });
    if (url.includes('/products/9/components')) return response<ListResponse<Component>>({
      data: [],
      pagination: { limit: 100, offset: 0 },
    });
    if (url.endsWith('/components') && init?.method === 'POST') return response({
      code: 'invalid_component_details',
      message: 'component details are invalid',
      status: 400,
    }, 400);
    throw new Error(`Unexpected request: ${url}`);
  }));
  const user = userEvent.setup();
  render(<StatefulInventory initialRoute={{ kind: 'product', productKey: 'PAY', tab: 'components' }} />);

  const createButtons = await screen.findAllByRole('button', { name: 'Create component' });
  await user.click(createButtons[0]);
  for (const label of ['Component name', 'Component type', 'Language', 'Language version', 'Framework', 'Description']) {
    expect(screen.getByRole('button', { name: `About ${label}` })).toBeTruthy();
  }
  const providedAPIs = screen.getByRole('region', { name: 'Provided APIs' });
  await user.click(within(providedAPIs).getByRole('button', { name: 'Add API' }));
  const apiCard = within(providedAPIs).getByRole('group', { name: 'API 1' });
  expect(within(apiCard).getByRole('button', { name: 'Remove API 1' })).toBeTruthy();
  for (const label of ['API name', 'API type', 'Network exposure']) {
    expect(screen.getByRole('button', { name: `About ${label}` })).toBeTruthy();
  }
  await user.type(screen.getByRole('textbox', { name: 'Component name' }), 'Checkout API');
  await user.type(screen.getByRole('textbox', { name: 'Language' }), 'Go');
  await user.type(screen.getByRole('textbox', { name: 'API name' }), 'Checkout REST');
  await user.click(screen.getByRole('button', { name: 'Create component' }));

  expect(await screen.findByText('component details are invalid')).toBeTruthy();
  expect(screen.getByRole('heading', { name: 'Create component' })).toBeTruthy();
  expect((screen.getByRole('textbox', { name: 'Component name' }) as HTMLInputElement).value).toBe('Checkout API');
});

it('offers only unlinked provider APIs from other components', () => {
  const components = componentFixtures();
  expect(relationshipCandidates(components[0], components).map((candidate) => candidate.api.id)).toEqual([202]);
});

it('explains API directions and keeps the full entity context for a component', async () => {
  const components = componentFixtures();
  const user = userEvent.setup();
  vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL) => {
    const url = String(input);
    if (url.includes('/workspaces?')) return response<ListResponse<Workspace>>({
      data: [{ id: 7, name: 'Payments' }],
      pagination: { limit: 100, offset: 0 },
    });
    if (url.includes('/workspaces/7/products')) return response<ListResponse<Product>>({
      data: [{ id: 9, workspace_id: 7, product_code: 'PAY', name: 'Payments', criticality: 'mission-critical' }],
      pagination: { limit: 100, offset: 0 },
    });
    if (url.includes('/products/9/components')) return response<ListResponse<Component>>({
      data: components,
      pagination: { limit: 100, offset: 0 },
    });
    throw new Error(`Unexpected request: ${url}`);
  }));
  render(<StatefulInventory initialRoute={{ kind: 'component', productKey: 'PAY', componentId: '101' }} />);

  expect(await screen.findByRole('heading', { name: 'APIs this component provides' })).toBeTruthy();
  expect(screen.getByRole('button', { name: 'About APIs this component provides' })).toBeTruthy();
  expect(screen.getByRole('heading', { name: 'APIs this component uses' })).toBeTruthy();
  expect(screen.getByRole('button', { name: 'About APIs this component uses' })).toBeTruthy();
  const context = screen.getByRole('navigation', { name: 'Current location' });
  expect(context.textContent).toContain('PaymentsPaymentsConsumer');
  expect(within(context).getByRole('button', { name: 'Open workspace Payments' })).toBeTruthy();
  await user.click(within(context).getByRole('button', { name: 'Open product Payments' }));
  expect(await screen.findByRole('heading', { name: 'Payments' })).toBeTruthy();
  await user.click(within(screen.getByRole('navigation', { name: 'Current location' })).getByRole('button', { name: 'Open workspace Payments' }));
  expect(await screen.findByRole('heading', { name: 'Workspace' })).toBeTruthy();
});

it('offers component client creation instead of the removed consumer API relationship action', async () => {
  const components = componentFixtures().map((item) => item.id === 101 ? { ...item, clients: [] } : item);
  const requests: Array<{ url: string; init?: RequestInit }> = [];
  vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    requests.push({ url, init });
    if (url.includes('/workspaces?')) return response<ListResponse<Workspace>>({ data: [{ id: 7, name: 'Payments' }], pagination: { limit: 100, offset: 0 } });
    if (url.includes('/workspaces/7/products')) return response<ListResponse<Product>>({ data: [{ id: 9, workspace_id: 7, product_code: 'PAY', name: 'Payments', criticality: 'mission-critical' }], pagination: { limit: 100, offset: 0 } });
    if (url.includes('/products/9/components')) return response<ListResponse<Component>>({ data: components, pagination: { limit: 100, offset: 0 } });
    if (url === '/v1/components/101/clients' && init?.method === 'POST') return response({ id: 901, client_type: 'rest-client', description: 'Calls checkout', api_id: null }, 201);
    if (url === '/v1/components/101') return response({ ...components[0], clients: [{ id: 901, client_type: 'rest-client', description: 'Calls checkout', api_id: null }] });
    throw new Error(`Unexpected request: ${url}`);
  }));
  const user = userEvent.setup();
  render(<StatefulInventory initialRoute={{ kind: 'component', productKey: 'PAY', componentId: '101' }} />);

  await user.click(await screen.findByRole('button', { name: 'Create component client' }));
  expect(screen.getByRole('dialog')).toBeTruthy();
  await user.selectOptions(screen.getByRole('combobox', { name: 'Client type' }), 'rest-client');
  await user.type(screen.getByRole('textbox', { name: 'Description' }), 'Calls checkout');
  await user.click(screen.getByRole('button', { name: 'Create client' }));

  await waitFor(() => expect(requests.some(({ url, init }) => url === '/v1/components/101/clients' && init?.method === 'POST')).toBe(true));
  const createRequest = requests.find(({ url }) => url === '/v1/components/101/clients')!;
  expect(JSON.parse(String(createRequest.init?.body))).toEqual({ client_type: 'rest-client', description: 'Calls checkout' });
  expect(await screen.findByText('Component client created')).toBeTruthy();
  expect(screen.queryByRole('button', { name: 'Add API relationship' })).toBeNull();
});

it('keeps the relationship dialog open and shows the duplicate conflict inline', async () => {
  const components = componentFixtures();
  vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    if (url.includes('/workspaces?')) return response<ListResponse<Workspace>>({
      data: [{ id: 7, name: 'Payments' }],
      pagination: { limit: 100, offset: 0 },
    });
    if (url.includes('/workspaces/7/products')) return response<ListResponse<Product>>({
      data: [{ id: 9, workspace_id: 7, product_code: 'PAY', name: 'Payments', criticality: 'mission-critical' }],
      pagination: { limit: 100, offset: 0 },
    });
    if (url.includes('/products/9/components')) return response<ListResponse<Component>>({
      data: components,
      pagination: { limit: 100, offset: 0 },
    });
    if (url.includes('/consumer-apis') && init?.method === 'POST') return response({
      code: 'consumer_api_link_already_exists',
      message: 'consumer api link already exists',
      status: 409,
    }, 409);
    throw new Error(`Unexpected request: ${url}`);
  }));
  const user = userEvent.setup();
  render(<StatefulInventory initialRoute={{ kind: 'component', productKey: 'PAY', componentId: '101' }} />);

  await user.click(await screen.findByRole('button', { name: 'Add API relationship' }));
  expect(screen.getByRole('dialog')).toBeTruthy();
  await user.click(screen.getByRole('button', { name: 'Add relationship' }));

  expect(await screen.findByText('This API relationship already exists')).toBeTruthy();
  expect(screen.getByRole('dialog')).toBeTruthy();
});

it('announces a relationship only after a failed mutation is confirmed by refresh', async () => {
  const components = componentFixtures();
  let relationshipPosts = 0;
  const refreshed: Component = {
    ...components[0],
    apis: [
      ...components[0].apis,
      { id: 202, name: 'Available API', api_type: 'graphql', network_exposure: 'internet', role: 'consumer' },
    ],
  };
  vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    if (url.includes('/workspaces?')) return response<ListResponse<Workspace>>({
      data: [{ id: 7, name: 'Payments' }],
      pagination: { limit: 100, offset: 0 },
    });
    if (url.includes('/workspaces/7/products')) return response<ListResponse<Product>>({
      data: [{ id: 9, workspace_id: 7, product_code: 'PAY', name: 'Payments', criticality: 'mission-critical' }],
      pagination: { limit: 100, offset: 0 },
    });
    if (url.includes('/products/9/components')) return response<ListResponse<Component>>({
      data: components,
      pagination: { limit: 100, offset: 0 },
    });
    if (url.includes('/consumer-apis') && init?.method === 'POST') {
      relationshipPosts += 1;
      throw new TypeError('connection closed');
    }
    if (url.endsWith('/components/101')) return response(refreshed);
    throw new Error(`Unexpected request: ${url}`);
  }));
  const user = userEvent.setup();
  render(<StatefulInventory initialRoute={{ kind: 'component', productKey: 'PAY', componentId: '101' }} />);

  await user.click(await screen.findByRole('button', { name: 'Add API relationship' }));
  await user.click(screen.getByRole('button', { name: 'Add relationship' }));

  await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  expect(screen.getByRole('status').textContent).toContain('API relationship added');
  expect(screen.getByText('Available API')).toBeTruthy();
  expect(relationshipPosts).toBe(1);
});

function componentFixtures(): Component[] {
  return [
    {
      id: 101,
      product_id: 9,
      name: 'Consumer',
      type: 'backend-service',
      description: '',
      details: { language: 'Go', language_version: '', framework: '' },
      apis: [
        { id: 100, name: 'Own API', api_type: 'rest', network_exposure: 'internal', role: 'provider' },
        { id: 201, name: 'Already linked', api_type: 'rest', network_exposure: 'internal', role: 'consumer' },
      ],
    },
    {
      id: 102,
      product_id: 9,
      name: 'Provider',
      type: 'frontend-service',
      description: '',
      details: { language: 'TypeScript', language_version: '', framework: 'React' },
      apis: [
        { id: 201, name: 'Already linked', api_type: 'rest', network_exposure: 'internal', role: 'provider' },
        { id: 202, name: 'Available API', api_type: 'graphql', network_exposure: 'internet', role: 'provider' },
      ],
    },
  ];
}
