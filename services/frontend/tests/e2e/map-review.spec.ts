import { expect, test } from "@playwright/test";
import { mockInventory } from "./inventory-fixture";
import { languages } from "../../src/domain/enums";
import { technologies } from "../../src/domain/catalog";
const base = "/workspaces/1/products/1/architecture";

test("all cards stack full-width API rows above clients with named square ports", async ({
  page,
  context,
}) => {
  await mockInventory(context);
  await page.goto(base);
  await expect(page.locator(".react-flow__node")).toHaveCount(2);
  for (const node of await page.locator(".react-flow__node").all()) {
    const ports = node.locator("[data-port]");
    const rows = await ports.evaluateAll((elements) =>
      elements.map((element) => ({
        kind: element.getAttribute("data-port"),
        width: element.getBoundingClientRect().width,
        y: element.getBoundingClientRect().y,
      })),
    );
    const width = (await node.boundingBox())!.width;
    expect(rows.every((row) => Math.abs(row.width - width) < 4)).toBe(true);
    const card = (await node.boundingBox())!;
    for (const port of await ports.all()) {
      for (const side of ["left", "right"] as const) {
        const square = (await port
          .locator(`[data-port-side="${side}"]`)
          .boundingBox())!;
        const border = side === "left" ? card.x : card.x + card.width;
        expect(Math.abs(square.x + square.width / 2 - border)).toBeLessThan(
          1.1,
        );
        expect(square.x).toBeLessThan(border);
        expect(square.x + square.width).toBeGreaterThan(border);
      }
    }
    expect(rows.map((row) => row.y)).toEqual(
      rows.map((row) => row.y).sort((a, b) => a - b),
    );
    expect(rows.findIndex((row) => row.kind!.startsWith("client")) !== 0).toBe(
      true,
    );
    for (const port of await node.locator(".node-port.api").all()) {
      await expect(port).toContainText("TCP");
      await expect(port).toContainText("Orders");
      await expect(port).not.toContainText(/Internal|Internet/);
      await expect(port.locator(".port-label")).toHaveCSS("font-weight", "700");
      await expect(port.locator(".port-handle")).toHaveCount(2);
      await expect(port.locator(".port-handle").first()).toHaveCSS(
        "border-radius",
        "3px",
      );
    }
  }
  await page.screenshot({ path: "/private/tmp/alpa-map-blocks.png" });
});

test("creation dialogs use compact actions and every language and system has a loaded logo", async ({
  page,
  context,
}) => {
  await mockInventory(context);
  await page.goto(base);
  await page
    .getByRole("button", { name: "Add component", exact: true })
    .click();
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
    await expect
      .poll(async () => {
        const heading = await button.locator("..").locator("h3").boundingBox();
        const bounds = await button.boundingBox();
        return bounds!.x - heading!.x - heading!.width;
      })
      .toBeCloseTo(8, 0);
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
    .getByRole("button", { name: "Add component", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Create infrastructure", exact: true })
    .click();
  await expect(dialog).not.toContainText("resources. Add up to");
  await expect(dialog.locator(".draft-section h3")).toHaveText("Topic 0/5");
  await dialog.getByRole("combobox", { name: "System", exact: true }).click();
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
  await expect(
    dialog.getByRole("combobox", { name: "Exposure 1", exact: true }),
  ).toBeVisible();
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

test("port titles and names are centered, transport sits beside the type, and client TLS follows secure_connection", async ({
  page,
  context,
}) => {
  const state = await mockInventory(context);
  state.components[0].clients[0].secure_connection = true;
  await page.goto(base);
  const client = page.locator('[data-port="client-10"]');
  await expect(client).toContainText("TLS/SSL: ON");
  for (const node of await page.locator(".react-flow__node").all()) {
    for (const port of await node.locator("[data-port]").all()) {
      await expect(
        port.locator('.port-handle[data-port-side="left"]'),
      ).toBeVisible();
      await expect(
        port.locator('.port-handle[data-port-side="right"]'),
      ).toBeVisible();
      await expect(port.locator(".port-label")).toHaveCSS(
        "text-align",
        "center",
      );
      const bounds = (await port.boundingBox())!;
      if (await port.locator(".port-type").count()) {
        const title = (await port.locator(".port-type").boundingBox())!;
        const protocol = (await port
          .locator(".port-type small")
          .boundingBox())!;
        expect(
          Math.abs(title.x + title.width / 2 - bounds.x - bounds.width / 2),
        ).toBeLessThan(1);
        expect(protocol.x - title.x - title.width).toBeGreaterThan(0);
        expect(protocol.x - title.x - title.width).toBeLessThan(8);
        expect(protocol.x + protocol.width).toBeLessThan(
          bounds.x + bounds.width,
        );
      }
    }
  }
  await page.screenshot({ path: "/private/tmp/alpa-centered-ports.png" });
  state.components[0].clients[0].secure_connection = false;
  await page.reload();
  await expect(client).toContainText("TLS/SSL: OFF");
});
