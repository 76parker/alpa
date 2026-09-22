import { expect, test, type Page } from "@playwright/test";
import { mockInventory, service } from "./inventory-fixture";
const base = "/workspaces/1/products/1/architecture";
const selectedNodes = (page: Page) =>
  page.locator(".react-flow__node.selected");

async function selectWithBox(page: Page) {
  const nodes = page.locator(".react-flow__node");
  await expect(nodes).toHaveCount(2);
  await page.getByRole("button", { name: "Select", exact: true }).click();
  const boxes = await Promise.all(
    (await nodes.all()).map((node) => node.boundingBox()),
  );
  const left = Math.min(...boxes.map((box) => box!.x)) - 15;
  const top = Math.min(...boxes.map((box) => box!.y)) - 15;
  const right = Math.max(...boxes.map((box) => box!.x + box!.width)) + 15;
  const bottom = Math.max(...boxes.map((box) => box!.y + box!.height)) + 15;
  await page.mouse.move(left, top);
  await page.mouse.down();
  await page.mouse.move(right, bottom, { steps: 15 });
  await expect(page.locator(".react-flow__selection")).toHaveCSS(
    "background-color",
    "rgba(0, 0, 0, 0)",
  );
  await page.mouse.up();
  await expect(page.locator(".react-flow__nodesselection-rect")).toHaveCSS(
    "background-color",
    "rgba(0, 0, 0, 0)",
  );
  await expect(selectedNodes(page)).toHaveCount(2);
  await expect(page.getByText("2 selected", { exact: true })).toBeVisible();
}

test("box selection moves all selected components together and persists positions", async ({
  page,
  context,
}) => {
  const state = await mockInventory(context);
  await page.goto(base);
  await selectWithBox(page);
  const nodes = page.locator(".react-flow__node");
  const before = await Promise.all(
    (await nodes.all()).map((node) => node.boundingBox()),
  );
  const group = page.locator(".react-flow__nodesselection-rect");
  await expect(group).toBeVisible();
  const bounds = (await group.boundingBox())!;
  await page.mouse.move(
    bounds.x + bounds.width / 2,
    bounds.y + bounds.height / 2,
  );
  await page.mouse.down();
  await page.mouse.move(
    bounds.x + bounds.width / 2 + 85,
    bounds.y + bounds.height / 2 + 60,
    { steps: 12 },
  );
  await page.mouse.up();
  const after = await Promise.all(
    (await nodes.all()).map((node) => node.boundingBox()),
  );
  const delta = {
    x: after[0]!.x - before[0]!.x,
    y: after[0]!.y - before[0]!.y,
  };
  expect(delta.x).toBeGreaterThan(60);
  expect(delta.y).toBeGreaterThan(40);
  expect(after[1]!.x - before[1]!.x).toBeCloseTo(delta.x, 0);
  expect(after[1]!.y - before[1]!.y).toBeCloseTo(delta.y, 0);
  const positions = await nodes.evaluateAll((elements) =>
    elements.map((element) => (element as HTMLElement).style.transform),
  );
  await page.screenshot({ path: "/private/tmp/alpa-map-selection.png" });
  await page.reload();
  await expect(nodes).toHaveCount(2);
  await expect
    .poll(() =>
      nodes.evaluateAll((elements) =>
        elements.map((element) => (element as HTMLElement).style.transform),
      ),
    )
    .toEqual(positions);
  expect(state.calls.filter((call) => call.method === "DELETE")).toEqual([]);
  await page.getByRole("button", { name: "Select", exact: true }).click();
  await page.getByRole("button", { name: "Select all", exact: true }).click();
  await page.keyboard.press("Escape");
  await expect(page.locator("#map-tool-panel")).toHaveCount(0);
  await page.keyboard.press("Escape");
  await expect(selectedNodes(page)).toHaveCount(0);
  await page.getByRole("button", { name: "Select", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Delete selected", exact: true }),
  ).toBeDisabled();
  await page.getByRole("button", { name: "Select", exact: true }).click();
  await nodes.first().click();
  await expect(
    page.getByRole("complementary", { name: "Component details" }),
  ).toBeVisible();
});

test("group deletion confirms, preserves failures for retry and leaves unselected components", async ({
  page,
  context,
}) => {
  const state = await mockInventory(context);
  state.components.push(service(3, "untouched-service"));
  await page.goto(base);
  await page.getByRole("button", { name: "Select", exact: true }).click();
  await page.locator('.react-flow__node[data-id="1"]').click();
  await page.keyboard.down("Shift");
  await page.locator('.react-flow__node[data-id="2"]').click();
  await page.keyboard.up("Shift");
  await expect(selectedNodes(page)).toHaveCount(2);
  await expect(
    page.getByRole("complementary", { name: "Component details" }),
  ).toHaveCount(0);
  await page
    .getByRole("button", { name: "Delete selected", exact: true })
    .click();
  const confirmation = page.getByRole("alertdialog");
  await expect(confirmation).toContainText("2 selected");
  await confirmation.getByRole("button", { name: "Cancel" }).click();
  await expect(confirmation).toHaveCount(0);
  expect(state.components).toHaveLength(3);
  await page
    .getByRole("button", { name: "Delete selected", exact: true })
    .click();
  state.failNext = "/v1/components/2";
  await confirmation
    .getByRole("button", { name: "Delete selected", exact: true })
    .click();
  await expect(confirmation.getByRole("alert")).toContainText(
    "could not be deleted",
  );
  expect(state.components.map((component) => component.id)).toEqual([2, 3]);
  await expect(selectedNodes(page)).toHaveCount(1);
  await confirmation
    .getByRole("button", { name: "Delete selected", exact: true })
    .click();
  await expect(confirmation).toHaveCount(0);
  expect(state.components.map((component) => component.id)).toEqual([3]);
  expect(
    state.calls
      .filter((call) => call.method === "DELETE")
      .map((call) => call.path),
  ).toEqual(["/v1/components/1", "/v1/components/2", "/v1/components/2"]);
  await page.reload();
  await expect(page.locator(".react-flow__node")).toHaveCount(1);
});

test("select all and filtering act only on visible components", async ({
  page,
  context,
}) => {
  const state = await mockInventory(context);
  await page.goto(base);
  await page.getByRole("button", { name: "Select", exact: true }).click();
  await page.getByRole("button", { name: "Select all", exact: true }).click();
  await expect(selectedNodes(page)).toHaveCount(2);
  await page.getByRole("button", { name: "Filters", exact: true }).click();
  await page.getByRole("combobox", { name: "Show components" }).click();
  await page
    .getByRole("option", { name: "Infrastructure", exact: true })
    .click();
  await expect(selectedNodes(page)).toHaveCount(0);
  await page.getByRole("button", { name: "Select", exact: true }).click();
  await page.getByRole("button", { name: "Select all", exact: true }).click();
  await expect(selectedNodes(page)).toHaveCount(1);
  await page
    .getByRole("button", { name: "Delete selected", exact: true })
    .click();
  await page
    .getByRole("alertdialog")
    .getByRole("button", { name: "Delete selected", exact: true })
    .click();
  await expect(page.getByRole("alertdialog")).toHaveCount(0);
  expect(state.components.map((component) => component.id)).toEqual([1]);
});
