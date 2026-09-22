import { expect, test } from "@playwright/test";
import { mockInventory, service } from "./inventory-fixture";

const base = "/workspaces/1/products/1";

for (const type of ["backend-service", "frontend-service"] as const) {
  test(`${type} overview shows live counts, exposure and TLS at desktop and mobile sizes`, async ({
    page,
    context,
  }) => {
    const state = await mockInventory(context);
    const component = service(1, "api-server");
    component.type = type;
    component.details = {
      language: type === "backend-service" ? "go" : "typescript",
      repository_url: "https://github.com/alpa/trading-platform/api-server",
    };
    component.apis[0].id = 1000000000000001;
    component.clients[0].id = 2000000000000001;
    component.clients[0].integrations = [
      {
        id: 1,
        client_id: 2000000000000001,
        api_id: 20,
        action: "produce",
        description: null,
      },
      {
        id: 2,
        client_id: 2000000000000001,
        api_id: 21,
        action: "produce",
        description: null,
      },
    ];
    component.clients.push({
      ...component.clients[0],
      id: 2000000000000002,
      client_name: "rest-client",
      secure_connection: false,
      integrations: [
        {
          id: 3,
          client_id: 2000000000000002,
          api_id: 21,
          action: "call",
          description: null,
        },
      ],
    });
    state.components[0] = component;
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    page.on("console", (message) => {
      if (message.type() === "error") errors.push(message.text());
    });
    for (const width of [1440, 390]) {
      await page.setViewportSize({ width, height: 960 });
      await page.goto(`${base}/components/1`);
      await expect(page).toHaveURL(`${base}/components/1`);
      await expect(page).toHaveTitle(/Trading Platform/);
      await expect(
        page.getByRole("heading", { name: "api-server", exact: true }),
      ).toBeVisible();
      const summary = page.getByRole("region", { name: "Component inventory" });
      await expect(summary.getByLabel("API count")).toHaveText("1");
      await expect(summary.getByLabel("Clients count")).toHaveText("2");
      await expect(summary.getByLabel("Integrations count")).toHaveText("3");
      await expect(
        page.getByRole("link", {
          name: "https://github.com/alpa/trading-platform/api-server",
        }),
      ).toHaveAttribute(
        "href",
        "https://github.com/alpa/trading-platform/api-server",
      );
      const apis = page.getByRole("table", { name: "Component APIs" });
      await expect(
        apis.getByRole("cell", { name: "1000000000000001", exact: true }),
      ).toBeVisible();
      await expect(apis.getByRole("columnheader")).toHaveText([
        "ID",
        "Type",
        "Network exposure",
      ]);
      await expect(
        apis.getByRole("cell").getByText("Internal", { exact: true }),
      ).toBeVisible();
      const clients = page.getByRole("table", { name: "Component clients" });
      await expect(
        clients.getByRole("row").filter({ hasText: "2000000000000001" }),
      ).toContainText("Enabled");
      await expect(
        clients.getByRole("row").filter({ hasText: "2000000000000002" }),
      ).toContainText("Disabled");
      await page
        .getByRole("button", {
          name: /^API actions REST · Internal · #1000000000000001$/,
        })
        .click();
      await page
        .getByRole("menuitem", { name: "Edit API", exact: true })
        .click();
      await expect(
        page.getByRole("dialog").getByLabel("API type", { exact: true }),
      ).toHaveText("REST");
      await expect(
        page.getByRole("dialog").getByLabel("Description", { exact: true }),
      ).toHaveCount(0);
      await page.getByRole("button", { name: "Cancel", exact: true }).click();
      await expect(
        page.getByRole("link", { name: "Open in architecture" }),
      ).toHaveAttribute("href", `${base}/architecture?component=1`);
      await page.screenshot({
        path: `/private/tmp/alpa-${type}-overview-${width}.png`,
        fullPage: true,
      });
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
    }
    expect(errors).toEqual([]);
  });
}

test("service overview handles missing data, five-port limits and live removal", async ({
  page,
  context,
}) => {
  const state = await mockInventory(context);
  const component = state.components[0];
  component.description = "";
  component.apis = [];
  component.clients = [];
  await page.goto(`${base}/components/1`);
  await expect(
    page.getByText("Repository not configured", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("No description provided.", { exact: true }),
  ).toBeVisible();
  await expect(page.getByText("No APIs yet", { exact: true })).toBeVisible();
  await expect(page.getByText("No clients yet", { exact: true })).toBeVisible();
  await expect(page.getByLabel("Integrations count")).toHaveText("0");
  const template = service();
  component.apis = Array.from({ length: 5 }, (_, i) => ({
    ...template.apis[0],
    id: i + 10,
  }));
  component.clients = Array.from({ length: 5 }, (_, i) => ({
    ...template.clients[0],
    id: i + 20,
  }));
  await page.reload();
  await expect(
    page.getByRole("button", { name: "Add API", exact: true }),
  ).toBeDisabled();
  await expect(
    page.getByRole("button", { name: "Add client", exact: true }),
  ).toBeDisabled();
  await expect(
    page.getByRole("table", { name: "Component APIs" }).getByRole("link"),
  ).toHaveCount(0);
  await page
    .getByRole("button", {
      name: "API actions REST · Internal · #10",
      exact: true,
    })
    .click();
  await page.getByRole("menuitem", { name: "Delete API", exact: true }).click();
  await page
    .getByRole("alertdialog")
    .getByRole("button", { name: "Delete", exact: true })
    .click();
  await expect(page.getByLabel("API count")).toHaveText("4");
  await expect(
    page.getByRole("button", { name: "Add API", exact: true }),
  ).toBeEnabled();
});
