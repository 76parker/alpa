import { afterEach, describe, expect, it, vi } from 'vitest';
import { env } from 'cloudflare:workers';
import { GET, POST } from './route';

afterEach(() => {
  delete (env as Record<string, string | undefined>).API_SERVER_BASE_URL;
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe('inventory proxy', () => {
  it('prefers the hosted runtime binding over the process environment', async () => {
    (env as Record<string, string | undefined>).API_SERVER_BASE_URL = 'https://runtime.example/';
    vi.stubEnv('API_SERVER_BASE_URL', 'https://process.example');
    const upstream = vi.fn(async (input: RequestInfo | URL) => {
      void input;
      return Response.json({ data: [] });
    });
    vi.stubGlobal('fetch', upstream);

    const response = await GET(
      new Request('https://atlas.example/api/inventory/workspaces?limit=100'),
      { params: Promise.resolve({ path: ['workspaces'] }) },
    );

    expect(response.status).toBe(200);
    expect(String(upstream.mock.calls[0][0])).toBe(
      'https://runtime.example/v1/workspaces?limit=100',
    );
  });

  it('forwards an allowed URL, query, method, and JSON body without credentials', async () => {
    vi.stubEnv('API_SERVER_BASE_URL', 'https://inventory.example/base/');
    const upstream = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      void input;
      void init;
      return new Response(JSON.stringify({ id: 3 }), {
        status: 201,
        headers: { 'content-type': 'application/json' },
      });
    });
    vi.stubGlobal('fetch', upstream);

    const request = new Request('https://atlas.example/api/inventory/workspaces/7/products?limit=100&offset=20', {
      method: 'POST',
      headers: {
        authorization: 'Bearer browser-token',
        cookie: 'session=browser-session',
        'content-type': 'application/json',
      },
      body: JSON.stringify({ product_code: 'PAY' }),
    });
    const response = await POST(request, { params: Promise.resolve({ path: ['workspaces', '7', 'products'] }) });

    expect(response.status).toBe(201);
    const [url, init] = upstream.mock.calls[0];
    expect(String(url)).toBe('https://inventory.example/base/v1/workspaces/7/products?limit=100&offset=20');
    expect(init?.method).toBe('POST');
    expect(new Headers(init?.headers).get('authorization')).toBeNull();
    expect(new Headers(init?.headers).get('cookie')).toBeNull();
    expect(new Headers(init?.headers).get('content-type')).toBe('application/json');
    expect(init?.body).toBe(JSON.stringify({ product_code: 'PAY' }));
  });

  it('preserves an upstream JSON error status and body', async () => {
    vi.stubEnv('API_SERVER_BASE_URL', 'https://inventory.example');
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ code: 'invalid_request', message: 'invalid request', status: 400 }), {
      status: 400,
      headers: { 'content-type': 'application/json' },
    })));

    const response = await GET(
      new Request('https://atlas.example/api/inventory/workspaces?limit=100'),
      { params: Promise.resolve({ path: ['workspaces'] }) },
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ code: 'invalid_request', message: 'invalid request', status: 400 });
  });

  it('returns api_not_configured when production configuration is missing', async () => {
    vi.stubEnv('API_SERVER_BASE_URL', '');
    vi.stubEnv('NODE_ENV', 'production');

    const response = await GET(
      new Request('https://atlas.example/api/inventory/workspaces'),
      { params: Promise.resolve({ path: ['workspaces'] }) },
    );

    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({
      code: 'api_not_configured',
      message: 'Inventory API is not configured',
      status: 503,
    });
  });

  it('returns api_unavailable when the upstream request fails', async () => {
    vi.stubEnv('API_SERVER_BASE_URL', 'https://inventory.example');
    vi.stubGlobal('fetch', vi.fn(async () => { throw new TypeError('network failed'); }));

    const response = await GET(
      new Request('https://atlas.example/api/inventory/workspaces'),
      { params: Promise.resolve({ path: ['workspaces'] }) },
    );

    expect(response.status).toBe(502);
    expect(await response.json()).toEqual({
      code: 'api_unavailable',
      message: 'Inventory API is unavailable',
      status: 502,
    });
  });

  it('rejects paths outside the inventory allowlist', async () => {
    vi.stubEnv('API_SERVER_BASE_URL', 'https://inventory.example');
    const upstream = vi.fn();
    vi.stubGlobal('fetch', upstream);

    const response = await GET(
      new Request('https://atlas.example/api/inventory/products/2'),
      { params: Promise.resolve({ path: ['products', '2'] }) },
    );

    expect(response.status).toBe(404);
    expect(upstream).not.toHaveBeenCalled();
  });
});
