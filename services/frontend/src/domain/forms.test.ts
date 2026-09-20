import { describe, expect, it } from "vitest";
import {
  componentSchema,
  makeComponentRequest,
  makeClientRequest,
  workspaceSchema,
} from "./forms";
import { technologies } from "./catalog";

describe("inventory forms", () => {
  it("trims workspace names and rejects unsupported characters", () => {
    expect(workspaceSchema.parse({ name: "  Trading  " }).name).toBe("Trading");
    for (const name of ["", "   ", "Продукт", "x".repeat(51)])
      expect(workspaceSchema.safeParse({ name }).success).toBe(false);
  });
  it("preserves independent exposure choices for infrastructure APIs", () => {
    const result = makeComponentRequest(
      {
        name: "",
        description: "",
        type: "infrastructure",
        language: "go",
        technology: "kafka",
        importancy: "critical",
        apis: [
          {
            name: "orders.created",
            api_type: "rest",
            network_exposure: "internal",
          },
          {
            name: "orders.public",
            api_type: "rest",
            network_exposure: "internet",
          },
        ],
        clients: [],
      },
      2,
    );
    expect(result).toMatchObject({
      name: "Kafka",
      product_id: 2,
      details: {
        technology_name: "kafka",
        technology_type: "message-broker",
        importancy: "critical",
        endpoints: [],
      },
      apis: [
        {
          name: "orders.created",
          api_type: "topic",
          network_exposure: "internal",
        },
        {
          name: "orders.public",
          api_type: "topic",
          network_exposure: "internet",
        },
      ],
    });
    expect(result).not.toHaveProperty("network_exposure");
    expect(result).not.toHaveProperty("clients");
  });
  it("permits infrastructure with no APIs and does not invent exposure", () => {
    const result = makeComponentRequest(
      {
        name: "",
        description: "",
        type: "infrastructure",
        language: "go",
        technology: "postgresql",
        importancy: "important",
        apis: [],
        clients: [],
      },
      1,
    );
    expect(result.apis).toEqual([]);
    expect(result.details).not.toHaveProperty("network_exposure");
  });
  it("validates names, the five-interface limit, and service language", () => {
    const draft = {
      name: "orders",
      description: "",
      type: "backend-service",
      language: "go",
      technology: "kafka",
      importancy: "critical",
      apis: [],
      clients: [],
    };
    expect(componentSchema.safeParse(draft).success).toBe(true);
    expect(componentSchema.safeParse({ ...draft, name: "" }).success).toBe(
      false,
    );
    expect(
      componentSchema.safeParse({ ...draft, language: "unknown" }).success,
    ).toBe(false);
    expect(
      componentSchema.safeParse({
        ...draft,
        apis: Array.from({ length: 6 }, () => ({
          name: "API",
          api_type: "rest",
          network_exposure: "internal",
        })),
      }).success,
    ).toBe(false);
  });
  it("preserves hidden client fields and never sends response-only communication", () => {
    const result = makeClientRequest(
      {
        client_name: "kafka-client",
        role: "producer",
        secure_connection: true,
      },
      {
        id: 8,
        client_name: "rest-client",
        role: "caller",
        communication_type: "request-response",
        action: "# Keep this",
        capabilities: "read:orders",
        secure_connection: false,
        api_id: 33,
      },
    );
    expect(result).toEqual({
      client_name: "kafka-client",
      role: "producer",
      secure_connection: true,
      action: "# Keep this",
      capabilities: "read:orders",
    });
    expect(result).not.toHaveProperty("api_id");
    expect(result).not.toHaveProperty("communication_type");
  });
  it("provides a typed default API for every infrastructure technology", () => {
    expect(technologies.length).toBeGreaterThan(30);
    for (const system of technologies) expect(system.apiType).toBeTruthy();
  });
});
