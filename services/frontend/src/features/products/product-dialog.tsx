import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { FieldGroup } from "@/components/ui/field";
import { DialogClose } from "@/components/ui/dialog";
import {
  CriticalityBadge,
  ErrorNotice,
  FormDialog,
  FormField,
  SelectControl,
  SubmitButton,
} from "@/components/shared/controls";
import { useInventoryMutation } from "@/api/queries";
import type { CreateProduct, Product } from "@/api/types";
import { criticalities } from "@/domain/catalog";
import {
  productSchema,
  makeProductRequest,
  type ProductDraft,
} from "@/domain/forms";
import { useWorkspace } from "@/app/workspace-context";
export function ProductDialog({ onClose }: { onClose: () => void }) {
  const { activeID, activeWorkspace } = useWorkspace();
  const navigate = useNavigate();
  const form = useForm<ProductDraft>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: "",
      product_code: "",
      criticality: "business-critical",
      description: "",
      owning_team_id: "",
    },
  });
  const create = useInventoryMutation<Product, CreateProduct>({
    method: "POST",
    path: () => `/v1/workspaces/${activeID}/products`,
    body: (values) => values,
  });
  const submit = form.handleSubmit(async (values) => {
    if (!activeID) return;
    try {
      const product = await create.mutateAsync(makeProductRequest(values));
      toast.success("Product created");
      navigate(`/workspaces/${activeID}/products/${product.id}`);
    } catch {
      /* Preserve the form and show the error. */
    }
  });
  return (
    <FormDialog
      title="Create product"
      description={activeWorkspace?.name || "Workspace"}
      onClose={onClose}
      dirty={form.formState.isDirty}
      busy={create.isPending}
      className="product-dialog"
    >
      <form onSubmit={submit} noValidate>
        <fieldset disabled={create.isPending}>
          <FieldGroup>
            <FormField
              id="product-name"
              label="Name"
              required
              hint="Up to 50 characters."
              error={form.formState.errors.name?.message}
            >
              <Input
                id="product-name"
                autoFocus
                maxLength={50}
                aria-invalid={!!form.formState.errors.name}
                {...form.register("name")}
              />
            </FormField>
            <div className="form-two-column product-code-row">
              <FormField
                id="product-code"
                label="Code"
                required
                hint="1–10 uppercase letters A–Z."
                error={form.formState.errors.product_code?.message}
              >
                <Input
                  id="product-code"
                  maxLength={10}
                  aria-invalid={!!form.formState.errors.product_code}
                  {...form.register("product_code")}
                />
              </FormField>
              <FormField
                id="product-criticality"
                label="Criticality"
                required
                error={form.formState.errors.criticality?.message}
              >
                <Controller
                  control={form.control}
                  name="criticality"
                  render={({ field }) => (
                    <SelectControl
                      id="product-criticality"
                      label="Criticality"
                      value={field.value}
                      onChange={field.onChange}
                      options={criticalities.map((value) => ({
                        value,
                        label: <CriticalityBadge value={value} />,
                        text: value,
                      }))}
                    />
                  )}
                />
              </FormField>
            </div>
            <FormField
              id="product-description"
              label="Description"
              hint="Optional · up to 1,000 characters."
              error={form.formState.errors.description?.message}
            >
              <Textarea
                id="product-description"
                maxLength={1000}
                aria-invalid={!!form.formState.errors.description}
                {...form.register("description")}
              />
            </FormField>
            <FormField
              id="product-team"
              label="Owning team ID"
              hint="Positive integer. A team picker is not available yet."
              error={form.formState.errors.owning_team_id?.message}
            >
              <Input
                id="product-team"
                inputMode="numeric"
                placeholder="Optional"
                aria-invalid={!!form.formState.errors.owning_team_id}
                {...form.register("owning_team_id")}
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
          <SubmitButton busy={create.isPending}>Create product</SubmitButton>
        </footer>
      </form>
    </FormDialog>
  );
}
