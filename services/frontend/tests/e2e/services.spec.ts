import { expect, test } from "@playwright/test";
import { mockInventory, service } from "./inventory-fixture";

const path = "/workspaces/1/products/1/components";

for (const width of [1440, 1024, 390]) {
  test(`Services matches the Figma columns and navigation at ${width}px`, async ({
    page,
    context,
  }) => {
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    page.on("console", (message) => {
      if (message.type() === "error") errors.push(message.text());
    });
    const state = await mockInventory(context);
    state.components = [
      {
        ...service(),
        description: "Processes and routes trade orders.",
        details: {
          language: "go",
          repository_url: "https://github.com/acme/order-service",
        },
      },
      {
        ...service(3, "notification-service"),
        description: "Delivers trade notifications.",
        details: {
          language: "go",
          repository_url: "https://github.com/acme/notification-service",
        },
      },
      {
        ...service(4, "trading-web"),
        type: "frontend-service",
        description: "Trading workstation interface.",
        details: { language: "typescript" },
      },
    ];
    await page.setViewportSize({ width, height: 900 });
    await page.goto(path);
    await expect(page.getByRole("table")).toBeVisible();
    await page.screenshot({
      path: `/private/tmp/alpa-services-${width}.png`,
      fullPage: true,
    });
    await expect(page).toHaveURL(path);
    await expect(page).toHaveTitle(/Trading Platform/);
    await expect(page.getByRole("columnheader")).toHaveText([
      "Name",
      "Type",
      "Language",
      "Description",
      "Actions",
    ]);
    const order = page
      .getByRole("row")
      .filter({
        has: page.getByRole("link", { name: "order-service", exact: true }),
      });
    await expect(
      order.getByRole("link", {
        name: "https://github.com/acme/order-service",
        exact: true,
      }),
    ).toHaveAttribute("href", "https://github.com/acme/order-service");
    await expect(order.getByRole("cell").nth(1)).toHaveText("Backend service");
    await expect(order.getByRole("cell").nth(1).locator("img")).toHaveAttribute(
      "src",
      "/assets/523d5.png",
    );
    await expect(order.getByRole("cell").nth(2)).toHaveText("Go");
    await expect(order.getByRole("cell").nth(2).locator("img")).toHaveAttribute(
      "src",
      "/assets/29923.png",
    );
    await expect(order.getByRole("cell").nth(3)).toHaveText(
      "Processes and routes trade orders.",
    );
    const frontend = page
      .getByRole("row")
      .filter({
        has: page.getByRole("link", { name: "trading-web", exact: true }),
      });
    await expect(
      frontend.getByRole("cell").nth(1).locator("img"),
    ).toHaveAttribute("src", "/assets/c8f5b.png");
    await expect(
      frontend.getByRole("cell").nth(2).locator("img"),
    ).toHaveAttribute("src", "/assets/6849c.png");
    await expect(
      frontend.getByRole("cell").first().getByRole("link"),
    ).toHaveCount(1);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    expect(
      await page
        .locator("table img")
        .evaluateAll((images) =>
          images.every(
            (image) =>
              image instanceof HTMLImageElement &&
              image.complete &&
              image.naturalWidth > 0,
          ),
        ),
    ).toBe(true);
    await page.getByRole("button", { name: "Name", exact: true }).click();
    await expect(page.getByRole("row").nth(1)).toContainText("trading-web");
    await page
      .getByRole("textbox", { name: "Search services" })
      .fill("trade notifications");
    await expect(page.getByRole("row")).toHaveCount(2);
    await expect(page.getByRole("row").nth(1)).toContainText(
      "notification-service",
    );
    await page.getByRole("textbox", { name: "Search services" }).fill("");
    await page
      .getByRole("combobox", { name: "Service type", exact: true })
      .click();
    await page
      .getByRole("option", { name: "Frontend service", exact: true })
      .click();
    await expect(page.getByRole("row")).toHaveCount(2);
    await expect(page.getByRole("row").nth(1)).toContainText("trading-web");
    const popup = page.waitForEvent("popup");
    await frontend.getByRole("link", { name: "Show on map" }).click();
    const map = await popup;
    await expect(map).toHaveURL(/architecture\?component=4$/);
    await expect(
      map.getByRole("complementary", { name: "Component details" }),
    ).toContainText("trading-web");
    await map.close();
    await frontend
      .getByRole("link", { name: "trading-web", exact: true })
      .click();
    await expect(page).toHaveURL(`${path}/4`);
    expect(errors).toEqual([]);
  });
}
