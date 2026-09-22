import { describe, expect, it } from "vitest";
import {
  apiSchema,
  makeAPIRequest,
  componentSchema,
  emptyComponent,
  makeComponentRequest,
  makeClientRequest,
  workspaceSchema,
} from "./forms";
import { technologies } from "./catalog";

describe("inventory forms", () => {
  it("sends optional repository URLs only in backend details", () => {
    const draft = { ...emptyComponent("backend-service"), name: "orders" };
    for (const repository_url of [
      "https://github.com/acme/orders",
      "ssh://git@example.com/acme/orders.git",
    ]) {
      expect(
        makeComponentRequest(
          { ...draft, repository_url: ` ${repository_url} ` },
          1,
        ).details,
      ).toMatchObject({ repository_url });
    }
    expect(
      makeComponentRequest({ ...draft, repository_url: "  " }, 1).details,
    ).not.toHaveProperty("repository_url");
    expect(
      makeComponentRequest(
        {
          ...draft,
          type: "frontend-service",
          repository_url: "https://github.com/acme/web",
        },
        1,
      ).details,
    ).not.toHaveProperty("repository_url");
    for (const repository_url of [
      "not a URL",
      "https://",
      "https://example.com/" + "a".repeat(2048),
    ]) {
      expect(
        componentSchema.safeParse({ ...draft, repository_url }).success,
      ).toBe(false);
    }
  });
  it("accepts multilingual component descriptions while retaining the length limit", () => {
    const draft = { ...emptyComponent("backend-service"), name: "orders" };
    for (const description of [
      "Обработка заказов",
      "Résumé des commandes",
      "注文の処理",
      "معالجة الطلبات",
      "First line\nВторая строка",
    ]) {
      const parsed = componentSchema.parse({ ...draft, description });
      expect(makeComponentRequest(parsed, 1).description).toBe(description);
    }
    expect(
      componentSchema.safeParse({ ...draft, description: "я".repeat(1001) })
        .success,
    ).toBe(false);
  });
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
            name: "Orders",
            api_type: "rest",
            network_exposure: "internal",
          },
          {
            name: "Orders",
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
          name: "Orders",
          api_type: "topic",
          network_exposure: "internal",
        },
        {
          name: "Orders",
          api_type: "topic",
          network_exposure: "internet",
        },
      ],
    });
    expect(result.apis?.some((api) => Object.hasOwn(api, "description"))).toBe(
      false,
    );
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
          name: "Orders",
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
        secure_connection: true,
      },
      {
        id: 8,
        client_name: "rest-client",
        communication_type: "request-response",
        capabilities: "read:orders",
        secure_connection: false,
        integrations: [],
      },
    );
    expect(result).toEqual({
      client_name: "kafka-client",
      secure_connection: true,
      capabilities: "read:orders",
    });
    expect(result).not.toHaveProperty("api_id");
    expect(result).not.toHaveProperty("communication_type");
  });
  it.each(["description", "documentation_url"])(
    "rejects removed API field %s in standalone and component requests",
    (field) => {
      const api = {
        name: "Orders",
        api_type: "rest" as const,
        network_exposure: "internal" as const,
        [field]: "https://example.com/legacy",
      };
      expect(() => makeAPIRequest(api)).toThrow();
      expect(() =>
        makeComponentRequest(
          {
            ...emptyComponent("backend-service"),
            name: "service",
            apis: [api],
          },
          1,
        ),
      ).toThrow();
    },
  );

  it("builds API requests with the required name, type and exposure", () => {
    const api = {
      name: "Orders",
      api_type: "rest" as const,
      network_exposure: "internal" as const,
    };
    expect(apiSchema.parse(api)).toEqual(api);
    expect(makeAPIRequest(api)).toEqual(api);
  });

  it("provides a typed default API for every infrastructure technology", () => {
    expect(technologies.length).toBeGreaterThan(30);
    for (const system of technologies) expect(system.apiType).toBeTruthy();
  });
});

describe("proxy infrastructure clients", () => {
  it.each(["nginx", "envoy", "traefik", "haproxy"] as const)(
    "creates %s with both proxy client types",
    (technology) => {
      const draft = {
        ...emptyComponent("infrastructure"),
        technology,
        importancy: "critical" as const,
        clients: [
          { client_name: "http-proxy-client" as const },
          { client_name: "grpc-proxy-client" as const },
        ],
      };
      expect(makeComponentRequest(draft, 1)).toMatchObject({
        details: { technology_type: "proxy/load-balancer" },
        clients: [
          { client_name: "http-proxy-client", secure_connection: false },
          { client_name: "grpc-proxy-client", secure_connection: false },
        ],
      });
      expect(
        componentSchema.safeParse({
          ...draft,
          clients: [{ client_name: "rest-client" }],
        }).success,
      ).toBe(false);
    },
  );
  it.each(
    technologies.filter((system) => system.type !== "proxy/load-balancer"),
  )("rejects clients on $label infrastructure", (system) => {
    expect(
      componentSchema.safeParse({
        ...emptyComponent("infrastructure"),
        technology: system.name,
        importancy: "critical",
        clients: [{ client_name: "http-proxy-client" }],
      }).success,
    ).toBe(false);
  });
});

it("rejects duplicate client types while allowing different types", () => {
  const draft = {
    ...emptyComponent("backend-service"),
    name: "orders",
    clients: [
      { client_name: "rest-client" as const },
      { client_name: "rest-client" as const },
    ],
  };
  expect(componentSchema.safeParse(draft).success).toBe(false);
  expect(
    componentSchema.safeParse({
      ...draft,
      clients: [draft.clients[0], { client_name: "grpc-client" }],
    }).success,
  ).toBe(true);
});

it("validates API names by non-whitespace length and trims outer whitespace", () => {
  const api = {
    name: "  Orders REST  ",
    api_type: "rest" as const,
    network_exposure: "internal" as const,
  };
  expect(makeAPIRequest(api).name).toBe("Orders REST");
  expect(apiSchema.safeParse({ ...api, name: " " }).success).toBe(false);
  expect(apiSchema.safeParse({ ...api, name: "x".repeat(21) }).success).toBe(
    false,
  );
  expect(apiSchema.safeParse({ ...api, name: "x ".repeat(20) }).success).toBe(
    true,
  );
});
