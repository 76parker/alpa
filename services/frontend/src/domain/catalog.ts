import type {
  APIType,
  ComponentAPI,
  Component,
  ClientName,
  ClientAction,
  CommunicationType,
  Criticality,
  Importancy,
  Language,
  TechnologyName,
  TechnologyType,
} from "@/api/types";
import {
  apiTypes,
  clientNames as generatedClientNames,
  languages,
} from "./enums";
export { apiTypes, languages };
export const proxyClientNames = [
  "http-proxy-client",
  "grpc-proxy-client",
] as const;
export const clientNames = [
  ...generatedClientNames,
  ...proxyClientNames,
] as const;
export const isProxyClient = (name: ClientName) =>
  proxyClientNames.some((value) => value === name);
export const isProxyTechnology = (name: TechnologyName) =>
  technologyFor(name).type === "proxy/load-balancer";
export function availableClientNames(
  component: Pick<Component, "type" | "details">,
): readonly ClientName[] {
  if (component.type !== "infrastructure") return clientNames;
  return "technology_name" in component.details &&
    (component.details.technology_type === "proxy/load-balancer" ||
      isProxyTechnology(component.details.technology_name))
    ? proxyClientNames
    : [];
}
export function unusedClientNames(
  component: Component,
  editingID?: number,
): readonly ClientName[] {
  return availableClientNames(component).filter(
    (name) =>
      !component.clients.some(
        (client) => client.id !== editingID && client.client_name === name,
      ),
  );
}
export const criticalities: Criticality[] = [
  "mission-critical",
  "business-critical",
  "business-operational",
  "office-productivity",
];
export const importancies: Importancy[] = [
  "critical",
  "important",
  "supporting",
];
export const titleCase = (value: string) =>
  value.replaceAll("-", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
export const criticalityLabel = (value: string) =>
  value.replaceAll("-", " ").toUpperCase();
export function integrationActions(
  communication: CommunicationType,
  clientName?: ClientName,
): ClientAction[] {
  if (clientName && isProxyClient(clientName)) return ["proxy"];
  if (communication === "events") return ["produce", "consume"];
  if (communication === "stream") return ["listen-events"];
  return ["call"];
}
const streaming: ClientName[] = [
  "websocket-client",
  "sse-client",
  "grpc-streaming-client",
];
const synchronous: ClientName[] = [
  ...proxyClientNames,
  "s3-client",
  "rest-client",
  "graphql-client",
  "grpc-client",
  "json-rpc-client",
  "soap-client",
  "odata-client",
  "native-protocol-client",
];
export function communicationFor(name: ClientName): CommunicationType {
  return streaming.includes(name)
    ? "stream"
    : synchronous.includes(name)
      ? "request-response"
      : "events";
}
const apiLabels: Partial<Record<APIType, string>> = {
  rest: "REST",
  graphql: "GraphQL",
  grpc: "gRPC",
  "json-rpc": "JSON-RPC",
  soap: "SOAP",
  websocket: "WebSocket",
  odata: "OData",
  sse: "SSE",
};
export const apiLabel = (type: APIType) => apiLabels[type] || titleCase(type);
// Mirrors inventory.resolveTransportProtocol until the API projection exposes transport.
export const transportProtocol = (type: APIType) =>
  type === "native-protocol" ? "TCP/UDP" : "TCP";
export const apiDisplayName = (
  api: Pick<ComponentAPI, "id" | "api_type" | "network_exposure">,
) =>
  `${apiLabel(api.api_type)} · ${titleCase(api.network_exposure)} · #${api.id}`;
const apiCollectionLabels: Partial<Record<APIType, string>> = {
  database: "Databases",
  topic: "Topics",
  exchange: "Exchanges",
  subject: "Subjects",
};
export const apiCollectionLabel = (type: APIType) =>
  apiCollectionLabels[type] || apiLabel(type);

export const clientLabel = (name: ClientName) =>
  name === "http-proxy-client"
    ? "HTTP proxy client"
    : name === "grpc-proxy-client"
      ? "gRPC proxy client"
      : name === "native-protocol-client"
        ? "Native protocol client"
        : `${apiLabels[name.replace(/-client$/, "") as APIType] || titleCase(name.replace(/-client$/, ""))} client`;
const languageLabels: Partial<Record<Language, string>> = {
  go: "Go",
  javascript: "Node.js",
  typescript: "TypeScript",
  "c++": "C++",
  "c#": "C#",
  "f#": "F#",
  php: "PHP",
  sql: "SQL",
  "objective-c": "Objective-C",
};
export const languageLabel = (language: Language) =>
  languageLabels[language] || titleCase(language);
export const impact: Record<
  Importancy,
  { description: string; example: string }
> = {
  critical: {
    description:
      "Product cannot perform core business functionality without this infrastructure component. There is no viable workaround.",
    example: "The primary database required to complete key operations.",
  },
  important: {
    description:
      "Core business functionality remains, but some features are unavailable or performance is degraded.",
    example: "A cache failure with a tested database fallback.",
  },
  supporting: {
    description:
      "All business functionality works, but product support is deteriorating.",
    example: "A monitoring dashboard that does not affect request processing.",
  },
};
type Technology = {
  name: TechnologyName;
  label: string;
  type: TechnologyType;
  apiType: APIType;
  resource: string;
};
const systems: Record<TechnologyName, [string, TechnologyType, APIType]> = {
  postgresql: ["PostgreSQL", "sql-database", "database"],
  mysql: ["MySQL", "sql-database", "database"],
  mariadb: ["MariaDB", "sql-database", "database"],
  mongodb: ["MongoDB", "nosql-database", "database"],
  cassandra: ["Cassandra", "nosql-database", "database"],
  clickhouse: ["ClickHouse", "sql-database", "database"],
  redis: ["Redis", "cache", "database"],
  memcached: ["Memcached", "cache", "database"],
  etcd: ["Etcd", "nosql-database", "grpc"],
  kafka: ["Kafka", "message-broker", "topic"],
  rabbitmq: ["RabbitMQ", "message-broker", "exchange"],
  nats: ["NATS", "message-broker", "subject"],
  pulsar: ["Pulsar", "message-broker", "topic"],
  elasticsearch: ["Elasticsearch", "search-engine", "rest"],
  opensearch: ["OpenSearch", "search-engine", "rest"],
  s3: ["AWS S3", "object-storage", "rest"],
  minio: ["MinIO", "object-storage", "rest"],
  ceph: ["Ceph", "object-storage", "rest"],
  temporal: ["Temporal", "workflow-engine", "grpc"],
  airflow: ["Airflow", "workflow-engine", "rest"],
  "argo-workflows": ["Argo Workflows", "workflow-engine", "rest"],
  nginx: ["Nginx", "proxy/load-balancer", "rest"],
  envoy: ["Envoy", "proxy/load-balancer", "grpc"],
  kong: ["Kong", "api-gateway", "rest"],
  traefik: ["Traefik", "proxy/load-balancer", "rest"],
  haproxy: ["HAProxy", "proxy/load-balancer", "rest"],
  prometheus: ["Prometheus", "monitoring", "rest"],
  grafana: ["Grafana", "monitoring", "rest"],
  zabbix: ["Zabbix", "monitoring", "json-rpc"],
  jaeger: ["Jaeger", "tracing", "grpc"],
  zipkin: ["Zipkin", "tracing", "rest"],
  opentelemetry: ["OpenTelemetry", "tracing", "grpc"],
  keycloak: ["Keycloak", "identity-provider", "rest"],
  vault: ["Vault", "secret-storage", "rest"],
};
export const technologies: Technology[] = Object.entries(systems).map(
  ([name, [label, type, apiType]]) => ({
    name: name as TechnologyName,
    label,
    type,
    apiType,
    resource: ["database", "topic", "exchange", "subject", "queue"].includes(
      apiType,
    )
      ? titleCase(apiType)
      : "API",
  }),
);
export function technologyFor(name: TechnologyName): Technology {
  return technologies.find((technology) => technology.name === name)!;
}

const technologyTypeLabels: Record<TechnologyType, string> = {
  "proxy/load-balancer": "Proxy / LB",
  "sql-database": "SQL Database",
  "nosql-database": "NoSQL Database",
  cache: "Cache",
  "message-broker": "Message Broker",
  "search-engine": "Search Engine",
  "object-storage": "Object Storage",
  "workflow-engine": "Workflow Engine",
  "service-mesh": "Service Mesh",
  "api-gateway": "API Gateway",
  "load-balancer": "Load Balancer",
  monitoring: "Monitoring",
  logging: "Logging",
  tracing: "Tracing",
  "identity-provider": "Identity Provider",
  "secret-storage": "Secret Storage",
};

export function technologySubtitle(name: TechnologyName): string {
  return technologyTypeLabels[technologyFor(name).type];
}
