import { Controller, useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { z } from "zod";
import { Plus, X } from "lucide-react";
import { toast } from "sonner";
import type {
  Component,
  ComponentType,
  CreateComponent,
  Product,
} from "@/api/types";
import { useInventoryMutation } from "@/api/queries";
import {
  apiLabel,
  apiTypes,
  clientLabel,
  clientNames,
  communicationFor,
  impact,
  importancies,
  languageLabel,
  languages,
  roles,
  technologies,
  technologyFor,
  titleCase,
} from "@/domain/catalog";
import {
  componentSchema,
  emptyComponent,
  makeComponentRequest,
  type ComponentDraft,
} from "@/domain/forms";
import { TechnologyIcon } from "@/domain/visuals";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { FieldGroup } from "@/components/ui/field";
import { DialogClose } from "@/components/ui/dialog";
import {
  ErrorNotice,
  FormDialog,
  FormField,
  SelectControl,
  SubmitButton,
} from "@/components/shared/controls";
import { ComponentNodeView } from "@/features/architecture/component-node";
function previewComponent(draft: ComponentDraft, product: Product): Component {
  const system = technologyFor(draft.technology);
  const infrastructure = draft.type === "infrastructure";
  return {
    id: 0,
    product_id: product.id,
    name: infrastructure ? system.label : draft.name || "untitled-service",
    type: draft.type,
    description: draft.description,
    details: infrastructure
      ? {
          technology_name: system.name,
          technology_type: system.type,
          importancy: draft.importancy || "supporting",
          version: "",
          endpoints: [],
        }
      : { language: draft.language },
    apis: draft.apis.map((api, index) => ({
      ...api,
      name: api.name || `${infrastructure ? system.resource : "API"} name`,
      api_type: infrastructure ? system.apiType : api.api_type,
      id: -(index + 1),
      documentation_url: null,
    })),
    clients: infrastructure
      ? []
      : draft.clients.map((client, index) => ({
          ...client,
          id: -(index + 1),
          secure_connection: client.secure_connection || false,
          api_id: null,
          communication_type: communicationFor(client.client_name),
          action: null,
          capabilities: null,
        })),
  };
}
export function ComponentDialog({
  product,
  type,
  onClose,
  onCreated,
}: {
  product: Product;
  type: ComponentType;
  onClose: () => void;
  onCreated: (component: Component) => void;
}) {
  const form = useForm<
    ComponentDraft,
    unknown,
    z.output<typeof componentSchema>
  >({
    resolver: zodResolver(componentSchema),
    defaultValues: emptyComponent(type),
  });
  const apis = useFieldArray({ control: form.control, name: "apis" });
  const clients = useFieldArray({ control: form.control, name: "clients" });
  const draft = form.watch();
  const infrastructure = type === "infrastructure";
  const system = technologyFor(draft.technology);
  const title = infrastructure
    ? "Create infrastructure"
    : type === "frontend-service"
      ? "Create frontend service"
      : "Create backend service";
  const create = useInventoryMutation<Component, CreateComponent>({
    method: "POST",
    path: () => "/v1/components",
    body: (value) => value,
  });
  const submit = form.handleSubmit(async (values) => {
    try {
      const component = await create.mutateAsync(
        makeComponentRequest(values, product.id),
      );
      toast.success(
        `${infrastructure ? "Infrastructure" : "Component"} created`,
      );
      onCreated(component);
    } catch {
      /* Preserve all draft fields. */
    }
  });
  return (
    <FormDialog
      title={title}
      description={product.name}
      className={infrastructure ? "infrastructure-dialog" : "component-dialog"}
      onClose={onClose}
      dirty={form.formState.isDirty}
      busy={create.isPending}
    >
      <form noValidate onSubmit={submit}>
        <fieldset disabled={create.isPending} className="component-form-layout">
          <div className="component-form-fields">
            <FieldGroup>
              {infrastructure ? (
                <>
                  <FormField id="system-name" label="SystemName" required>
                    <Controller
                      name="technology"
                      control={form.control}
                      render={({ field }) => (
                        <SelectControl
                          id="system-name"
                          label="SystemName"
                          value={field.value}
                          onChange={field.onChange}
                          options={technologies.map((item) => ({
                            value: item.name,
                            label: (
                              <span className="inline-label">
                                <TechnologyIcon name={item.name} size={18} />
                                {item.label}
                              </span>
                            ),
                            text: item.label,
                          }))}
                        />
                      )}
                    />
                  </FormField>
                  <FormField
                    id="infrastructure-importancy"
                    label="Importancy"
                    required
                    error={form.formState.errors.importancy?.message}
                  >
                    <Controller
                      name="importancy"
                      control={form.control}
                      render={({ field }) => (
                        <SelectControl
                          id="infrastructure-importancy"
                          label="Importancy"
                          value={field.value}
                          onChange={field.onChange}
                          options={importancies.map((value) => ({
                            value,
                            label: value.toUpperCase(),
                          }))}
                        />
                      )}
                    />
                    {draft.importancy ? (
                      <div
                        className="impact-description"
                        data-importancy={draft.importancy}
                      >
                        <span>Impact</span>
                        <p>{impact[draft.importancy].description}</p>
                        <small>
                          Example: {impact[draft.importancy].example}
                        </small>
                      </div>
                    ) : null}
                  </FormField>
                </>
              ) : (
                <>
                  <div className="form-two-column">
                    <FormField
                      id="component-name"
                      label="Name"
                      required
                      error={form.formState.errors.name?.message}
                    >
                      <Input
                        id="component-name"
                        autoFocus
                        maxLength={50}
                        aria-invalid={!!form.formState.errors.name}
                        {...form.register("name")}
                      />
                    </FormField>
                    <FormField
                      id="repository-url"
                      label="Repository URL"
                      disabled
                      hint="Not available in this version."
                    >
                      <Input
                        id="repository-url"
                        disabled
                        placeholder="Not available yet"
                      />
                    </FormField>
                  </div>
                  <FormField
                    id="component-description"
                    label="Description"
                    error={form.formState.errors.description?.message}
                  >
                    <Textarea
                      id="component-description"
                      maxLength={1000}
                      {...form.register("description")}
                    />
                  </FormField>
                  <FormField
                    id="component-language"
                    label="Language"
                    required
                    error={form.formState.errors.language?.message}
                  >
                    <Controller
                      name="language"
                      control={form.control}
                      render={({ field }) => (
                        <SelectControl
                          id="component-language"
                          label="Language"
                          value={field.value}
                          onChange={field.onChange}
                          options={languages.map((value) => ({
                            value,
                            label: (
                              <span className="inline-label">
                                <TechnologyIcon name={value} size={18} />
                                {languageLabel(value)}
                              </span>
                            ),
                            text: languageLabel(value),
                          }))}
                        />
                      )}
                    />
                  </FormField>
                </>
              )}
              <section className="draft-section">
                <div className="section-heading">
                  <h3>
                    API <span>{apis.fields.length}/5</span>
                  </h3>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon-sm"
                    aria-label="Add API"
                    disabled={apis.fields.length >= 5}
                    onClick={() =>
                      apis.append({
                        name: "",
                        api_type: infrastructure ? system.apiType : "rest",
                        network_exposure: "internal",
                      })
                    }
                  >
                    <Plus data-icon="inline-start" />
                  </Button>
                </div>
                {apis.fields.map((field, index) => (
                  <div
                    className={`draft-api-row ${infrastructure ? "infrastructure-api-row" : ""}`}
                    key={field.id}
                  >
                    <FormField
                      id={`api-name-${index}`}
                      label={
                        infrastructure ? `${system.resource} name` : "Name"
                      }
                      required
                      error={form.formState.errors.apis?.[index]?.name?.message}
                    >
                      <Input
                        id={`api-name-${index}`}
                        aria-label={`${infrastructure ? system.resource : "API"} name ${index + 1}`}
                        maxLength={50}
                        {...form.register(`apis.${index}.name`)}
                        aria-invalid={
                          !!form.formState.errors.apis?.[index]?.name
                        }
                      />
                    </FormField>
                    {!infrastructure ? (
                      <FormField
                        id={`api-type-${index}`}
                        label="API type"
                        required
                      >
                        <Controller
                          name={`apis.${index}.api_type`}
                          control={form.control}
                          render={({ field }) => (
                            <SelectControl
                              id={`api-type-${index}`}
                              label={`API type ${index + 1}`}
                              value={field.value}
                              onChange={field.onChange}
                              options={apiTypes.map((value) => ({
                                value,
                                label: apiLabel(value),
                              }))}
                            />
                          )}
                        />
                      </FormField>
                    ) : null}
                    <FormField
                      id={`api-exposure-${index}`}
                      label="Exposure"
                      required
                    >
                      <Controller
                        name={`apis.${index}.network_exposure`}
                        control={form.control}
                        render={({ field }) => (
                          <SelectControl
                            id={`api-exposure-${index}`}
                            label={`Exposure ${index + 1}`}
                            value={field.value}
                            onChange={field.onChange}
                            options={[
                              { value: "internal", label: "Internal" },
                              { value: "internet", label: "Internet" },
                            ]}
                          />
                        )}
                      />
                    </FormField>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      className="draft-remove"
                      aria-label={`Remove API ${index + 1}`}
                      onClick={() => apis.remove(index)}
                    >
                      <X />
                    </Button>
                  </div>
                ))}
              </section>
              {!infrastructure ? (
                <section className="draft-section">
                  <div className="section-heading">
                    <h3>
                      Clients <span>{clients.fields.length}/5</span>
                    </h3>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon-sm"
                      aria-label="Add client"
                      disabled={clients.fields.length >= 5}
                      onClick={() =>
                        clients.append({
                          client_name: "rest-client",
                          role: "caller",
                          secure_connection: false,
                        })
                      }
                    >
                      <Plus data-icon="inline-start" />
                    </Button>
                  </div>
                  {clients.fields.map((field, index) => (
                    <div className="draft-client-block" key={field.id}>
                      <div className="draft-client-row">
                        <FormField
                          id={`client-name-${index}`}
                          label="Client name"
                          required
                        >
                          <Controller
                            name={`clients.${index}.client_name`}
                            control={form.control}
                            render={({ field }) => (
                              <SelectControl
                                id={`client-name-${index}`}
                                label={`Client name ${index + 1}`}
                                value={field.value}
                                onChange={field.onChange}
                                options={clientNames.map((value) => ({
                                  value,
                                  label: clientLabel(value),
                                }))}
                              />
                            )}
                          />
                        </FormField>
                        <FormField
                          id={`client-role-${index}`}
                          label="Role"
                          required
                        >
                          <Controller
                            name={`clients.${index}.role`}
                            control={form.control}
                            render={({ field }) => (
                              <SelectControl
                                id={`client-role-${index}`}
                                label={`Role ${index + 1}`}
                                value={field.value}
                                onChange={field.onChange}
                                options={roles.map((value) => ({
                                  value,
                                  label: value.toUpperCase(),
                                }))}
                              />
                            )}
                          />
                        </FormField>
                        <FormField
                          id={`client-communication-${index}`}
                          label="Communication"
                        >
                          <Input
                            id={`client-communication-${index}`}
                            value={titleCase(
                              communicationFor(
                                draft.clients[index].client_name,
                              ),
                            )}
                            readOnly
                            title="Determined automatically by the client type"
                          />
                        </FormField>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          className="draft-remove"
                          aria-label={`Remove client ${index + 1}`}
                          onClick={() => clients.remove(index)}
                        >
                          <X />
                        </Button>
                      </div>
                      <FormField
                        id={`client-description-${index}`}
                        label={`${clientLabel(draft.clients[index].client_name)} description`}
                        disabled
                        hint="Not supported by the API yet."
                      >
                        <Input
                          id={`client-description-${index}`}
                          disabled
                          placeholder="Not available yet"
                        />
                      </FormField>
                    </div>
                  ))}
                  <p className="form-hint">
                    Clients are created unbound. Connect them to existing API
                    after saving.
                  </p>
                </section>
              ) : null}
            </FieldGroup>
          </div>
          <aside className="live-preview">
            <h3>{infrastructure ? "Preview" : "Live Preview"}</h3>
            {!infrastructure ? <p>Updates as you edit</p> : null}
            <ComponentNodeView
              component={previewComponent(draft, product)}
              hideImportancy={infrastructure && !draft.importancy}
            />
            {!infrastructure ? (
              <>
                <div className="port-legend">
                  <span className="api-legend">API</span>
                  <span className="client-legend">Client</span>
                </div>
                <p>Local preview · not saved yet</p>
              </>
            ) : null}
          </aside>
        </fieldset>
        {create.error ? <ErrorNotice error={create.error} /> : null}
        <footer className="form-actions">
          <DialogClose asChild>
            <Button type="button" variant="outline" disabled={create.isPending}>
              Cancel
            </Button>
          </DialogClose>
          <SubmitButton busy={create.isPending}>Create</SubmitButton>
        </footer>
      </form>
    </FormDialog>
  );
}
