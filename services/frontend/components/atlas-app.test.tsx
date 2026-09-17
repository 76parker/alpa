import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import type {
  Component,
  ListResponse,
  Product,
  Workspace,
} from "../lib/inventory/contracts";
import { AtlasApp } from "./atlas-app";

const workspace: Workspace = { id: 7, name: "Payments" };
const product: Product = {
  id: 12,
  workspace_id: 7,
  product_code: "GCPAY",
  name: "Global Checkout",
  criticality: "mission-critical",
  description: "Coordinates global checkout and payments.",
};
const components: Component[] = [
  {
    id: 101,
    product_id: 12,
    name: "Checkout API",
    type: "backend-service",
    description: "Accepts checkout requests.",
    details: { language: "Go", language_version: "1.25", framework: "Gin" },
    apis: [
      {
        id: 201,
        name: "Checkout REST API",
        api_type: "rest",
        network_exposure: "internet",
      },
    ],
    clients: [
      {
        id: 301,
        client_name: "rest-client",
        role: "caller",
        communication_type: "request-response",
        description: "Calls fraud scoring",
        api_id: 202,
      },
    ],
  },
  {
    id: 102,
    product_id: 12,
    name: "Fraud scoring",
    type: "backend-service",
    description: "Scores payment risk.",
    details: { language: "Go", language_version: "1.25", framework: "Chi" },
    apis: [
      {
        id: 202,
        name: "Fraud API",
        api_type: "graphql",
        network_exposure: "internal",
      },
    ],
    clients: [],
  },
];

function response<T>(value: T, status = 200) {
  return new Response(JSON.stringify(value), {
    status,
    headers: { "content-type": "application/json" },
  });
}

function list<T>(data: T[]): ListResponse<T> {
  return { data, pagination: { limit: 100, offset: 0 } };
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
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/workspaces?")) return response(list([workspace]));
      if (url.includes("/workspaces/7/products"))
        return response(list([product]));
      if (url.includes("/products/12/components"))
        return response(list(components));
      throw new Error(`Unexpected request: ${url}`);
    }),
  );
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

it("restores a direct product route and its title", async () => {
  window.history.replaceState({}, "", "/products/GCPAY");
  render(<AtlasApp />);

  await waitFor(() => expect(document.title).toBe("Global Checkout · Alpa"));
  expect(window.location.pathname).toBe("/products/GCPAY");
});

it("renders client bindings as React Flow connections on the architecture route", async () => {
  window.history.replaceState({}, "", "/products/GCPAY/architecture");
  render(<AtlasApp />);

  expect(
    (await screen.findByTestId("architecture-node-component-101")).textContent,
  ).toContain("Checkout API");
  expect(
    screen.getByTestId("architecture-node-component-102").textContent,
  ).toContain("Fraud scoring");
  expect(screen.getByText("REST client")).toBeTruthy();
  expect(screen.getByText("GraphQL")).toBeTruthy();
  expect(document.title).toBe("Architecture map · Alpa");
});

it("opens a component from the architecture graph", async () => {
  window.history.replaceState({}, "", "/products/GCPAY/architecture");
  render(<AtlasApp />);

  const node = await screen.findByTestId("architecture-node-component-101");
  const openButton = node.querySelector<HTMLButtonElement>(
    ".architecture-node-open",
  );
  expect(openButton?.getAttribute("aria-label")).toBe(
    "Open component Checkout API",
  );
  openButton?.click();

  await waitFor(() =>
    expect(window.location.pathname).toBe("/products/GCPAY/components/101"),
  );
  expect(
    await screen.findByRole("heading", { name: "Checkout API" }),
  ).toBeTruthy();
});
