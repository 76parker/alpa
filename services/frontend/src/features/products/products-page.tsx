import { useDeferredValue, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  ArrowDown,
  ArrowUp,
  ChevronLeft,
  ChevronRight,
  MoreHorizontal,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { useWorkspace } from "@/app/workspace-context";
import { useInventoryMutation, useProducts } from "@/api/queries";
import type { Product } from "@/api/types";
import { criticalities, criticalityLabel } from "@/domain/catalog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  CriticalityBadge,
  EmptyState,
  ErrorNotice,
  Loading,
  NotFound,
  PageHeading,
  SelectControl,
  useTitle,
} from "@/components/shared/controls";
import { ProductDialog } from "./product-dialog";
export function ProductsPage({ creating = false }: { creating?: boolean }) {
  useTitle("Products");
  const { workspaceID } = useParams();
  const { activeID, activeWorkspace, workspaces, setCreating } = useWorkspace();
  const products = useProducts(activeID || undefined);
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const query = useDeferredValue(search);
  const [criticality, setCriticality] = useState("all");
  const [descending, setDescending] = useState(false);
  const [page, setPage] = useState(0);
  const [deleting, setDeleting] = useState<Product | null>(null);
  const remove = useInventoryMutation<void, number>({
    method: "DELETE",
    path: (id) => `/v1/products/${id}`,
  });
  const filtered = (products.data || [])
    .filter(
      (product) =>
        (criticality === "all" || product.criticality === criticality) &&
        `${product.name} ${product.product_code} ${product.description || ""}`
          .toLowerCase()
          .includes(query.toLowerCase()),
    )
    .sort((a, b) => a.name.localeCompare(b.name) * (descending ? -1 : 1));
  const currentPage = Math.min(
    page,
    Math.max(0, Math.ceil(filtered.length / 20) - 1),
  );
  const rows = filtered.slice(currentPage * 20, currentPage * 20 + 20);
  const base = `/workspaces/${activeID}/products`;
  const onDelete = async () => {
    if (!deleting) return;
    try {
      await remove.mutateAsync(deleting.id);
      setDeleting(null);
      toast.success("Product deleted");
    } catch {
      /* Confirmation remains open. */
    }
  };
  if (
    workspaceID &&
    (!Number.isSafeInteger(Number(workspaceID)) ||
      Number(workspaceID) < 1 ||
      (workspaces.isSuccess &&
        !workspaces.data.some((item) => item.id === Number(workspaceID))))
  )
    return <NotFound label="Workspace not found" />;
  return (
    <>
      <PageHeading
        title="Products"
        description={
          activeWorkspace
            ? `Architecture inventory for ${activeWorkspace.name}`
            : "Your product architecture inventory"
        }
      >
        <Button
          onClick={() => navigate(`${base}/new`)}
          disabled={!activeWorkspace}
        >
          Create product
        </Button>
      </PageHeading>
      {workspaces.isPending ? (
        <Loading />
      ) : workspaces.isError ? (
        <ErrorNotice
          error={workspaces.error}
          retry={() => void workspaces.refetch()}
        />
      ) : !activeID ? (
        <EmptyState
          title="Create your first workspace"
          description="Create a workspace to start organizing products and components."
        >
          <Button onClick={() => setCreating(true)}>Create workspace</Button>
        </EmptyState>
      ) : products.isPending ? (
        <Loading label="Loading products…" />
      ) : products.isError ? (
        <ErrorNotice
          error={products.error}
          retry={() => void products.refetch()}
        />
      ) : !products.data.length ? (
        <EmptyState
          title="No products yet"
          description="Create your first product to start mapping its architecture."
        >
          <Button onClick={() => navigate(`${base}/new`)}>
            Create product
          </Button>
        </EmptyState>
      ) : (
        <>
          <div className="list-toolbar">
            <Input
              className="search-input"
              aria-label="Search products"
              placeholder="Search products…"
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(0);
              }}
            />
            <SelectControl
              label="Filter criticality"
              value={criticality}
              onChange={(value) => {
                setCriticality(value);
                setPage(0);
              }}
              className="criticality-filter"
              options={[
                { value: "all", label: "All criticalities" },
                ...criticalities.map((value) => ({
                  value,
                  label: criticalityLabel(value),
                })),
              ]}
            />
            <span className="result-count">
              {filtered.length} {filtered.length === 1 ? "product" : "products"}
            </span>
          </div>
          {!rows.length ? (
            <EmptyState
              title="No results"
              description="No products match the current search. Try a different search or clear the filters."
            >
              <Button
                variant="outline"
                onClick={() => {
                  setSearch("");
                  setCriticality("all");
                }}
              >
                Clear filters
              </Button>
            </EmptyState>
          ) : (
            <>
              <Table className="inventory-table products-table">
                <TableHeader>
                  <TableRow>
                    <TableHead>
                      <button
                        className="sort-heading"
                        onClick={() => setDescending(!descending)}
                      >
                        Name{" "}
                        {descending ? (
                          <ArrowDown size={14} />
                        ) : (
                          <ArrowUp size={14} />
                        )}
                      </button>
                    </TableHead>
                    <TableHead>Code</TableHead>
                    <TableHead>Criticality</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>
                      <span className="sr-only">Actions</span>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((product) => (
                    <TableRow key={product.id}>
                      <TableCell>
                        <Link
                          className="name-link"
                          to={`${base}/${product.id}`}
                        >
                          {product.name}
                        </Link>
                      </TableCell>
                      <TableCell>{product.product_code}</TableCell>
                      <TableCell>
                        <CriticalityBadge value={product.criticality} />
                      </TableCell>
                      <TableCell className="description-cell">
                        {product.description || "—"}
                      </TableCell>
                      <TableCell className="row-actions">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              aria-label={`Actions for ${product.name}`}
                            >
                              <MoreHorizontal />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuGroup>
                              <DropdownMenuItem
                                onSelect={() => {
                                  remove.reset();
                                  setDeleting(product);
                                }}
                              >
                                <Trash2 />
                                Delete product
                              </DropdownMenuItem>
                            </DropdownMenuGroup>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <div className="table-footer">
                <span>
                  Showing {currentPage * 20 + 1}–
                  {currentPage * 20 + rows.length} of {filtered.length}
                </span>
                {filtered.length > 20 ? (
                  <div className="pagination">
                    <Button
                      variant="outline"
                      size="icon-sm"
                      aria-label="Previous page"
                      disabled={!currentPage}
                      onClick={() => setPage(currentPage - 1)}
                    >
                      <ChevronLeft />
                    </Button>
                    <span>Page {currentPage + 1}</span>
                    <Button
                      variant="outline"
                      size="icon-sm"
                      aria-label="Next page"
                      disabled={(currentPage + 1) * 20 >= filtered.length}
                      onClick={() => setPage(currentPage + 1)}
                    >
                      <ChevronRight />
                    </Button>
                  </div>
                ) : null}
              </div>
            </>
          )}
        </>
      )}
      {creating && activeWorkspace ? (
        <ProductDialog onClose={() => navigate(base)} />
      ) : null}
      {deleting ? (
        <ConfirmDialog
          open
          title={`Delete ${deleting.name}?`}
          description="The product and its components will be removed. This action cannot be undone."
          onCancel={() => setDeleting(null)}
          onConfirm={() => void onDelete()}
          busy={remove.isPending}
          error={remove.error}
        />
      ) : null}
    </>
  );
}
