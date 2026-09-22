import { useState } from "react";
import {
  Link,
  useNavigate,
  useParams,
  useSearchParams,
} from "react-router-dom";
import { Box, Database, Plus, Server } from "lucide-react";
import { useComponents } from "@/api/queries";
import type { ComponentType } from "@/api/types";
import { isInfrastructure } from "@/api/types";
import { componentSubtitle } from "@/domain/visuals";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  EmptyState,
  ErrorNotice,
  Loading,
  NotFound,
  SelectControl,
} from "@/components/shared/controls";
import {
  ArchitectureLink,
  productPath,
  useCurrentProduct,
} from "@/features/products/product-layout";
import { ComponentDialog } from "./component-dialog";
import { ComponentDetails } from "./component-details";
import { ServicesTable, serviceRepositoryURL } from "./services-table";
import { InfrastructureTable } from "./infrastructure-table";
import { apiDisplayName, technologyFor } from "@/domain/catalog";
export function CreateComponentButton({
  onSelect,
  servicesOnly = false,
}: {
  onSelect: (type: ComponentType) => void;
  servicesOnly?: boolean;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button>
          <Plus data-icon="inline-start" />
          {servicesOnly ? "Create service" : "Create component"}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onSelect={() => onSelect("backend-service")}>
          <Server />
          Backend
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => onSelect("frontend-service")}>
          <Box />
          Frontend
        </DropdownMenuItem>
        {!servicesOnly ? (
          <DropdownMenuItem onSelect={() => onSelect("infrastructure")}>
            <Database />
            Infrastructure
          </DropdownMenuItem>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
export function ComponentsPage() {
  const product = useCurrentProduct();
  const inventory = useComponents(product.id);
  const [params, setParams] = useSearchParams();
  const infrastructure = params.get("view") === "infrastructure";
  const [search, setSearch] = useState("");
  const [type, setType] = useState("all");
  const [system, setSystem] = useState("all");
  const [descending, setDescending] = useState(false);
  const [creating, setCreating] = useState<ComponentType | null>(null);
  const navigate = useNavigate();
  const [page, setPage] = useState(0);
  const all = inventory.data || [];
  const items = all
    .filter(
      (item) =>
        (item.type === "infrastructure") === infrastructure &&
        (infrastructure
          ? system === "all" ||
            (isInfrastructure(item) && item.details.technology_name === system)
          : type === "all" || item.type === type) &&
        `${item.name} ${componentSubtitle(item)} ${item.description || ""} ${serviceRepositoryURL(item)} ${isInfrastructure(item) ? item.details.endpoints.join(" ") + " " + item.apis.map((api) => apiDisplayName(api)).join(" ") : ""}`
          .toLowerCase()
          .includes(search.toLowerCase()),
    )
    .sort((a, b) => (descending ? -1 : 1) * a.name.localeCompare(b.name));
  const lastPage = Math.max(0, Math.ceil(items.length / 20) - 1);
  const currentPage = Math.min(page, lastPage);
  return (
    <>
      <div className="components-navigation components-list-navigation">
        <div className="component-view-tabs">
          <Button
            variant={!infrastructure ? "secondary" : "ghost"}
            onClick={() => {
              setParams({});
              setPage(0);
              setType("all");
              setSystem("all");
            }}
          >
            <img
              src="/assets/navigation-services.png"
              width={20}
              height={20}
              alt=""
            />
            Services
          </Button>
          <Button
            variant={infrastructure ? "secondary" : "ghost"}
            onClick={() => {
              setParams({ view: "infrastructure" });
              setPage(0);
              setType("all");
              setSystem("all");
            }}
          >
            <img
              src="/assets/navigation-infrastructure.png"
              width={20}
              height={20}
              alt=""
            />
            Infrastructure
          </Button>
          <Button variant="ghost" asChild>
            <ArchitectureLink product={product}>
              <img
                src="/assets/navigation-architecture.png"
                width={20}
                height={20}
                alt=""
              />
              Architecture
            </ArchitectureLink>
          </Button>
        </div>
      </div>
      <div
        className={`table-toolbar services-toolbar ${infrastructure ? "infrastructure-toolbar" : ""}`}
      >
        <div className="services-search">
          <Input
            aria-label={
              infrastructure ? "Search infrastructure" : "Search services"
            }
            placeholder={
              infrastructure ? "Search infrastructure…" : "Search services…"
            }
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(0);
            }}
          />
        </div>
        {!infrastructure ? (
          <SelectControl
            label="Service type"
            value={type}
            onChange={(value) => {
              setType(value);
              setPage(0);
            }}
            className="filter-select"
            options={[
              { value: "all", label: "All service types" },
              { value: "backend-service", label: "Backend service" },
              { value: "frontend-service", label: "Frontend service" },
            ]}
          />
        ) : (
          <SelectControl
            label="System"
            value={system}
            onChange={(value) => {
              setSystem(value);
              setPage(0);
            }}
            className="filter-select"
            options={[
              { value: "all", label: "All systems" },
              ...Array.from(
                new Set(
                  all
                    .filter(isInfrastructure)
                    .map((item) => item.details.technology_name),
                ),
              )
                .sort()
                .map((name) => ({
                  value: name,
                  label: technologyFor(name).label,
                })),
            ]}
          />
        )}
        {infrastructure ? (
          <Button
            variant="outline"
            onClick={() => setCreating("infrastructure")}
          >
            <Plus />
            Create infrastructure
          </Button>
        ) : (
          <CreateComponentButton onSelect={setCreating} servicesOnly />
        )}
      </div>
      {inventory.isPending ? (
        <Loading />
      ) : inventory.isError ? (
        <ErrorNotice
          error={inventory.error}
          retry={() => void inventory.refetch()}
        />
      ) : !items.length ? (
        <EmptyState
          title={
            search
              ? "No components found"
              : infrastructure
                ? "No infrastructure yet"
                : "No services yet"
          }
          description={
            search
              ? "Try a different search or filter."
              : "Create your first component to start mapping this product."
          }
        >
          {infrastructure ? (
            <Button
              variant="outline"
              onClick={() => setCreating("infrastructure")}
            >
              <Plus />
              Create infrastructure
            </Button>
          ) : (
            <CreateComponentButton onSelect={setCreating} servicesOnly />
          )}
        </EmptyState>
      ) : !infrastructure ? (
        <ServicesTable
          components={items.slice(currentPage * 20, (currentPage + 1) * 20)}
          product={product}
          descending={descending}
          onSort={() => setDescending(!descending)}
        />
      ) : (
        <InfrastructureTable
          components={items
            .filter(isInfrastructure)
            .slice(currentPage * 20, (currentPage + 1) * 20)}
          product={product}
          descending={descending}
          onSort={() => setDescending(!descending)}
        />
      )}
      {!infrastructure && inventory.isSuccess && items.length > 0 ? (
        <p className="services-table-hint">Select a service to open details</p>
      ) : null}
      {items.length > 20 ? (
        <div className="pagination">
          <span>{items.length} components</span>
          <span>
            Page {currentPage + 1} of {lastPage + 1}
          </span>
          <Button
            variant="outline"
            disabled={currentPage === 0}
            onClick={() => setPage(currentPage - 1)}
          >
            Previous
          </Button>
          <Button
            variant="outline"
            disabled={currentPage === lastPage}
            onClick={() => setPage(currentPage + 1)}
          >
            Next
          </Button>
        </div>
      ) : null}
      {creating ? (
        <ComponentDialog
          type={creating}
          product={product}
          onClose={() => setCreating(null)}
          onCreated={(component) => {
            setCreating(null);
            navigate(`${productPath(product)}/components/${component.id}`);
          }}
        />
      ) : null}
    </>
  );
}
export function ComponentPage() {
  const product = useCurrentProduct();
  const { componentID } = useParams();
  const inventory = useComponents(product.id);
  const navigate = useNavigate();
  if (inventory.isPending) return <Loading />;
  if (inventory.isError)
    return (
      <ErrorNotice
        error={inventory.error}
        retry={() => void inventory.refetch()}
      />
    );
  const component = inventory.data.find(
    (item) => item.id === Number(componentID),
  );
  if (!component)
    return (
      <NotFound
        label="Component not found"
        back={`${productPath(product)}/components`}
      />
    );
  return (
    <div className="component-page">
      <Button variant="ghost" asChild>
        <Link
          to={`${productPath(product)}/components${component.type === "infrastructure" ? "?view=infrastructure" : ""}`}
        >
          ← Back to components
        </Link>
      </Button>
      <ComponentDetails
        component={component}
        product={product}
        onDeleted={() => navigate(`${productPath(product)}/components`)}
      />
    </div>
  );
}

export function ComponentCreationPage() {
  const product = useCurrentProduct();
  const navigate = useNavigate();
  return (
    <>
      <ComponentsPage />
      <ComponentDialog
        product={product}
        type="backend-service"
        onClose={() => navigate(`${productPath(product)}/components`)}
        onCreated={(component) =>
          navigate(`${productPath(product)}/components/${component.id}`)
        }
      />
    </>
  );
}
