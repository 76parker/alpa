import {
  type ClientRole,
  type CommunicationType,
  type ComponentClientName,
  type ComponentType,
  type CreateAPIInput,
  type CreateClientInput,
  type CreateComponentInput,
  type SystemType,
} from "../../lib/inventory/contracts";
import { type AtlasRoute } from "../../lib/routes";

export type Navigate = (route: AtlasRoute) => void;

export type ServiceDraft = {
  language: string;
  languageVersion: string;
  framework: string;
};

export type InfrastructureDraft = {
  system: string;
  systemType: SystemType;
  version: string;
  networkAddresses: readonly string[];
};

export type DraftAPI = CreateAPIInput & { key: string };
export type DraftClient = CreateClientInput & { key: string };

export type ComponentDraft = {
  key: string;
  name: string;
  type: ComponentType;
  description: string;
  details: ServiceDraft | InfrastructureDraft;
  apis: DraftAPI[];
  clients: DraftClient[];
};

export function createComponentDraft(
  initial: Partial<ComponentDraft> = {},
): ComponentDraft {
  return {
    key: initial.key ?? "component-draft",
    name: initial.name ?? "",
    type: initial.type ?? "backend-service",
    description: initial.description ?? "",
    details: initial.details ?? {
      language: "",
      languageVersion: "",
      framework: "",
    },
    apis: initial.apis ?? [],
    clients: initial.clients ?? [],
  };
}

const asynchronousClients = new Set<ComponentClientName>([
  "kafka-client",
  "rabbitmq-client",
  "amqp-client",
  "redpanda-client",
  "nats-client",
  "pulsar-client",
  "sqs-client",
  "gcp-pub-sub-client",
  "azure-service-bus-client",
  "redis-streams-client",
  "activemq-client",
  "ibm-mq-client",
]);

const streamingClients = new Set<ComponentClientName>([
  "websocket-client",
  "sse-client",
]);

export function validClientOptions(clientName: ComponentClientName): {
  roles: ClientRole[];
  communicationTypes: CommunicationType[];
} {
  if (asynchronousClients.has(clientName))
    return { roles: ["producer", "consumer"], communicationTypes: ["events"] };
  if (streamingClients.has(clientName))
    return { roles: ["listener"], communicationTypes: ["stream"] };
  return {
    roles: ["caller"],
    communicationTypes: [
      "request-response",
      "polling",
      "long-polling",
      "stream",
    ],
  };
}

export function optional(value: string) {
  const trimmed = value.trim();
  return trimmed || undefined;
}

export function buildComponentInput(
  productID: number,
  draft: ComponentDraft,
): CreateComponentInput {
  let details: CreateComponentInput["details"];
  if (draft.type === "infrastructure") {
    const values = draft.details as InfrastructureDraft;
    const networkAddresses = values.networkAddresses
      .map((value) => value.trim())
      .filter(Boolean);
    details = {
      system: values.system.trim(),
      system_type: values.systemType,
      ...(optional(values.version)
        ? { version: optional(values.version) }
        : {}),
      ...(networkAddresses.length ? { network_address: networkAddresses } : {}),
    };
  } else {
    const values = draft.details as ServiceDraft;
    details = {
      language: values.language.trim(),
      ...(optional(values.languageVersion)
        ? { language_version: optional(values.languageVersion) }
        : {}),
      ...(optional(values.framework)
        ? { framework: optional(values.framework) }
        : {}),
    };
  }
  return {
    product_id: productID,
    name: draft.name.trim(),
    type: draft.type,
    ...(optional(draft.description)
      ? { description: optional(draft.description) }
      : {}),
    details,
    ...(draft.apis.length
      ? {
          apis: draft.apis.map((api) => ({
            name: api.name.trim(),
            api_type: api.api_type,
            network_exposure: api.network_exposure,
          })),
        }
      : {}),
    ...(draft.clients.length
      ? {
          clients: draft.clients.map((client) => ({
            client_name: client.client_name,
            role: client.role,
            communication_type: client.communication_type,
            ...(optional(client.description ?? "")
              ? { description: optional(client.description ?? "") }
              : {}),
          })),
        }
      : {}),
  };
}
