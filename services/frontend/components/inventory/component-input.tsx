import { type Component, type ComponentAPI, type ComponentType, type CreateComponentAPIInput, type CreateComponentInput, type SystemType } from '../../lib/inventory/contracts';
import { type AtlasRoute } from '../../lib/routes';

export type Navigate = (route: AtlasRoute) => void;

export type ServiceDraft = { language: string; languageVersion: string; framework: string };

export type InfrastructureDraft = { system: string; systemType: SystemType; version: string; networkAddresses: readonly string[] };

export type ComponentDraft = {
  name: string;
  type: ComponentType;
  description: string;
  details: ServiceDraft | InfrastructureDraft;
};

export type RelationshipCandidate = { component: Component; api: ComponentAPI };

export function relationshipCandidates(component: Component, components: Component[]): RelationshipCandidate[] {
  const linkedIDs = new Set(component.apis.map((api) => api.id));
  return components.flatMap((candidate) => candidate.id === component.id ? [] : candidate.apis
    .filter((api) => api.role !== 'consumer' && !linkedIDs.has(api.id))
    .map((api) => ({ component: candidate, api })));
}

export function optional(value: string) {
  const trimmed = value.trim();
  return trimmed || undefined;
}

export function buildComponentInput(
  productID: number,
  draft: ComponentDraft,
  apis: CreateComponentAPIInput[],
): CreateComponentInput {
  let details: CreateComponentInput['details'];
  if (draft.type === 'infrastructure') {
    const values = draft.details as InfrastructureDraft;
    const networkAddresses = values.networkAddresses.map((value) => value.trim()).filter(Boolean);
    details = {
      system: values.system.trim(),
      system_type: values.systemType,
      ...(optional(values.version) ? { version: optional(values.version) } : {}),
      ...(networkAddresses.length ? { network_address: networkAddresses } : {}),
    };
  } else {
    const values = draft.details as ServiceDraft;
    details = {
      language: values.language.trim(),
      ...(optional(values.languageVersion) ? { language_version: optional(values.languageVersion) } : {}),
      ...(optional(values.framework) ? { framework: optional(values.framework) } : {}),
    };
  }
  return {
    product_id: productID,
    name: draft.name.trim(),
    type: draft.type,
    ...(optional(draft.description) ? { description: optional(draft.description) } : {}),
    details,
    ...(apis.length ? { apis: apis.map((api) => ({ ...api, name: api.name.trim() })) } : {}),
  };
}
