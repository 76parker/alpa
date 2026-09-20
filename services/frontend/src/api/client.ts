export class APIError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = "APIError";
  }
}
export async function apiRequest<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const response = await fetch(path, {
    ...init,
    credentials: "same-origin",
    headers: {
      Accept: "application/json",
      ...(init.body ? { "Content-Type": "application/json" } : {}),
      ...init.headers,
    },
  });
  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new APIError(
      body?.message || `Request failed (${response.status}). Please try again.`,
      body?.code || "request_failed",
      response.status,
    );
  }
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}
export async function listAll<T>(
  path: string,
  signal?: AbortSignal,
): Promise<T[]> {
  const items: T[] = [];
  let offset = 0;
  for (;;) {
    const page = await apiRequest<{ data: T[] }>(
      `${path}?limit=100&offset=${offset}`,
      { signal },
    );
    if (!Array.isArray(page.data))
      throw new APIError(
        "The server returned an invalid inventory page.",
        "invalid_response",
        502,
      );
    items.push(...page.data);
    if (page.data.length < 100) return items;
    offset += page.data.length;
  }
}
export function errorMessage(error: unknown): string {
  return error instanceof APIError
    ? error.message
    : "Could not reach the server. Check your connection and try again.";
}
