import { useEffect, useState } from "react";
import { type Product } from "../../lib/inventory/contracts";
import { serializeRoute, type AtlasRoute } from "../../lib/routes";
import { DevelopmentNotice } from "./development-notice";
import { useInventory } from "./inventory-context";
import {
  Alert,
  AlertActionCloseButton,
  AlertGroup,
  Button,
  ThemeToggle,
} from "../../src/ui";
import { BarsIcon } from "../../src/ui/icons";
import { InventorySidebar, ContextTrail, routeTitle } from "./app-shell";
import {
  WorkspacesPage,
  WorkspaceCreateDialog,
  EmptyWorkspaces,
} from "./workspace-pages";
import {
  ProductsPage,
  ProductComponentsPage,
  ProductCreatePage,
  ProductPage,
  ProductArchitecturePage,
} from "./product-pages";
import { ComponentCreatePage, ComponentPage } from "./component-pages";
import { LoadingState, RequestError, NotFound } from "./shared";
import { type Navigate } from "./component-input";

export function InventoryApp({
  route,
  navigate,
}: {
  route: AtlasRoute;
  navigate: Navigate;
}) {
  const inventory = useInventory();
  const [workspaceCreateOpen, setWorkspaceCreateOpen] = useState(false);
  const [navigationOpen, setNavigationOpen] = useState(false);
  const [toast, setToast] = useState("");

  useEffect(() => {
    if (navigationOpen)
      document
        .querySelector<HTMLButtonElement>("#application-sidebar button")
        ?.focus();
  }, [navigationOpen]);

  const productKey = "productKey" in route ? route.productKey : undefined;
  const activeProduct = productKey
    ? inventory.products.find((product) => product.product_code === productKey)
    : undefined;

  useEffect(() => {
    if (!activeProduct || inventory.selectedProductID === activeProduct.id)
      return;
    void inventory.loadComponents(activeProduct.id).catch(() => undefined);
  }, [activeProduct, inventory]);

  useEffect(() => {
    const title = routeTitle(route, activeProduct, inventory.components);
    document.title = `${title} · Alpa`;
  }, [activeProduct, inventory.components, route]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(""), 3200);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const go = (next: AtlasRoute) => {
    setNavigationOpen(false);
    navigate(next);
  };
  const renderRoute = () =>
    renderInventoryRoute({
      route,
      product: activeProduct,
      inventory,
      navigate: go,
      notify: setToast,
      openWorkspaceCreate: () => setWorkspaceCreateOpen(true),
    });
  const page =
    route.kind === "templates" ? (
      renderRoute()
    ) : inventory.workspacesStatus === "loading" ? (
      <LoadingState label="Loading workspaces" />
    ) : inventory.workspacesStatus === "error" ? (
      <RequestError message={inventory.workspacesError} />
    ) : inventory.workspaces.length === 0 && route.kind !== "workspaces" ? (
      <EmptyWorkspaces onCreate={() => setWorkspaceCreateOpen(true)} />
    ) : (
      renderRoute()
    );

  return (
    <div
      className="alpa-app inventory-app"
      data-navigation-open={navigationOpen}
    >
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>
      <InventorySidebar
        isOpen={navigationOpen}
        onDismiss={() => setNavigationOpen(false)}
        route={route}
        workspaces={inventory.workspaces}
        activeWorkspaceID={inventory.activeWorkspaceID}
        onWorkspaceCreate={() => setWorkspaceCreateOpen(true)}
        onWorkspaceSelect={(workspaceID) => {
          inventory.selectWorkspace(workspaceID);
          go({ kind: "products" });
        }}
        navigate={go}
      />
      <div className="app-frame">
        <header className="topbar">
          <Button
            className="navigation-toggle"
            aria-label="Toggle navigation"
            aria-expanded={navigationOpen}
            aria-controls="application-sidebar"
            onClick={() => setNavigationOpen(!navigationOpen)}
            icon={<BarsIcon />}
          />
          <ContextTrail
            route={route}
            workspaceName={inventory.activeWorkspace?.name ?? "Inventory"}
            product={activeProduct}
            components={inventory.components}
            navigate={go}
          />
          <ThemeToggle />
        </header>
        <main id="main-content" className="content" tabIndex={-1}>
          <div className="surface-transition">{page}</div>
        </main>
      </div>

      {workspaceCreateOpen ? (
        <WorkspaceCreateDialog
          onClose={() => setWorkspaceCreateOpen(false)}
          onCreated={async (name) => {
            await inventory.createWorkspace(name);
            setWorkspaceCreateOpen(false);
            go({ kind: "products" });
          }}
        />
      ) : null}

      {toast ? (
        <AlertGroup isToast isLiveRegion>
          <Alert
            role="status"
            variant="success"
            title={toast}
            actionClose={
              <AlertActionCloseButton onClose={() => setToast("")} />
            }
          />
        </AlertGroup>
      ) : null}
    </div>
  );
}

