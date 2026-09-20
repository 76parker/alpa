import { lazy, Suspense } from "react";
import {
  createBrowserRouter,
  Navigate,
  Outlet,
  useLocation,
  useParams,
} from "react-router-dom";
import { WorkspaceProvider, useWorkspace } from "./workspace-context";
import { Shell } from "./shell";
import { useComponents, useProducts } from "@/api/queries";
import {
  DevelopmentPage,
  ErrorNotice,
  Loading,
  NotFound,
} from "@/components/shared/controls";
import { WorkspacesPage } from "@/features/workspaces/workspaces-page";
import { ProductsPage } from "@/features/products/products-page";
import {
  ProductLayout,
  ProductOverview,
  ThreatModelingPage,
  ComponentSecurityPage,
  useCurrentProduct,
} from "@/features/products/product-layout";
import {
  ComponentsPage,
  ComponentPage,
  ComponentCreationPage,
} from "@/features/components/components-page";
const ArchitecturePage = lazy(
  () => import("@/features/architecture/architecture-page"),
);
function Providers() {
  return (
    <WorkspaceProvider>
      <Suspense fallback={<Loading />}>
        <Outlet />
      </Suspense>
    </WorkspaceProvider>
  );
}
function ProductsRedirect() {
  const { activeID, workspaces } = useWorkspace();
  if (workspaces.isPending) return <Loading />;
  if (workspaces.isError)
    return (
      <ErrorNotice
        error={workspaces.error}
        retry={() => void workspaces.refetch()}
      />
    );
  return activeID ? (
    <Navigate to={`/workspaces/${activeID}/products`} replace />
  ) : (
    <ProductsPage />
  );
}
function LegacyProductRedirect() {
  const { code, "*": suffix } = useParams();
  const { activeID, workspaces } = useWorkspace();
  const products = useProducts(activeID || undefined);
  const location = useLocation();
  if (workspaces.isPending || (activeID && products.isPending))
    return <Loading />;
  if (products.isError)
    return (
      <ErrorNotice
        error={products.error}
        retry={() => void products.refetch()}
      />
    );
  const product = products.data?.find(
    (item) => item.product_code.toLowerCase() === code?.toLowerCase(),
  );
  if (!product) return <NotFound label="Product not found" />;
  const path =
    suffix === "overview"
      ? ""
      : suffix
        ? `/${suffix.replace(/^threat-model$/, "threat-modeling").replace(/\/security(?=\/|$)/, "/security-checks")}`
        : "";
  return (
    <Navigate
      to={`/workspaces/${product.workspace_id}/products/${product.id}${path}${location.search}`}
      replace
    />
  );
}
function SecurityRoute() {
  const product = useCurrentProduct();
  const inventory = useComponents(product.id);
  const { componentID } = useParams();
  if (inventory.isPending) return <Loading />;
  if (inventory.isError)
    return (
      <ErrorNotice
        error={inventory.error}
        retry={() => void inventory.refetch()}
      />
    );
  return inventory.data.some((item) => item.id === Number(componentID)) ? (
    <ComponentSecurityPage />
  ) : (
    <NotFound label="Component not found" />
  );
}
export const router = createBrowserRouter([
  {
    element: <Providers />,
    errorElement: (
      <div className="route-error">
        <NotFound label="This page could not be opened" />
      </div>
    ),
    children: [
      {
        path: "/workspaces/:workspaceID/products/:productID/architecture",
        element: <ArchitecturePage />,
      },
      {
        element: <Shell />,
        children: [
          { index: true, element: <DevelopmentPage title="Dashboard" /> },
          { path: "workspaces", element: <WorkspacesPage /> },
          { path: "products", element: <ProductsRedirect /> },
          { path: "products/new", element: <LegacyNewProduct /> },
          { path: "products/:code/*", element: <LegacyProductRedirect /> },
          {
            path: "workspaces/:workspaceID/products",
            element: <ProductsPage />,
          },
          {
            path: "workspaces/:workspaceID/products/new",
            element: <ProductsPage creating />,
          },
          {
            path: "workspaces/:workspaceID/products/:productID",
            element: <ProductLayout />,
            children: [
              { index: true, element: <ProductOverview /> },
              { path: "overview", element: <ProductOverview /> },
              { path: "components", element: <ComponentsPage /> },
              { path: "components/new", element: <ComponentCreationPage /> },
              { path: "components/:componentID", element: <ComponentPage /> },
              {
                path: "components/:componentID/security-checks/*",
                element: <SecurityRoute />,
              },
              { path: "threat-modeling/*", element: <ThreatModelingPage /> },
            ],
          },
          {
            path: "templates/*",
            element: <DevelopmentPage title="Templates" />,
          },
          { path: "teams/*", element: <DevelopmentPage title="Teams" /> },
          { path: "settings/*", element: <DevelopmentPage title="Settings" /> },
          { path: "*", element: <NotFound /> },
        ],
      },
    ],
  },
]);
function LegacyNewProduct() {
  const { activeID, workspaces } = useWorkspace();
  if (workspaces.isPending) return <Loading />;
  return activeID ? (
    <Navigate replace to={`/workspaces/${activeID}/products/new`} />
  ) : (
    <ProductsPage />
  );
}
