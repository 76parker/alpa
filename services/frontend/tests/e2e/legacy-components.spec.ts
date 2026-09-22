import { expect, test } from "@playwright/test";
import { mockInventory } from "./inventory-fixture";

test("legacy component details render with current API and integration projections", async ({
  page,
  context,
}) => {
  const errors: string[] = [];
  context.on("page", (tab) => {
    tab.on("pageerror", (error) => errors.push(error.message));
    tab.on("console", (message) => {
      if (message.type() === "error") errors.push(message.text());
    });
  });
  await mockInventory(context);
  await context.route("**/v1/products/1/components?*", (route) =>
    route.fulfill({
      json: {
        data: [
          {
            id: 1,
            product_id: 1,
            name: "api-server",
            type: "backend-service",
            description: "",
            details: {
              language: "Go",
              language_version: "1.27",
              framework: "Gin",
            },
            apis: [
              {
                id: 1,
                name: "Orders",
                api_type: "rest",
                network_exposure: "internet",
              },
            ],
            clients: [
              {
                id: 1,
                client_name: "kafka-client",
                communication_type: "events",
                capabilities: null,
                secure_connection: false,
                integrations: [
                  {
                    id: 6001,
                    client_id: 1,
                    api_id: 2,
                    action: "produce",
                    description: null,
                  },
                ],
              },
            ],
          },
          {
            id: 2,
            product_id: 1,
            name: "Kafka",
            type: "infrastructure",
            description: "",
            details: {
              system: "Kafka",
              version: "",
              system_type: "queue/stream",
              network_address: [],
            },
            apis: [
              {
                id: 2,
                name: "orders.created",
                api_type: "topic",
                network_exposure: "internal",
              },
            ],
            clients: [],
          },
        ],
        pagination: { limit: 100, offset: 0 },
      },
    }),
  );
  await page.setViewportSize({ width: 757, height: 863 });
  const base = "/workspaces/1/products/1";
  await page.goto(`${base}/components`);
  await expect(page.locator(".service-language img")).toHaveAttribute(
    "src",
    "/assets/29923.png",
  );
  await page
    .getByRole("button", { name: "Create service", exact: true })
    .click();
  await expect(page.getByRole("menuitem")).toHaveText(["Backend", "Frontend"]);
  await page.keyboard.press("Escape");
  await page
    .getByRole("button", { name: "Infrastructure", exact: true })
    .click();
  await expect(page.getByRole("table")).toContainText("Kafka");
  await expect(page.getByRole("table")).toContainText("Not specified");
  await page.reload();
  await expect(page.getByRole("table")).toContainText("Kafka");
  const opened = page.waitForEvent("popup");
  await page.getByRole("link", { name: "Architecture", exact: true }).click();
  const map = await opened;
  await expect(map.locator(".react-flow__node")).toHaveCount(2);
  await expect(map.locator(".react-flow__edge")).toHaveCount(1);
  await map.getByRole("button", { name: "Open Kafka", exact: true }).click();
  await expect(
    map.getByRole("complementary", { name: "Component details" }),
  ).toContainText("Not specified");
  await map.reload();
  await expect(map.locator(".react-flow__node")).toHaveCount(2);
  await map.close();
  expect(errors).toEqual([]);
});
