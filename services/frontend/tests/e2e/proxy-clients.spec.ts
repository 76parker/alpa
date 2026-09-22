import { expect, test } from "@playwright/test";
import { mockInventory } from "./inventory-fixture";
const base = "/workspaces/1/products/1";

test("proxy infrastructure offers only proxy clients, previews and submits both types", async ({
  page,
  context,
}) => {
  const state = await mockInventory(context);
  await page.goto(`${base}/architecture`);
  await page
    .getByRole("button", { name: "Add component", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Create infrastructure", exact: true })
    .click();
  const dialog = page.getByRole("dialog");
  await expect(
    dialog.getByRole("button", { name: "Add client", exact: true }),
  ).toHaveCount(0);
  await dialog.getByRole("combobox", { name: "System", exact: true }).click();
  await page.getByRole("option", { name: "Nginx", exact: true }).click();
  await dialog
    .getByRole("combobox", { name: "Importancy", exact: true })
    .click();
  await page.getByRole("option", { name: "CRITICAL", exact: true }).click();
  await dialog.getByRole("button", { name: "Add client", exact: true }).click();
  await dialog
    .getByRole("combobox", { name: "Client name 1", exact: true })
    .click();
  await expect(page.getByRole("option")).toHaveText([
    "HTTP proxy client",
    "gRPC proxy client",
  ]);
  await page
    .getByRole("option", { name: "HTTP proxy client", exact: true })
    .click();
  await dialog.getByRole("button", { name: "Add client", exact: true }).click();
  await dialog
    .getByRole("combobox", { name: "Client name 2", exact: true })
    .click();
  await page
    .getByRole("option", { name: "gRPC proxy client", exact: true })
    .click();
  await expect(dialog.locator(".live-preview")).toContainText(
    "HTTP proxy client",
  );
  await expect(dialog.locator(".live-preview")).toContainText(
    "gRPC proxy client",
  );
  await dialog.getByRole("button", { name: "Create", exact: true }).click();
  await expect(dialog).toHaveCount(0);
  expect(
    state.calls.find(
      (call) => call.method === "POST" && call.path === "/v1/components",
    )?.body,
  ).toMatchObject({
    details: { technology_type: "proxy/load-balancer" },
    clients: [
      { client_name: "http-proxy-client" },
      { client_name: "grpc-proxy-client" },
    ],
  });
});

test("proxy clients can be added from details and map and integrate with automatic proxy action", async ({
  page,
  context,
}) => {
  const state = await mockInventory(context);
  state.components[1] = {
    ...state.components[1],
    name: "Nginx",
    details: {
      technology_name: "nginx",
      technology_type: "proxy/load-balancer",
      importancy: "critical",
      version: "",
      endpoints: [],
    },
    apis: [],
  };
  for (const [view, name] of [
    ["components/2", "HTTP proxy client"],
    ["architecture", "gRPC proxy client"],
  ]) {
    await page.goto(`${base}/${view}`);
    if (view === "architecture")
      await page
        .getByRole("button", { name: "Open Nginx", exact: true })
        .click();
    await page.getByRole("button", { name: "Add client", exact: true }).click();
    const dialog = page.getByRole("dialog");
    await dialog
      .getByRole("combobox", { name: "Client name", exact: true })
      .click();
    await expect(page.getByRole("option")).toHaveText(
      view === "architecture"
        ? ["gRPC proxy client"]
        : ["HTTP proxy client", "gRPC proxy client"],
    );
    await page.getByRole("option", { name, exact: true }).click();
    await dialog
      .getByRole("button", { name: "Add client", exact: true })
      .click();
    await expect(dialog).toHaveCount(0);
  }
  await page.goto(`${base}/architecture`);
  for (const name of ["HTTP proxy client", "gRPC proxy client"]) {
    await page
      .getByRole("button", { name: `Integrate client ${name}`, exact: true })
      .click();
    await page
      .getByRole("button", {
        name: "Integrate with API REST · Internal · #10",
        exact: true,
      })
      .click();
    const dialog = page.getByRole("dialog");
    await expect(
      dialog.getByRole("combobox", { name: "Action", exact: true }),
    ).toHaveCount(0);
    await dialog
      .getByRole("button", { name: "Create integration", exact: true })
      .click();
    await expect(dialog).toHaveCount(0);
  }
  expect(
    state.calls
      .filter(
        (call) => call.method === "POST" && call.path === "/v1/integrations",
      )
      .map((call) => call.body),
  ).toEqual([
    {
      client_id: state.components[1].clients[0].id,
      api_id: 10,
      action: "proxy",
      description: null,
    },
    {
      client_id: state.components[1].clients[1].id,
      api_id: 10,
      action: "proxy",
      description: null,
    },
  ]);
  await expect(page.locator(".react-flow__edge")).toHaveCount(2);
});

test("switching to non-proxy infrastructure removes unsupported draft clients", async ({
  page,
  context,
}) => {
  await mockInventory(context);
  await page.goto(`${base}/architecture`);
  await page
    .getByRole("button", { name: "Add component", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Create infrastructure", exact: true })
    .click();
  const dialog = page.getByRole("dialog");
  const system = dialog.getByRole("combobox", { name: "System", exact: true });
  await system.click();
  await page.getByRole("option", { name: "Envoy", exact: true }).click();
  await dialog.getByRole("button", { name: "Add client", exact: true }).click();
  await expect(dialog.locator(".live-preview")).toContainText(
    "HTTP proxy client",
  );
  await system.click();
  await page.getByRole("option", { name: "Kafka", exact: true }).click();
  await expect(
    dialog.getByRole("button", { name: "Add client", exact: true }),
  ).toHaveCount(0);
  await expect(dialog.locator(".live-preview")).not.toContainText(
    "HTTP proxy client",
  );
  await system.click();
  await page.getByRole("option", { name: "Nginx", exact: true }).click();
  await expect(
    dialog.getByRole("heading", { name: "Clients 0/5" }),
  ).toBeVisible();
});
