import {
  cleanup,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { AtlasRoute } from "../../lib/routes";
import type {
  Component,
  ListResponse,
  Product,
  Workspace,
} from "../../lib/inventory/contracts";
import { InventoryProvider } from "./inventory-context";
import { InventoryApp } from "./inventory-app";
import { ComponentCreatePage } from "./component-pages";

const workspace: Workspace = { id: 7, name: "Platform" };
const product: Product = {
  id: 9,
  workspace_id: 7,
  product_code: "PAY",
  name: "Payments",
  criticality: "mission-critical",
};

function response<T>(value: T, status = 200) {
  return new Response(JSON.stringify(value), {
    status,
    headers: { "content-type": "application/json" },
  });
}

function list<T>(data: T[]): ListResponse<T> {
  return { data, pagination: { limit: 100, offset: 0 } };
}

function StatefulInventory({ initialRoute }: { initialRoute: AtlasRoute }) {
  const [route, setRoute] = useState(initialRoute);
  return (
    <InventoryProvider>
      <InventoryApp route={route} navigate={setRoute} />
    </InventoryProvider>
  );
}

function componentFixture(overrides: Partial<Component> = {}): Component {
  return {
    id: 11,
    product_id: 9,
    name: "Checkout API",
    type: "backend-service",
    description: "Accepts checkout requests.",
    details: { language: "Go", language_version: "1.25", framework: "Gin" },
    apis: [
      {
        id: 21,
        name: "Public API",
        api_type: "rest",
        network_exposure: "internet",
      },
    ],
    clients: [],
    ...overrides,
  } as Component;
}

beforeEach(() => {
  const storage = new Map<string, string>();
  Object.defineProperty(window, "localStorage", {
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

describe("component creation", () => {
  it("lets users add and remove infrastructure network addresses", async () => {
    const onCreate = vi.fn(async () => undefined);
    const user = userEvent.setup();
    render(
      <ComponentCreatePage
        product={product}
        onClose={vi.fn()}
        onCreate={onCreate}
      />,
    );

    await user.type(
      screen.getByRole("textbox", { name: "Component name" }),
      "Cache",
    );
    await user.click(screen.getByRole("button", { name: "Component type" }));
    await user.click(
      within(
        screen.getByRole("listbox", { name: "Component type options" }),
      ).getByRole("option", { name: /Infrastructure/ }),
    );
    await user.type(screen.getByRole("textbox", { name: "System" }), "Redis");
    await user.click(screen.getByRole("button", { name: "Add address" }));
    await user.type(
      screen.getByRole("textbox", { name: "Network address 1" }),
      "redis://cache:6379",
    );
    await user.click(screen.getByRole("button", { name: "Create component" }));

    await waitFor(() =>
      expect(onCreate).toHaveBeenCalledWith({
        product_id: 9,
        name: "Cache",
        type: "infrastructure",
        details: {
          system: "Redis",
          system_type: "sql-database",
          network_address: ["redis://cache:6379"],
        },
      }),
    );
    await user.click(
      screen.getByRole("button", { name: "Remove network address 1" }),
    );
    expect(screen.getByText("No network addresses added.")).toBeTruthy();
  });

  it("submits the aggregate backend contract and updates the live graph preview", async () => {
    const requests: Array<{ url: string; init?: RequestInit }> = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = String(input);
        requests.push({ url, init });
        if (url.includes("/workspaces?")) return response(list([workspace]));
        if (url.includes("/workspaces/7/products"))
          return response(list([product]));
        if (url.includes("/products/9/components"))
          return response(list<Component>([]));
        if (url === "/v1/components" && init?.method === "POST") {
          return response(
            componentFixture({
              id: 41,
              clients: [
                {
                  id: 71,
                  client_name: "kafka-client",
                  role: "consumer",
                  communication_type: "events",
                  description: "Reads payment events",
                  api_id: null,
                },
              ],
            }),
            201,
          );
        }
        throw new Error(`Unexpected request: ${url}`);
      }),
    );

    const user = userEvent.setup();
    render(
      <StatefulInventory
        initialRoute={{ kind: "component-create", productKey: "PAY" }}
      />,
    );

    await screen.findByRole("heading", { name: "Create component" });
    expect(await screen.findByTestId("architecture-preview")).toBeTruthy();
    await user.type(
      screen.getByRole("textbox", { name: "Component name" }),
      "Checkout API",
    );
    await user.type(screen.getByRole("textbox", { name: "Language" }), "Go");

    const providedAPIs = screen.getByRole("region", { name: "Provided APIs" });
    await user.click(
      within(providedAPIs).getByRole("button", { name: "Add API" }),
    );
    await user.type(
      screen.getByRole("textbox", { name: "API name" }),
      "Public API",
    );

    const clients = screen.getByRole("region", { name: "Component clients" });
    await user.click(
      within(clients).getByRole("button", { name: "Add client" }),
    );
    await user.selectOptions(
      within(clients).getByRole("combobox", { name: "Client name" }),
      "kafka-client",
    );
    await user.selectOptions(
      within(clients).getByRole("combobox", { name: "Role" }),
      "consumer",
    );
    await user.type(
      within(clients).getByRole("textbox", { name: "Description" }),
      "Reads payment events",
    );

    expect(
      (
        await screen.findByTestId(
          "architecture-node-draft-component-component-draft",
        )
      ).textContent,
    ).toContain("Checkout API");
    await user.click(screen.getByRole("button", { name: "Create component" }));

    await waitFor(() =>
      expect(
        requests.some(
          ({ url, init }) =>
            url === "/v1/components" && init?.method === "POST",
        ),
      ).toBe(true),
    );
    const request = requests.find(
      ({ url, init }) => url === "/v1/components" && init?.method === "POST",
    );
    expect(JSON.parse(String(request?.init?.body))).toEqual({
      product_id: 9,
      name: "Checkout API",
      type: "backend-service",
      details: { language: "Go" },
      apis: [
        { name: "Public API", api_type: "rest", network_exposure: "internal" },
      ],
      clients: [
        {
          client_name: "kafka-client",
          role: "consumer",
          communication_type: "events",
          description: "Reads payment events",
        },
      ],
    });
  });
});

describe("component detail mutations", () => {
  it("creates an API and binds an unbound client through the current backend routes", async () => {
    const requests: Array<{ url: string; init?: RequestInit }> = [];
    let apiCreated = false;
    let clientBound = false;
    const consumer = componentFixture({
      clients: [
        {
          id: 61,
          client_name: "rest-client",
          role: "caller",
          communication_type: "request-response",
          description: "",
          api_id: null,
        },
      ],
    });
    const provider = componentFixture({
      id: 12,
      name: "Payment provider",
      apis: [
        {
          id: 91,
          name: "Provider API",
          api_type: "graphql",
          network_exposure: "internal",
        },
      ],
    });
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = String(input);
        requests.push({ url, init });
        if (url.includes("/workspaces?")) return response(list([workspace]));
        if (url.includes("/workspaces/7/products"))
          return response(list([product]));
        if (url.includes("/products/9/components"))
          return response(list([consumer, provider]));
        if (url === "/v1/components/11/apis" && init?.method === "POST") {
          apiCreated = true;
          return response(
            {
              id: 22,
              name: "Health",
              api_type: "rest",
              network_exposure: "internal",
            },
            201,
          );
        }
        if (
          url === "/v1/components/11/clients/61/bindings" &&
          init?.method === "POST"
        ) {
          clientBound = true;
          return response({ ...consumer.clients[0], api_id: 91 }, 201);
        }
        if (url === "/v1/components/11") {
          return response({
            ...consumer,
            apis: apiCreated
              ? [
                  ...consumer.apis,
                  {
                    id: 22,
                    name: "Health",
                    api_type: "rest",
                    network_exposure: "internal",
                  },
                ]
              : consumer.apis,
            clients: clientBound
              ? [{ ...consumer.clients[0], api_id: 91 }]
              : consumer.clients,
          });
        }
        throw new Error(`Unexpected request: ${url}`);
      }),
    );

    const user = userEvent.setup();
    render(
      <StatefulInventory
        initialRoute={{
          kind: "component",
          productKey: "PAY",
          componentId: "11",
        }}
      />,
    );

    await screen.findByRole("heading", { name: "Checkout API" });
    expect(await screen.findByTestId("architecture-preview")).toBeTruthy();
    expect(screen.getByText(/Caller/)).toBeTruthy();
    expect(screen.getByText(/Request-response/)).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "Create API" }));
    const apiDialog = screen.getByRole("dialog");
    await user.type(
      within(apiDialog).getByRole("textbox", { name: "API name" }),
      "Health",
    );
    await user.click(
      within(apiDialog).getByRole("button", { name: "Create API" }),
    );
    expect(await screen.findByText("Component API created")).toBeTruthy();

    await user.click(screen.getByRole("button", { name: "Bind client" }));
    const bindingDialog = screen.getByRole("dialog");
    expect(
      (
        within(bindingDialog).getByRole("combobox", {
          name: "Provider API",
        }) as HTMLSelectElement
      ).value,
    ).toBe("91");
    await user.click(
      within(bindingDialog).getByRole("button", { name: "Bind client" }),
    );
    expect(await screen.findByText("Client bound to API")).toBeTruthy();

    const apiRequest = requests.find(
      ({ url }) => url === "/v1/components/11/apis",
    );
    expect(JSON.parse(String(apiRequest?.init?.body))).toEqual({
      name: "Health",
      api_type: "rest",
      network_exposure: "internal",
    });
    const bindingRequest = requests.find(
      ({ url }) => url === "/v1/components/11/clients/61/bindings",
    );
    expect(JSON.parse(String(bindingRequest?.init?.body))).toEqual({
      api_id: 91,
    });
  });
});

it("keeps component listing compact and treats all returned APIs as provider APIs", async () => {
  const components = [
    componentFixture({
      apis: [
        {
          id: 21,
          name: "Public API",
          api_type: "rest",
          network_exposure: "internet",
        },
        {
          id: 22,
          name: "Admin API",
          api_type: "rest",
          network_exposure: "internal",
        },
      ],
    }),
    componentFixture({
      id: 12,
      name: "Checkout UI",
      type: "frontend-service",
      apis: [
        {
          id: 23,
          name: "UI API",
          api_type: "graphql",
          network_exposure: "internet",
        },
      ],
    }),
  ];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/workspaces?")) return response(list([workspace]));
      if (url.includes("/workspaces/7/products"))
        return response(list([product]));
      if (url.includes("/products/9/components"))
        return response(list(components));
      throw new Error(`Unexpected request: ${url}`);
    }),
  );

  render(
    <StatefulInventory
      initialRoute={{ kind: "product", productKey: "PAY", tab: "components" }}
    />,
  );

  const services = await screen.findByRole("region", {
    name: "Services components",
  });
  expect(within(services).getByText("REST ×2")).toBeTruthy();
  expect(within(services).getByText("GraphQL")).toBeTruthy();
});
