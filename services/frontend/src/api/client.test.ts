import { afterEach, describe, expect, it, vi } from "vitest";
import { apiRequest, listAll, APIError } from "./client";
afterEach(() => vi.unstubAllGlobals());
describe("API boundary", () => {
  it("loads all pages including the last page beyond 100 records", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            data: Array.from({ length: 100 }, (_, i) => ({ id: i + 1 })),
            pagination: { limit: 100, offset: 0 },
          }),
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            data: [{ id: 101 }],
            pagination: { limit: 100, offset: 100 },
          }),
        ),
      );
    vi.stubGlobal("fetch", fetchMock);
    const result = await listAll<{ id: number }>("/v1/workspaces");
    expect(result).toHaveLength(101);
    expect(String(fetchMock.mock.calls[1][0])).toContain("offset=100");
  });
  it("rejects partial inventories when a later page fails", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce(
          new Response(
            JSON.stringify({
              data: Array(100).fill({ id: 1 }),
              pagination: { limit: 100, offset: 0 },
            }),
          ),
        )
        .mockResolvedValueOnce(
          new Response(
            JSON.stringify({
              code: "internal_error",
              message: "Try again",
              status: 500,
            }),
            { status: 500 },
          ),
        ),
    );
    await expect(listAll("/v1/workspaces")).rejects.toBeInstanceOf(APIError);
  });
  it("handles successful empty delete responses", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response(null, { status: 204 })),
    );
    await expect(
      apiRequest("/v1/workspaces/1", { method: "DELETE" }),
    ).resolves.toBeUndefined();
  });
  it("preserves a binding conflict code for the UI", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            code: "integration_already_exists",
            message: "integration already exists",
            status: 409,
          }),
          { status: 409 },
        ),
      ),
    );
    await expect(
      apiRequest("/v1/integrations", {
        method: "POST",
        body: JSON.stringify({ client_id: 2, api_id: 3, action: "call" }),
      }),
    ).rejects.toMatchObject({
      code: "integration_already_exists",
      status: 409,
    });
  });
});
