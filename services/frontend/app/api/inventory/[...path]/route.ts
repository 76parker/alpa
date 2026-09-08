import type { ApiError } from '../../../../lib/inventory/contracts';

type RouteContext = {
  params: Promise<{ path: string[] }> | { path: string[] };
};

const positiveID = /^[1-9]\d*$/;

function isAllowed(method: string, path: string[]) {
  if (method === 'GET') {
    return path.length === 1 && path[0] === 'workspaces'
      || path.length === 3 && path[0] === 'workspaces' && positiveID.test(path[1]) && path[2] === 'products'
      || path.length === 3 && path[0] === 'products' && positiveID.test(path[1]) && path[2] === 'components'
      || path.length === 2 && path[0] === 'components' && positiveID.test(path[1]);
  }
  if (method === 'POST') {
    return path.length === 1 && (path[0] === 'workspaces' || path[0] === 'components')
      || path.length === 3 && path[0] === 'workspaces' && positiveID.test(path[1]) && path[2] === 'products'
      || path.length === 3 && path[0] === 'components' && positiveID.test(path[1]) && path[2] === 'consumer-apis';
  }
  return false;
}

function errorResponse(code: string, message: string, status: number) {
  const error: ApiError = { code, message, status };
  return Response.json(error, { status });
}

async function configuredBaseURL() {
  let runtimeBaseURL: string | undefined;
  try {
    const { env } = await import('cloudflare:workers');
    runtimeBaseURL = (env as { API_SERVER_BASE_URL?: string }).API_SERVER_BASE_URL;
  } catch {
    // Node-based tests and deployments provide server variables via process.env.
  }

  const configured = runtimeBaseURL?.trim() || process.env.API_SERVER_BASE_URL?.trim();
  if (configured) return configured.replace(/\/+$/, '');
  if (process.env.NODE_ENV === 'development') return 'http://localhost:8080';
  return undefined;
}

async function proxy(request: Request, context: RouteContext) {
  const { path } = await context.params;
  if (!isAllowed(request.method, path)) {
    return errorResponse('not_found', 'Inventory API route not found', 404);
  }

  const baseURL = await configuredBaseURL();
  if (!baseURL) {
    return errorResponse('api_not_configured', 'Inventory API is not configured', 503);
  }

  const sourceURL = new URL(request.url);
  const upstreamURL = `${baseURL}/v1/${path.map(encodeURIComponent).join('/')}${sourceURL.search}`;
  const headers = new Headers({ accept: 'application/json' });
  let body: string | undefined;
  if (request.method === 'POST') {
    headers.set('content-type', 'application/json');
    body = await request.text();
  }

  try {
    const upstream = await fetch(upstreamURL, {
      method: request.method,
      headers,
      body,
      cache: 'no-store',
      redirect: 'manual',
      signal: request.signal,
    });
    const responseBody = upstream.status === 204 ? null : await upstream.arrayBuffer();
    return new Response(responseBody, {
      status: upstream.status,
      headers: { 'content-type': upstream.headers.get('content-type') ?? 'application/json' },
    });
  } catch {
    return errorResponse('api_unavailable', 'Inventory API is unavailable', 502);
  }
}

export function GET(request: Request, context: RouteContext) {
  return proxy(request, context);
}

export function POST(request: Request, context: RouteContext) {
  return proxy(request, context);
}
