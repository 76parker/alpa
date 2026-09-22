import { useState } from "react";
import { ArrowRight, Link2 } from "lucide-react";
import { toast } from "sonner";
import type {
  Component,
  ComponentClient,
  Integration,
  ClientAction,
  CreateIntegration,
} from "@/api/types";
import { useComponents, useInventoryMutation } from "@/api/queries";
import {
  apiDisplayName,
  clientLabel,
  integrationActions,
} from "@/domain/catalog";
import { ComponentIcon } from "@/domain/visuals";
import {
  defaultConnectionStyle,
  saveConnectionStyle,
  type ConnectionStyle,
} from "@/features/architecture/connection-style";
import { canBind } from "@/features/architecture/model";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
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
  connectionStyle = defaultConnectionStyle,
  onClose,
}: {
  productID: number;
  selection: BindingSelection;
  connectionStyle?: ConnectionStyle;
  onClose: () => void;
}) {
  const inventory = useComponents(productID);
  const components = inventory.data || [];
  const [apiID, setAPIID] = useState(
    selection.targetAPIID ? String(selection.targetAPIID) : "",
  );
  const [action, setAction] = useState<ClientAction | "">("");
  const [description, setDescription] = useState("");
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
  const actions = client
    ? integrationActions(client.communication_type, client.client_name)
    : [];
  const selectedAction = actions.includes(action as ClientAction)
    ? (action as ClientAction)
    : actions[0];
  const duplicate = client?.integrations.some(
    (item) => item.api_id === Number(apiID),
  );
  const save = useInventoryMutation<Integration, CreateIntegration>({
    method: "POST",
    path: () => "/v1/integrations",
    body: (value) => value,
  });
  const valid = !!(
    source &&
    client &&
    target &&
    api &&
    selectedAction &&
    description.trim().length <= 1000 &&
    canBind(source, client, target, api.id)
  );
  const submit = async () => {
    if (!valid || save.isPending) return;
    try {
      const integration = await save.mutateAsync({
        client_id: selection.clientID,
        api_id: Number(apiID),
        action: selectedAction,
        description: description.trim() || null,
      });
      saveConnectionStyle(productID, integration.id, connectionStyle);
      toast.success("Integration created");
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
          <DialogTitle>Review integration</DialogTitle>
          <DialogDescription>
            Create an integration between a client and an API in this product.
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
                <span className="api-text">{apiDisplayName(api)}</span>
              </div>
            ) : (
              <div>
                <Link2 />
                <strong>Choose an API</strong>
                <span>Another component in this product</span>
              </div>
            )}
          </div>
          {!selection.targetAPIID && (
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
                    label: `${item.name} / ${apiDisplayName(api)}`,
                  })),
                )}
              />
            </FormField>
          )}
          {actions.length > 1 ? (
            <FormField id="integration-action" label="Action" required>
              <SelectControl
                id="integration-action"
                label="Action"
                value={selectedAction || ""}
                onChange={(value) => setAction(value as ClientAction)}
                disabled={save.isPending}
                options={actions.map((value) => ({ value, label: value }))}
              />
            </FormField>
          ) : null}
          <FormField id="integration-description" label="Description">
            <Textarea
              id="integration-description"
              dir="auto"
              maxLength={1000}
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              disabled={save.isPending}
            />
          </FormField>
          {duplicate ? (
            <p role="alert" className="form-error">
              An integration with this API already exists. Choose another API.
            </p>
          ) : null}
          {!targets.some((item) => item.apis.length) ? (
            <p className="form-hint">
              Create an API on another component to integrate this client.
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
                {save.isPending
                  ? "Creating integration…"
                  : "Create integration"}
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
