import { expect, test } from "@playwright/test";
import { infrastructure, mockInventory, service } from "./inventory-fixture";

const base = "/workspaces/1/products/1";
for (const width of [1440, 1024, 757, 390]) {
  test(`product headings, infrastructure and component details at ${width}px`, async ({
    page,
    context,
  }) => {
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    const state = await mockInventory(context);
    const kafka = infrastructure();
    kafka.description = "Streams trade events to downstream services.";
    if ("endpoints" in kafka.details)
      kafka.details.endpoints = [
        "kafka-1.internal:9092",
        "kafka-2.internal:9092",
      ];
    const redis = infrastructure(3);
    redis.name = "Redis";
    redis.details = {
      technology_name: "redis",
      technology_type: "cache",
      importancy: "important",
      endpoints: [],
      version: "",
    };
    redis.apis = [];
    const orders = service();
    orders.clients[0].api_id = kafka.apis[0].id;
    state.components = [orders, kafka, redis];
    await page.setViewportSize({ width, height: 1000 });
    await page.goto(base);
    const title = page.locator(".product-heading h1");
    await expect(title).toHaveText("Trading Platform");
    await page.evaluate(() => document.fonts.ready);
    const before = await title.boundingBox();
    const tabsBefore = await page.locator(".product-tabs").boundingBox();
    await expect(
      page.getByText("MISSION CRITICAL", { exact: true }),
    ).toHaveCount(1);
    await expect(page.locator(".product-facts")).not.toContainText(
      "Criticality",
    );
    await page.getByRole("tab", { name: "Components", exact: true }).click();
    await expect(page.getByRole("table")).toBeVisible();
    expect(await title.boundingBox()).toEqual(before);
    expect(await page.locator(".product-tabs").boundingBox()).toEqual(
      tabsBefore,
    );
    await expect(page.locator(".service-name .service-repository")).toHaveText(
      "No repository URL",
    );
    await expect(
      page
        .getByRole("button", { name: "Create service", exact: true })
        .locator("svg.lucide-plus"),
    ).toHaveCount(1);
    await page
      .getByRole("button", { name: "Infrastructure", exact: true })
      .click();
    await expect(page.getByRole("columnheader")).toHaveText([
      "Name",
      "API",
      "Endpoints",
      "Description",
      "Actions",
    ]);
    const row = page
      .getByRole("row")
      .filter({ has: page.getByRole("link", { name: "Kafka", exact: true }) });
    await expect(row.getByRole("cell").first()).toContainText("CRITICAL");
    await expect(row.getByRole("cell").nth(1)).toContainText("orders.created");
    await expect(row.getByRole("cell").nth(1)).toContainText("Topic");
    await expect(row.getByRole("cell").nth(2)).toContainText(
      "kafka-1.internal:9092",
    );
    await expect(row.getByRole("cell").nth(3)).toHaveText(kafka.description!);
    await expect(
      row.getByRole("link", { name: "Show on map" }),
    ).toHaveAttribute("href", `${base}/architecture?component=2`);
    await page.screenshot({
      path: `/private/tmp/alpa-infrastructure-${width}.png`,
      fullPage: true,
    });
    await page.getByRole("combobox", { name: "System", exact: true }).click();
    await page.getByRole("option", { name: "Redis", exact: true }).click();
    await expect(page.getByRole("row")).toHaveCount(2);
    await expect(page.getByRole("row").nth(1)).toContainText("IMPORTANT");
    await page.reload();
    await expect(page.getByRole("table")).toBeVisible();
    await page.goto(`${base}/components/1`);
    await expect(
      page.getByRole("heading", { name: orders.name, exact: true }),
    ).toBeVisible();
    await expect(page.locator(".product-heading")).toHaveCount(0);
    await expect(
      page.getByLabel("Architecture preview").getByRole("article"),
    ).toBeVisible();
    await expect(
      page.locator(".component-api-table").getByRole("columnheader"),
    ).toHaveText(["Name", "API type", "Network exposure"]);
    await expect(
      page.locator(".component-client-table").getByRole("columnheader"),
    ).toHaveText(["Client name", "Role", "Communication", "Bound API"]);
    await expect(
      page.getByRole("link", { name: "Kafka · orders.created", exact: true }),
    ).toBeVisible();
    await expect(page.locator(".component-dependencies")).toContainText(
      "Outgoing · Kafka — produce → orders.created",
    );
    for (const label of ["Add API", "Add client"]) {
      const add = page.getByRole("button", { name: label, exact: true });
      await expect(add).toHaveText("");
      const heading = await add.locator("..").locator("h3").boundingBox();
      const button = await add.boundingBox();
      expect(button!.x - heading!.x - heading!.width).toBeCloseTo(8, 0);
      await add.click();
      await expect(page.getByRole("dialog")).toBeVisible();
      await page.getByRole("button", { name: "Cancel", exact: true }).click();
    }
    await page.screenshot({
      path: `/private/tmp/alpa-component-${width}.png`,
      fullPage: true,
    });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page
      .getByRole("link", { name: "Security checks", exact: false })
      .click();
    await expect(
      page.getByText("In development", { exact: true }),
    ).toBeVisible();
    await page
      .getByRole("link", { name: "Back to component", exact: true })
      .click();
    await expect(
      page.getByRole("heading", { name: orders.name, exact: true }),
    ).toBeVisible();
    expect(errors).toEqual([]);
  });
}
