import { afterEach, describe, expect, it, vi } from "vitest";
import { InventoryClient, InventoryRequestError } from "./client";

afterEach(() => vi.unstubAllGlobals());

describe("InventoryClient", () => {
  it("loads every page in batches of 100", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      const offset = Number(
        new URL(url, "https://atlas.example").searchParams.get("offset"),
      );
      const data =
        offset === 0
          ? Array.from({ length: 100 }, (_, index) => ({
              id: index + 1,
              name: `Workspace ${index + 1}`,
            }))
          : [{ id: 101, name: "Workspace 101" }];
      return new Response(
        JSON.stringify({ data, pagination: { limit: 100, offset } }),
        {
          status: 200,
          headers: { "content-type": "application/json" },
        },
      );
    });
    vi.stubGlobal("fetch", fetchMock);

    const workspaces = await new InventoryClient().listAllWorkspaces();

    expect(workspaces).toHaveLength(101);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(String(fetchMock.mock.calls[1][0])).toContain(
      "limit=100&offset=100",
    );
  });

  it("exposes the server error code and status without leaking raw failures", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response(
            JSON.stringify({
              code: "consumer_api_link_already_exists",
              message: "consumer api link already exists",
              status: 409,
            }),
            { status: 409, headers: { "content-type": "application/json" } },
          ),
      ),
    );

    try {
      await new InventoryClient().bindComponentClient(4, 9, { api_id: 12 });
      expect.fail("expected the request to fail");
    } catch (error) {
      expect(error).toBeInstanceOf(InventoryRequestError);
      expect((error as InventoryRequestError).code).toBe(
        "consumer_api_link_already_exists",
      );
      expect((error as InventoryRequestError).status).toBe(409);
    }
  });

  it("posts the exact aggregate, API, client, and binding contracts", async () => {
    const fetchMock = vi.fn(
      async (input: RequestInfo | URL, init?: RequestInit) => {
        void input;
        void init;
        return new Response(JSON.stringify({}), {
          status: 201,
          headers: { "content-type": "application/json" },
        });
      },
    );
    vi.stubGlobal("fetch", fetchMock);

    const client = new InventoryClient();
    await client.createComponent({
      product_id: 4,
      name: "Checkout API",
      type: "backend-service",
      details: { language: "Go" },
      apis: [
        { name: "Public", api_type: "rest", network_exposure: "internet" },
      ],
      clients: [
        {
          client_name: "rest-client",
          role: "caller",
          communication_type: "request-response",
        },
      ],
    });
    await client.createComponentAPI(4, {
      name: "Health",
      api_type: "rest",
      network_exposure: "internal",
    });
    await client.createComponentClient(4, {
      client_name: "kafka-client",
      role: "consumer",
      communication_type: "events",
    });
    await client.bindComponentClient(4, 9, { api_id: 12 });

    expect(fetchMock).toHaveBeenCalledTimes(4);
    expect(String(fetchMock.mock.calls[0][0])).toBe("/v1/components");
    expect(JSON.parse(String(fetchMock.mock.calls[0][1]?.body))).toEqual({
      product_id: 4,
      name: "Checkout API",
      type: "backend-service",
      details: { language: "Go" },
      apis: [
        { name: "Public", api_type: "rest", network_exposure: "internet" },
      ],
      clients: [
        {
          client_name: "rest-client",
          role: "caller",
          communication_type: "request-response",
        },
      ],
    });
    expect(String(fetchMock.mock.calls[1][0])).toBe("/v1/components/4/apis");
    expect(JSON.parse(String(fetchMock.mock.calls[1][1]?.body))).toEqual({
      name: "Health",
      api_type: "rest",
      network_exposure: "internal",
    });
    expect(String(fetchMock.mock.calls[2][0])).toBe("/v1/components/4/clients");
    expect(JSON.parse(String(fetchMock.mock.calls[2][1]?.body))).toEqual({
      client_name: "kafka-client",
      role: "consumer",
      communication_type: "events",
    });
    expect(String(fetchMock.mock.calls[3][0])).toBe(
      "/v1/components/4/clients/9/bindings",
    );
    expect(JSON.parse(String(fetchMock.mock.calls[3][1]?.body))).toEqual({
      api_id: 12,
    });
  });
});
