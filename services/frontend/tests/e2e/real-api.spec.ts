import { test, expect, type Page } from "@playwright/test";
test.skip(
  !process.env.ALPA_REAL_API,
  "Run only against the disposable local API and database.",
);
async function choose(page: Page, label: string, option: string | RegExp) {
  await page.getByRole("combobox", { name: label, exact: true }).click();
  await page
    .getByRole("option", { name: option, exact: typeof option === "string" })
    .click();
}
test("real API: workspace, product, service, mixed exposure, connection, reload and cleanup", async ({
  page,
  request,
}) => {
  test.setTimeout(90000);
  let workspaceID: number | undefined;
  try {
    await page.goto("/workspaces");
    await page
      .getByRole("button", { name: "Create workspace", exact: true })
      .first()
      .click();
    await page
      .getByRole("dialog")
      .getByLabel("Name", { exact: false })
      .fill(`Frontend QA ${Date.now()}`);
    await page
      .getByRole("dialog")
      .getByRole("button", { name: "Create workspace", exact: true })
      .click();
    await expect(page).toHaveURL(/workspaces\/\d+\/products$/);
    workspaceID = Number(page.url().match(/workspaces\/(\d+)/)![1]);
    await page
      .getByRole("button", { name: "Create product", exact: true })
      .first()
      .click();
    await page.getByLabel("Name", { exact: false }).fill("Release validation");
    await page.getByLabel("Code", { exact: false }).fill("VERIFY");
    await page
      .getByRole("dialog")
      .getByRole("button", { name: "Create product", exact: true })
      .click();
    await expect(page.getByRole("tab", { name: "Components" })).toBeVisible();
    const productURL = page.url();
    const productID = Number(productURL.match(/products\/(\d+)/)![1]);
    await page.getByRole("tab", { name: "Components" }).click();
    await page
      .getByRole("button", { name: "Create service", exact: true })
      .first()
      .click();
    await page.getByRole("menuitem", { name: "Backend", exact: true }).click();
    await page.locator("#component-name").fill("order-service");
    await page.getByRole("button", { name: "Add client", exact: true }).click();
    await choose(page, "Client name 1", "Kafka client");

    await page.getByRole("button", { name: "Create", exact: true }).click();
    await expect(
      page.getByRole("heading", { name: "order-service" }),
    ).toBeVisible();
    const sourceURL = page.url();
    await page
      .getByRole("link", { name: "Back to components", exact: false })
      .click();
    await page
      .getByRole("button", { name: "Infrastructure", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Create infrastructure", exact: true })
      .first()
      .click();
    await choose(page, "Importancy", "CRITICAL");
    await page.getByRole("button", { name: "Add API", exact: true }).click();
    await page.getByRole("button", { name: "Add API", exact: true }).click();
    await page.locator("#api-name-0").fill("orders.created");
    await page.locator("#api-name-1").fill("orders.updated");
    await choose(page, "Exposure 2", "Internet");
    await page
      .getByRole("dialog")
      .getByRole("button", { name: "Create", exact: true })
      .click();
    await expect(
      page.getByRole("heading", { name: "Kafka", exact: true }),
    ).toBeVisible();
    const infraURL = page.url();
    const response = await request.get(
      `/v1/products/${productID}/components?limit=100&offset=0`,
    );
    expect(response.ok()).toBe(true);
    const inventory = await response.json();
    const infrastructure = inventory.data.find(
      (item: { type: string }) => item.type === "infrastructure",
    );
    expect(
      infrastructure.apis.map(
        (api: { network_exposure: string }) => api.network_exposure,
      ),
    ).toEqual(["internal", "internet"]);
    await page.goto(sourceURL);
    await page
      .getByRole("button", { name: "client actions Kafka client" })
      .click();
    await page
      .getByRole("menuitem", { name: "Integrate Kafka client" })
      .click();
    await choose(page, "Target API", /^Kafka \/ Topic · Internet · #\d+$/);
    await page.getByRole("button", { name: "Create integration" }).click();
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await page
      .getByRole("button", { name: "client actions Kafka client" })
      .click();
    await expect(
      page.getByRole("menuitem", { name: "Integrate Kafka client" }),
    ).toBeEnabled();
    await page.keyboard.press("Escape");
    await page.reload();
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await page
      .getByRole("button", { name: "client actions Kafka client" })
      .click();
    await expect(
      page.getByRole("menuitem", { name: "Integrate Kafka client" }),
    ).toBeEnabled();
    await page.keyboard.press("Escape");
    await page.goto(`${productURL}/architecture`);
    await expect(page.locator(".react-flow__edge")).toHaveCount(1);
    await page.screenshot({
      path: "test-results/visual/real-api-architecture.png",
    });
    await page.goto(infraURL);
    await page
      .getByRole("button", { name: /^API actions Topic · Internet · #\d+$/ })
      .click();
    await page.getByRole("menuitem", { name: "Delete API" }).click();
    await page
      .getByRole("alertdialog")
      .getByRole("button", { name: "Delete", exact: true })
      .click();
    await page.goto(sourceURL);
    await page
      .getByRole("button", { name: "client actions Kafka client" })
      .click();
    await expect(
      page.getByRole("menuitem", {
        name: "Integrate Kafka client",
        exact: true,
      }),
    ).toBeVisible();
  } finally {
    if (workspaceID) {
      const response = await request.delete(`/v1/workspaces/${workspaceID}`);
      if (response.status() === 404) {
        test.info().annotations.push({
          type: "backend-contract-gap",
          description:
            "DELETE /v1/workspaces/{id} is documented but not registered. Disposable database teardown removes the test workspace.",
        });
      } else expect(response.status()).toBe(204);
    }
  }
});
