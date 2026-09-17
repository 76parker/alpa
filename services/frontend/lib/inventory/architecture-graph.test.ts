import { describe, expect, it } from "vitest";
import {
  architectureNodeHeight,
  architectureNodeWidth,
  architectureClientHandleTop,
  buildArchitectureGraph,
  isQueueStreamInfrastructure,
} from "./architecture-graph";
import type { GraphComponent } from "./graph-model";

const provider: GraphComponent = {
  id: "component-provider",
  name: "Provider",
  type: "backend-service",
  details: { language: "Go", language_version: "", framework: "" },
  apis: [
    {
      id: "api-public",
      name: "Public",
      apiType: "rest",
      networkExposure: "internet",
    },
  ],
  clients: [],
};

describe("buildArchitectureGraph", () => {
  it("connects a client to its API without an API role field", () => {
    const client: GraphComponent = {
      id: "component-client",
      name: "Client",
      type: "frontend-service",
      details: { language: "TypeScript", language_version: "", framework: "" },
      apis: [],
      clients: [
        {
          id: "client-rest",
          clientName: "rest-client",
          role: "caller",
          communicationType: "request-response",
          description: "",
          apiID: "api-public",
        },
      ],
    };

    const graph = buildArchitectureGraph([provider, client]);

    expect(graph.edges).toEqual([
      expect.objectContaining({
        source: "component-client",
        sourceHandle: "client-rest",
        target: "component-provider",
        targetHandle: "api-public",
      }),
    ]);
  });

  it("keeps unbound clients visible without an edge", () => {
    const graph = buildArchitectureGraph([
      {
        ...provider,
        clients: [
          {
            id: "client-a",
            clientName: "rest-client",
            role: "caller",
            communicationType: "request-response",
            description: "",
            apiID: null,
          },
        ],
      },
    ]);
    expect(graph.nodes[0].data.clients).toHaveLength(1);
    expect(graph.edges).toEqual([]);
  });

  it("reserves rails only for APIs and Clients that exist", () => {
    const empty = { ...provider, apis: [], clients: [] };
    expect(architectureNodeWidth(empty)).toBeLessThan(
      architectureNodeWidth(provider),
    );
    expect(architectureNodeHeight(empty)).toBe(132);
  });

  it("keeps the dedicated pointer and keyboard move control as the drag handle", () => {
    expect(buildArchitectureGraph([provider]).nodes[0].dragHandle).toBe(
      ".architecture-node-drag-handle",
    );
  });

  it("preserves the larger queue and stream card layout", () => {
    const queue: GraphComponent = {
      id: "component-events",
      name: "Events",
      type: "infrastructure",
      details: {
        system: "Kafka",
        system_type: "queue/stream",
        version: "3.9",
        network_address: [],
      },
      apis: [
        {
          id: "api-orders-created",
          name: "orders.created",
          apiType: "topic",
          networkExposure: "internal",
        },
      ],
      clients: [],
    };

    expect(isQueueStreamInfrastructure(queue)).toBe(true);
    expect(architectureNodeHeight(queue)).toBeGreaterThan(
      architectureNodeHeight(provider),
    );
    expect(architectureNodeWidth(queue)).toBeGreaterThanOrEqual(320);
  });

  it("aligns queue and stream client handles with their fixed-height rows", () => {
    const queue: GraphComponent = {
      id: "component-events",
      name: "Events",
      type: "infrastructure",
      details: {
        system: "Kafka",
        system_type: "queue/stream",
        version: "3.9",
        network_address: [],
      },
      apis: [
        {
          id: "api-orders-created",
          name: "orders.created",
          apiType: "topic",
          networkExposure: "internal",
        },
      ],
      clients: [
        {
          id: "client-orders",
          clientName: "kafka-client",
          role: "producer",
          communicationType: "events",
          description: "Publishes orders",
          apiID: null,
        },
        {
          id: "client-notifications",
          clientName: "kafka-client",
          role: "producer",
          communicationType: "events",
          description: "Publishes notifications",
          apiID: null,
        },
      ],
    };

    expect(architectureClientHandleTop(queue, 0, 1)).toBe("180px");
    expect(architectureClientHandleTop(queue, 1, 2)).toBe("246px");
    expect(architectureNodeHeight(queue)).toBe(289);
  });
});
