import type { BrowserContext, Route } from "@playwright/test";
import type {
  Component,
  Product,
  Workspace,
  ComponentAPI,
  ComponentClient,
} from "../../src/api/types";
export const fixtureWorkspace: Workspace = { id: 1, name: "Acme workspace" };
export const fixtureProduct: Product = {
  id: 1,
  workspace_id: 1,
  name: "Trading Platform",
  product_code: "TRADE",
  criticality: "mission-critical",
  description: "Product for high-frequency trading.",
  owning_team_id: null,
};
export function service(id = 1, name = "order-service"): Component {
  return {
    id,
    product_id: 1,
    name,
    type: "backend-service",
    description: "Processes orders and publishes events.",
    details: { language: "go" },
    apis: [
      {
        id: id * 10,
        name: "REST API",
        api_type: "rest",
        network_exposure: "internal",
        documentation_url: "https://example.com/docs",
      },
    ],
    clients: [
      {
        id: id * 10,
        client_name: "kafka-client",
        role: "producer",
        communication_type: "events",
        action: "# Keep action",
        capabilities: "write:orders",
        secure_connection: true,
        api_id: null,
      },
    ],
  };
}
export function infrastructure(id = 2): Component {
  return {
    id,
    product_id: 1,
    name: "Kafka",
    type: "infrastructure",
    description: "",
    details: {
      technology_name: "kafka",
      technology_type: "message-broker",
      importancy: "critical",
      version: "",
      endpoints: [],
    },
    apis: [
      {
        id: id * 10,
        name: "orders.created",
        api_type: "topic",
        network_exposure: "internal",
        documentation_url: null,
      },
      {
        id: id * 10 + 1,
        name: "orders.updated",
        api_type: "topic",
        network_exposure: "internet",
        documentation_url: null,
      },
    ],
    clients: [],
  };
}
export async function mockInventory(
  context: BrowserContext,
  options: { empty?: boolean; many?: boolean } = {},
) {
  const state = {
    workspaces: options.empty ? ([] as Workspace[]) : [fixtureWorkspace],
    products: options.empty
      ? ([] as Product[])
      : [
          fixtureProduct,
          {
            ...fixtureProduct,
            id: 2,
            name: "Risk Platform",
            product_code: "RISK",
            criticality: "business-critical" as const,
            description: "Real-time trade risk assessment.",
          },
          {
            ...fixtureProduct,
            id: 3,
            name: "Developer Portal",
            product_code: "DEV",
            criticality: "office-productivity" as const,
            description: "Internal documentation and service discovery.",
          },
        ],
    components: options.empty
      ? ([] as Component[])
      : options.many
        ? Array.from({ length: 105 }, (_, index) =>
            service(index + 1, `service-${String(index + 1).padStart(3, "0")}`),
          )
        : [service(), infrastructure()],
    calls: [] as { method: string; path: string; body: unknown }[],
    failNext: "",
    conflict: false,
  };
  let next = 1000;
  const respond = (route: Route, data: unknown, status = 200) =>
    route.fulfill({
      status,
      contentType: "application/json",
      body: status === 204 ? undefined : JSON.stringify(data),
    });
  await context.route("**/v1/**", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const path = url.pathname;
    const method = request.method();
    const body = request.postDataJSON();
    state.calls.push({ method, path: path + url.search, body });
    if (state.failNext && path.includes(state.failNext)) {
      state.failNext = "";
      return respond(
        route,
        {
          message: "Temporary network failure. Please retry.",
          code: "temporary_failure",
        },
        500,
      );
    }
    const page = <T>(items: T[]) => ({
      data: items.slice(
        Number(url.searchParams.get("offset") || 0),
        Number(url.searchParams.get("offset") || 0) +
          Number(url.searchParams.get("limit") || 100),
      ),
      pagination: {
        limit: 100,
        offset: Number(url.searchParams.get("offset") || 0),
      },
    });
    if (path === "/v1/workspaces") {
      if (method === "GET") return respond(route, page(state.workspaces));
      const workspace = { id: next++, name: body.name };
      state.workspaces.push(workspace);
      return respond(route, workspace, 201);
    }
    const ws = path.match(/^\/v1\/workspaces\/(\d+)$/);
    if (ws && method === "DELETE") {
      state.workspaces = state.workspaces.filter(
        (item) => item.id !== Number(ws[1]),
      );
      return respond(route, null, 204);
    }
    const prods = path.match(/^\/v1\/workspaces\/(\d+)\/products$/);
    if (prods) {
      if (!state.workspaces.some((item) => item.id === Number(prods[1])))
        return respond(
          route,
          { message: "Workspace not found", code: "not_found" },
          404,
        );
      if (method === "GET")
        return respond(
          route,
          page(
            state.products.filter(
              (item) => item.workspace_id === Number(prods[1]),
            ),
          ),
        );
      const product = {
        ...body,
        id: next++,
        workspace_id: Number(prods[1]),
        description: body.description || null,
        owning_team_id: body.owning_team_id || null,
      };
      state.products.push(product);
      return respond(route, product, 201);
    }
    const prod = path.match(/^\/v1\/products\/(\d+)$/);
    if (prod) {
      if (method === "DELETE") {
        state.products = state.products.filter(
          (item) => item.id !== Number(prod[1]),
        );
        return respond(route, null, 204);
      }
      const item = state.products.find((item) => item.id === Number(prod[1]));
      return item
        ? respond(route, item)
        : respond(
            route,
            { message: "Product not found", code: "not_found" },
            404,
          );
    }
    const comps = path.match(/^\/v1\/products\/(\d+)\/components$/);
    if (comps)
      return respond(
        route,
        page(
          state.components.filter(
            (item) => item.product_id === Number(comps[1]),
          ),
        ),
      );
    const createAPI = (body: Partial<ComponentAPI>): ComponentAPI => ({
      id: next++,
      name: body.name!,
      api_type: body.api_type!,
      network_exposure: body.network_exposure!,
      documentation_url: body.documentation_url || null,
    });
    const createClient = (body: Partial<ComponentClient>): ComponentClient => ({
      id: next++,
      client_name: body.client_name!,
      role: body.role!,
      communication_type: ["kafka-client", "rabbitmq-client"].includes(
        body.client_name!,
      )
        ? "events"
        : "request-response",
      action: body.action || null,
      capabilities: body.capabilities || null,
      secure_connection: body.secure_connection || false,
      api_id: null,
    });
    if (path === "/v1/components" && method === "POST") {
      const item: Component = {
        ...body,
        id: next++,
        description: body.description || "",
        apis: (body.apis || []).map(createAPI),
        clients: (body.clients || []).map(createClient),
      };
      state.components.push(item);
      return respond(route, item, 201);
    }
    const parts = path.match(
      /^\/v1\/components\/(\d+)(?:\/(apis|clients)(?:\/(\d+)(?:\/(bindings))?)?)?$/,
    );
    if (parts) {
      const component = state.components.find(
        (item) => item.id === Number(parts[1]),
      );
      if (!component)
        return respond(route, { message: "Component not found" }, 404);
      const portID = Number(parts[3]);
      if (!parts[2]) {
        if (method === "GET") return respond(route, component);
        state.components = state.components.filter(
          (item) => item.id !== component.id,
        );
        return respond(route, null, 204);
      }
      if (parts[4]) {
        const client = component.clients.find((item) => item.id === portID)!;
        if (state.conflict || client.api_id !== null) {
          client.api_id =
            state.components.flatMap((item) => item.apis)[0]?.id || 10;
          return respond(
            route,
            {
              message: "Client is already bound",
              code: "client_already_bound",
            },
            409,
          );
        }
        client.api_id = body.api_id;
        return respond(
          route,
          { client_id: client.id, api_id: body.api_id },
          201,
        );
      }
      if (parts[2] === "apis") {
        if (method === "DELETE") {
          component.apis = component.apis.filter((api) => api.id !== portID);
          state.components.forEach((item) =>
            item.clients.forEach((client) => {
              if (client.api_id === portID) client.api_id = null;
            }),
          );
          return respond(route, null, 204);
        }
        if (method === "PUT") {
          const api = component.apis.find((item) => item.id === portID)!;
          Object.assign(api, body);
          return respond(route, api);
        }
        const api = createAPI(body);
        component.apis.push(api);
        return respond(route, api, 201);
      }
      if (method === "DELETE") {
        component.clients = component.clients.filter(
          (item) => item.id !== portID,
        );
        return respond(route, null, 204);
      }
      if (method === "PUT") {
        const client = component.clients.find((item) => item.id === portID)!;
        Object.assign(client, body);
        return respond(route, client);
      }
      const client = createClient(body);
      component.clients.push(client);
      return respond(route, client, 201);
    }
    return respond(
      route,
      { message: `Unexpected API request ${method} ${path}` },
      500,
    );
  });
  return state;
}
