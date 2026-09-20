import {
  Link,
  Outlet,
  useLocation,
  useNavigate,
  useOutletContext,
  useParams,
} from "react-router-dom";
import type { Product } from "@/api/types";
import { APIError } from "@/api/client";
import { useProduct } from "@/api/queries";
import { useWorkspace } from "@/app/workspace-context";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  CriticalityBadge,
  DevelopmentPage,
  ErrorNotice,
  Loading,
  NotFound,
  useTitle,
} from "@/components/shared/controls";
export function productPath(product: Product) {
  return `/workspaces/${product.workspace_id}/products/${product.id}`;
}
export function architecturePath(product: Product, componentID?: number) {
  return `${productPath(product)}/architecture${componentID ? `?component=${componentID}` : ""}`;
}
export function ArchitectureLink({
  product,
  componentID,
  children = "Open architecture",
  ...linkProps
}: {
  product: Product;
  componentID?: number;
  children?: React.ReactNode;
} & Omit<React.ComponentProps<"a">, "href" | "target" | "rel">) {
  return (
    <a
      {...linkProps}
      href={architecturePath(product, componentID)}
      target="_blank"
      rel="noopener noreferrer"
    >
      {children}
    </a>
  );
}
export function ProductLayout() {
  const { productID, workspaceID } = useParams();
  const product = useProduct(Number(productID));
  const location = useLocation();
  const navigate = useNavigate();
  useTitle(product.data?.name || "Product");
  if (!Number.isSafeInteger(Number(productID)) || Number(productID) < 1)
    return <NotFound label="Product not found" />;
  if (product.isPending) return <Loading label="Loading product…" />;
  if (
    product.isError &&
    product.error instanceof APIError &&
    product.error.status === 404
  )
    return <NotFound label="Product not found" />;
  if (product.isError)
    return (
      <ErrorNotice error={product.error} retry={() => void product.refetch()} />
    );
  if (product.data.workspace_id !== Number(workspaceID))
    return <NotFound label="Product not found" />;
  const base = productPath(product.data);
  const componentDetails = /^\/components\/\d+(?:\/|$)/.test(
    location.pathname.slice(base.length),
  );
  const tab = location.pathname.includes("/components")
    ? "components"
    : location.pathname.includes("/threat-modeling")
      ? "threat-modeling"
      : "overview";
  return (
    <>
      {!componentDetails ? (
        <>
          <header className="product-heading components-product-heading">
            <h1>{product.data.name}</h1>
            <Badge variant="outline" className="product-code">
              {product.data.product_code}
            </Badge>
            <CriticalityBadge value={product.data.criticality} />
          </header>
          <Tabs
            value={tab}
            onValueChange={(value) =>
              navigate(value === "overview" ? base : `${base}/${value}`)
            }
          >
            <TabsList className="product-tabs components-product-tabs">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="components">Components</TabsTrigger>
              <TabsTrigger value="threat-modeling">Threat modeling</TabsTrigger>
            </TabsList>
          </Tabs>
        </>
      ) : null}
      <Outlet context={product.data} />
    </>
  );
}
export const useCurrentProduct = () => useOutletContext<Product>();
export function ProductOverview() {
  const product = useCurrentProduct();
  const { activeWorkspace } = useWorkspace();
  return (
    <section className="product-overview">
      <p>{product.description || "No description provided."}</p>
      <dl className="product-facts">
        <div>
          <dt>Workspace</dt>
          <dd>
            {activeWorkspace?.name || `Workspace ${product.workspace_id}`}
          </dd>
        </div>
        <div className="fact-pair">
          <div>
            <dt>Product code</dt>
            <dd>{product.product_code}</dd>
          </div>
        </div>
        <div>
          <dt>Owning team</dt>
          <dd className="muted">
            {product.owning_team_id
              ? `Team #${product.owning_team_id}`
              : "Not assigned"}
          </dd>
        </div>
      </dl>
      <Button asChild>
        <ArchitectureLink product={product} />
      </Button>
    </section>
  );
}
export function ThreatModelingPage() {
  const product = useCurrentProduct();
  return (
    <DevelopmentPage
      title="Threat modeling"
      nested
      back={productPath(product)}
    />
  );
}
export function ComponentSecurityPage() {
  const product = useCurrentProduct();
  const { componentID } = useParams();
  return (
    <>
      <div className="section-heading">
        <h2>Security checks</h2>
        <Button variant="ghost" asChild>
          <Link to={`${productPath(product)}/components/${componentID}`}>
            Back to component
          </Link>
        </Button>
      </div>
      <DevelopmentPage
        title="Security checks"
        nested
        back={`${productPath(product)}/components/${componentID}`}
      />
    </>
  );
}
