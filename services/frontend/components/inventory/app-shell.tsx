import { Boxes, FileStack, LayoutDashboard, Package, Settings2, Users } from '../../src/ui/icons';
import { type ReactNode } from 'react';
import { type Component, type Product } from '../../lib/inventory/contracts';
import { type AtlasRoute } from '../../lib/routes';
import { useInventory } from './inventory-context';
import { WorkspaceSwitcher } from './workspace-switcher';
import { Breadcrumb, BreadcrumbItem, Button, Nav, NavItem, NavList } from '../../src/ui';
import { type Navigate } from './component-input';

export function InventorySidebar({ route, workspaces, activeWorkspaceID, onWorkspaceCreate, onWorkspaceSelect, navigate, isOpen, onDismiss }: {
  route: AtlasRoute;
  workspaces: ReturnType<typeof useInventory>['workspaces'];
  activeWorkspaceID: number | null;
  onWorkspaceCreate: () => void;
  onWorkspaceSelect: (workspaceID: number) => void;
  navigate: Navigate;
  isOpen: boolean;
  onDismiss: () => void;
}) {
  const items: Array<{ label: string; icon: ReactNode; destination: AtlasRoute; active: boolean }> = [
    { label: 'Dashboard', icon: <LayoutDashboard />, destination: { kind: 'overview' }, active: route.kind === 'overview' },
    { label: 'Workspace', icon: <Boxes />, destination: { kind: 'workspaces' }, active: route.kind === 'workspaces' },
    { label: 'Products', icon: <Package />, destination: { kind: 'products' }, active: ['products', 'product-create', 'product', 'component-create', 'component', 'component-check'].includes(route.kind) },
    { label: 'Templates', icon: <FileStack />, destination: { kind: 'templates' }, active: route.kind === 'templates' },
    { label: 'Teams', icon: <Users />, destination: { kind: 'teams' }, active: route.kind === 'teams' || route.kind === 'team' },
  ];
  return <>
    {isOpen ? <Button className="navigation-backdrop" aria-label="Close navigation" onClick={onDismiss} tabIndex={-1} /> : null}
    <aside id="application-sidebar" className="sidebar" aria-label="Workspace navigation" onKeyDown={(event) => { if (event.key === 'Escape') { onDismiss(); document.querySelector<HTMLButtonElement>('.navigation-toggle')?.focus(); } }}>
      <Button className="brand" aria-label="Alpa" onClick={() => navigate({ kind: 'overview' })}>Alpa</Button>
      <WorkspaceSwitcher workspaces={workspaces} activeWorkspaceID={activeWorkspaceID} onSelect={onWorkspaceSelect} onCreate={onWorkspaceCreate} />
      <Nav aria-label="Primary navigation" className="main-nav"><NavList>{items.map((item) =>
        <NavItem key={item.label} isActive={item.active} component="button" icon={item.icon} onClick={() => navigate(item.destination)}>{item.label}</NavItem>
      )}</NavList></Nav>
      <div className="sidebar-footer"><Nav aria-label="Administration"><NavList><NavItem component="button" isActive={route.kind === 'settings'} icon={<Settings2 />} onClick={() => navigate({ kind: 'settings' })}>Settings</NavItem></NavList></Nav></div>
    </aside>
  </>;
}

export function ContextTrail({ route, workspaceName, product, components, navigate }: { route: AtlasRoute; workspaceName: string; product?: Product; components: Component[]; navigate: Navigate }) {
  const segments: Array<{ type: string; name: string; destination?: AtlasRoute }> = [{ type: 'workspace', name: workspaceName, destination: { kind: 'workspaces' } }];
  if ('productKey' in route && product) segments.push({ type: 'product', name: product.name, destination: { kind: 'product', productKey: product.product_code } });
  if (route.kind === 'component' || route.kind === 'component-check') {
    segments.push({ type: 'component', name: components.find((item) => String(item.id) === route.componentId)?.name ?? 'Component' });
  } else if (route.kind !== 'product') {
    segments.push({ type: 'view', name: routeTitle(route, product, components) });
  }
  return <Breadcrumb aria-label="Current location">{segments.map((segment, index) => <BreadcrumbItem key={index} isActive={index === segments.length - 1}>
    {segment.destination && index < segments.length - 1 ? <Button variant="link" className="breadcrumb-link" aria-label={`Open ${segment.type} ${segment.name}`} onClick={() => navigate(segment.destination!)}>{segment.name}</Button> : segment.name}
  </BreadcrumbItem>)}</Breadcrumb>;
}

export function routeTitle(route: AtlasRoute, product?: Product, components: Component[] = []) {
  if (route.kind === 'overview') return 'Dashboard';
  if (route.kind === 'workspaces') return 'Workspace';
  if (route.kind === 'products') return 'Products';
  if (route.kind === 'templates') return 'Templates';
  if (route.kind === 'teams' || route.kind === 'team') return 'Teams';
  if (route.kind === 'settings') return 'Settings';
  if (route.kind === 'product-create') return 'Create product';
  if (route.kind === 'component-create') return 'Create component';
  if (route.kind === 'product') {
    if (route.tab === 'components') return 'Components';
    if (route.tab === 'architecture') return 'Architecture map';
    if (route.tab === 'threat-model') return 'Threat modeling';
    return product?.name ?? 'Product';
  }
  if (route.kind === 'component' || route.kind === 'component-check') {
    if (route.kind === 'component-check' || route.tab === 'security') return 'Security checks';
    return components.find((component) => String(component.id) === route.componentId)?.name ?? 'Component';
  }
  return 'Inventory';
}
