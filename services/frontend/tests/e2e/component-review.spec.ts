import { expect, test } from "@playwright/test";
import { mockInventory } from "./inventory-fixture";
import { apiLabel, technologies } from "../../src/domain/catalog";
const base = "/workspaces/1/products/1";

test("service creation stays centered and submits multilingual descriptions", async ({
  page,
  context,
}) => {
  const state = await mockInventory(context);
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  for (const [width, height] of [
    [1676, 1726],
    [1440, 900],
    [390, 844],
  ]) {
    await page.setViewportSize({ width, height });
    await page.goto(`${base}/architecture`);
    await page
      .getByRole("button", { name: "Add component", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Create backend", exact: true })
      .click();
    const dialog = page.getByRole("dialog");
    await dialog.evaluate(async (element) => {
      await Promise.all(
        element.getAnimations().map((animation) => animation.finished),
      );
    });
    const box = (await dialog.boundingBox())!;
    expect(Math.abs(box.x + box.width / 2 - width / 2)).toBeLessThan(2);
    expect(Math.abs(box.y + box.height / 2 - height / 2)).toBeLessThan(2);
    expect(box.y).toBeGreaterThanOrEqual(12);
    expect(box.y + box.height).toBeLessThanOrEqual(height - 12);
    const description =
      "Обработка заказов — résumé\n注文の処理 · معالجة الطلبات";
    await dialog.locator("#component-name").fill(`multilingual-${width}`);
    await dialog.getByLabel("Description", { exact: true }).fill(description);
    await expect(dialog.getByLabel("Description", { exact: true })).toHaveValue(
      description,
    );
    await page.screenshot({
      path: `/private/tmp/alpa-service-dialog-${width}.png`,
    });
    await dialog.getByRole("button", { name: "Create", exact: true }).click();
    await expect(dialog).toHaveCount(0);
    expect(
      state.components.find(
        (component) => component.name === `multilingual-${width}`,
      )?.description,
    ).toBe(description);
  }
  expect(errors).toEqual([]);
});

for (const type of [
  "backend-service",
  "frontend-service",
  "infrastructure",
] as const) {
  test(`${type} API forms submit the required name, type and exposure`, async ({
    page,
    context,
  }) => {
    const state = await mockInventory(context);
    const component = state.components[type === "infrastructure" ? 1 : 0];
    component.type = type;
    await page.goto(`${base}/components/${component.id}`);
    await page.getByRole("button", { name: "Add API", exact: true }).click();
    const dialog = page.getByRole("dialog");
    await expect(dialog.getByRole("textbox")).toHaveCount(1);
    await dialog.getByLabel("API name", { exact: false }).fill("Orders");
    await dialog
      .getByRole("button", {
        name: type === "infrastructure" ? "Add topic" : "Add API",
        exact: true,
      })
      .click();
    await expect(dialog).toHaveCount(0);
    const api = component.apis.at(-1)!;
    expect(
      state.calls.findLast((call) => call.method === "POST")?.body,
    ).toEqual({
      name: "Orders",
      api_type: type === "infrastructure" ? "topic" : "rest",
      network_exposure: "internal",
    });
    await page
      .getByRole("button", { name: new RegExp(`^API actions .*#${api.id}$`) })
      .click();
    await page.getByRole("menuitem", { name: "Edit API", exact: true }).click();
    await expect(dialog.getByRole("textbox")).toHaveCount(1);
    await dialog.getByLabel("API name", { exact: false }).fill("Orders");
    await dialog
      .getByRole("combobox", { name: "Exposure", exact: true })
      .click();
    await page.getByRole("option", { name: "Internet", exact: true }).click();
    await dialog.getByRole("button", { name: "Save changes" }).click();
    await expect(dialog).toHaveCount(0);
    expect(state.calls.findLast((call) => call.method === "PUT")?.body).toEqual(
      {
        name: "Orders",
        api_type: api.api_type,
        network_exposure: "internet",
      },
    );
    expect(api.network_exposure).toBe("internet");
  });
}

test("draft fields are submitted and infrastructure headings match every system's API type", async ({
  page,
  context,
}) => {
  const state = await mockInventory(context);
  await page.goto(`${base}/architecture`);
  await page
    .getByRole("button", { name: "Add component", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Create backend", exact: true })
    .click();
  const dialog = page.getByRole("dialog");
  await dialog.locator("#component-name").fill("draft-service");
  await expect(
    dialog.getByLabel("Repository URL", { exact: true }),
  ).toBeEnabled();
  await dialog.getByLabel("Repository URL", { exact: true }).fill("not a URL");
  await dialog.getByRole("button", { name: "Create", exact: true }).click();
  await expect(dialog.getByText("Enter a valid repository URL.")).toBeVisible();
  await dialog
    .getByLabel("Repository URL", { exact: true })
    .fill("https://github.com/acme/draft-service");
  await dialog.getByRole("button", { name: "Add API", exact: true }).click();
  await expect(dialog.getByLabel("Documentation URL")).toHaveCount(0);
  await dialog.getByLabel("API name", { exact: false }).fill("Orders");
  await dialog.getByRole("button", { name: "Add client", exact: true }).click();
  await page.screenshot({ path: "/private/tmp/alpa-review-draft.png" });
  await dialog.getByRole("button", { name: "Create", exact: true }).click();
  await expect(dialog).toHaveCount(0);
  const created = state.components.find((c) => c.name === "draft-service")!;
  expect(created.details).toMatchObject({
    repository_url: "https://github.com/acme/draft-service",
  });
  expect(created.apis[0]).toEqual({
    id: expect.any(Number),
    name: "Orders",
    api_type: "rest",
    network_exposure: "internal",
  });
  expect(
    state.calls.findLast(
      (call) => call.path === "/v1/components" && call.method === "POST",
    )?.body,
  ).toMatchObject({
    apis: [{ api_type: "rest", network_exposure: "internal" }],
  });
  expect(created.clients[0].integrations).toEqual([]);
  await page
    .getByRole("button", { name: "Add component", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Create infrastructure", exact: true })
    .click();
  for (const system of technologies) {
    await dialog.getByRole("combobox", { name: "System", exact: true }).click();
    await page.getByRole("option", { name: system.label, exact: true }).click();
    await expect(dialog.locator(".draft-section h3").first()).toHaveText(
      `${apiLabel(system.apiType)} 0/5`,
    );
  }
});

test("API badges show type with hover and keyboard details while client metadata stays compact", async ({
  page,
  context,
}) => {
  const state = await mockInventory(context);
  state.components[0].clients[0].secure_connection = false;
  await page.setViewportSize({ width: 1191, height: 863 });
  await page.goto(`${base}/architecture?component=1`);
  const panel = page.getByRole("complementary", { name: "Component details" });
  const badge = panel.getByRole("button", {
    name: "Edit API REST · Internal · #10",
  });
  await expect(badge).toHaveText("REST");
  await badge.hover();
  const details = page.locator(".api-details-hover");
  await expect(details).toBeVisible();
  await expect(details.getByRole("heading")).toHaveText(
    "REST · Internal · #10",
  );
  await expect(details).toContainText("Internal");
  await expect(details.getByRole("link")).toHaveCount(0);
  await expect(details).not.toContainText("Documentation");
  await page.screenshot({ path: "/private/tmp/alpa-review-hover.png" });
  await page.mouse.move(5, 5);
  await expect(details).toHaveCount(0);
  await badge.focus();
  await expect(details).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(details).toHaveCount(0);
  await expect(panel.locator(".map-client-metadata")).toHaveText(
    "0 integrationsinsecure",
  );
  expect(
    await panel
      .locator(".map-client-metadata")
      .evaluate((el) => el.getBoundingClientRect().height),
  ).toBeLessThan(16);
  await expect(panel.locator(".map-component-actions")).toHaveCount(0);
  await page.getByRole("button", { name: "Filters", exact: true }).click();
  await expect(
    page.getByRole("button", {
      name: "Show only integrated services",
      exact: true,
    }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await badge.click();
  await expect(page.getByRole("dialog", { name: "Edit API" })).toBeVisible();
});

test("infrastructure labels, create icons and component headers stay aligned at narrow widths", async ({
  page,
  context,
}) => {
  const state = await mockInventory(context);
  for (const width of [838, 757, 390]) {
    await page.setViewportSize({ width, height: 863 });
    await page.goto(`${base}/architecture`);
    await expect(page.locator(".map-status")).not.toContainText(
      /\d+ components|\d+ connections/,
    );
    for (const icon of await page.locator(".map-create-actions img").all()) {
      await expect(icon).toHaveCSS("width", "22px");
      await expect(icon).toHaveCSS("height", "22px");
    }
    await page.screenshot({
      path: `/private/tmp/alpa-review-toolbar-${width}.png`,
    });
    await page
      .getByRole("button", { name: "Add component", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Create infrastructure", exact: true })
      .click();
    for (const id of ["system-name", "infrastructure-importancy"]) {
      await expect(page.locator(`label[for="${id}"]`)).toHaveCSS(
        "padding-left",
        "0px",
      );
    }
    await page.getByRole("dialog").evaluate(async (element) => {
      await Promise.all(
        element.getAnimations().map((animation) => animation.finished),
      );
    });
    await page.screenshot({
      path: `/private/tmp/alpa-review-alignment-${width}.png`,
    });
    await page.getByRole("button", { name: "Cancel", exact: true }).click();
    await page.goto(`${base}/components/2`);
    await expect(page.locator(".component-summary-heading h1")).toHaveText(
      "Kafka",
    );
    await expect(
      page.locator(".component-summary-heading .technology-icon"),
    ).toHaveCount(1);
    await expect(page.locator(".component-facts")).not.toContainText(
      /SystemName|Kafka/,
    );
    await expect(page.locator("#component-apis-heading")).toHaveText(
      "Topics 2/5",
    );
    await expect(
      page.locator(".component-api-table").getByRole("columnheader"),
    ).toHaveText(["API type", "Network exposure"]);
    await expect(page.locator(".component-type-badge")).toHaveCSS(
      "margin-top",
      "16px",
    );
    await expect(page.locator(".component-type-badge")).toHaveCSS(
      "height",
      "28px",
    );
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      path: `/private/tmp/alpa-review-infrastructure-${width}.png`,
      fullPage: true,
    });
    await page.goto(`${base}/components/1`);
    await expect(page.locator(".component-type-badge")).toHaveCSS(
      "height",
      "24px",
    );
    await expect(page.locator("#component-apis-heading")).toHaveText(
      "API 1 / 5",
    );
  }
  state.components[0].type = "frontend-service";
  await page.reload();
  await expect(page.locator(".component-type-badge")).toHaveText(
    "Go Frontend service",
  );
  await expect(page.locator(".component-type-badge")).toHaveCSS(
    "height",
    "24px",
  );
});

test("infrastructure detail titles use the technology's API collection", async ({
  page,
  context,
}) => {
  const state = await mockInventory(context);
  const component = state.components[1];
  for (const [name, expected] of [
    ["postgresql", "Databases"],
    ["kafka", "Topics"],
    ["rabbitmq", "Exchanges"],
    ["nats", "Subjects"],
    ["etcd", "gRPC"],
    ["elasticsearch", "REST"],
    ["zabbix", "JSON-RPC"],
  ]) {
    const system = technologies.find((system) => system.name === name)!;
    component.name = system.label;
    component.details = {
      technology_name: system.name,
      technology_type: system.type,
      importancy: "critical",
      endpoints: [],
      version: "",
    };
    component.apis.forEach((api) => {
      api.api_type = system.apiType;
    });
    await page.goto(`${base}/components/2`);
    await expect(page.locator("#component-apis-heading")).toHaveText(
      `${expected} 2/5`,
    );
    await expect(
      page.locator(".component-api-table").getByRole("columnheader"),
    ).toHaveText(["API type", "Network exposure"]);
    await page.goto(`${base}/architecture?component=2`);
    await expect(
      page
        .getByRole("complementary", { name: "Component details" })
        .locator(".section-heading h3"),
    ).toHaveText(`${expected} 2/5`);
  }
});
