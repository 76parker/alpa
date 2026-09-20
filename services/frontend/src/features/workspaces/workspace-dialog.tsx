import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { FieldGroup } from "@/components/ui/field";
import { DialogClose } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  FormDialog,
  FormField,
  ErrorNotice,
  SubmitButton,
} from "@/components/shared/controls";
import { useInventoryMutation } from "@/api/queries";
import type { Workspace } from "@/api/types";
import { workspaceSchema } from "@/domain/forms";
export function WorkspaceDialog({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: (workspace: Workspace) => void;
}) {
  const form = useForm({
    resolver: zodResolver(workspaceSchema),
    defaultValues: { name: "" },
  });
  const create = useInventoryMutation<Workspace, { name: string }>({
    method: "POST",
    path: () => "/v1/workspaces",
    body: (value) => value,
  });
  const submit = form.handleSubmit(async (values) => {
    try {
      const workspace = await create.mutateAsync(values);
      toast.success("Workspace created");
      onCreated(workspace);
    } catch {
      /* The form displays the mutation error and preserves its values. */
    }
  });
  return (
    <FormDialog
      title="Create workspace"
      description="A shared space for your products and their architecture."
      onClose={onClose}
      dirty={form.formState.isDirty}
      busy={create.isPending}
      className="workspace-dialog"
    >
      <form onSubmit={submit} noValidate>
        <fieldset disabled={create.isPending}>
          <FieldGroup>
            <FormField
              id="workspace-name"
              label="Name"
              required
              error={form.formState.errors.name?.message}
              hint="Up to 50 characters."
            >
              <Input
                id="workspace-name"
                autoFocus
                maxLength={50}
                aria-invalid={!!form.formState.errors.name}
                {...form.register("name")}
                placeholder="For example, Acme workspace"
              />
            </FormField>
          </FieldGroup>
        </fieldset>
        {create.error ? <ErrorNotice error={create.error} /> : null}
        <footer className="form-actions">
          <DialogClose asChild>
            <Button type="button" variant="outline" disabled={create.isPending}>
              Cancel
            </Button>
          </DialogClose>
          <SubmitButton busy={create.isPending}>Create workspace</SubmitButton>
        </footer>
      </form>
    </FormDialog>
  );
}
