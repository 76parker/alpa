import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { buildArchitectureGraph } from "../../lib/inventory/architecture-graph";
import type { GraphComponent } from "../../lib/inventory/graph-model";
import { ArchitectureCanvas } from "./architecture-map";

const component: GraphComponent = {
  id: "component-orders",
  name: "Orders",
  type: "backend-service",
  details: { language: "Go", language_version: "", framework: "" },
  apis: [
    {
      id: "api-orders",
      name: "Orders API",
      apiType: "rest",
      networkExposure: "internal",
    },
  ],
  clients: [],
};

afterEach(cleanup);

describe("ArchitectureCanvas", () => {
  it("keeps the specialized queue and stream card content", () => {
    const graph = buildArchitectureGraph([
      {
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
        ],
      },
    ]);
    render(
      <ArchitectureCanvas
        nodes={graph.nodes}
        edges={graph.edges}
        ariaLabel="Events preview"
      />,
    );

    expect(document.querySelector(".queue-stream-infrastructure")).toBeTruthy();
    expect(
      document.querySelector(".architecture-stream-api-name")?.textContent,
    ).toBe("orders.created");
    expect(
      document
        .querySelector('[aria-label="Client connection for Kafka client"]')
        ?.getAttribute("style"),
    ).toContain("top: 180px");
  });

  it("keeps previews inspectable while omitting edit controls", () => {
    const graph = buildArchitectureGraph([component]);
    render(
      <ArchitectureCanvas
        nodes={graph.nodes}
        edges={graph.edges}
        ariaLabel="Orders preview"
      />,
    );

    expect(
      document.querySelector('[aria-label="Show details for API Orders API"]'),
    ).toBeTruthy();
    expect(
      document.querySelector('[aria-label="Move component Orders"]'),
    ).toBeNull();
    expect(
      document.querySelector('[aria-label="Open component Orders"]'),
    ).toBeNull();
  });

  it("exposes the map move and open controls only for interactive cards", () => {
    const graph = buildArchitectureGraph([{ ...component, componentID: 42 }]);
    render(
      <ArchitectureCanvas
        nodes={graph.nodes}
        edges={graph.edges}
        ariaLabel="Orders map"
        interactive
        onOpenComponentID={() => undefined}
      />,
    );

    expect(
      document.querySelector('[aria-label="Move component Orders"]'),
    ).toBeTruthy();
    expect(
      document.querySelector('[aria-label="Open component Orders"]'),
    ).toBeTruthy();
  });
});
