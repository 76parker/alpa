import { expect, test } from "@playwright/test";
import { mockInventory } from "./inventory-fixture";
const base = "/workspaces/1/products/1/architecture";
test("tools isolate canvas gestures, switch modes and preserve fullscreen menus", async ({
  page,
  context,
}) => {
  await mockInventory(context);
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto(base);
  await expect(page.locator(".react-flow__node")).toHaveCount(2);
  await expect(page.locator(".map-toolbar")).toHaveCount(0);
  const rail = page.getByRole("toolbar", { name: "Architecture tools" });
  expect((await rail.boundingBox())!.width).toBe(60);
  await rail.getByRole("button", { name: "Select", exact: true }).click();
  await page.getByRole("button", { name: "Select all", exact: true }).click();
  await expect(page.getByText("2 selected", { exact: true })).toBeVisible();
  const viewport = page.locator(".react-flow__viewport");
  const transform = await viewport.getAttribute("style");
  const panel = page.locator("#map-tool-panel");
  await panel.hover();
  await page.mouse.wheel(0, 300);
  const bounds = (await panel.locator("header").boundingBox())!;
  await page.mouse.move(bounds.x + 50, bounds.y + 10);
  await page.mouse.down();
  await page.mouse.move(bounds.x + 100, bounds.y + 70, { steps: 8 });
  await page.mouse.up();
  await expect(viewport).toHaveAttribute("style", transform!);
  await expect(page.locator(".react-flow__node.selected")).toHaveCount(2);
  await page.keyboard.press("Escape");
  await expect(panel).toHaveCount(0);
  await expect(page.locator(".react-flow__node.selected")).toHaveCount(2);
  await expect(
    rail.getByRole("button", { name: "Select", exact: true }),
  ).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.getByText("2 selected", { exact: true })).toBeVisible();
  await page.keyboard.press("Escape");
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("Enter");
  await expect(
    rail.getByRole("button", { name: "Create integration", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await expect(
    rail.getByRole("button", { name: "Select", exact: true }),
  ).toHaveAttribute("aria-pressed", "false");
  await page.getByRole("button", { name: "Filters", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Show only integrated services" }),
  ).toBeDisabled();
  await expect(
    rail.getByRole("button", { name: "Create integration", exact: true }),
  ).toHaveAttribute("aria-pressed", "false");
  await page.getByRole("combobox", { name: "Show components" }).click();
  await page.getByRole("option", { name: "Services", exact: true }).click();
  await expect(page.locator(".react-flow__node")).toHaveCount(1);
  await page.getByRole("button", { name: "Full screen", exact: true }).click();
  await expect
    .poll(() => page.evaluate(() => !!document.fullscreenElement))
    .toBe(true);
  await page.getByRole("combobox", { name: "Show components" }).click();
  await expect(page.getByRole("listbox")).toBeVisible();
  expect(
    await page
      .getByRole("listbox")
      .evaluate((element) => document.fullscreenElement!.contains(element)),
  ).toBe(true);
  await page.keyboard.press("Escape");
  await expect(panel).toBeVisible();
  await page
    .getByRole("button", { name: "Add component", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Create frontend", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toBeVisible();
  expect(
    await page
      .getByRole("dialog")
      .evaluate((element) => document.fullscreenElement!.contains(element)),
  ).toBe(true);
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.getByRole("button", { name: "Full screen", exact: true }).click();
  await expect
    .poll(() => page.evaluate(() => !!document.fullscreenElement))
    .toBe(false);
  await page
    .getByRole("button", { name: "Add component", exact: true })
    .click();
  await expect(
    rail.getByRole("button", { name: "Add component", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await expect
    .poll(() =>
      page
        .locator(".map-create-actions img")
        .evaluateAll(
          (images) =>
            images.length === 3 &&
            images.every(
              (image) =>
                (image as HTMLImageElement).complete &&
                (image as HTMLImageElement).naturalWidth > 0,
            ),
        ),
    )
    .toBe(true);
  await page.screenshot({ path: "/private/tmp/alpa-left-tools.png" });
  expect(errors).toEqual([]);
});

for (const [sourceSide, targetSide] of [
  ["right", "left"],
  ["left", "right"],
] as const) {
  test(`square handles connect ${sourceSide} to ${targetSide} and native APIs show TCP/UDP`, async ({
    page,
    context,
  }) => {
    const state = await mockInventory(context);
    state.components[1].apis[0].api_type = "native-protocol";
    await page.goto(base);
    const source = page.locator(
      `[data-port="client-10"] .port-handle[data-port-side="${sourceSide}"]`,
    );
    const target = page.locator(
      `[data-port="api-20"] .port-handle[data-port-side="${targetSide}"]`,
    );
    await expect(page.locator('[data-port="api-20"]')).toContainText("TCP/UDP");
    const start = (await source.boundingBox())!;
    const end = (await target.boundingBox())!;
    await page.mouse.move(
      start.x + start.width / 2,
      start.y + start.height / 2,
    );
    await page.mouse.down();
    await page.mouse.move(end.x + end.width / 2, end.y + end.height / 2, {
      steps: 15,
    });
    await page.mouse.up();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await expect(
      dialog.getByRole("combobox", { name: "Target API" }),
    ).toHaveCount(0);
    await dialog
      .getByRole("button", { name: "Create integration", exact: true })
      .click();
    await expect(dialog).toHaveCount(0);
    await expect(page.locator(".react-flow__edge")).toHaveCount(1);
    expect(state.components[0].clients[0].integrations[0].api_id).toBe(20);
  });
}

test("infrastructure empty endpoints are centered and map action is prominent", async ({
  page,
  context,
}) => {
  const state = await mockInventory(context);
  const infrastructure = state.components[1];
  if ("endpoints" in infrastructure.details)
    infrastructure.details.endpoints = [];
  await page.goto("/workspaces/1/products/1/components?view=infrastructure");
  const empty = page.locator(".infrastructure-endpoints.empty");
  await expect(empty).toHaveText("—");
  await expect(empty).toHaveCSS("align-items", "center");
  const action = page.getByRole("link", { name: "Show on map", exact: true });
  await expect(action).toBeVisible();
  expect((await action.boundingBox())!.height).toBeGreaterThanOrEqual(36);
  await page.screenshot({ path: "/private/tmp/alpa-infrastructure-table.png" });
});
