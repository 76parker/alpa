import type { components } from "./schema";
import type { Component, InfrastructureDetails } from "./types";
import { languages, technologies } from "@/domain/catalog";
import { APIError } from "./client";

type LegacyInfrastructureDetails = {
  system: string;
  system_type?: string;
  version?: string;
  network_address?: string[];
};
export type ComponentResponse = Omit<Component, "details"> & {
  details:
    | InfrastructureDetails
    | LegacyInfrastructureDetails
    | (Omit<components["schemas"]["BackendServiceDetails"], "language"> & {
        language: string;
      })
    | (Omit<components["schemas"]["FrontendServiceDetails"], "language"> & {
        language: string;
      });
};

// Existing inventories can still contain details written before the current schema.
export function normalizeComponent(component: ComponentResponse): Component {
  const details = component.details;
  if (component.type !== "infrastructure" && "language" in details) {
    const language = languages.find(
      (value) => value === details.language.trim().toLowerCase(),
    );
    if (language) return { ...component, details: { ...details, language } };
  }
  if (component.type === "infrastructure" && "technology_name" in details) {
    return {
      ...component,
      details: { ...details, importancy: details.importancy ?? null },
    };
  }
  if (component.type === "infrastructure" && "system" in details) {
    const systemName = details.system.trim().toLowerCase();
    const technology = technologies.find(
      (value) =>
        value.name === systemName || value.label.toLowerCase() === systemName,
    );
    if (technology) {
      return {
        ...component,
        details: {
          technology_name: technology.name,
          technology_type: technology.type,
          importancy: null,
          version: details.version || "",
          endpoints: details.network_address || [],
        },
      };
    }
  }
  throw new APIError(
    `The server returned unsupported details for ${component.name}.`,
    "invalid_component_details",
    502,
  );
}
