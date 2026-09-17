import { expect, it } from "vitest";
import { toDraftGraphComponent, toGraphComponent } from "./graph-model";

it("keeps draft API and Client graph IDs stable while values change", () => {
  const draft = {
    key: "component-a",
    name: "Checkout",
    type: "backend-service" as const,
    description: "",
    details: { language: "Go", languageVersion: "", framework: "" },
    apis: [
      {
        key: "api-a",
        name: "Public",
        api_type: "rest" as const,
        network_exposure: "internet" as const,
      },
    ],
    clients: [
      {
        key: "client-a",
        client_name: "rest-client" as const,
        role: "caller" as const,
        communication_type: "request-response" as const,
      },
    ],
  };

  expect(toDraftGraphComponent(draft).apis[0].id).toBe("draft-api-api-a");
  expect(
    toDraftGraphComponent({
      ...draft,
      apis: [{ ...draft.apis[0], name: "Public v2" }],
    }).clients[0].id,
  ).toBe("draft-client-client-a");
});

it("maps infrastructure draft details into the graph model", () => {
  const graph = toDraftGraphComponent({
    key: "component-b",
    name: "Kafka",
    type: "infrastructure",
    description: "",
    details: {
      system: "Apache Kafka",
      systemType: "queue/stream",
      version: "4.1",
      networkAddresses: ["kafka:9092"],
    },
    apis: [],
    clients: [],
  });

  expect(graph.details).toEqual({
    system: "Apache Kafka",
    system_type: "queue/stream",
    version: "4.1",
    network_address: ["kafka:9092"],
  });
});

it("maps backend client bindings into graph API IDs", () => {
  const graph = toGraphComponent({
    id: 8,
    product_id: 4,
    name: "Checkout",
    type: "backend-service",
    description: "",
    details: { language: "Go", language_version: "", framework: "" },
    apis: [
      {
        id: 11,
        name: "Public",
        api_type: "rest",
        network_exposure: "internet",
      },
    ],
    clients: [
      {
        id: 12,
        client_name: "rest-client",
        role: "caller",
        communication_type: "request-response",
        description: "",
        api_id: 11,
      },
    ],
  });

  expect(graph.clients[0].apiID).toBe("api-11");
});
