import { describe, expect, it } from "vitest";
import {
  architectureNodeHeight,
  architectureNodeWidth,
  buildArchitectureGraph,
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

  it("leaves interactive map cards draggable instead of requiring a missing child handle", () => {
    expect(buildArchitectureGraph([provider]).nodes[0].dragHandle).toBeUndefined();
  });
});
