import { z } from "zod";
import type {
  APIInput,
  ClientInput,
  ComponentClient,
  CreateComponent,
  Importancy,
  CreateProduct,
} from "@/api/types";
import {
  apiTypes,
  clientNames,
  isProxyClient,
  isProxyTechnology,
  criticalities,
  importancies,
  languages,
  technologies,
  technologyFor,
} from "./catalog";
const allowed = /^[A-Za-z0-9 ._()@+:/#&',%[\]-]+$/;
export const nameSchema = z
  .string()
  .trim()
  .min(1, "Name is required.")
  .max(50, "Use 50 characters or fewer.")
  .regex(allowed, "Use Latin letters, numbers and supported punctuation.");
const descriptionSchema = z
  .string()
  .trim()
  .max(1000, "Use 1,000 characters or fewer.")
  .refine(
    (value) => !value || allowed.test(value),
    "Use Latin letters, numbers and supported punctuation.",
  );
export const workspaceSchema = z.object({ name: nameSchema });
export const productSchema = z.object({
  name: nameSchema,
  product_code: z
    .string()
    .trim()
    .regex(/^[A-Z]{1,10}$/, "Use 1–10 uppercase letters A–Z."),
  criticality: z.enum(criticalities),
  description: descriptionSchema,
  owning_team_id: z
    .string()
    .trim()
    .refine(
      (value) =>
        !value ||
        (/^\d+$/.test(value) &&
          Number.isSafeInteger(Number(value)) &&
          Number(value) > 0),
      "Enter a positive integer.",
    ),
});
export const apiSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(1, "API name is required.")
      .refine(
        (value) => [...value.replace(/\s/g, "")].length <= 20,
        "Use 20 non-whitespace characters or fewer.",
      ),
    api_type: z.enum(apiTypes),
    network_exposure: z.enum(["internal", "internet"]),
  })
  .strict();
export const clientSchema = z.object({
  client_name: z.enum(clientNames),
  secure_connection: z.boolean().default(false),
});
export const componentSchema = z
  .object({
    type: z.enum(["backend-service", "frontend-service", "infrastructure"]),
    name: z.string().trim(),
    description: z.string().trim().max(1000, "Use 1,000 characters or fewer."),
    repository_url: z
      .string()
      .trim()
      .max(2048, "Use 2,048 characters or fewer.")
      .refine(
        (value) => !value || z.url({ hostname: /.+/ }).safeParse(value).success,
        "Enter a valid repository URL.",
      )
      .optional(),
    language: z.enum(languages),
    technology: z.enum(technologies.map((item) => item.name)),
    importancy: z.union([z.enum(importancies), z.literal("")]),
    apis: z.array(apiSchema).max(5, "A component can have up to 5 APIs."),
    clients: z
      .array(clientSchema)
      .max(5, "A component can have up to 5 clients."),
  })
  .superRefine((value, ctx) => {
    const clientTypes = new Set<string>();
    value.clients.forEach((client, index) => {
      if (clientTypes.has(client.client_name))
        ctx.addIssue({
          code: "custom",
          path: ["clients", index, "client_name"],
          message: "This client type already exists on the component.",
        });
      clientTypes.add(client.client_name);
    });
    if (value.type === "infrastructure" && !value.importancy)
      ctx.addIssue({
        code: "custom",
        path: ["importancy"],
        message: "Select the infrastructure importancy.",
      });
    if (value.type === "infrastructure") {
      value.clients.forEach((client, index) => {
        if (
          !isProxyTechnology(value.technology) ||
          !isProxyClient(client.client_name)
        )
          ctx.addIssue({
            code: "custom",
            path: ["clients", index, "client_name"],
            message:
              "Only proxy/load-balancer infrastructure supports HTTP proxy and gRPC proxy clients.",
          });
      });
    }
    if (value.type !== "infrastructure") {
      const result = nameSchema.safeParse(value.name);
      if (!result.success)
        for (const issue of result.error.issues)
          ctx.addIssue({
            code: "custom",
            path: ["name"],
            message: issue.message,
          });
    }
  });
export type ComponentDraft = z.input<typeof componentSchema>;
export type ProductDraft = z.input<typeof productSchema>;
export type ClientDraft = z.input<typeof clientSchema>;
export const emptyComponent = (
  type: ComponentDraft["type"],
): ComponentDraft => ({
  type,
  name: "",
  description: "",
  repository_url: "",
  language: type === "frontend-service" ? "typescript" : "go",
  technology: "kafka",
  importancy: "",
  apis: [],
  clients: [],
});
export function makeComponentRequest(
  draft: ComponentDraft,
  productID: number,
): CreateComponent {
  const value = componentSchema.parse(draft);
  if (value.type === "infrastructure") {
    const system = technologyFor(value.technology);
    return {
      product_id: productID,
      name: system.label,
      type: "infrastructure",
      details: {
        technology_name: system.name,
        technology_type: system.type,
        importancy: value.importancy as Importancy,
        endpoints: [],
      },
      ...(value.clients.length
        ? { clients: value.clients.map((client) => makeClientRequest(client)) }
        : {}),
      apis: value.apis.map((api) =>
        makeAPIRequest({ ...api, api_type: system.apiType }),
      ),
    };
  }
  return {
    product_id: productID,
    name: value.name,
    type: value.type,
    ...(value.description ? { description: value.description } : {}),
    details: {
      language: value.language,
      ...(value.type === "backend-service" && value.repository_url
        ? { repository_url: value.repository_url }
        : {}),
    },
    apis: value.apis.map((api) => makeAPIRequest(api)),
    clients: value.clients.map((client) => makeClientRequest(client)),
  };
}
export function makeClientRequest(
  draft: ClientDraft,
  original?: ComponentClient,
): ClientInput {
  const value = clientSchema.parse(draft);
  return {
    ...value,
    ...(original ? { capabilities: original.capabilities } : {}),
  };
}
export function makeAPIRequest(draft: z.input<typeof apiSchema>): APIInput {
  return apiSchema.parse(draft);
}

export function makeProductRequest(draft: ProductDraft): CreateProduct {
  const value = productSchema.parse(draft);
  return {
    name: value.name,
    product_code: value.product_code,
    criticality: value.criticality,
    ...(value.description ? { description: value.description } : {}),
    ...(value.owning_team_id
      ? { owning_team_id: Number(value.owning_team_id) }
      : {}),
  };
}
