import type { components } from "./schema";
type Schemas = components["schemas"];
export type Workspace = Schemas["Workspace"];
export type Product = Schemas["Product"];
export type Component = Omit<Schemas["Component"], "details"> & {
  details: ServiceDetails | InfrastructureDetails;
};
export type ComponentAPI = Schemas["ComponentAPI"];
export type ComponentClient = Schemas["ComponentClient"];
export type CreateComponent = Schemas["CreateComponentRequest"];
export type CreateProduct = Schemas["CreateProductRequest"];
export type APIInput = Schemas["CreateAPIRequest"];
export type ClientInput = Schemas["CreateClientRequest"];
export type ComponentType = Schemas["ComponentType"];
export type Criticality = Schemas["Criticality"];
export type Language = Schemas["Language"];
export type TechnologyName = Schemas["TechnologyName"];
export type TechnologyType = Schemas["TechnologyType"];
export type APIType = Schemas["APIType"];
export type ClientName = Schemas["ClientName"];
export type ClientRole = Schemas["ClientRole"];
export type CommunicationType = Schemas["CommunicationType"];
export type InfrastructureDetails = Omit<
  Schemas["InfrastructureDetails"],
  "importancy"
> & {
  importancy: Importancy | null;
};
export type ServiceDetails =
  Schemas["BackendServiceDetails"] | Schemas["FrontendServiceDetails"];
export type Importancy = Schemas["InfrastructureImportancy"];
export function isInfrastructure(
  component: Component,
): component is Component & { details: InfrastructureDetails } {
  return component.type === "infrastructure";
}
