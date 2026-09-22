import { expect, test, type Page } from "@playwright/test";
import { mockInventory } from "./inventory-fixture";
const base = "/workspaces/1/products/1";
async function choose(page: Page, label: string, option: string) {
  await page.getByRole("combobox", { name: label, exact: true }).click();
  await page.getByRole("option", { name: option, exact: true }).click();
}

test("client types are unique in drafts, creation and editing", async ({
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
  await dialog.locator("#component-name").fill("unique-clients");
  await dialog.getByRole("button", { name: "Add client", exact: true }).click();
  await dialog.getByRole("button", { name: "Add client", exact: true }).click();
  await dialog
    .getByRole("combobox", { name: "Client name 2", exact: true })
    .click();
  await expect(
    page.getByRole("option", { name: "REST client", exact: true }),
  ).toHaveCount(0);
  await page.getByRole("option", { name: "gRPC client", exact: true }).click();
  await dialog.getByRole("button", { name: "Create", exact: true }).click();
  await expect(dialog).toHaveCount(0);
  const created = state.components.find((c) => c.name === "unique-clients")!;
  expect(created.clients.map((c) => c.client_name)).toEqual([
    "rest-client",
    "grpc-client",
  ]);
  await page.goto(`${base}/components/${created.id}`);
  await page.getByRole("button", { name: "Add client", exact: true }).click();
  await dialog
    .getByRole("combobox", { name: "Client name", exact: true })
    .click();
  await expect(
    page.getByRole("option", { name: "REST client", exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("option", { name: "gRPC client", exact: true }),
  ).toHaveCount(0);
  await page.keyboard.press("Escape");
  await dialog.getByRole("button", { name: "Cancel", exact: true }).click();
  await page
    .getByRole("button", { name: "client actions REST client", exact: true })
    .click();
  await page
    .getByRole("menuitem", { name: "Edit client", exact: true })
    .click();
  await dialog
    .getByRole("combobox", { name: "Client name", exact: true })
    .click();
  await expect(
    page.getByRole("option", { name: "REST client", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("option", { name: "gRPC client", exact: true }),
  ).toHaveCount(0);
});

test("connections retain independently selected arrow styles and plain action text", async ({
  page,
  context,
}) => {
  const state = await mockInventory(context);
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(`${base}/architecture`);
  await expect(page).toHaveTitle(/Architecture/);
  for (const [id, shape, stroke, arrow] of [
    [20, "Straight", "Dashed", "Open arrow"],
    [21, "Elbow", "Dotted", "No arrow"],
  ] as const) {
    await page
      .getByRole("button", { name: "Create integration", exact: true })
      .click();
    await choose(page, "Line shape", shape);
    await choose(page, "Line style", stroke);
    await choose(page, "Arrowhead", arrow);
    await expect(
      page.getByRole("img", { name: `${shape}, ${stroke}, ${arrow}` }),
    ).toBeVisible();
    if (id === 20) {
      await page.setViewportSize({ width: 390, height: 960 });
      const settings = page.locator("#map-tool-panel");
      const bounds = (await settings.boundingBox())!;
      expect(bounds.x).toBeGreaterThan(60);
      expect(bounds.x + bounds.width).toBeLessThanOrEqual(390);
      await page.screenshot({ path: "/private/tmp/alpa-tools-mobile.png" });
      await page.setViewportSize({ width: 1440, height: 1000 });
    }
    await page.getByRole("button", { name: "Close tool settings" }).click();
    await page
      .getByRole("button", {
        name: "Integrate client Kafka client",
        exact: true,
      })
      .click();
    await page
      .getByRole("button", {
        name: new RegExp(`^Integrate with API .*#${id}$`),
      })
      .click();
    await expect(
      page.getByRole("dialog").getByRole("combobox", { name: "Target API" }),
    ).toHaveCount(0);
    await expect(
      page.getByRole("dialog").getByRole("combobox", { name: "Line shape" }),
    ).toHaveCount(0);
    await page
      .getByRole("dialog")
      .getByRole("button", { name: "Create integration", exact: true })
      .click();
    await expect(page.getByRole("dialog")).toHaveCount(0);
  }
  expect(
    state.calls
      .filter((c) => c.path === "/v1/integrations" && c.method === "POST")
      .map((c) => Object.keys(c.body as object).sort()),
  ).toEqual([
    ["action", "api_id", "client_id", "description"],
    ["action", "api_id", "client_id", "description"],
  ]);
  for (const reload of [false, true]) {
    if (reload) await page.reload();
    await expect(page.locator(".react-flow__edge")).toHaveCount(2);
    const ports = await page
      .locator('.react-flow__node[data-id="2"] [data-port]')
      .all();
    const boxes = await Promise.all(ports.map((port) => port.boundingBox()));
    expect(Math.abs(boxes[0]!.y - boxes[1]!.y)).toBeGreaterThan(30);
    const first = page.locator(".react-flow__edge-path").first();
    const second = page.locator(".react-flow__edge-path").nth(1);
    await expect(first).toHaveAttribute("d", /L/);
    await expect(first).toHaveCSS("stroke-dasharray", "8px, 5px");
    await expect(first).toHaveAttribute("marker-end", /url/);
    await expect(second).toHaveCSS("stroke-dasharray", "2px, 5px");
    await expect(second).not.toHaveAttribute("marker-end", /url/);
    await expect(page.locator(".edge-label").first()).toHaveText("produce");
    await expect(page.locator(".edge-label").first()).toHaveCSS(
      "background-color",
      "rgba(0, 0, 0, 0)",
    );
    await expect(page.locator(".edge-label").first()).toHaveCSS(
      "font-weight",
      "700",
    );
  }
  await page.screenshot({ path: "/private/tmp/alpa-connection-styles.png" });
  expect(errors).toEqual([]);
});

test("infrastructure connection follows the facing edge as a client moves across it", async ({
  page,
  context,
}) => {
  const state = await mockInventory(context);
  state.components[0].clients[0].integrations = [
    {
      id: 6001,
      client_id: 10,
      api_id: 20,
      action: "produce",
      description: null,
    },
  ];
  await context.addInitScript(() =>
    localStorage.setItem(
      "alpa:map:v1:1",
      JSON.stringify({
        positions: { "1": { x: 950, y: 280 }, "2": { x: 500, y: 280 } },
        viewport: { x: 0, y: 0, zoom: 0.8 },
      }),
    ),
  );
  await page.goto(`${base}/architecture`);
  const target = page.locator('.react-flow__node[data-id="2"]');
  const source = page.locator('.react-flow__node[data-id="1"]');
  const path = page.locator(".react-flow__edge-path");
  const endX = () =>
    path.evaluate((element: SVGPathElement) => {
      const point = element.getPointAtLength(element.getTotalLength());
      return new DOMPoint(point.x, point.y).matrixTransform(
        element.getScreenCTM()!,
      ).x;
    });
  const expectSourceAtSquare = async (side: "left" | "right") => {
    const square = (await source
      .locator(`[data-port="client-10"] [data-port-side="${side}"]`)
      .boundingBox())!;
    await expect
      .poll(() =>
        path.evaluate((element: SVGPathElement) => {
          const point = element.getPointAtLength(0);
          const screen = new DOMPoint(point.x, point.y).matrixTransform(
            element.getScreenCTM()!,
          );
          return { x: screen.x, y: screen.y };
        }),
      )
      .toEqual({
        x: expect.closeTo(square.x + square.width / 2, 0),
        y: expect.closeTo(square.y + square.height / 2, 0),
      });
  };
  await expect(path).toBeVisible();
  await expectSourceAtSquare("left");
  let bounds = (await target
    .locator('[data-port="api-20"] [data-port-side="right"]')
    .boundingBox())!;
  await expect.poll(endX).toBeCloseTo(bounds.x + bounds.width / 2, 0);
  await expect(source.locator('[data-port="client-10"]')).toHaveAttribute(
    "data-side",
    "left",
  );
  const header = (await source.locator(".node-heading").boundingBox())!;
  await page.mouse.move(header.x + 80, header.y + 20);
  await page.mouse.down();
  await page.mouse.move(header.x - 650, header.y + 20, { steps: 24 });
  await page.mouse.up();
  bounds = (await target
    .locator('[data-port="api-20"] [data-port-side="left"]')
    .boundingBox())!;
  await expect.poll(endX).toBeCloseTo(bounds.x + bounds.width / 2, 0);
  await expect(source.locator('[data-port="client-10"]')).toHaveAttribute(
    "data-side",
    "right",
  );
  await expectSourceAtSquare("right");
  await page.screenshot({ path: "/private/tmp/alpa-auto-connection.png" });
});
