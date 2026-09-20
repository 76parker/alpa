import { test, expect, type Page } from "@playwright/test";
import { mockInventory, service } from "./inventory-fixture";
const base = "/workspaces/1/products/1";
let runtimeErrors: string[] = [];
test.beforeEach(async ({ context }) => {
  runtimeErrors = [];
  context.on("page", (page) =>
    page.on("pageerror", (error) => runtimeErrors.push(error.message)),
  );
});
test.afterEach(() => {
  expect(runtimeErrors, "Unhandled browser errors").toEqual([]);
});

async function choose(page: Page, label: string, option: string) {
  await page.getByRole("combobox", { name: label, exact: true }).click();
  await page.getByRole("option", { name: option, exact: true }).click();
  await expect(page.getByRole("listbox")).toHaveCount(0);
}
async function createFromMenu(page: Page, type: string) {
  if (type === "Infrastructure") {
    await page
      .getByRole("button", { name: "Infrastructure", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Create infrastructure", exact: true })
      .first()
      .click();
    return;
  }
  await page
    .getByRole("button", { name: /^Create (component|service)$/ })
    .first()
    .click();
  await page.getByRole("menuitem", { name: type, exact: true }).click();
}
test("global navigation works without a workspace and does not call missing APIs", async ({
  page,
  context,
}) => {
  const state = await mockInventory(context, { empty: true });
  for (const [path, label] of [
    ["/", "Dashboard"],
    ["/templates", "Templates"],
    ["/teams", "Teams"],
    ["/teams/42", "Teams"],
    ["/settings", "Settings"],
  ]) {
    await page.goto(path);
    await expect(
      page.getByText("In development", { exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: label, exact: true }),
    ).toBeVisible();
    await page.getByRole("link", { name: "Back", exact: true }).click();
    await expect(page.getByText("Create your first workspace")).toBeVisible();
    await expect(
      page.locator(
        'nav[aria-label="Primary navigation"] a[aria-current="page"]',
      ),
    ).toHaveCount(1);
  }
  expect(
    state.calls.every((call) => call.path.startsWith("/v1/workspaces?")),
  ).toBe(true);
});
test("workspace creation preserves errors, trims names, switches and deletes active workspace", async ({
  page,
  context,
}) => {
  const state = await mockInventory(context, { empty: true });
  await page.goto("/workspaces");
  await page
    .getByRole("button", { name: "Create workspace", exact: true })
    .first()
    .click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Name", { exact: false }).fill("  New workspace  ");
  state.failNext = "/workspaces";
  await dialog
    .getByRole("button", { name: "Create workspace", exact: true })
    .click();
  await expect(dialog.getByRole("alert")).toContainText(
    "Temporary network failure",
  );
  await expect(dialog.getByLabel("Name", { exact: false })).toHaveValue(
    "  New workspace  ",
  );
  await dialog
    .getByRole("button", { name: "Create workspace", exact: true })
    .click();
  await expect(page).toHaveURL(/workspaces\/1000\/products$/);
  expect(state.workspaces[0].name).toBe("New workspace");
  await page.getByRole("link", { name: "Workspace", exact: true }).click();
  await page.getByRole("button", { name: "Actions for New workspace" }).click();
  await page.getByRole("menuitem", { name: "Delete workspace" }).click();
  await page
    .getByRole("alertdialog")
    .getByRole("button", { name: "Delete", exact: true })
    .click();
  await expect(page.getByText("Create your first workspace")).toBeVisible();
});
test("full inventory flow: create product, service, infrastructure with independent exposure, bind and delete API", async ({
  page,
  context,
}) => {
  const state = await mockInventory(context, { empty: true });
  await page.goto("/workspaces");
  await page
    .getByRole("button", { name: "Create workspace", exact: true })
    .first()
    .click();
  await page.getByLabel("Name", { exact: false }).fill("Flow workspace");
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Create workspace", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Create product", exact: true })
    .first()
    .click();
  await page.getByLabel("Name", { exact: false }).fill("Flow product");
  await page.getByLabel("Code", { exact: false }).fill("FLOW");
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Create product", exact: true })
    .click();
  await page.getByRole("tab", { name: "Components", exact: true }).click();
  await createFromMenu(page, "Backend");
  await page.locator("#component-name").fill("orders-service");
  await page.getByRole("button", { name: "Add client", exact: true }).click();
  await choose(page, "Client name 1", "Kafka client");
  await choose(page, "Role 1", "PRODUCER");
  await page.getByRole("button", { name: "Create", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "orders-service" }),
  ).toBeVisible();
  await page
    .getByRole("link", { name: "Back to components", exact: false })
    .click();
  await createFromMenu(page, "Infrastructure");
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Create", exact: true })
    .click();
  await expect(
    page.getByText("Select the infrastructure importancy."),
  ).toBeVisible();
  await choose(page, "Importancy", "CRITICAL");
  await page.getByRole("button", { name: "Add API", exact: true }).click();
  await page
    .getByLabel("Topic name 1", { exact: true })
    .fill("orders.internal");
  await page.getByRole("button", { name: "Add API", exact: true }).click();
  await page.getByLabel("Topic name 2", { exact: true }).fill("orders.public");
  await choose(page, "Exposure 2", "Internet");
  await expect(
    page.getByRole("combobox", { name: "Exposure 1", exact: true }),
  ).toHaveText("Internal");
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Create", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Kafka", exact: true }),
  ).toBeVisible();
  const infra = state.components.find(
    (item) => item.type === "infrastructure",
  )!;
  expect(infra.apis.map((api) => api.network_exposure)).toEqual([
    "internal",
    "internet",
  ]);
  const source = state.components.find(
    (item) => item.name === "orders-service",
  )!;
  const prod = state.products[0];
  const path = `/workspaces/${prod.workspace_id}/products/${prod.id}`;
  await page.goto(`${path}/components/${source.id}`);
  await page.getByRole("button", { name: "Connect Kafka client" }).click();
  await choose(page, "Target API", "Kafka / orders.public");
  await page
    .getByRole("button", { name: "Create connection", exact: true })
    .click();
  await expect(
    page.getByRole("link", { name: "Kafka · orders.public", exact: true }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole("link", { name: "Kafka · orders.public", exact: true }),
  ).toBeVisible();
  await page.goto(`${path}/architecture`);
  await expect(page.locator(".react-flow__edge")).toHaveCount(1);
  await page.goto(`${path}/components/${infra.id}`);
  await page.getByRole("button", { name: "API actions orders.public" }).click();
  await page.getByRole("menuitem", { name: "Delete API" }).click();
  await page
    .getByRole("alertdialog")
    .getByRole("button", { name: "Delete", exact: true })
    .click();
  await page.goto(`${path}/components/${source.id}`);
  await expect(
    page.getByRole("button", { name: "Connect Kafka client", exact: true }),
  ).toBeVisible();
});
test("edits preserve hidden fields, exposure and limits; cancel asks to discard", async ({
  page,
  context,
}) => {
  const state = await mockInventory(context);
  await page.goto(`${base}/components/1`);
  await page.getByRole("button", { name: "API actions REST API" }).click();
  await page.getByRole("menuitem", { name: "Edit API" }).click();
  await choose(page, "Exposure", "Internet");
  await page.getByRole("button", { name: "Save changes" }).click();
  expect(state.components[0].apis[0].documentation_url).toBe(
    "https://example.com/docs",
  );
  expect(state.components[0].apis[0].network_exposure).toBe("internet");
  await page
    .getByRole("button", { name: "client actions Kafka client" })
    .click();
  await page.getByRole("menuitem", { name: "Edit client" }).click();
  await choose(page, "Role", "CONSUMER");
  await page.getByRole("button", { name: "Save changes" }).click();
  expect(state.components[0].clients[0]).toMatchObject({
    action: "# Keep action",
    capabilities: "write:orders",
    secure_connection: true,
    role: "consumer",
  });
  await page.goto(`${base}/components`);
  await createFromMenu(page, "Backend");
  await page.locator("#component-name").fill("draft");
  for (let index = 0; index < 5; index++)
    await page.getByRole("button", { name: "Add API", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Add API", exact: true }),
  ).toBeDisabled();
  for (let index = 0; index < 5; index++)
    await page.getByRole("button", { name: "Add client", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Add client", exact: true }),
  ).toBeDisabled();
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  await expect(page.getByRole("alertdialog")).toContainText(
    "Discard unsaved changes",
  );
  await page
    .getByRole("alertdialog")
    .getByRole("button", { name: "Cancel", exact: true })
    .click();
  await expect(page.locator("#component-name")).toHaveValue("draft");
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  await page
    .getByRole("button", { name: "Discard draft", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
});
test("loads every component page for search and architecture", async ({
  page,
  context,
}) => {
  const state = await mockInventory(context, { many: true });
  await page.goto(`${base}/components`);
  await expect(page.getByText("105 components", { exact: true })).toBeVisible();
  await page
    .getByRole("textbox", { name: "Search services" })
    .fill("service-105");
  await expect(
    page.getByRole("link", { name: /service-105/ }).first(),
  ).toBeVisible();
  expect(state.calls.some((call) => call.path.includes("offset=100"))).toBe(
    true,
  );
  await page.goto(`${base}/architecture`);
  await expect(page.locator(".react-flow__node")).toHaveCount(105);
  await page.goto(`${base}/architecture?component=105`);
  await expect(
    page
      .getByRole("complementary", { name: "Component details" })
      .getByRole("heading", { name: "service-105" }),
  ).toBeVisible();
});
test("binding conflict refreshes client while preserving target selection", async ({
  page,
  context,
}) => {
  const state = await mockInventory(context);
  state.conflict = true;
  await page.goto(`${base}/components/1`);
  await page.getByRole("button", { name: "Connect Kafka client" }).click();
  await choose(page, "Target API", "Kafka / orders.updated");
  await page.getByRole("button", { name: "Create connection" }).click();
  await expect(
    page.getByRole("combobox", { name: "Target API" }),
  ).toContainText("Kafka / orders.updated");
  await expect(
    page.getByText("This client is already connected.", { exact: false }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Create connection" }),
  ).toBeDisabled();
});
test("legacy and direct links resolve to entities and unavailable sections", async ({
  page,
  context,
}) => {
  await mockInventory(context);
  await page.goto("/products/TRADE/components/1/security/sast");
  await expect(page.getByText("In development", { exact: true })).toBeVisible();
  await page.goto("/products/TRADE/threat-model");
  await expect(page.getByText("In development", { exact: true })).toBeVisible();
  await page.goto("/teams/1");
  await expect(page.getByText("In development", { exact: true })).toBeVisible();
  await page.goto("/workspaces/1/products/999");
  await expect(
    page.getByText("Product not found", { exact: true }),
  ).toBeVisible();
  await page.goto("/products/MISSING");
  await expect(
    page.getByText("Product not found", { exact: true }),
  ).toBeVisible();
});
for (const width of [1440, 1024, 390])
  test(`visual layouts and navigation at ${width}px`, async ({
    page,
    context,
  }) => {
    await mockInventory(context);
    await page.setViewportSize({ width, height: 1000 });
    await page.goto("/products");
    await expect(
      page.getByRole("link", { name: "Trading Platform", exact: true }),
    ).toBeVisible();
    await page.screenshot({
      path: `test-results/visual/products-${width}.png`,
      fullPage: true,
    });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
    if (width === 390) {
      await page.getByRole("button", { name: "Open navigation" }).click();
      await expect(
        page.getByRole("link", { name: "Settings", exact: true }),
      ).toBeVisible();
      await page.keyboard.press("Escape");
    }
    await page.goto(`${base}/components`);
    await expect(page.getByRole("table")).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
    await createFromMenu(page, "Infrastructure");
    await choose(page, "Importancy", "CRITICAL");
    await page.getByRole("button", { name: "Add API", exact: true }).click();
    await page.getByLabel("Topic name 1").fill("orders.created");
    await page.screenshot({
      path: `test-results/visual/infrastructure-${width}.png`,
      fullPage: true,
    });
    expect(
      await page
        .getByRole("dialog")
        .evaluate((element) => element.scrollWidth <= element.clientWidth + 1),
    ).toBe(true);
    await page.getByRole("button", { name: "Cancel", exact: true }).click();
    await page.getByRole("button", { name: "Discard draft" }).click();
    await page.goto(`${base}/architecture`);
    await expect(page.locator(".react-flow__node")).toHaveCount(2);
    await page.screenshot({
      path: `test-results/visual/map-${width}.png`,
      fullPage: true,
    });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
    await page
      .getByRole("button", { name: "Create backend", exact: true })
      .click();
    await page.locator("#component-name").fill("pricing-service");
    await page
      .locator("#component-description")
      .fill("Calculates instrument prices and publishes quote events.");
    await page.getByRole("button", { name: "Add API", exact: true }).click();
    await page.getByLabel("API name 1", { exact: true }).fill("Pricing REST");
    await page.getByRole("button", { name: "Add client", exact: true }).click();
    await choose(page, "Client name 1", "Kafka client");
    await choose(page, "Role 1", "PRODUCER");
    await expect(page.locator("#repository-url")).toBeDisabled();
    await page.locator("#component-name").scrollIntoViewIfNeeded();
    await page.screenshot({
      path: `test-results/visual/service-${width}.png`,
      fullPage: true,
    });
    expect(
      await page
        .getByRole("dialog")
        .evaluate((element) => element.scrollWidth <= element.clientWidth + 1),
    ).toBe(true);
    if (width === 390) {
      const fields = await page.locator(".component-form-fields").boundingBox();
      const preview = await page.locator(".live-preview").boundingBox();
      expect(preview!.y).toBeGreaterThan(fields!.y + fields!.height - 1);
      await page.locator(".live-preview").scrollIntoViewIfNeeded();
      await page.screenshot({
        path: "test-results/visual/service-preview-390.png",
      });
    }
  });

test("map preserves viewport across panels and reload; two tabs synchronize API deletion", async ({
  page,
  context,
}) => {
  const state = await mockInventory(context);
  state.components[0].clients[0].api_id = 20;
  await page.goto(`${base}/architecture`);
  await expect(page.locator(".react-flow__edge")).toHaveCount(1);
  await page.getByRole("button", { name: "Zoom in", exact: true }).click();
  await expect(
    page.locator(".map-controls").getByText("96%", { exact: true }),
  ).toBeVisible();
  const before = await page
    .locator(".react-flow__viewport")
    .getAttribute("style");
  await page
    .getByRole("button", {
      name: "Connection order-service to Kafka",
      exact: true,
    })
    .click();
  await expect(
    page.getByRole("complementary", { name: "Connection details" }),
  ).toBeVisible();
  expect(
    await page.locator(".react-flow__viewport").getAttribute("style"),
  ).toBe(before);
  await page
    .getByRole("button", { name: "Close details", exact: true })
    .click();
  await page.reload();
  await expect(page.locator(".react-flow__edge")).toHaveCount(1);
  await expect(page.locator(".react-flow__viewport")).toHaveAttribute(
    "style",
    before!,
  );
  const second = await context.newPage();
  await second.goto(`${base}/components/2`);
  await second
    .getByRole("button", { name: "API actions orders.created" })
    .click();
  await second.getByRole("menuitem", { name: "Delete API" }).click();
  await second
    .getByRole("alertdialog")
    .getByRole("button", { name: "Delete", exact: true })
    .click();
  await expect(page.locator(".react-flow__edge")).toHaveCount(0);
  await page
    .getByRole("button", {
      name: "Connect from client Kafka client",
      exact: true,
    })
    .click();
  await expect(
    page.getByText(
      "Select an API on another component to connect this client.",
    ),
  ).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(
    page.getByText(
      "Select an API on another component to connect this client.",
    ),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "Auto layout", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Auto layout", exact: true }),
  ).toBeEnabled();
  await second.close();
});
test("keyboard navigation, failed component save and back navigation keep drafts", async ({
  page,
  context,
}) => {
  const state = await mockInventory(context);
  await page.goto(`${base}/components/new`);
  await page.locator("#component-name").fill("frontend-draft");
  await page.keyboard.press("Tab");
  await expect(page.locator("#component-description")).toBeFocused();
  state.failNext = "/components";
  await page.getByRole("button", { name: "Create", exact: true }).click();
  await expect(page.getByRole("dialog").getByRole("alert")).toContainText(
    "Temporary network failure",
  );
  await expect(page.locator("#component-name")).toHaveValue("frontend-draft");
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  await page.getByRole("button", { name: "Discard draft" }).click();
  await expect(page).toHaveURL(`${base}/components`);
  await createFromMenu(page, "Frontend");
  await page.locator("#component-name").fill("web-app");
  await page.getByRole("button", { name: "Create", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "web-app", exact: true }),
  ).toBeVisible();
  expect(state.components.find((item) => item.name === "web-app")?.type).toBe(
    "frontend-service",
  );
});

test("map supports dragging, neighbors, full screen overlays and opening in a separate tab", async ({
  page,
  context,
}) => {
  const state = await mockInventory(context);
  state.components[0].clients[0].api_id = 20;
  state.components.push(service(3, "unrelated-service"));
  await page.goto(base);
  const [map] = await Promise.all([
    context.waitForEvent("page"),
    page.getByRole("link", { name: "Open architecture", exact: true }).click(),
  ]);
  await expect(map).toHaveURL(`${base}/architecture`);
  await expect(map.locator(".react-flow__node")).toHaveCount(3);
  const node = map.locator('.react-flow__node[data-id="1"]');
  const positionBefore = await node.evaluate(
    (element) => (element as HTMLElement).style.transform,
  );
  const heading = await node.locator(".node-heading").boundingBox();
  await map.mouse.move(heading!.x + 45, heading!.y + 20);
  await map.mouse.down();
  await map.mouse.move(heading!.x + 115, heading!.y + 75, { steps: 8 });
  await map.mouse.up();
  await expect
    .poll(() =>
      node.evaluate((element) => (element as HTMLElement).style.transform),
    )
    .not.toBe(positionBefore);
  const positionAfter = await node.evaluate(
    (element) => (element as HTMLElement).style.transform,
  );
  await map.reload();
  await expect
    .poll(() =>
      map
        .locator('.react-flow__node[data-id="1"]')
        .evaluate((element) => (element as HTMLElement).style.transform),
    )
    .toBe(positionAfter);
  await map
    .getByRole("button", { name: "Open order-service", exact: true })
    .click();
  await map.getByRole("button", { name: "Neighborhood", exact: true }).click();
  await expect(map.locator(".react-flow__node")).toHaveCount(2);
  await map.getByRole("button", { name: "Close details", exact: true }).click();
  await map.getByRole("button", { name: "Full screen", exact: true }).click();
  await expect
    .poll(() => map.evaluate(() => Boolean(document.fullscreenElement)))
    .toBe(true);
  await map
    .getByRole("button", { name: "Create infrastructure", exact: true })
    .click();
  await expect(map.getByRole("dialog")).toBeVisible();
  await map.getByRole("combobox", { name: "SystemName", exact: true }).click();
  await expect(
    map.getByRole("option", { name: "PostgreSQL", exact: true }),
  ).toBeVisible();
  await map.keyboard.press("Escape");
  await map.getByRole("button", { name: "Cancel", exact: true }).click();
  await map.getByRole("button", { name: "Full screen", exact: true }).click();
  await expect
    .poll(() => map.evaluate(() => Boolean(document.fullscreenElement)))
    .toBe(false);
  await map.getByRole("button", { name: "Close window", exact: true }).click();
  await expect.poll(() => map.isClosed()).toBe(true);
  await expect(
    page.getByRole("heading", { name: "Trading Platform" }),
  ).toBeVisible();
});
