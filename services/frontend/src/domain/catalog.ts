import type {
  APIType,
  ClientName,
  ClientRole,
  CommunicationType,
  Criticality,
  Importancy,
  Language,
  TechnologyName,
  TechnologyType,
} from "@/api/types";
import { apiTypes, clientNames, languages } from "./enums";
export { apiTypes, clientNames, languages };
export const criticalities: Criticality[] = [
  "mission-critical",
  "business-critical",
  "business-operational",
  "office-productivity",
];
export const roles: ClientRole[] = [
  "caller",
  "producer",
  "consumer",
  "listener",
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
export const roleAction: Record<ClientRole, string> = {
  caller: "call",
  producer: "produce",
  consumer: "consume",
  listener: "listen",
};
const streaming: ClientName[] = [
  "websocket-client",
  "sse-client",
  "grpc-streaming-client",
];
const synchronous: ClientName[] = [
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
export const clientLabel = (name: ClientName) =>
  name === "native-protocol-client"
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
      "Core product flow becomes unavailable and no viable workaround exists.",
    example: "The primary database required to complete key operations.",
  },
  important: {
    description:
      "Core flows remain available, but features are limited or performance degrades.",
    example: "A cache failure with a tested database fallback.",
  },
  supporting: {
    description:
      "Core product flows remain available. Supporting operations are affected.",
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
  nginx: ["Nginx", "load-balancer", "rest"],
  envoy: ["Envoy", "service-mesh", "grpc"],
  kong: ["Kong", "api-gateway", "rest"],
  traefik: ["Traefik", "api-gateway", "rest"],
  haproxy: ["HAProxy", "load-balancer", "rest"],
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
