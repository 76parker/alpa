export type Workspace = {
  id: number;
  name: string;
};

export const productCriticalities = [
  'MISSION-CRITICAL',
  'BUSINESS-CRITICAL',
  'BUSINESS-OPERATIONAL',
  'OFFICE-PRODUCTIVITY',
] as const;

export type ProductCriticality = typeof productCriticalities[number];

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
  'Backend Service',
  'Frontend Service',
  'Background Worker',
  'Infrastructure',
] as const;

export type ComponentType = typeof componentTypes[number];

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
  version: string;
  network_address: string;
};

export const apiTypes = [
  'REST',
  'GraphQL',
  'gRPC',
  'JSON-RPC',
  'SOAP',
  'WebSocket',
  'OData',
  'SSE',
  'Event',
  'Native Protocol',
] as const;

export type APIType = typeof apiTypes[number];
export type NetworkExposure = 'internal' | 'internet';
export type APIRole = 'provider' | 'consumer';

export const eventBrokers = [
  'RabbitMQ',
  'Kafka',
  'Redpanda',
  'NATS/JetStream',
  'Apache Pulsar',
  'AWS SQS',
  'Google Cloud Pub/Sub',
  'Azure Service Bus',
  'Redis Streams',
  'ActiveMQ',
  'IBM MQ',
] as const;

export type EventBroker = typeof eventBrokers[number];

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
  | { type: 'Backend Service' | 'Frontend Service'; details: ServiceDetails }
  | { type: 'Background Worker'; details: BackgroundWorkerDetails }
  | { type: 'Infrastructure'; details: InfrastructureDetails }
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
  version?: string;
  network_address?: string;
};

export type CreateComponentInput = {
  product_id: number;
  name: string;
  type: ComponentType;
  description?: string;
  details: ServiceDetailsInput | BackgroundWorkerDetailsInput | InfrastructureDetailsInput;
  apis?: CreateComponentAPIInput[];
};
