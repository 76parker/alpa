import { useState } from "react";
import { toast } from "sonner";
import type { Integration } from "@/api/types";
import { useInventoryMutation } from "@/api/queries";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  ConfirmDialog,
  ErrorNotice,
  FormDialog,
  FormField,
} from "@/components/shared/controls";

export function IntegrationDetails({
  integration,
  onDeleted,
}: {
  integration: Integration;
  onDeleted: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const remove = useInventoryMutation<void, number>({
    method: "DELETE",
    path: (id) => `/v1/integrations/${id}`,
  });
  return (
    <>
      <div className="integration-description">
        <h3>Description</h3>
        <p>{integration.description || "No description"}</p>
      </div>
      <div className="integration-actions">
        <Button variant="outline" onClick={() => setEditing(true)}>
          Edit description
        </Button>
        <Button
          variant="destructive"
          onClick={() => {
            remove.reset();
            setDeleting(true);
          }}
        >
          Delete integration
        </Button>
      </div>
      {editing ? (
        <IntegrationDescriptionDialog
          integration={integration}
          onClose={() => setEditing(false)}
        />
      ) : null}
      <ConfirmDialog
        open={deleting}
        title="Delete integration?"
        description="Only this integration will be removed. The client, API and other integrations will remain."
        label="Delete integration"
        busy={remove.isPending}
        error={remove.error}
        onCancel={() => setDeleting(false)}
        onConfirm={() => {
          void remove
            .mutateAsync(integration.id)
            .then(() => {
              toast.success("Integration deleted");
              onDeleted();
            })
            .catch(() => {});
        }}
      />
    </>
  );
}
function IntegrationDescriptionDialog({
  integration,
  onClose,
}: {
  integration: Integration;
  onClose: () => void;
}) {
  const [description, setDescription] = useState(integration.description || "");
  const save = useInventoryMutation<Integration, string>({
    method: "PATCH",
    path: () => `/v1/integrations/${integration.id}`,
    body: (value) => ({ description: value.trim() || null }),
  });
  return (
    <FormDialog
      title="Edit integration description"
      description="Describe what this integration does."
      onClose={onClose}
      busy={save.isPending}
      dirty={description !== (integration.description || "")}
    >
      <form
        onSubmit={(event) => {
          event.preventDefault();
          if (save.isPending || description.trim().length > 1000) return;
          void save
            .mutateAsync(description)
            .then(() => {
              toast.success("Integration updated");
              onClose();
            })
            .catch(() => {});
        }}
      >
        <FormField id="edit-integration-description" label="Description">
          <Textarea
            autoFocus
            id="edit-integration-description"
            dir="auto"
            maxLength={1000}
            value={description}
            disabled={save.isPending}
            onChange={(event) => setDescription(event.target.value)}
          />
        </FormField>
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
          <Button type="submit" disabled={save.isPending}>
            {save.isPending ? "Saving…" : "Save changes"}
          </Button>
        </footer>
      </form>
    </FormDialog>
  );
}
