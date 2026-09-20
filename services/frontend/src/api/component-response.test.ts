import { describe, expect, it } from "vitest";
import {
  normalizeComponent,
  type ComponentResponse,
} from "./component-response";

const base = {
  id: 1,
  product_id: 1,
  name: "Component",
  description: "",
  apis: [],
  clients: [],
};
describe("component response compatibility", () => {
  it("normalizes legacy language casing without changing hidden details", () => {
    const input: ComponentResponse = {
      ...base,
      type: "backend-service",
      details: { language: "Go", repository_url: "https://example.com/repo" },
    };
    expect(normalizeComponent(input).details).toEqual({
      language: "go",
      repository_url: "https://example.com/repo",
    });
    expect(input.details).toHaveProperty("language", "Go");
  });
  it("maps the legacy infrastructure system through the catalog without inventing importancy", () => {
    const input: ComponentResponse = {
      ...base,
      type: "infrastructure",
      details: {
        system: "Kafka",
        system_type: "queue/stream",
        version: "3.8",
        network_address: ["broker:9092"],
      },
    };
    expect(normalizeComponent(input).details).toEqual({
      technology_name: "kafka",
      technology_type: "message-broker",
      importancy: null,
      version: "3.8",
      endpoints: ["broker:9092"],
    });
  });
  it("preserves current infrastructure fields", () => {
    const input: ComponentResponse = {
      ...base,
      type: "infrastructure",
      details: {
        technology_name: "kafka",
        technology_type: "message-broker",
        importancy: "critical",
        endpoints: [],
        version: "",
      },
    };
    expect(normalizeComponent(input)).toEqual(input);
  });
  it("reports unsupported legacy systems as a query error instead of a render crash", () => {
    expect(() =>
      normalizeComponent({
        ...base,
        type: "infrastructure",
        details: { system: "Unknown system" },
      }),
    ).toThrow("The server returned unsupported details for Component.");
  });
});
