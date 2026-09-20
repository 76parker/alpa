import { afterEach, describe, expect, it, vi } from "vitest";
import {
  graphEdges,
  immediateNeighborhood,
  canBind,
  mergePositions,
  nearestPortSide,
  readLayout,
  saveLayout,
} from "./model";
import type { Component } from "@/api/types";
const service = (id: number): Component => ({
  id,
  product_id: 1,
  name: `Service ${id}`,
  type: "backend-service",
  description: "",
  details: { language: "go" },
  apis: [],
  clients: [],
});
const first: Component = {
  ...service(1),
  clients: [
    {
      id: 4,
      client_name: "kafka-client",
      role: "producer",
      communication_type: "events",
      action: null,
      capabilities: null,
      api_id: 5,
      secure_connection: true,
    },
    {
      id: 6,
      client_name: "rest-client",
      role: "caller",
      communication_type: "request-response",
      action: null,
      capabilities: null,
      api_id: null,
      secure_connection: false,
    },
  ],
};
const second: Component = {
  ...service(2),
  apis: [
    {
      id: 5,
      name: "orders.created",
      api_type: "topic",
      network_exposure: "internal",
      documentation_url: null,
    },
  ],
};
describe("architecture graph", () => {
  afterEach(() => vi.unstubAllGlobals());
  it("chooses only left, right or bottom for dropped ports", () => {
    expect(nearestPortSide(2, 120, 350, 200)).toBe("left");
    expect(nearestPortSide(348, 120, 350, 200)).toBe("right");
    expect(nearestPortSide(175, 198, 350, 200)).toBe("bottom");
    expect(nearestPortSide(175, -10, 350, 200)).toBe("left");
  });
  it("persists port sides per product and discards invalid stored sides", () => {
    const storage = new Map<string, string>();
    vi.stubGlobal("localStorage", {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => storage.set(key, value),
      removeItem: (key: string) => storage.delete(key),
    });
    saveLayout(801, {
      positions: {},
      portSides: { "1:api-10": "bottom", "1:client-10": "left" },
    });
    expect(readLayout(801).portSides).toEqual({
      "1:api-10": "bottom",
      "1:client-10": "left",
    });
    expect(readLayout(802).portSides).toEqual({});
    localStorage.setItem(
      "alpa:map:v1:802",
      JSON.stringify({
        portSides: {
          "1:api-10": "top",
          "1:client-10": "right",
          invalid: "left",
        },
      }),
    );
    expect(readLayout(802).portSides).toEqual({ "1:client-10": "right" });
    localStorage.removeItem("alpa:map:v1:801");
    localStorage.removeItem("alpa:map:v1:802");
  });
  it("only draws explicit API bindings with stable interface anchors", () => {
    const edges = graphEdges([first, second]);
    expect(edges).toHaveLength(1);
    expect(edges[0]).toMatchObject({
      id: "client-4",
      source: "1",
      target: "2",
      sourceHandle: "client-4",
      targetHandle: "api-5",
      label: "PRODUCE",
    });
  });
  it("removes an edge when its API is removed without hiding the unbound client", () => {
    expect(graphEdges([first, service(2)])).toEqual([]);
    expect(first.clients).toHaveLength(2);
  });
  it("selects only immediate neighbors, even in a cyclic graph", () => {
    expect(
      [...immediateNeighborhood([first, second, service(3)], 1)].sort(),
    ).toEqual([1, 2]);
  });
  it("rejects bound clients, self-bindings and cross-product targets", () => {
    expect(canBind(first, first.clients[0], second)).toBe(false);
    expect(canBind(first, first.clients[1], first)).toBe(false);
    expect(canBind(first, first.clients[1], { ...second, product_id: 2 })).toBe(
      false,
    );
    expect(canBind(first, first.clients[1], second)).toBe(true);
  });
  it("restores valid coordinates, rejects corrupt positions and includes newly created nodes", () => {
    const positions = mergePositions([first, second], {
      "1": { x: 100, y: 200 },
      "2": { x: Infinity, y: 0 },
      "99": { x: 0, y: 0 },
    });
    expect(positions["1"]).toEqual({ x: 100, y: 200 });
    expect(Number.isFinite(positions["2"].x)).toBe(true);
    expect(positions).not.toHaveProperty("99");
  });
});
