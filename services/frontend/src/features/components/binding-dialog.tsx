import { useState } from "react";
import { ArrowRight, Link2 } from "lucide-react";
import { toast } from "sonner";
import type { Component, ComponentClient } from "@/api/types";
import { useComponents, useInventoryMutation } from "@/api/queries";
import { clientLabel, roleAction } from "@/domain/catalog";
import { ComponentIcon } from "@/domain/visuals";
import { canBind } from "@/features/architecture/model";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  ErrorNotice,
  FormField,
  SelectControl,
} from "@/components/shared/controls";
export type BindingSelection = {
  sourceID: number;
  clientID: number;
  targetAPIID?: number;
};
export function BindingDialog({
  productID,
  selection,
  onClose,
}: {
  productID: number;
  selection: BindingSelection;
  onClose: () => void;
}) {
  const inventory = useComponents(productID);
  const components = inventory.data || [];
  const [apiID, setAPIID] = useState(
    selection.targetAPIID ? String(selection.targetAPIID) : "",
  );
  const source = components.find((item) => item.id === selection.sourceID);
  const client = source?.clients.find((item) => item.id === selection.clientID);
  const targets = source
    ? components.filter(
        (item) =>
          item.id !== source.id && item.product_id === source.product_id,
      )
    : [];
  const target = targets.find((item) =>
    item.apis.some((api) => String(api.id) === apiID),
  );
  const api = target?.apis.find((item) => String(item.id) === apiID);
  const save = useInventoryMutation<unknown, number>({
    method: "POST",
    path: () =>
      `/v1/components/${selection.sourceID}/clients/${selection.clientID}/bindings`,
    body: (id) => ({ api_id: id }),
  });
  const valid = !!(
    source &&
    client &&
    target &&
    api &&
    canBind(source, client, target)
  );
  const submit = async () => {
    if (!valid || save.isPending) return;
    try {
      await save.mutateAsync(Number(apiID));
      toast.success("Connection created");
      onClose();
    } catch {
      /* Keep the selected target visible after a conflict. Inventory is refreshed by the mutation. */
    }
  };
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !save.isPending) onClose();
      }}
    >
      <DialogContent className="connection-dialog">
        <DialogHeader>
          <DialogTitle>Review connection</DialogTitle>
          <DialogDescription>
            Connect a free client to an API in this product.
          </DialogDescription>
        </DialogHeader>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            void submit();
          }}
        >
          <div className="connection-endpoints">
            {source && client ? (
              <Endpoint component={source} client={client} />
            ) : (
              <p>This client is no longer available.</p>
            )}
            <ArrowRight aria-hidden="true" />
            {target && api ? (
              <div>
                <ComponentIcon component={target} size={28} />
                <strong>{target.name}</strong>
                <span className="api-text">{api.name}</span>
              </div>
            ) : (
              <div>
                <Link2 />
                <strong>Choose an API</strong>
                <span>Another component in this product</span>
              </div>
            )}
          </div>
          <FormField id="binding-api" label="Target API" required>
            <SelectControl
              id="binding-api"
              label="Target API"
              value={apiID}
              onChange={setAPIID}
              disabled={save.isPending}
              options={targets.flatMap((item) =>
                item.apis.map((api) => ({
                  value: String(api.id),
                  label: `${item.name} / ${api.name}`,
                })),
              )}
            />
          </FormField>
          {client ? (
            <dl className="connection-facts">
              <div>
                <dt>Action</dt>
                <dd>{roleAction[client.role].toUpperCase()}</dd>
              </div>
              <div>
                <dt>Communication</dt>
                <dd>{client.communication_type}</dd>
              </div>
            </dl>
          ) : null}
          {client?.api_id != null ? (
            <p role="alert" className="form-error">
              This client is already connected. Its current connection has been
              refreshed.
            </p>
          ) : null}
          {!targets.some((item) => item.apis.length) ? (
            <p className="form-hint">
              Create an API on another component to connect this client.
            </p>
          ) : null}
          {save.error ? <ErrorNotice error={save.error} /> : null}
          <footer className="form-actions">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={save.isPending}
            >
              Cancel
            </Button>
            <div>
              <Button type="submit" disabled={!valid || save.isPending}>
                {save.isPending ? "Connecting…" : "Create connection"}
              </Button>
            </div>
          </footer>
        </form>
      </DialogContent>
    </Dialog>
  );
}
function Endpoint({
  component,
  client,
}: {
  component: Component;
  client: ComponentClient;
}) {
  return (
    <div>
      <ComponentIcon component={component} size={28} />
      <strong>{component.name}</strong>
      <span className="client-text">{clientLabel(client.client_name)}</span>
    </div>
  );
}
