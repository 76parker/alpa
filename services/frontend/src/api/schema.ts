export interface paths {
  "/v1/workspaces": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    /** List workspaces */
    get: operations["listWorkspaces"];
    put?: never;
    /** Create a workspace */
    post: operations["createWorkspace"];
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/v1/workspaces/{workspace_id}": {
    parameters: {
      query?: never;
      header?: never;
      path: {
        workspace_id: components["parameters"]["WorkspaceID"];
      };
      cookie?: never;
    };
    /** Get a workspace */
    get: operations["getWorkspace"];
    put?: never;
    post?: never;
    /** Delete a workspace */
    delete: operations["deleteWorkspace"];
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/v1/workspaces/{workspace_id}/products": {
    parameters: {
      query?: never;
      header?: never;
      path: {
        workspace_id: components["parameters"]["WorkspaceID"];
      };
      cookie?: never;
    };
    /** List products in a workspace */
    get: operations["listWorkspaceProducts"];
    put?: never;
    /** Create a product in a workspace */
    post: operations["createProduct"];
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/v1/products/{product_id}": {
    parameters: {
      query?: never;
      header?: never;
      path: {
        product_id: components["parameters"]["ProductID"];
      };
      cookie?: never;
    };
    /** Get a product */
    get: operations["getProduct"];
    put?: never;
    post?: never;
    /** Delete a product */
    delete: operations["deleteProduct"];
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/v1/components": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get?: never;
    put?: never;
    /** Create a component */
    post: operations["createComponent"];
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/v1/components/{component_id}/apis": {
    parameters: {
      query?: never;
      header?: never;
      path: {
        component_id: components["parameters"]["ParentComponentID"];
      };
      cookie?: never;
    };
    get?: never;
    put?: never;
    /** Create a component API */
    post: operations["createComponentAPI"];
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/v1/components/{component_id}/apis/{id}": {
    parameters: {
      query?: never;
      header?: never;
      path: {
        component_id: components["parameters"]["ParentComponentID"];
        id: components["parameters"]["APIID"];
      };
      cookie?: never;
    };
    get?: never;
    /** Update a component API */
    put: operations["updateComponentAPI"];
    post?: never;
    /** Delete a component API */
    delete: operations["deleteComponentAPI"];
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/v1/components/{component_id}/clients": {
    parameters: {
      query?: never;
      header?: never;
      path: {
        component_id: components["parameters"]["ParentComponentID"];
      };
      cookie?: never;
    };
    get?: never;
    put?: never;
    /** Create a component client */
    post: operations["createComponentClient"];
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/v1/components/{component_id}/clients/{id}": {
    parameters: {
      query?: never;
      header?: never;
      path: {
        component_id: components["parameters"]["ParentComponentID"];
        id: components["parameters"]["ClientID"];
      };
      cookie?: never;
    };
    get?: never;
    /** Update a component client */
    put: operations["updateComponentClient"];
    post?: never;
    /** Delete a component client */
    delete: operations["deleteComponentClient"];
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/v1/integrations": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get?: never;
    put?: never;
    /**
     * Create an integration between a client and an API
     * @description Creates a directed integration from a component client to an API in another component of the same product.
     *     A client may have integrations with multiple APIs, but the same `client_id` and `api_id` pair may occur only once.
     *     The action must match the client communication type: request/response clients use `call`, event clients use
     *     `produce` or `consume`, and streaming clients use `listen-events`.
     */
    post: operations["createIntegration"];
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/v1/integrations/{id}": {
    parameters: {
      query?: never;
      header?: never;
      path: {
        id: components["parameters"]["IntegrationID"];
      };
      cookie?: never;
    };
    get?: never;
    put?: never;
    post?: never;
    /**
     * Delete an integration
     * @description Deletes only the integration; the client and API remain unchanged.
     */
    delete: operations["deleteIntegration"];
    options?: never;
    head?: never;
    /**
     * Update an integration description
     * @description Updates only the description. Send `null` to clear the current description.
     */
    patch: operations["updateIntegrationDescription"];
    trace?: never;
  };
  "/v1/components/{id}": {
    parameters: {
      query?: never;
      header?: never;
      path: {
        id: components["parameters"]["ComponentID"];
      };
      cookie?: never;
    };
    /** Get a component */
    get: operations["getComponent"];
    put?: never;
    post?: never;
    /** Delete a component */
    delete: operations["deleteComponent"];
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/v1/products/{product_id}/components": {
    parameters: {
      query?: never;
      header?: never;
      path: {
        product_id: components["parameters"]["ProductID"];
      };
      cookie?: never;
    };
    /** List components in a product */
    get: operations["listProductComponents"];
    put?: never;
    post?: never;
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
}
export type webhooks = Record<string, never>;
export interface components {
  schemas: {
    /**
     * Format: int64
     * @example 1001
     */
    ID: number;
    /** @example CHECKOUT */
    ProductCode: string;
    /** @example Payments Platform */
    Name: string;
    /** @example Processes card payments and refunds. */
    Description: string;
    Pagination: {
      /** @example 20 */
      limit: number;
      /** @example 0 */
      offset: number;
    };
    Error: {
      /** @example name contains unsupported characters */
      message: string;
      /**
       * @description Business errors include unknown_language, unknown_technology_name, unknown_technology_type, too_many_endpoints, invalid_criticality, invalid_importancy, invalid_api_name, invalid_product_code, api_limit_exceeded, client_limit_exceeded, client_capabilities_too_large, client_already_exists, invalid_client_action, invalid_integration, integration_already_exists, and incompatible_client_integrations. Transport errors use invalid_request.
       * @example invalid_request
       */
      code: string;
      /** @example 400 */
      status: number;
    };
    Workspace: {
      /** @example 1001 */
      id: components["schemas"]["ID"];
      /** @example Payments Platform */
      name: components["schemas"]["Name"];
    };
    CreateWorkspaceRequest: {
      /** @example Payments Platform */
      name: components["schemas"]["Name"];
    };
    WorkspaceList: {
      data: components["schemas"]["Workspace"][];
      pagination: components["schemas"]["Pagination"];
    };
    /**
     * @example business-critical
     * @enum {string}
     */
    Criticality:
      | "mission-critical"
      | "business-critical"
      | "business-operational"
      | "office-productivity";
    Product: {
      /** @example 2001 */
      id: components["schemas"]["ID"];
      /** @example 1001 */
      workspace_id: components["schemas"]["ID"];
      /** @example 301 */
      owning_team_id: components["schemas"]["ID"] | null;
      /** @example CHECKOUT */
      product_code: components["schemas"]["ProductCode"];
      /** @example Checkout Service */
      name: components["schemas"]["Name"];
      criticality: components["schemas"]["Criticality"];
      /** @example Handles checkout and payment confirmation. */
      description: components["schemas"]["Description"] | null;
    };
    CreateProductRequest: {
      /** @example 301 */
      owning_team_id?: components["schemas"]["ID"];
      /** @example CHECKOUT */
      product_code: components["schemas"]["ProductCode"];
      /** @example Checkout Service */
      name: components["schemas"]["Name"];
      criticality: components["schemas"]["Criticality"];
      /** @example Handles checkout and payment confirmation. */
      description?: components["schemas"]["Description"];
    };
    ProductList: {
      data: components["schemas"]["Product"][];
      pagination: components["schemas"]["Pagination"];
    };
    /**
     * @example backend-service
     * @enum {string}
     */
    ComponentType: "backend-service" | "frontend-service" | "infrastructure";
    BackendServiceDetails: {
      language: components["schemas"]["Language"];
      /**
       * Format: uri
       * @example https://github.com/example/backend
       */
      repository_url?: string | null;
    };
    FrontendServiceDetails: {
      language: components["schemas"]["Language"];
      /** @example 1.27 */
      language_version?: components["schemas"]["Name"];
      /** @example Gin */
      framework?: components["schemas"]["Name"];
    };
    /**
     * @example go
     * @enum {string}
     */
    Language:
      | "c"
      | "c++"
      | "c#"
      | "go"
      | "java"
      | "javascript"
      | "typescript"
      | "python"
      | "ruby"
      | "php"
      | "rust"
      | "swift"
      | "kotlin"
      | "scala"
      | "dart"
      | "lua"
      | "perl"
      | "r"
      | "objective-c"
      | "shell"
      | "bash"
      | "powershell"
      | "sql"
      | "solidity"
      | "haskell"
      | "elixir"
      | "erlang"
      | "clojure"
      | "groovy"
      | "fortran"
      | "cobol"
      | "assembly"
      | "visual-basic"
      | "matlab"
      | "pascal"
      | "delphi"
      | "f#"
      | "julia"
      | "zig"
      | "nim"
      | "ocaml"
      | "prolog"
      | "common-lisp"
      | "scratch";
    /**
     * @example sql-database
     * @enum {string}
     */
    TechnologyType:
      | "message-broker"
      | "sql-database"
      | "nosql-database"
      | "cache"
      | "search-engine"
      | "object-storage"
      | "workflow-engine"
      | "service-mesh"
      | "api-gateway"
      | "load-balancer"
      | "identity-provider"
      | "secret-storage"
      | "monitoring"
      | "logging"
      | "tracing";
    /**
     * @example postgresql
     * @enum {string}
     */
    TechnologyName:
      | "postgresql"
      | "mysql"
      | "mariadb"
      | "mongodb"
      | "cassandra"
      | "clickhouse"
      | "redis"
      | "memcached"
      | "etcd"
      | "kafka"
      | "rabbitmq"
      | "nats"
      | "pulsar"
      | "elasticsearch"
      | "opensearch"
      | "s3"
      | "minio"
      | "ceph"
      | "temporal"
      | "airflow"
      | "argo-workflows"
      | "nginx"
      | "envoy"
      | "kong"
      | "traefik"
      | "haproxy"
      | "prometheus"
      | "grafana"
      | "zabbix"
      | "jaeger"
      | "zipkin"
      | "opentelemetry"
      | "keycloak"
      | "vault";
    /**
     * @example critical
     * @enum {string}
     */
    InfrastructureImportancy: "critical" | "important" | "supporting";
    InfrastructureDetails: {
      technology_name: components["schemas"]["TechnologyName"];
      /** @example 17.2 */
      version: string;
      technology_type: components["schemas"]["TechnologyType"];
      importancy: components["schemas"]["InfrastructureImportancy"];
      /**
       * @description Optional on input. Missing, null, or empty input is returned and stored as []. Order and duplicates are preserved.
       * @example [
       *       "postgres-primary.internal:5432",
       *       "postgres-replica.internal:5432"
       *     ]
       */
      endpoints: components["schemas"]["Name"][];
    };
    InfrastructureDetailsRequest: {
      technology_name: components["schemas"]["TechnologyName"];
      /** @example 17.2 */
      version?: components["schemas"]["Name"];
      technology_type: components["schemas"]["TechnologyType"];
      importancy: components["schemas"]["InfrastructureImportancy"];
      /**
       * @description Optional on input. Missing, null, or empty input is returned and stored as []. Order and duplicates are preserved.
       * @example [
       *       "postgres-primary.internal:5432",
       *       "postgres-replica.internal:5432"
       *     ]
       */
      endpoints?: components["schemas"]["Name"][] | null;
    };
    ComponentDetails:
      | components["schemas"]["BackendServiceDetails"]
      | components["schemas"]["FrontendServiceDetails"]
      | components["schemas"]["InfrastructureDetails"];
    ComponentDetailsRequest:
      | components["schemas"]["BackendServiceDetails"]
      | components["schemas"]["FrontendServiceDetails"]
      | components["schemas"]["InfrastructureDetailsRequest"];
    Component: {
      /** @example 3001 */
      id: components["schemas"]["ID"];
      /** @example 2001 */
      product_id: components["schemas"]["ID"];
      /** @example Checkout API */
      name: components["schemas"]["Name"];
      type: components["schemas"]["ComponentType"];
      /** @example Serves checkout requests for the web and mobile apps. */
      description: components["schemas"]["Description"];
      details: components["schemas"]["ComponentDetails"];
      apis: components["schemas"]["ComponentAPI"][];
      clients: components["schemas"]["ComponentClientProjection"][];
    };
    CreateComponentRequest: {
      /** @example 2001 */
      product_id: components["schemas"]["ID"];
      /** @example Checkout API */
      name: components["schemas"]["Name"];
      type: components["schemas"]["ComponentType"];
      /** @example Serves checkout requests for the web and mobile apps. */
      description?: components["schemas"]["Description"];
      details: components["schemas"]["ComponentDetailsRequest"];
      apis?: components["schemas"]["CreateAPIRequest"][];
      clients?: components["schemas"]["CreateClientRequest"][];
    };
    ComponentList: {
      data: components["schemas"]["Component"][];
      pagination: components["schemas"]["Pagination"];
    };
    /**
     * @example rest
     * @enum {string}
     */
    APIType:
      | "rest"
      | "graphql"
      | "grpc"
      | "json-rpc"
      | "soap"
      | "websocket"
      | "odata"
      | "sse"
      | "event-consumer"
      | "topic"
      | "subject"
      | "exchange"
      | "queue"
      | "native-protocol"
      | "database";
    /**
     * @example internet
     * @enum {string}
     */
    NetworkExposure: "internal" | "internet";
    /**
     * @description Required API name with up to 20 non-whitespace characters; surrounding whitespace is trimmed.
     * @example Orders REST
     */
    APIName: string;
    ComponentAPI: {
      /** @example 4001 */
      id: components["schemas"]["ID"];
      name: components["schemas"]["APIName"];
      api_type: components["schemas"]["APIType"];
      network_exposure: components["schemas"]["NetworkExposure"];
    };
    CreateAPIRequest: {
      name: components["schemas"]["APIName"];
      api_type: components["schemas"]["APIType"];
      network_exposure: components["schemas"]["NetworkExposure"];
    };
    UpdateAPIRequest: components["schemas"]["CreateAPIRequest"];
    /**
     * @example rest-client
     * @enum {string}
     */
    ClientName:
      | "s3-client"
      | "rest-client"
      | "graphql-client"
      | "grpc-client"
      | "grpc-streaming-client"
      | "json-rpc-client"
      | "soap-client"
      | "websocket-client"
      | "odata-client"
      | "sse-client"
      | "kafka-client"
      | "rabbitmq-client"
      | "amqp-client"
      | "redpanda-client"
      | "nats-client"
      | "pulsar-client"
      | "sqs-client"
      | "gcp-pub-sub-client"
      | "azure-service-bus-client"
      | "redis-streams-client"
      | "activemq-client"
      | "ibm-mq-client"
      | "native-protocol-client";
    /**
     * @example call
     * @enum {string}
     */
    ClientAction: "consume" | "produce" | "call" | "listen-events";
    /**
     * @example request-response
     * @enum {string}
     */
    CommunicationType:
      "request-response" | "polling" | "long-polling" | "events" | "stream";
    ComponentClient: {
      /** @example 5001 */
      id: components["schemas"]["ID"];
      client_name: components["schemas"]["ClientName"];
      communication_type: components["schemas"]["CommunicationType"];
      /** @example read:orders */
      capabilities: string | null;
      /** @example false */
      secure_connection: boolean;
    };
    ComponentClientProjection: components["schemas"]["ComponentClient"] & {
      integrations: components["schemas"]["Integration"][];
    };
    CreateClientRequest: {
      client_name: components["schemas"]["ClientName"];
      /** @example read:orders */
      capabilities?: string | null;
      /** @default false */
      secure_connection: boolean;
    };
    UpdateClientRequest: components["schemas"]["CreateClientRequest"];
    Integration: {
      /** @example 6001 */
      id: components["schemas"]["ID"];
      /** @example 5001 */
      client_id: components["schemas"]["ID"];
      /** @example 4001 */
      api_id: components["schemas"]["ID"];
      action: components["schemas"]["ClientAction"];
      /** @example Calls the checkout API. */
      description: components["schemas"]["Description"] | null;
    };
    CreateIntegrationRequest: {
      /** @example 5001 */
      client_id: components["schemas"]["ID"];
      /** @example 4001 */
      api_id: components["schemas"]["ID"];
      action: components["schemas"]["ClientAction"];
      /** @example Calls the checkout API. */
      description?: components["schemas"]["Description"] | null;
    };
    UpdateIntegrationDescriptionRequest: {
      /** @example Calls checkout with retries. */
      description: components["schemas"]["Description"] | null;
    };
  };
  responses: {
    /** @description Invalid request */
    BadRequest: {
      headers: {
        [name: string]: unknown;
      };
      content: {
        "application/json": components["schemas"]["Error"];
      };
    };
    /** @description Resource not found */
    NotFound: {
      headers: {
        [name: string]: unknown;
      };
      content: {
        "application/json": components["schemas"]["Error"];
      };
    };
    /** @description Conflicting resource state */
    Conflict: {
      headers: {
        [name: string]: unknown;
      };
      content: {
        "application/json": components["schemas"]["Error"];
      };
    };
    /** @description A client with this type already exists for the component */
    ClientAlreadyExists: {
      headers: {
        [name: string]: unknown;
      };
      content: {
        "application/json": components["schemas"]["Error"];
      };
    };
    /** @description Unexpected server error */
    InternalError: {
      headers: {
        [name: string]: unknown;
      };
      content: {
        "application/json": components["schemas"]["Error"];
      };
    };
  };
  parameters: {
    WorkspaceID: components["schemas"]["ID"];
    ProductID: components["schemas"]["ID"];
    ComponentID: components["schemas"]["ID"];
    ParentComponentID: components["schemas"]["ID"];
    APIID: components["schemas"]["ID"];
    ClientID: components["schemas"]["ID"];
    IntegrationID: components["schemas"]["ID"];
    Limit: number;
    Offset: number;
  };
  requestBodies: never;
  headers: never;
  pathItems: never;
}
export type $defs = Record<string, never>;
export interface operations {
  listWorkspaces: {
    parameters: {
      query?: {
        limit?: components["parameters"]["Limit"];
        offset?: components["parameters"]["Offset"];
      };
      header?: never;
      path?: never;
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      /** @description Workspace page */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["WorkspaceList"];
        };
      };
      400: components["responses"]["BadRequest"];
      500: components["responses"]["InternalError"];
    };
  };
  createWorkspace: {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    requestBody: {
      content: {
        "application/json": components["schemas"]["CreateWorkspaceRequest"];
      };
    };
    responses: {
      /** @description Workspace created */
      201: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["Workspace"];
        };
      };
      400: components["responses"]["BadRequest"];
      500: components["responses"]["InternalError"];
    };
  };
  getWorkspace: {
    parameters: {
      query?: never;
      header?: never;
      path: {
        workspace_id: components["parameters"]["WorkspaceID"];
      };
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      /** @description Workspace */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["Workspace"];
        };
      };
      400: components["responses"]["BadRequest"];
      404: components["responses"]["NotFound"];
      500: components["responses"]["InternalError"];
    };
  };
  deleteWorkspace: {
    parameters: {
      query?: never;
      header?: never;
      path: {
        workspace_id: components["parameters"]["WorkspaceID"];
      };
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      /** @description Workspace deleted */
      204: {
        headers: {
          [name: string]: unknown;
        };
        content?: never;
      };
      400: components["responses"]["BadRequest"];
      404: components["responses"]["NotFound"];
      500: components["responses"]["InternalError"];
    };
  };
  listWorkspaceProducts: {
    parameters: {
      query?: {
        limit?: components["parameters"]["Limit"];
        offset?: components["parameters"]["Offset"];
      };
      header?: never;
      path: {
        workspace_id: components["parameters"]["WorkspaceID"];
      };
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      /** @description Product page */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ProductList"];
        };
      };
      400: components["responses"]["BadRequest"];
      404: components["responses"]["NotFound"];
      500: components["responses"]["InternalError"];
    };
  };
  createProduct: {
    parameters: {
      query?: never;
      header?: never;
      path: {
        workspace_id: components["parameters"]["WorkspaceID"];
      };
      cookie?: never;
    };
    requestBody: {
      content: {
        "application/json": components["schemas"]["CreateProductRequest"];
      };
    };
    responses: {
      /** @description Product created */
      201: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["Product"];
        };
      };
      400: components["responses"]["BadRequest"];
      404: components["responses"]["NotFound"];
      500: components["responses"]["InternalError"];
    };
  };
  getProduct: {
    parameters: {
      query?: never;
      header?: never;
      path: {
        product_id: components["parameters"]["ProductID"];
      };
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      /** @description Product */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["Product"];
        };
      };
      400: components["responses"]["BadRequest"];
      404: components["responses"]["NotFound"];
      500: components["responses"]["InternalError"];
    };
  };
  deleteProduct: {
    parameters: {
      query?: never;
      header?: never;
      path: {
        product_id: components["parameters"]["ProductID"];
      };
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      /** @description Product deleted */
      204: {
        headers: {
          [name: string]: unknown;
        };
        content?: never;
      };
      400: components["responses"]["BadRequest"];
      404: components["responses"]["NotFound"];
      500: components["responses"]["InternalError"];
    };
  };
  createComponent: {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    requestBody: {
      content: {
        "application/json": components["schemas"]["CreateComponentRequest"];
      };
    };
    responses: {
      /** @description Component created */
      201: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["Component"];
        };
      };
      400: components["responses"]["BadRequest"];
      404: components["responses"]["NotFound"];
      409: components["responses"]["ClientAlreadyExists"];
      500: components["responses"]["InternalError"];
    };
  };
  createComponentAPI: {
    parameters: {
      query?: never;
      header?: never;
      path: {
        component_id: components["parameters"]["ParentComponentID"];
      };
      cookie?: never;
    };
    requestBody: {
      content: {
        "application/json": components["schemas"]["CreateAPIRequest"];
      };
    };
    responses: {
      /** @description API created */
      201: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ComponentAPI"];
        };
      };
      400: components["responses"]["BadRequest"];
      404: components["responses"]["NotFound"];
      500: components["responses"]["InternalError"];
    };
  };
  updateComponentAPI: {
    parameters: {
      query?: never;
      header?: never;
      path: {
        component_id: components["parameters"]["ParentComponentID"];
        id: components["parameters"]["APIID"];
      };
      cookie?: never;
    };
    requestBody: {
      content: {
        "application/json": components["schemas"]["UpdateAPIRequest"];
      };
    };
    responses: {
      /** @description API updated */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ComponentAPI"];
        };
      };
      400: components["responses"]["BadRequest"];
      404: components["responses"]["NotFound"];
      500: components["responses"]["InternalError"];
    };
  };
  deleteComponentAPI: {
    parameters: {
      query?: never;
      header?: never;
      path: {
        component_id: components["parameters"]["ParentComponentID"];
        id: components["parameters"]["APIID"];
      };
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      /** @description API deleted */
      204: {
        headers: {
          [name: string]: unknown;
        };
        content?: never;
      };
      400: components["responses"]["BadRequest"];
      404: components["responses"]["NotFound"];
      500: components["responses"]["InternalError"];
    };
  };
  createComponentClient: {
    parameters: {
      query?: never;
      header?: never;
      path: {
        component_id: components["parameters"]["ParentComponentID"];
      };
      cookie?: never;
    };
    requestBody: {
      content: {
        "application/json": components["schemas"]["CreateClientRequest"];
      };
    };
    responses: {
      /** @description Client created */
      201: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ComponentClient"];
        };
      };
      400: components["responses"]["BadRequest"];
      404: components["responses"]["NotFound"];
      409: components["responses"]["ClientAlreadyExists"];
      500: components["responses"]["InternalError"];
    };
  };
  updateComponentClient: {
    parameters: {
      query?: never;
      header?: never;
      path: {
        component_id: components["parameters"]["ParentComponentID"];
        id: components["parameters"]["ClientID"];
      };
      cookie?: never;
    };
    requestBody: {
      content: {
        "application/json": components["schemas"]["UpdateClientRequest"];
      };
    };
    responses: {
      /** @description Client updated */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ComponentClient"];
        };
      };
      400: components["responses"]["BadRequest"];
      404: components["responses"]["NotFound"];
      409: components["responses"]["ClientAlreadyExists"];
      500: components["responses"]["InternalError"];
    };
  };
  deleteComponentClient: {
    parameters: {
      query?: never;
      header?: never;
      path: {
        component_id: components["parameters"]["ParentComponentID"];
        id: components["parameters"]["ClientID"];
      };
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      /** @description Client deleted */
      204: {
        headers: {
          [name: string]: unknown;
        };
        content?: never;
      };
      400: components["responses"]["BadRequest"];
      404: components["responses"]["NotFound"];
      500: components["responses"]["InternalError"];
    };
  };
  createIntegration: {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    requestBody: {
      content: {
        "application/json": components["schemas"]["CreateIntegrationRequest"];
      };
    };
    responses: {
      /** @description Integration created */
      201: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["Integration"];
        };
      };
      400: components["responses"]["BadRequest"];
      404: components["responses"]["NotFound"];
      409: components["responses"]["Conflict"];
      500: components["responses"]["InternalError"];
    };
  };
  deleteIntegration: {
    parameters: {
      query?: never;
      header?: never;
      path: {
        id: components["parameters"]["IntegrationID"];
      };
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      /** @description Integration deleted */
      204: {
        headers: {
          [name: string]: unknown;
        };
        content?: never;
      };
      400: components["responses"]["BadRequest"];
      404: components["responses"]["NotFound"];
      500: components["responses"]["InternalError"];
    };
  };
  updateIntegrationDescription: {
    parameters: {
      query?: never;
      header?: never;
      path: {
        id: components["parameters"]["IntegrationID"];
      };
      cookie?: never;
    };
    requestBody: {
      content: {
        "application/json": components["schemas"]["UpdateIntegrationDescriptionRequest"];
      };
    };
    responses: {
      /** @description Integration updated */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["Integration"];
        };
      };
      400: components["responses"]["BadRequest"];
      404: components["responses"]["NotFound"];
      500: components["responses"]["InternalError"];
    };
  };
  getComponent: {
    parameters: {
      query?: never;
      header?: never;
      path: {
        id: components["parameters"]["ComponentID"];
      };
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      /** @description Component */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["Component"];
        };
      };
      400: components["responses"]["BadRequest"];
      404: components["responses"]["NotFound"];
      500: components["responses"]["InternalError"];
    };
  };
  deleteComponent: {
    parameters: {
      query?: never;
      header?: never;
      path: {
        id: components["parameters"]["ComponentID"];
      };
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      /** @description Component deleted */
      204: {
        headers: {
          [name: string]: unknown;
        };
        content?: never;
      };
      400: components["responses"]["BadRequest"];
      404: components["responses"]["NotFound"];
      500: components["responses"]["InternalError"];
    };
  };
  listProductComponents: {
    parameters: {
      query?: {
        limit?: components["parameters"]["Limit"];
        offset?: components["parameters"]["Offset"];
      };
      header?: never;
      path: {
        product_id: components["parameters"]["ProductID"];
      };
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      /** @description Component page */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ComponentList"];
        };
      };
      400: components["responses"]["BadRequest"];
      404: components["responses"]["NotFound"];
      500: components["responses"]["InternalError"];
    };
  };
}
