import { useState } from "react";
import { Link, Outlet, useLocation } from "react-router-dom";
import {
  Box,
  Boxes,
  Check,
  ChevronDown,
  FileStack,
  LayoutDashboard,
  Menu,
  Plus,
  Settings2,
  Users,
} from "lucide-react";
import { useWorkspace } from "./workspace-context";
import { useProduct, useComponents } from "@/api/queries";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
const items = [
  { label: "Dashboard", path: "/", icon: LayoutDashboard },
  { label: "Workspace", path: "/workspaces", icon: Boxes },
  { label: "Products", path: "/products", icon: Box },
  { label: "Templates", path: "/templates", icon: FileStack },
  { label: "Teams", path: "/teams", icon: Users },
];
function Navigation({ onNavigate }: { onNavigate?: () => void }) {
  const {
    workspaces,
    activeID,
    activeWorkspace,
    selectWorkspace,
    setCreating,
  } = useWorkspace();
  const location = useLocation();
  const productsPath = activeID
    ? `/workspaces/${activeID}/products`
    : "/products";
  const active = (path: string) =>
    path === "/products"
      ? location.pathname.includes("/products")
      : path === "/workspaces"
        ? location.pathname === path
        : path === "/"
          ? location.pathname === "/"
          : location.pathname.startsWith(path);
  return (
    <div className="sidebar-inner">
      <Link className="brand" to="/" onClick={onNavigate}>
        <span className="brand-symbol">
          <img src="/assets/ac6fc.svg" alt="" />
        </span>
        <div>
          <span>Alpa</span>
          <small>Developer Platform</small>
        </div>
      </Link>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            className="workspace-trigger"
            aria-label="Switch workspace"
          >
            <span>{activeWorkspace?.name || "Select workspace"}</span>
            <ChevronDown data-icon="inline-end" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="workspace-menu">
          <DropdownMenuLabel>Workspaces</DropdownMenuLabel>
          <DropdownMenuGroup>
            {workspaces.data?.map((workspace) => (
              <DropdownMenuItem
                key={workspace.id}
                onSelect={() => {
                  selectWorkspace(workspace.id);
                  onNavigate?.();
                }}
              >
                <span className="truncate">{workspace.name}</span>
                {workspace.id === activeID ? (
                  <Check className="ml-auto" />
                ) : null}
              </DropdownMenuItem>
            ))}
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuGroup>
            <DropdownMenuItem
              onSelect={() => {
                setCreating(true);
                onNavigate?.();
              }}
            >
              <Plus />
              Create workspace
            </DropdownMenuItem>
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>
      <nav aria-label="Primary navigation" className="main-navigation">
        {items.map(({ label, path, icon: Icon }) => (
          <Link
            key={path}
            className={`nav-link ${active(path) ? "active" : ""}`}
            to={path === "/products" ? productsPath : path}
            aria-current={active(path) ? "page" : undefined}
            onClick={onNavigate}
          >
            <Icon size={16} />
            <span>{label}</span>
          </Link>
        ))}
      </nav>
      <div className="sidebar-bottom">
        <Link
          className={`nav-link ${active("/settings") ? "active" : ""}`}
          to="/settings"
          aria-current={active("/settings") ? "page" : undefined}
          onClick={onNavigate}
        >
          <Settings2 size={16} />
          Settings
        </Link>
        <Separator />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="account-trigger">
              Account
              <ChevronDown data-icon="inline-end" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuLabel>
              {activeWorkspace?.name || "Alpa"}
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem disabled>Sign out</DropdownMenuItem>
            </DropdownMenuGroup>
            <p className="account-hint">Sign out is not available yet.</p>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
export function Shell() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { activeWorkspace, activeID } = useWorkspace();
  const location = useLocation();
  const productID = Number(
    location.pathname.match(/\/products\/(\d+)(?:\/|$)/)?.[1],
  );
  const product = useProduct(productID || undefined);
  const componentID = Number(
    location.pathname.match(/\/components\/(\d+)(?:\/|$)/)?.[1],
  );
  const components = useComponents(componentID ? productID : undefined);
  const component = components.data?.find((item) => item.id === componentID);
  const productBase = product.data
    ? `/workspaces/${product.data.workspace_id}/products/${product.data.id}`
    : "";
  const hasComponents = location.pathname.includes("/components");
  const hasSecurity = location.pathname.includes("/security-checks");
  const hasThreat = location.pathname.includes("/threat-modeling");
  const name = location.pathname.includes("/products")
    ? "Products"
    : location.pathname.startsWith("/workspaces")
      ? "Workspace"
      : location.pathname.startsWith("/teams")
        ? "Teams"
        : location.pathname.startsWith("/templates")
          ? "Templates"
          : location.pathname.startsWith("/settings")
            ? "Settings"
            : "Dashboard";
  return (
    <div className="app-shell">
      <a href="#main-content" className="skip-link">
        Skip to content
      </a>
      <aside className="desktop-sidebar" aria-label="Workspace navigation">
        <Navigation />
      </aside>
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="mobile-sidebar">
          <SheetTitle className="sr-only">Navigation</SheetTitle>
          <Navigation onNavigate={() => setMobileOpen(false)} />
        </SheetContent>
      </Sheet>
      <div className="main-frame">
        <header className="app-header">
          <Button
            variant="ghost"
            size="icon"
            className="mobile-menu"
            aria-label="Open navigation"
            onClick={() => setMobileOpen(true)}
          >
            <Menu />
          </Button>
          <nav aria-label="Breadcrumb" className="breadcrumbs">
            <Link to="/workspaces">{activeWorkspace?.name || "Alpa"}</Link>
            <span>/</span>
            {product.data ? (
              <>
                <Link
                  to={
                    activeID ? `/workspaces/${activeID}/products` : "/products"
                  }
                >
                  Products
                </Link>
                <span>/</span>
                <Link to={productBase}>{product.data.name}</Link>
                {hasComponents ? (
                  <>
                    <span>/</span>
                    <Link to={`${productBase}/components`}>Components</Link>
                  </>
                ) : null}
                {component ? (
                  <>
                    <span>/</span>
                    <Link to={`${productBase}/components/${component.id}`}>
                      {component.name}
                    </Link>
                  </>
                ) : null}
                {hasSecurity ? (
                  <>
                    <span>/</span>
                    <span>Security checks</span>
                  </>
                ) : null}
                {hasThreat ? (
                  <>
                    <span>/</span>
                    <span>Threat modeling</span>
                  </>
                ) : null}
              </>
            ) : (
              <span>{name}</span>
            )}
          </nav>
        </header>
        <main className="page-content" id="main-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
