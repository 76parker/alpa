import { expect, test } from "@playwright/test";
import { mockInventory } from "./inventory-fixture";
const base = "/workspaces/1/products/1";

test("one client integrates with multiple APIs; each integration can be edited and deleted independently", async ({
  page,
  context,
}) => {
  const state = await mockInventory(context);
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto(`${base}/components/1`);
  for (const [api, action] of [
    ["orders.created", "produce"],
    ["orders.updated", "consume"],
  ]) {
    if (api === "orders.updated") {
      await page.goto(`${base}/architecture`);
      await page
        .getByRole("button", {
          name: "Integrate client Kafka client",
          exact: true,
        })
        .click();
      await page
        .getByRole("button", {
          name: "Integrate with API Topic · Internet · #21",
          exact: true,
        })
        .click();
    } else {
      await page
        .getByRole("button", { name: "client actions Kafka client" })
        .click();
      await page
        .getByRole("menuitem", { name: "Integrate Kafka client" })
        .click();
    }
    const dialog = page.getByRole("dialog");
    if (api === "orders.created") {
      await dialog.getByRole("combobox", { name: "Target API" }).click();
      await page
        .getByRole("option", {
          name:
            api === "orders.created"
              ? "Kafka / Topic · Internal · #20"
              : "Kafka / Topic · Internet · #21",
          exact: true,
        })
        .click();
    }
    await dialog.getByRole("combobox", { name: "Action", exact: true }).click();
    await page.getByRole("option", { name: action, exact: true }).click();
    await dialog.getByLabel("Description").fill(`Описание ${api}`);
    await dialog
      .getByRole("button", { name: "Create integration", exact: true })
      .click();
    await expect(dialog).toHaveCount(0);
  }
  expect(state.components[0].clients).toHaveLength(1);
  expect(state.components[0].clients[0].integrations).toHaveLength(2);
  expect(
    state.calls
      .filter(
        (call) => call.method === "POST" && call.path === "/v1/integrations",
      )
      .map((call) => call.body),
  ).toEqual([
    {
      client_id: 10,
      api_id: 20,
      action: "produce",
      description: "Описание orders.created",
    },
    {
      client_id: 10,
      api_id: 21,
      action: "consume",
      description: "Описание orders.updated",
    },
  ]);
  await page.goto(`${base}/components/1`);
  await page
    .getByRole("button", { name: "client actions Kafka client" })
    .click();
  await page.getByRole("menuitem", { name: "Integrate Kafka client" }).click();
  await page.getByRole("combobox", { name: "Target API" }).click();
  await page
    .getByRole("option", {
      name: "Kafka / Topic · Internal · #20",
      exact: true,
    })
    .click();
  await expect(
    page
      .getByRole("dialog")
      .getByRole("button", { name: "Create integration", exact: true }),
  ).toBeDisabled();
  await expect(page.getByRole("alert")).toContainText("already exists");
  await page.getByRole("button", { name: "Cancel", exact: true }).click();

  await page.goto(`${base}/architecture`);
  const firstEdge = page.getByRole("button", {
    name: "Integration order-service to Kafka / Topic · Internal · #20",
    exact: true,
  });
  const secondEdge = page.getByRole("button", {
    name: "Integration order-service to Kafka / Topic · Internet · #21",
    exact: true,
  });
  await expect(firstEdge).toBeVisible();
  await expect(secondEdge).toBeVisible();
  await secondEdge.click();
  const panel = page.getByRole("complementary", {
    name: "Integration details",
  });
  await expect(panel).toContainText("consume");
  await panel.getByRole("button", { name: "Edit description" }).click();
  const dialog = page.getByRole("dialog");
  const description = "Получение обновлений\nUpdate events";
  await dialog.getByLabel("Description").fill(description);
  state.failNext = "/integrations/";
  await dialog.getByRole("button", { name: "Save changes" }).click();
  await expect(dialog.getByRole("alert")).toContainText(
    "Temporary network failure",
  );
  await expect(dialog.getByLabel("Description")).toHaveValue(description);
  await dialog.getByRole("button", { name: "Save changes" }).click();
  await expect(dialog).toHaveCount(0);
  await expect(panel).toContainText(description);
  await page.reload();
  await secondEdge.click();
  await expect(panel).toContainText(description);
  await page.screenshot({ path: "/private/tmp/alpa-integrations-details.png" });
  await panel.getByRole("button", { name: "Edit description" }).click();
  await dialog.getByLabel("Description").fill("");
  await dialog.getByRole("button", { name: "Save changes" }).click();
  await expect(dialog).toHaveCount(0);
  expect(state.components[0].clients[0].integrations[1].description).toBeNull();
  await expect(panel).toContainText("No description");
  await panel
    .getByRole("button", { name: "Delete integration", exact: true })
    .click();
  const confirmation = page.getByRole("alertdialog");
  await confirmation.getByRole("button", { name: "Cancel" }).click();
  await expect(secondEdge).toBeVisible();
  await panel
    .getByRole("button", { name: "Delete integration", exact: true })
    .click();
  state.failNext = "/integrations/";
  await confirmation
    .getByRole("button", { name: "Delete integration" })
    .click();
  await expect(confirmation.getByRole("alert")).toContainText(
    "Temporary network failure",
  );
  await expect(page.locator(".react-flow__edge")).toHaveCount(2);
  expect(state.components[0].clients[0].integrations).toHaveLength(2);
  await confirmation
    .getByRole("button", { name: "Delete integration" })
    .click();
  await expect(secondEdge).toHaveCount(0);
  await expect(firstEdge).toBeVisible();
  expect(state.components[0].clients).toHaveLength(1);
  expect(state.components[1].apis).toHaveLength(2);
  expect(state.components[0].clients[0].integrations).toHaveLength(1);
  await page.reload();
  await expect(secondEdge).toHaveCount(0);
  await expect(firstEdge).toBeVisible();
  expect(errors).toEqual([]);
});
