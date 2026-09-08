import type {
  ApiError,
  Component,
  CreateComponentInput,
  CreateProductInput,
  ListResponse,
  Product,
  Workspace,
} from './contracts';

const PAGE_SIZE = 100;

export class InventoryRequestError extends Error {
  readonly code: string;
  readonly status: number;

  constructor(error: ApiError) {
    super(error.message);
    this.name = 'InventoryRequestError';
    this.code = error.code;
    this.status = error.status;
  }
}

export class InventoryClient {
  private async request<T>(path: string, init: RequestInit = {}): Promise<T> {
    const headers = new Headers(init.headers);
    headers.set('accept', 'application/json');
    if (init.body !== undefined) headers.set('content-type', 'application/json');

    let response: Response;
    try {
      response = await fetch(`/api/inventory/${path}`, { ...init, headers });
    } catch {
      throw new InventoryRequestError({
        code: 'api_unavailable',
        message: 'Inventory API is unavailable',
        status: 502,
      });
    }

    if (response.status === 204) return undefined as T;

    let payload: unknown;
    try {
      payload = await response.json();
    } catch {
      payload = undefined;
    }
    if (!response.ok) {
      const candidate = payload as Partial<ApiError> | undefined;
      throw new InventoryRequestError({
        code: candidate?.code ?? 'unexpected_error',
        message: candidate?.message ?? 'The inventory request could not be completed',
        status: candidate?.status ?? response.status,
      });
    }
    return payload as T;
  }

  private async listAll<T>(path: string, signal?: AbortSignal): Promise<T[]> {
    const items: T[] = [];
    let offset = 0;
    while (true) {
      const page = await this.request<ListResponse<T>>(`${path}?limit=${PAGE_SIZE}&offset=${offset}`, { signal });
      items.push(...page.data);
      if (page.data.length < PAGE_SIZE) return items;
      offset += page.data.length;
    }
  }

  listAllWorkspaces(signal?: AbortSignal) {
    return this.listAll<Workspace>('workspaces', signal);
  }

  createWorkspace(name: string, signal?: AbortSignal) {
    return this.request<Workspace>('workspaces', {
      method: 'POST',
      body: JSON.stringify({ name }),
      signal,
    });
  }

  listAllProducts(workspaceID: number, signal?: AbortSignal) {
    return this.listAll<Product>(`workspaces/${workspaceID}/products`, signal);
  }

  createProduct(workspaceID: number, input: CreateProductInput, signal?: AbortSignal) {
    return this.request<Product>(`workspaces/${workspaceID}/products`, {
      method: 'POST',
      body: JSON.stringify(input),
      signal,
    });
  }

  listAllComponents(productID: number, signal?: AbortSignal) {
    return this.listAll<Component>(`products/${productID}/components`, signal);
  }

  createComponent(input: CreateComponentInput, signal?: AbortSignal) {
    return this.request<Component>('components', {
      method: 'POST',
      body: JSON.stringify(input),
      signal,
    });
  }

  getComponent(componentID: number, signal?: AbortSignal) {
    return this.request<Component>(`components/${componentID}`, { signal });
  }

  addConsumerAPI(componentID: number, apiID: number, signal?: AbortSignal) {
    return this.request<void>(`components/${componentID}/consumer-apis`, {
      method: 'POST',
      body: JSON.stringify({ api_id: apiID }),
      signal,
    });
  }
}

export const inventoryClient = new InventoryClient();
