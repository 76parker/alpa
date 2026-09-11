export type Workspace = {
  id: number;
  name: string;
};

export const productCriticalities = [
  { value: 'mission-critical', label: 'Mission critical', badge: 'MISSION-CRITICAL' },
  { value: 'business-critical', label: 'Business critical', badge: 'BUSINESS-CRITICAL' },
  { value: 'business-operational', label: 'Business operational', badge: 'BUSINESS-OPERATIONAL' },
  { value: 'office-productivity', label: 'Office productivity', badge: 'OFFICE-PRODUCTIVITY' },
] as const;

export type ProductCriticality = typeof productCriticalities[number]['value'];
export const productCriticalityLabels: Record<ProductCriticality, string> = Object.fromEntries(productCriticalities.map((option) => [option.value, option.label])) as Record<ProductCriticality, string>;
export const productCriticalityBadgeLabels: Record<ProductCriticality, string> = Object.fromEntries(productCriticalities.map((option) => [option.value, option.badge])) as Record<ProductCriticality, string>;

export type Product = {
  id: number;
  workspace_id: number;
  owning_team_id?: number | null;
  product_code: string;
  name: string;
  criticality: ProductCriticality;
  description?: string | null;
};

export const componentTypes = [
  { value: 'backend-service', label: 'Backend Service' },
  { value: 'frontend-service', label: 'Frontend Service' },
  { value: 'background-worker', label: 'Background Worker' },
  { value: 'infrastructure', label: 'Infrastructure' },
] as const;

export type ComponentType = typeof componentTypes[number]['value'];
export const componentTypeLabels: Record<ComponentType, string> = Object.fromEntries(componentTypes.map((option) => [option.value, option.label])) as Record<ComponentType, string>;

export type ServiceDetails = {
  language: string;
  language_version: string;
  framework: string;
};

export type BackgroundWorkerDetails = ServiceDetails & {
  broker: EventBroker;
};

export type InfrastructureDetails = {
  system: string;
  system_type: SystemType;
  version: string;
  network_address: string[];
};

export const systemTypes = [
  { value: 'queue/stream', label: 'Queue / Stream' },
  { value: 'sql-database', label: 'SQL Database' },
  { value: 'nosql-database', label: 'NoSQL Database' },
  { value: 'workflow-engine', label: 'Workflow Engine' },
] as const;

export type SystemType = typeof systemTypes[number]['value'];
export const systemTypeLabels: Record<SystemType, string> = Object.fromEntries(systemTypes.map((option) => [option.value, option.label])) as Record<SystemType, string>;

export const apiTypes = [
  { value: 'rest', label: 'REST' },
  { value: 'graphql', label: 'GraphQL' },
  { value: 'grpc', label: 'gRPC' },
  { value: 'json-rpc', label: 'JSON-RPC' },
  { value: 'soap', label: 'SOAP' },
  { value: 'websocket', label: 'WebSocket' },
  { value: 'odata', label: 'OData' },
  { value: 'sse', label: 'SSE' },
  { value: 'event', label: 'Event' },
  { value: 'native-protocol', label: 'Native Protocol' },
] as const;

export type APIType = typeof apiTypes[number]['value'];
export const apiTypeLabels: Record<APIType, string> = Object.fromEntries(apiTypes.map((option) => [option.value, option.label])) as Record<APIType, string>;
export type NetworkExposure = 'internal' | 'internet';
export type APIRole = 'provider' | 'consumer';

export const eventBrokers = [
  { value: 'rabbitmq', label: 'RabbitMQ' },
  { value: 'kafka', label: 'Kafka' },
  { value: 'redpanda', label: 'Redpanda' },
  { value: 'nats-jetstream', label: 'NATS/JetStream' },
  { value: 'apache-pulsar', label: 'Apache Pulsar' },
  { value: 'aws-sqs', label: 'AWS SQS' },
  { value: 'google-cloud-pub-sub', label: 'Google Cloud Pub/Sub' },
  { value: 'azure-service-bus', label: 'Azure Service Bus' },
  { value: 'redis-streams', label: 'Redis Streams' },
  { value: 'activemq', label: 'ActiveMQ' },
  { value: 'ibm-mq', label: 'IBM MQ' },
] as const;

export type EventBroker = typeof eventBrokers[number]['value'];
export const eventBrokerLabels: Record<EventBroker, string> = Object.fromEntries(eventBrokers.map((option) => [option.value, option.label])) as Record<EventBroker, string>;

export type ComponentAPI = {
  id: number;
  name: string;
  api_type: APIType;
  network_exposure: NetworkExposure;
  role: APIRole;
};

type ComponentBase = {
  id: number;
  product_id: number;
  name: string;
  description: string;
  apis: ComponentAPI[];
};

export type Component = ComponentBase & (
  | { type: 'backend-service' | 'frontend-service'; details: ServiceDetails }
  | { type: 'background-worker'; details: BackgroundWorkerDetails }
  | { type: 'infrastructure'; details: InfrastructureDetails }
);

export type Pagination = {
  limit: number;
  offset: number;
};

export type ListResponse<T> = {
  data: T[];
  pagination: Pagination;
};

export type ApiError = {
  message: string;
  code: string;
  status: number;
};

export type CreateProductInput = {
  product_code: string;
  name: string;
  criticality: ProductCriticality;
  description?: string;
};

export type CreateComponentAPIInput = Omit<ComponentAPI, 'id' | 'role'>;

export type ServiceDetailsInput = {
  language: string;
  language_version?: string;
  framework?: string;
};

export type BackgroundWorkerDetailsInput = ServiceDetailsInput & {
  broker: EventBroker;
};

export type InfrastructureDetailsInput = {
  system: string;
  system_type: SystemType;
  version?: string;
  network_address?: string[];
};

export type CreateComponentInput = {
  product_id: number;
  name: string;
  type: ComponentType;
  description?: string;
  details: ServiceDetailsInput | BackgroundWorkerDetailsInput | InfrastructureDetailsInput;
  apis?: CreateComponentAPIInput[];
};
