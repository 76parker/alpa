import type {
  Component,
  ComponentType,
  InfrastructureDetails,
  ServiceDetails,
} from "./contracts";
import type {
  ComponentDraft,
  InfrastructureDraft,
  ServiceDraft,
} from "../../components/inventory/component-input";

export type GraphAPI = {
  id: string;
  name: string;
  apiType: Component["apis"][number]["api_type"];
  networkExposure: Component["apis"][number]["network_exposure"];
};

export type GraphClient = {
  id: string;
  clientName: Component["clients"][number]["client_name"];
  role: Component["clients"][number]["role"];
  communicationType: Component["clients"][number]["communication_type"];
  description: string;
  apiID: string | null;
};

export type GraphComponent = {
  id: string;
  componentID?: number;
  name: string;
  type: ComponentType;
  details: ServiceDetails | InfrastructureDetails;
  apis: GraphAPI[];
  clients: GraphClient[];
};

export function toGraphComponent(component: Component): GraphComponent {
  return {
    id: `component-${component.id}`,
    componentID: component.id,
    name: component.name,
    type: component.type,
    details: component.details,
    apis: component.apis.map((api) => ({
      id: `api-${api.id}`,
      name: api.name,
      apiType: api.api_type,
      networkExposure: api.network_exposure,
    })),
    clients: component.clients.map((client) => ({
      id: `client-${client.id}`,
      clientName: client.client_name,
      role: client.role,
      communicationType: client.communication_type,
      description: client.description,
      apiID: client.api_id === null ? null : `api-${client.api_id}`,
    })),
  };
}

export function toDraftGraphComponent(draft: ComponentDraft): GraphComponent {
  const details =
    draft.type === "infrastructure"
      ? infrastructureDetails(draft.details as InfrastructureDraft)
      : serviceDetails(draft.details as ServiceDraft);
  return {
    id: `draft-component-${draft.key}`,
    name: draft.name.trim() || "Unnamed component",
    type: draft.type,
    details,
    apis: draft.apis.map((api) => ({
      id: `draft-api-${api.key}`,
      name: api.name.trim() || "Unnamed API",
      apiType: api.api_type,
      networkExposure: api.network_exposure,
    })),
    clients: draft.clients.map((client) => ({
      id: `draft-client-${client.key}`,
      clientName: client.client_name,
      role: client.role,
      communicationType: client.communication_type,
      description: client.description ?? "",
      apiID: null,
    })),
  };
}

function infrastructureDetails(
  details: InfrastructureDraft,
): InfrastructureDetails {
  return {
    system: details.system,
    system_type: details.systemType,
    version: details.version,
    network_address: [...details.networkAddresses],
  };
}

function serviceDetails(details: ServiceDraft): ServiceDetails {
  return {
    language: details.language,
    language_version: details.languageVersion,
    framework: details.framework,
  };
}
