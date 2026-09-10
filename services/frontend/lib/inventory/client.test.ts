import { afterEach, describe, expect, it, vi } from 'vitest';
import { InventoryClient, InventoryRequestError } from './client';

afterEach(() => vi.unstubAllGlobals());

describe('InventoryClient', () => {
  it('loads every page in batches of 100', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      const offset = Number(new URL(url, 'https://atlas.example').searchParams.get('offset'));
      const data = offset === 0
        ? Array.from({ length: 100 }, (_, index) => ({ id: index + 1, name: `Workspace ${index + 1}` }))
        : [{ id: 101, name: 'Workspace 101' }];
      return new Response(JSON.stringify({ data, pagination: { limit: 100, offset } }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    });
    vi.stubGlobal('fetch', fetchMock);

    const workspaces = await new InventoryClient().listAllWorkspaces();

    expect(workspaces).toHaveLength(101);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(String(fetchMock.mock.calls[1][0])).toContain('limit=100&offset=100');
  });

  it('exposes the server error code and status without leaking raw failures', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({
      code: 'consumer_api_link_already_exists',
      message: 'consumer api link already exists',
      status: 409,
    }), { status: 409, headers: { 'content-type': 'application/json' } })));

    try {
      await new InventoryClient().addConsumerAPI(4, 9);
      expect.fail('expected the request to fail');
    } catch (error) {
      expect(error).toBeInstanceOf(InventoryRequestError);
      expect((error as InventoryRequestError).code).toBe('consumer_api_link_already_exists');
      expect((error as InventoryRequestError).status).toBe(409);
    }
  });

  it('posts the exact consumer relationship contract', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      void input;
      void init;
      return new Response(null, { status: 204 });
    });
    vi.stubGlobal('fetch', fetchMock);

    await new InventoryClient().addConsumerAPI(4, 9);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toBe('/v1/components/4/consumer-apis');
    expect(init?.method).toBe('POST');
    expect(JSON.parse(String(init?.body))).toEqual({ api_id: 9 });
  });
});
