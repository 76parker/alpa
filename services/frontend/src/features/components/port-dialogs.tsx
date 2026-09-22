import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { z } from "zod";
import { toast } from "sonner";
import type {
  APIInput,
  ClientInput,
  Component,
  ComponentAPI,
  ComponentClient,
} from "@/api/types";
import { isInfrastructure } from "@/api/types";
import { useInventoryMutation } from "@/api/queries";
import {
  apiSchema,
  clientSchema,
  makeAPIRequest,
  makeClientRequest,
  type ClientDraft,
} from "@/domain/forms";
import {
  apiLabel,
  apiTypes,
  clientLabel,
  unusedClientNames,
  communicationFor,
  technologyFor,
  titleCase,
} from "@/domain/catalog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DialogClose } from "@/components/ui/dialog";
import { FieldGroup } from "@/components/ui/field";
import {
  ErrorNotice,
  FormDialog,
  FormField,
  SelectControl,
  SubmitButton,
} from "@/components/shared/controls";
export function APIDialog({
  component,
  original,
  onClose,
}: {
  component: Component;
  original?: ComponentAPI;
  onClose: () => void;
}) {
  const system = isInfrastructure(component)
    ? technologyFor(component.details.technology_name)
    : null;
  const form = useForm<z.input<typeof apiSchema>>({
    resolver: zodResolver(apiSchema),
    defaultValues: {
      name: original?.name ?? "",
      api_type: original?.api_type ?? system?.apiType ?? "rest",
      network_exposure: original?.network_exposure ?? "internal",
    },
  });
  const save = useInventoryMutation<ComponentAPI, APIInput>({
    method: original ? "PUT" : "POST",
    path: () =>
      `/v1/components/${component.id}/apis${original ? `/${original.id}` : ""}`,
    body: (value) => value,
  });
  const submit = form.handleSubmit(async (value) => {
    try {
      await save.mutateAsync(makeAPIRequest(value));
      toast.success(original ? "API updated" : "API added");
      onClose();
    } catch {
      /* The form keeps its draft on failure. */
    }
  });
  const title = `${original ? "Edit" : "Add"} ${system?.resource.toLowerCase() || "API"}`;
  return (
    <FormDialog
      title={title}
      description={component.name}
      onClose={onClose}
      dirty={form.formState.isDirty}
      busy={save.isPending}
    >
      <form onSubmit={submit} noValidate>
        <fieldset disabled={save.isPending}>
          <FieldGroup>
            <FormField
              id="port-api-name"
              label="API name"
              required
              error={form.formState.errors.name?.message}
            >
              <Input id="port-api-name" {...form.register("name")} />
            </FormField>
            {!system ? (
              <FormField id="port-api-type" label="API type" required>
                <Controller
                  name="api_type"
                  control={form.control}
                  render={({ field }) => (
                    <SelectControl
                      id="port-api-type"
                      label="API type"
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
            <FormField id="port-api-exposure" label="Exposure" required>
              <Controller
                name="network_exposure"
                control={form.control}
                render={({ field }) => (
                  <SelectControl
                    id="port-api-exposure"
                    label="Exposure"
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
          </FieldGroup>
        </fieldset>
        {save.error ? <ErrorNotice error={save.error} /> : null}
        <footer className="form-actions">
          <DialogClose asChild>
            <Button variant="outline" type="button" disabled={save.isPending}>
              Cancel
            </Button>
          </DialogClose>
          <SubmitButton busy={save.isPending}>
            {original
              ? "Save changes"
              : `Add ${system?.resource.toLowerCase() || "API"}`}
          </SubmitButton>
        </footer>
      </form>
    </FormDialog>
  );
}
export function ClientDialog({
  component,
  original,
  onClose,
}: {
  component: Component;
  original?: ComponentClient;
  onClose: () => void;
}) {
  const allowedClients = unusedClientNames(component, original?.id);
  const form = useForm<ClientDraft, unknown, z.output<typeof clientSchema>>({
    resolver: zodResolver(clientSchema),
    defaultValues: original
      ? original
      : {
          client_name: allowedClients.includes("rest-client")
            ? "rest-client"
            : allowedClients[0],
          secure_connection: false,
        },
  });
  const save = useInventoryMutation<ComponentClient, ClientInput>({
    method: original ? "PUT" : "POST",
    path: () =>
      `/v1/components/${component.id}/clients${original ? `/${original.id}` : ""}`,
    body: (value) => value,
  });
  const name = form.watch("client_name");
  const submit = form.handleSubmit(async (value) => {
    if (!allowedClients.includes(value.client_name)) {
      form.setError("client_name", {
        message: "This client type already exists on the component.",
      });
      return;
    }
    try {
      await save.mutateAsync(makeClientRequest(value, original));
      toast.success(original ? "Client updated" : "Client added");
      onClose();
    } catch {
      /* The form keeps its draft on failure. */
    }
  });
  return (
    <FormDialog
      title={original ? "Edit client" : "Add client"}
      description={component.name}
      onClose={onClose}
      dirty={form.formState.isDirty}
      busy={save.isPending}
    >
      <form onSubmit={submit} noValidate>
        <fieldset disabled={save.isPending}>
          <FieldGroup>
            <FormField
              id="port-client-name"
              label="Client name"
              required
              error={form.formState.errors.client_name?.message}
            >
              <Controller
                name="client_name"
                control={form.control}
                render={({ field }) => (
                  <SelectControl
                    id="port-client-name"
                    label="Client name"
                    value={field.value}
                    onChange={field.onChange}
                    options={allowedClients.map((value) => ({
                      value,
                      label: clientLabel(value),
                    }))}
                  />
                )}
              />
            </FormField>

            <FormField
              id="port-client-communication"
              label="Communication"
              hint="Determined by the client type."
            >
              <Input
                readOnly
                id="port-client-communication"
                value={titleCase(
                  original && name === original.client_name
                    ? original.communication_type
                    : communicationFor(name),
                )}
              />
            </FormField>

            <FormField
              id="port-client-description"
              label="Description"
              disabled
              hint="Not supported by the API yet."
            >
              <Input
                id="port-client-description"
                disabled
                placeholder="Not available yet"
              />
            </FormField>
          </FieldGroup>
        </fieldset>
        {save.error ? <ErrorNotice error={save.error} /> : null}
        <footer className="form-actions">
          <DialogClose asChild>
            <Button type="button" variant="outline" disabled={save.isPending}>
              Cancel
            </Button>
          </DialogClose>
          <SubmitButton busy={save.isPending}>
            {original ? "Save changes" : "Add client"}
          </SubmitButton>
        </footer>
      </form>
    </FormDialog>
  );
}
