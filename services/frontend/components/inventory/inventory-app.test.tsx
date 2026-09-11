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

it('switches workspaces from an inline sidebar disclosure without opening a chooser dialog', async () => {
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
  const choices = screen.getByRole('region', { name: 'Workspace options' });
  await user.click(within(choices).getByRole('button', { name: 'Platform' }));

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
  expect(brand.querySelector('img')?.getAttribute('width')).toBe('67');
  expect(brand.querySelector('img')?.getAttribute('height')).toBe('67');
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
        { id: 3, workspace_id: 7, product_code: 'OPS', name: 'Operations', criticality: 'business-operational', description: 'Runs operations' },
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
    if (url.includes('/products/3/components')) return response<ListResponse<Component>>({ data: [
      { id: 13, product_id: 3, name: 'Operations worker', type: 'background-worker', description: '', details: { language: 'Go', language_version: '', framework: '', broker: 'kafka' }, apis: [
        { id: 103, name: 'Events', api_type: 'event', network_exposure: 'internal', role: 'provider' },
      ] },
    ], pagination: { limit: 100, offset: 0 } });
    throw new Error(`Unexpected request: ${url}`);
  }));

  render(<StatefulInventory initialRoute={{ kind: 'overview' }} />);

  expect(await screen.findByRole('heading', { name: 'Dashboard is in development' })).toBeTruthy();
  const main = screen.getByRole('main');
  expect(within(main).getByText('In development')).toBeTruthy();
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
  expect(screen.queryByText('Core mission or safety impact')).toBeNull();
  expect(screen.queryByText('Severe customer or revenue impact')).toBeNull();
  expect(screen.queryByText('Material disruption to operations')).toBeNull();
  expect(screen.queryByText('Limited internal productivity impact')).toBeNull();
  await user.type(screen.getByRole('textbox', { name: 'Product code' }), 'PAY');
  await user.type(screen.getByRole('textbox', { name: 'Product name' }), 'Payments API');
  const criticality = screen.getByRole('combobox', { name: 'Criticality' });
  expect(criticality.querySelector('option:checked')?.getAttribute('value')).toBe('business-operational');
  await user.selectOptions(criticality, 'business-critical');
  await user.type(screen.getByRole('textbox', { name: 'Description' }), 'Processes payments');
  await user.click(screen.getByRole('button', { name: 'Create product' }));

  expect(await screen.findByRole('heading', { name: 'Products' })).toBeTruthy();
  expect(screen.getByRole('status').textContent).toContain('Product created');
  expect(screen.getByRole('button', { name: 'Payments API' }).closest('tr')?.classList.contains('recently-created')).toBe(false);
  const description = screen.getByLabelText('Description: Processes payments');
  expect(description.textContent).toBe('...');
  expect(description.tagName).toBe('BUTTON');
  expect(description.getAttribute('title')).toBeNull();
  await user.hover(description);
  expect((await screen.findByRole('tooltip')).textContent).toBe('Processes payments');
  const createRequest = requests.find((item) => item.init?.method === 'POST');
  expect(JSON.parse(String(createRequest?.init?.body))).toEqual({
    product_code: 'PAY',
    name: 'Payments API',
    criticality: 'business-critical',
    description: 'Processes payments',
  });
});

describe('component request variants', () => {
  it.each([
    ['backend-service', { language: 'Go', languageVersion: '1.25', framework: 'Gin' }, { language: 'Go', language_version: '1.25', framework: 'Gin' }],
    ['frontend-service', { language: 'TypeScript', languageVersion: '', framework: 'React' }, { language: 'TypeScript', framework: 'React' }],
    ['background-worker', { language: 'Go', languageVersion: '', framework: '', broker: 'kafka' }, { language: 'Go', broker: 'kafka' }],
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
  render(<StatefulInventory initialRoute={{ kind: 'product', productKey: 'PAY' }} />);

  await user.click((await screen.findAllByRole('button', { name: 'Create component' }))[0]);
  await user.selectOptions(screen.getByRole('combobox', { name: 'Component type' }), 'infrastructure');
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
  render(<StatefulInventory initialRoute={{ kind: 'product', productKey: 'PAY' }} />);

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
  await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Create component' }));

  expect(await screen.findByText('component details are invalid')).toBeTruthy();
  expect(screen.getByRole('dialog')).toBeTruthy();
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
  expect(context.textContent).toContain('WorkspacePaymentsProductPaymentsComponentConsumer');
  expect(within(context).getByRole('button', { name: 'Open workspace Payments' })).toBeTruthy();
  await user.click(within(context).getByRole('button', { name: 'Open product Payments' }));
  expect(await screen.findByRole('heading', { name: 'Payments' })).toBeTruthy();
  await user.click(within(screen.getByRole('navigation', { name: 'Current location' })).getByRole('button', { name: 'Open workspace Payments' }));
  expect(await screen.findByRole('heading', { name: 'Workspace' })).toBeTruthy();
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