export function renderInventoryRoute({
  route,
  product,
  inventory,
  navigate,
  notify,
  openWorkspaceCreate,
}: {
  route: AtlasRoute;
  product?: Product;
  inventory: ReturnType<typeof useInventory>;
  navigate: Navigate;
  notify: (message: string) => void;
  openWorkspaceCreate: () => void;
}) {
  if ("productKey" in route && inventory.productsStatus === "error")
    return <RequestError message={inventory.productsError} />;
  switch (route.kind) {
    case "overview":
      return (
        <DevelopmentNotice
          message="Dashboard is in development"
          onBack={() => navigate({ kind: "products" })}
        />
      );
    case "workspaces":
      return (
        <WorkspacesPage
          workspaces={inventory.workspaces}
          activeWorkspaceID={inventory.activeWorkspaceID}
          onCreate={openWorkspaceCreate}
          onSelect={(workspaceID) => {
            inventory.selectWorkspace(workspaceID);
            navigate({ kind: "products" });
          }}
        />
      );
    case "templates":
      return (
        <DevelopmentNotice
          message="Templates are in development"
          onBack={() => navigate({ kind: "overview" })}
        />
      );
    case "teams":
    case "team":
      return (
        <DevelopmentNotice
          message="Teams are in development"
          onBack={() => navigate({ kind: "overview" })}
        />
      );
    case "settings":
      return (
        <DevelopmentNotice
          message="Settings are in development"
          onBack={() => navigate({ kind: "overview" })}
        />
      );
    case "products":
      return (
        <ProductsPage
          products={inventory.products}
          status={inventory.productsStatus}
          error={inventory.productsError}
          navigate={navigate}
        />
      );
    case "product-create":
      return (
        <ProductCreatePage
          onCancel={() => navigate({ kind: "products" })}
          onCreate={async (input) => {
            await inventory.createProduct(input);
            navigate({ kind: "products" });
            notify("Product created");
          }}
        />
      );
    case "component-create":
      if (!product)
        return inventory.productsStatus === "loading" ? (
          <LoadingState label="Loading product" />
        ) : (
          <NotFound
            label="Product not found"
            onBack={() => navigate({ kind: "products" })}
          />
        );
      return (
        <ComponentCreatePage
          product={product}
          onClose={() =>
            navigate({ kind: "product", productKey: product.product_code })
          }
          onCreate={async (input) => {
            const component = await inventory.createComponent(input);
            notify("Component created");
            navigate({
              kind: "component",
              productKey: product.product_code,
              componentId: String(component.id),
            });
          }}
        />
      );
    case "product":
      if (!product)
        return inventory.productsStatus === "loading" ? (
          <LoadingState label="Loading product" />
        ) : (
          <NotFound
            label="Product not found"
            onBack={() => navigate({ kind: "products" })}
          />
        );
      if (route.tab === "components")
        return (
          <ProductComponentsPage
            product={product}
            components={inventory.components}
            status={inventory.componentsStatus}
            error={inventory.componentsError}
            navigate={navigate}
          />
        );
      if (route.tab === "architecture")
        return (
          <ProductArchitecturePage
            product={product}
            components={inventory.components}
            status={inventory.componentsStatus}
            error={inventory.componentsError}
            navigate={navigate}
          />
        );
      if (route.tab === "threat-model")
        return (
          <DevelopmentNotice
            message="Threat modeling is in development"
            onBack={() =>
              navigate({ kind: "product", productKey: product.product_code })
            }
          />
        );
      return <ProductPage product={product} navigate={navigate} />;
    case "component": {
      if (!product)
        return inventory.productsStatus === "loading" ? (
          <LoadingState label="Loading product" />
        ) : (
          <NotFound
            label="Product not found"
            onBack={() => navigate({ kind: "products" })}
          />
        );
      if (inventory.componentsStatus === "error")
        return <RequestError message={inventory.componentsError} />;
      const component = inventory.components.find(
        (item) => String(item.id) === route.componentId,
      );
      if (route.tab === "security")
        return (
          <DevelopmentNotice
            message="Security checks are in development"
            onBack={() =>
              navigate({
                kind: "component",
                productKey: product.product_code,
                componentId: route.componentId,
              })
            }
          />
        );
      if (!component)
        return inventory.componentsStatus === "loading" ? (
          <LoadingState label="Loading component" />
        ) : (
          <NotFound
            label="Component not found"
            onBack={() =>
              navigate({ kind: "product", productKey: product.product_code })
            }
          />
        );
      return (
        <ComponentPage
          product={product}
          component={component}
          components={inventory.components}
          navigate={navigate}
          createComponentAPI={inventory.createComponentAPI}
          createComponentClient={inventory.createComponentClient}
          bindComponentClient={inventory.bindComponentClient}
          notify={notify}
        />
      );
    }
    case "component-check":
      return (
        <DevelopmentNotice
          message="Security checks are in development"
          onBack={() =>
            navigate({
              kind: "component",
              productKey: route.productKey,
              componentId: route.componentId,
            })
          }
        />
      );
    default:
      return (
        <NotFound
          label="Inventory page not found"
          onBack={() => navigate({ kind: "products" })}
        />
      );
  }
}

export function inventoryPath(route: AtlasRoute) {
  return serializeRoute(route);
}

export {
  buildComponentInput,
  createComponentDraft,
  validClientOptions,
} from "./component-input";
export type { ComponentDraft } from "./component-input";
