import { useState } from "react";
import { Check, MoreHorizontal, Plus, Trash2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useWorkspace } from "@/app/workspace-context";
import { useInventoryMutation } from "@/api/queries";
import type { Workspace } from "@/api/types";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ConfirmDialog,
  EmptyState,
  ErrorNotice,
  Loading,
  PageHeading,
  useTitle,
} from "@/components/shared/controls";
export function WorkspacesPage() {
  useTitle("Workspace");
  const context = useWorkspace();
  const navigate = useNavigate();
  const [deleting, setDeleting] = useState<Workspace | null>(null);
  const remove = useInventoryMutation<void, number>({
    method: "DELETE",
    path: (id) => `/v1/workspaces/${id}`,
  });
  const onDelete = async () => {
    if (!deleting) return;
    try {
      await remove.mutateAsync(deleting.id);
      const next = context.workspaces.data?.find(
        (item) => item.id !== deleting.id,
      );
      if (deleting.id === context.activeID) {
        context.remember(next?.id || null);
        if (next) context.selectWorkspace(next.id);
        else navigate("/workspaces");
      }
      setDeleting(null);
      toast.success("Workspace deleted");
    } catch {
      /* Display deletion error. */
    }
  };
  return (
    <>
      <PageHeading
        title="Workspace"
        description="Choose a workspace to explore its products and architecture."
      >
        <Button onClick={() => context.setCreating(true)}>
          <Plus data-icon="inline-start" />
          Create workspace
        </Button>
      </PageHeading>
      {context.workspaces.isPending ? (
        <Loading label="Loading workspaces…" />
      ) : context.workspaces.isError ? (
        <ErrorNotice
          error={context.workspaces.error}
          retry={() => void context.workspaces.refetch()}
        />
      ) : !context.workspaces.data.length ? (
        <EmptyState
          title="Create your first workspace"
          description="Workspaces keep your products and their architecture together."
        >
          <Button onClick={() => context.setCreating(true)}>
            Create workspace
          </Button>
        </EmptyState>
      ) : (
        <Table className="inventory-table workspace-table">
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>
                <span className="sr-only">Actions</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {context.workspaces.data.map((workspace) => (
              <TableRow key={workspace.id}>
                <TableCell>
                  <button
                    className="name-link"
                    onClick={() => context.selectWorkspace(workspace.id)}
                  >
                    {workspace.name}
                  </button>
                </TableCell>
                <TableCell>
                  {workspace.id === context.activeID ? (
                    <span className="inline-label muted">
                      <Check size={14} />
                      Active workspace
                    </span>
                  ) : (
                    <Button
                      variant="ghost"
                      onClick={() => context.selectWorkspace(workspace.id)}
                    >
                      Switch workspace
                    </Button>
                  )}
                </TableCell>
                <TableCell className="row-actions">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={`Actions for ${workspace.name}`}
                      >
                        <MoreHorizontal />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuGroup>
                        <DropdownMenuItem
                          onSelect={() => {
                            remove.reset();
                            setDeleting(workspace);
                          }}
                        >
                          <Trash2 />
                          Delete workspace
                        </DropdownMenuItem>
                      </DropdownMenuGroup>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
      {deleting ? (
        <ConfirmDialog
          open
          title={`Delete ${deleting.name}?`}
          description="The workspace and its inventory will be removed. This action cannot be undone."
          onCancel={() => setDeleting(null)}
          onConfirm={() => void onDelete()}
          busy={remove.isPending}
          error={remove.error}
        />
      ) : null}
    </>
  );
}
