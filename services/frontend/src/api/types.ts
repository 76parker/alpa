import type { components } from "./schema";
type Schemas = components["schemas"];
export type Workspace = Schemas["Workspace"];
export type Product = Schemas["Product"];
export type Component = Omit<Schemas["Component"], "details" | "clients"> & {
  details: ServiceDetails | InfrastructureDetails;
  clients: ComponentClient[];
};
export type ComponentAPI = Schemas["ComponentAPI"];
export type ComponentClient = Omit<
  Schemas["ComponentClientProjection"],
  "client_name" | "integrations"
> & { client_name: ClientName; integrations: Integration[] };
export type CreateComponent = Omit<
  Schemas["CreateComponentRequest"],
  "clients" | "details"
> & {
  clients?: ClientInput[];
  details:
    | Schemas["BackendServiceDetails"]
    | Schemas["FrontendServiceDetails"]
    | (Omit<Schemas["InfrastructureDetailsRequest"], "technology_type"> & {
        technology_type: TechnologyType;
      });
};
export type CreateProduct = Schemas["CreateProductRequest"];
export type APIInput = Schemas["CreateAPIRequest"];
export type ClientInput = Omit<
  Schemas["CreateClientRequest"],
  "client_name"
> & { client_name: ClientName };
export type ComponentType = Schemas["ComponentType"];
export type Criticality = Schemas["Criticality"];
export type Language = Schemas["Language"];
export type TechnologyName = Schemas["TechnologyName"];
// Additive backend values pending publication in the generated OpenAPI contract.
export type TechnologyType = Schemas["TechnologyType"] | "proxy/load-balancer";
export type APIType = Schemas["APIType"];
export type ClientName =
  Schemas["ClientName"] | "http-proxy-client" | "grpc-proxy-client";
export type ClientAction = Schemas["ClientAction"] | "proxy";
export type Integration = Omit<Schemas["Integration"], "action"> & {
  action: ClientAction;
};
export type CreateIntegration = Omit<
  Schemas["CreateIntegrationRequest"],
  "action"
> & { action: ClientAction };
export type CommunicationType = Schemas["CommunicationType"];
export type InfrastructureDetails = Omit<
  Schemas["InfrastructureDetails"],
  "importancy" | "technology_type"
> & {
  importancy: Importancy | null;
  technology_type: TechnologyType;
};
export type ServiceDetails =
  Schemas["BackendServiceDetails"] | Schemas["FrontendServiceDetails"];
export type Importancy = Schemas["InfrastructureImportancy"];
export function isInfrastructure(
  component: Component,
): component is Component & { details: InfrastructureDetails } {
  return component.type === "infrastructure";
}
