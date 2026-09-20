import { expect, test } from "@playwright/test";
import { mockInventory } from "./inventory-fixture";
import { languages } from "../../src/domain/enums";
import { technologies } from "../../src/domain/catalog";
const base = "/workspaces/1/products/1/architecture";

test("port badges move between three sides without changing bindings or node positions", async ({
  page,
  context,
}) => {
  const state = await mockInventory(context);
  state.components[0].clients[0].api_id = 20;
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(base);
  await expect(page.locator(".react-flow__edge")).toHaveCount(1);
  await expect(
    page.getByRole("textbox", { name: "Search architecture" }),
  ).toHaveCount(0);
  const node = page.locator('.react-flow__node[data-id="1"]');
  const api = node.locator('[data-port="api-10"]');
  const client = node.locator('[data-port="client-10"]');
  await expect(api).toHaveAttribute("data-side", "left");
  await expect(client).toHaveAttribute("data-side", "right");
  await expect(api.locator(".port-label")).toHaveText("REST");
  const position = await node.getAttribute("style");
  const path = await page.locator(".react-flow__edge-path").getAttribute("d");
  for (const side of ["bottom", "left", "right"] as const) {
    const badge = await client.locator(".port-label").boundingBox();
    const bounds = await node.boundingBox();
    await page.mouse.move(
      badge!.x + badge!.width / 2,
      badge!.y + badge!.height / 2,
    );
    await page.mouse.down();
    await page.mouse.move(
      side === "left"
        ? bounds!.x + 2
        : side === "right"
          ? bounds!.x + bounds!.width - 2
          : bounds!.x + bounds!.width / 2,
      side === "bottom"
        ? bounds!.y + bounds!.height - 2
        : bounds!.y + bounds!.height / 2,
      { steps: 12 },
    );
    await page.mouse.up();
    await expect(client).toHaveAttribute("data-side", side);
    await expect(node).toHaveAttribute("style", position!);
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await expect(page.locator(".react-flow__edge")).toHaveCount(1);
    if (side === "bottom")
      await expect(page.locator(".react-flow__edge-path")).not.toHaveAttribute(
        "d",
        path!,
      );
  }
  await api.locator(".port-label").focus();
  await page.keyboard.press("Alt+ArrowDown");
  await expect(api).toHaveAttribute("data-side", "bottom");
  await client.locator(".port-label").focus();
  await page.keyboard.press("Alt+ArrowLeft");
  await page.reload();
  await expect(api).toHaveAttribute("data-side", "bottom");
  await expect(client).toHaveAttribute("data-side", "left");
  await expect(page.locator(".react-flow__edge")).toHaveCount(1);
  expect(state.components[0].clients[0].api_id).toBe(20);
  expect(state.calls.filter((call) => call.method !== "GET")).toEqual([]);
  await node
    .getByRole("button", { name: "Open order-service", exact: true })
    .click();
  const panel = page.getByRole("complementary", { name: "Component details" });
  await expect(
    panel.getByRole("heading", { name: "order-service" }),
  ).toBeVisible();
  await expect(panel.locator(".detail-tabs")).toHaveCount(0);
  await expect(
    panel.getByRole("button", { name: "Edit API REST API" }),
  ).toBeVisible();
  await expect(panel.getByText("SECURE", { exact: true })).toBeVisible();
  await panel.getByRole("button", { name: "Add API", exact: true }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  await page.screenshot({ path: "/private/tmp/alpa-map-panel-final.png" });
  await panel
    .getByRole("button", { name: "Show immediate neighborhood" })
    .click();
  await expect(
    panel.getByRole("button", { name: "Show all components" }),
  ).toBeVisible();
  await panel.getByRole("button", { name: "Close details" }).click();
  expect(errors).toEqual([]);
});

test("creation dialogs use compact actions and every language and system has a loaded logo", async ({
  page,
  context,
}) => {
  await mockInventory(context);
  await page.goto(base);
  await page
    .getByRole("button", { name: "Create backend", exact: true })
    .click();
  const dialog = page.getByRole("dialog");
  await expect(
    dialog.getByRole("heading", { name: "Create backend service" }),
  ).toBeVisible();
  await expect(dialog).not.toContainText("API and clients are saved");
  await expect(
    dialog.getByRole("button", { name: "Create", exact: true }),
  ).toBeVisible();
  for (const name of ["Add API", "Add client"]) {
    const button = dialog.getByRole("button", { name, exact: true });
    await expect(button).toHaveText("");
    const heading = await button.locator("..").locator("h3").boundingBox();
    const bounds = await button.boundingBox();
    expect(bounds!.x - heading!.x - heading!.width).toBeCloseTo(8, 0);
    await button.click();
  }
  await dialog.getByRole("combobox", { name: "Language", exact: true }).click();
  await expect(page.getByRole("option").locator("img")).toHaveCount(
    languages.length,
  );
  await expect
    .poll(() =>
      page
        .getByRole("option")
        .locator("img")
        .evaluateAll((images) =>
          images.every(
            (img) =>
              (img as HTMLImageElement).complete &&
              (img as HTMLImageElement).naturalWidth > 0,
          ),
        ),
    )
    .toBe(true);
  await page.getByRole("option", { name: "Java", exact: true }).click();
  await expect(dialog.locator("#component-language img")).toHaveAttribute(
    "src",
    "/assets/technology/java.svg",
  );
  await page.screenshot({ path: "/private/tmp/alpa-create-backend-final.png" });
  await dialog.getByRole("button", { name: "Cancel", exact: true }).click();
  await page.getByRole("button", { name: "Discard draft" }).click();
  await page
    .getByRole("button", { name: "Create infrastructure", exact: true })
    .click();
  await expect(dialog).not.toContainText("resources. Add up to");
  await expect(dialog.locator(".draft-section h3")).toHaveText("API 0/5");
  await dialog
    .getByRole("combobox", { name: "SystemName", exact: true })
    .click();
  await expect(page.getByRole("option").locator("img")).toHaveCount(
    technologies.length,
  );
  await expect
    .poll(() =>
      page
        .getByRole("option")
        .locator("img")
        .evaluateAll((images) =>
          images.every(
            (img) =>
              (img as HTMLImageElement).complete &&
              (img as HTMLImageElement).naturalWidth > 0,
          ),
        ),
    )
    .toBe(true);
  await page.keyboard.press("Escape");
  await dialog.getByRole("button", { name: "Add API", exact: true }).click();
  await expect(dialog.getByLabel("Topic name 1")).toBeVisible();
  await page.setViewportSize({ width: 390, height: 863 });
  await expect
    .poll(() =>
      dialog.evaluate((el) => {
        const rect = el.getBoundingClientRect();
        return rect.x >= 0 && rect.right <= innerWidth;
      }),
    )
    .toBe(true);
  await page.screenshot({
    path: "/private/tmp/alpa-create-infrastructure-mobile.png",
    fullPage: true,
  });
  expect(
    await dialog.evaluate((el) => el.scrollWidth <= el.clientWidth + 1),
  ).toBe(true);
});
