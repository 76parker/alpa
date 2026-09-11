import {
  AlertCircle,
  Boxes,
  Check,
  ChevronLeft,
  ChevronRight,
  FileStack,
  LayoutDashboard,
  Network,
  Package,
  Plus,
  Server,
  Settings2,
  ShieldCheck,
  Trash2,
  Users,
  X,
} from 'lucide-react';
import { cloneElement, useEffect, useId, useMemo, useRef, useState, type FormEvent, type ReactElement, type ReactNode } from 'react';
import { InventoryRequestError } from '../../lib/inventory/client';
import {
  apiTypes,
  componentTypes,
  eventBrokers,
  productCriticalities,
  type APIType,
  type Component,
  type ComponentAPI,
  type ComponentType,
  type CreateComponentAPIInput,
  type CreateComponentInput,
  type NetworkExposure,
  type Product,
  type ProductCriticality,
} from '../../lib/inventory/contracts';
import { serializeRoute, type AtlasRoute } from '../../lib/routes';
import { FieldLabel } from '../field-label';
import { SearchField } from '../search-field';
import { TooltipTrigger } from '../tooltip-trigger';
import { ArchitectureMap } from './architecture-map';
import { DevelopmentNotice } from './development-notice';
import { InventoryDialog } from './inventory-dialog';
import { useInventory } from './inventory-context';
import { WorkspaceSwitcher } from './workspace-switcher';

const PAGE_SIZE = 20;

type Navigate = (route: AtlasRoute) => void;

type ServiceDraft = { language: string; languageVersion: string; framework: string };
type WorkerDraft = ServiceDraft & { broker: string };
type InfrastructureDraft = { system: string; version: string; networkAddress: string };

export type ComponentDraft = {
  name: string;
  type: ComponentType;
  description: string;
  details: ServiceDraft | WorkerDraft | InfrastructureDraft;
};

export type RelationshipCandidate = { component: Component; api: ComponentAPI };

export function relationshipCandidates(component: Component, components: Component[]): RelationshipCandidate[] {
  const linkedIDs = new Set(component.apis.map((api) => api.id));
  return components.flatMap((candidate) => candidate.id === component.id ? [] : candidate.apis
    .filter((api) => api.role === 'provider' && !linkedIDs.has(api.id))
    .map((api) => ({ component: candidate, api })));
}

function optional(value: string) {
  const trimmed = value.trim();
  return trimmed || undefined;
}

export function buildComponentInput(
  productID: number,
  draft: ComponentDraft,
  apis: CreateComponentAPIInput[],
): CreateComponentInput {
  let details: CreateComponentInput['details'];
  if (draft.type === 'Infrastructure') {
    const values = draft.details as InfrastructureDraft;
    details = {
      system: values.system.trim(),
      ...(optional(values.version) ? { version: optional(values.version) } : {}),
      ...(optional(values.networkAddress) ? { network_address: optional(values.networkAddress) } : {}),
    };
  } else {
    const values = draft.details as ServiceDraft | WorkerDraft;
    details = {
      language: values.language.trim(),
      ...(optional(values.languageVersion) ? { language_version: optional(values.languageVersion) } : {}),
      ...(optional(values.framework) ? { framework: optional(values.framework) } : {}),
      ...(draft.type === 'Background Worker' ? { broker: (values as WorkerDraft).broker as (typeof eventBrokers)[number] } : {}),
    };
  }
  return {
    product_id: productID,
    name: draft.name.trim(),
    type: draft.type,
    ...(optional(draft.description) ? { description: optional(draft.description) } : {}),
    details,
    ...(apis.length ? { apis: apis.map((api) => ({ ...api, name: api.name.trim() })) } : {}),
  };
}

export function InventoryApp({ route, navigate }: { route: AtlasRoute; navigate: Navigate }) {
  const inventory = useInventory();
  const [workspaceCreateOpen, setWorkspaceCreateOpen] = useState(false);
  const [toast, setToast] = useState('');

  const productKey = 'productKey' in route ? route.productKey : undefined;
  const activeProduct = productKey ? inventory.products.find((product) => product.product_code === productKey) : undefined;

  useEffect(() => {
    if (!activeProduct || inventory.selectedProductID === activeProduct.id) return;
    void inventory.loadComponents(activeProduct.id).catch(() => undefined);
  }, [activeProduct, inventory]);

  useEffect(() => {
    const title = routeTitle(route, activeProduct, inventory.components);
    document.title = `${title} · Alpa`;
  }, [activeProduct, inventory.components, route]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(''), 3200);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const go = (next: AtlasRoute) => navigate(next);
  const renderRoute = () => renderInventoryRoute({
    route,
    product: activeProduct,
    inventory,
    navigate: go,
    notify: setToast,
    openWorkspaceCreate: () => setWorkspaceCreateOpen(true),
  });
  const page = route.kind === 'templates'
    ? renderRoute()
    : inventory.workspacesStatus === 'loading'
    ? <LoadingState label="Loading workspaces" />
    : inventory.workspacesStatus === 'error'
      ? <RequestError message={inventory.workspacesError} />
      : inventory.workspaces.length === 0 && route.kind !== 'workspaces'
        ? <EmptyWorkspaces onCreate={() => setWorkspaceCreateOpen(true)} />
        : renderRoute();

  return <div className="atlas-app final-app inventory-app">
    <InventorySidebar
      route={route}
      workspaces={inventory.workspaces}
      activeWorkspaceID={inventory.activeWorkspaceID}
      onWorkspaceCreate={() => setWorkspaceCreateOpen(true)}
      onWorkspaceSelect={(workspaceID) => {
        inventory.selectWorkspace(workspaceID);
        go({ kind: 'products' });
      }}
      navigate={go}
    />
    <div className="app-frame">
      <header className="topbar">
        <ContextTrail route={route} workspaceName={inventory.activeWorkspace?.name ?? 'Inventory'} product={activeProduct} components={inventory.components} navigate={go} />
        <div className="top-actions"><div className="profile-identity" aria-label="Alex Morgan, Application Security">AM</div></div>
      </header>
      <main className="content final-content"><div className="surface-transition">{page}</div></main>
    </div>

    {workspaceCreateOpen ? <WorkspaceCreateDialog onClose={() => setWorkspaceCreateOpen(false)} onCreated={async (name) => {
      await inventory.createWorkspace(name);
      setWorkspaceCreateOpen(false);
      go({ kind: 'products' });
    }} /> : null}

    {toast ? <div className="toast" role="status"><span><Check size={14} aria-hidden="true" /></span><div><strong>Done</strong><small>{toast}</small></div><button type="button" onClick={() => setToast('')} aria-label="Dismiss"><X size={13} aria-hidden="true" /></button></div> : null}
  </div>;
}

function renderInventoryRoute({
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
  switch (route.kind) {
    case 'overview':
      return <DevelopmentNotice message="Dashboard is in development" onBack={() => navigate({ kind: 'products' })} />;
    case 'workspaces':
      return <WorkspacesPage
        workspaces={inventory.workspaces}
        activeWorkspaceID={inventory.activeWorkspaceID}
        onCreate={openWorkspaceCreate}
        onSelect={(workspaceID) => {
          inventory.selectWorkspace(workspaceID);
          navigate({ kind: 'products' });
        }}
      />;
    case 'templates':
      return <DevelopmentNotice message="Templates are in development" onBack={() => navigate({ kind: 'overview' })} />;
    case 'teams':
    case 'team':
      return <DevelopmentNotice message="Teams are in development" onBack={() => navigate({ kind: 'overview' })} />;
    case 'settings':
      return <DevelopmentNotice message="Settings are in development" onBack={() => navigate({ kind: 'overview' })} />;
    case 'products':
      return <ProductsPage products={inventory.products} status={inventory.productsStatus} error={inventory.productsError} navigate={navigate} />;
    case 'product-create':
      return <ProductCreatePage onCancel={() => navigate({ kind: 'products' })} onCreate={async (input) => {
        await inventory.createProduct(input);
        navigate({ kind: 'products' });
        notify('Product created');
      }} />;
    case 'product':
      if (!product) return inventory.productsStatus === 'loading' ? <LoadingState label="Loading product" /> : <NotFound label="Product not found" onBack={() => navigate({ kind: 'products' })} />;
      if (route.tab === 'architecture') return <ProductArchitecturePage product={product} components={inventory.components} status={inventory.componentsStatus} error={inventory.componentsError} navigate={navigate} />;
      if (route.tab === 'threat-model') return <DevelopmentNotice message="Threat modeling is in development" onBack={() => navigate({ kind: 'product', productKey: product.product_code })} />;
      return <ProductPage product={product} components={inventory.components} status={inventory.componentsStatus} error={inventory.componentsError} navigate={navigate} createComponent={inventory.createComponent} notify={notify} />;
    case 'component': {
      if (!product) return inventory.productsStatus === 'loading' ? <LoadingState label="Loading product" /> : <NotFound label="Product not found" onBack={() => navigate({ kind: 'products' })} />;
      const component = inventory.components.find((item) => String(item.id) === route.componentId);
      if (route.tab === 'security') return <DevelopmentNotice message="Security checks are in development" onBack={() => navigate({ kind: 'component', productKey: product.product_code, componentId: route.componentId })} />;
      if (!component) return inventory.componentsStatus === 'loading' ? <LoadingState label="Loading component" /> : <NotFound label="Component not found" onBack={() => navigate({ kind: 'product', productKey: product.product_code })} />;
      return <ComponentPage product={product} component={component} components={inventory.components} navigate={navigate} addConsumerAPI={inventory.addConsumerAPI} refreshComponent={inventory.refreshComponent} notify={notify} />;
    }
    case 'component-check':
      return <DevelopmentNotice message="Security checks are in development" onBack={() => navigate({ kind: 'component', productKey: route.productKey, componentId: route.componentId })} />;
    default:
      return <NotFound label="Inventory page not found" onBack={() => navigate({ kind: 'products' })} />;
  }
}

function InventorySidebar({ route, workspaces, activeWorkspaceID, onWorkspaceCreate, onWorkspaceSelect, navigate }: {
  route: AtlasRoute;
  workspaces: ReturnType<typeof useInventory>['workspaces'];
  activeWorkspaceID: number | null;
  onWorkspaceCreate: () => void;
  onWorkspaceSelect: (workspaceID: number) => void;
  navigate: Navigate;
}) {
  const productsActive = ['products', 'product-create', 'product', 'component', 'component-check'].includes(route.kind);
  return <aside className="sidebar" aria-label="Workspace navigation">
    <button className="brand" type="button" aria-label="Alpa" onClick={() => navigate({ kind: 'overview' })}><span className="brand-mark" aria-hidden="true"><img src="/alpa-logo.png" width={67} height={67} alt="" /></span><span className="brand-copy"><strong>Alpa</strong><small>Security platform</small></span></button>
    <WorkspaceSwitcher workspaces={workspaces} activeWorkspaceID={activeWorkspaceID} onSelect={onWorkspaceSelect} onCreate={onWorkspaceCreate} />
    <nav className="main-nav" aria-label="Primary navigation">
      <NavButton label="Dashboard" icon={<LayoutDashboard size={19} />} active={route.kind === 'overview'} onClick={() => navigate({ kind: 'overview' })} />
      <NavButton label="Workspace" icon={<Boxes size={19} />} active={route.kind === 'workspaces'} onClick={() => navigate({ kind: 'workspaces' })} />
      <NavButton label="Products" icon={<Package size={19} />} active={productsActive} onClick={() => navigate({ kind: 'products' })} />
      <NavButton label="Templates" icon={<FileStack size={19} />} active={route.kind === 'templates'} onClick={() => navigate({ kind: 'templates' })} />
      <NavButton label="Teams" icon={<Users size={19} />} active={route.kind === 'teams' || route.kind === 'team'} onClick={() => navigate({ kind: 'teams' })} />
    </nav>
    <div className="sidebar-footer">
      <button type="button" onClick={() => navigate({ kind: 'settings' })}><Settings2 size={19} /><span>Settings</span></button>
      <div className="user-card"><span>AM</span><div><strong>Alex Morgan</strong><small>Application Security</small></div></div>
    </div>
  </aside>;
}

function WorkspacesPage({ workspaces, activeWorkspaceID, onCreate, onSelect }: { workspaces: ReturnType<typeof useInventory>['workspaces']; activeWorkspaceID: number | null; onCreate: () => void; onSelect: (id: number) => void }) {
  return <section className="workspaces-page">
    <PageHeader title="Workspace" description="Choose the inventory boundary you want to work in." actions={<button className="button primary" type="button" onClick={onCreate}><Plus size={15} />Create workspace</button>} />
    <section className="panel workspace-panel" aria-label="Available workspaces">
      <div className="workspace-panel-heading"><div><h2>Available workspaces</h2><p>Products and components stay isolated inside their workspace.</p></div><span>{workspaces.length}</span></div>
      {workspaces.length ? <div className="workspace-page-list">{workspaces.map((workspace) => {
        const active = workspace.id === activeWorkspaceID;
        return <button key={workspace.id} type="button" className={active ? 'active' : ''} onClick={() => onSelect(workspace.id)} aria-current={active ? 'page' : undefined}>
          <span className="workspace-page-avatar" aria-hidden="true">{initials(workspace.name)}</span>
          <span><strong>{workspace.name}</strong><small>{workspace.name === 'default' ? 'Default workspace' : `Workspace #${workspace.id}`}</small></span>
          {active ? <span className="workspace-active"><Check size={14} aria-hidden="true" />Active workspace</span> : <span className="workspace-select">Switch</span>}
        </button>;
      })}</div> : <div className="workspace-page-empty"><Boxes size={22} aria-hidden="true" /><strong>No workspaces yet</strong><p>Create a workspace to start organizing inventory.</p></div>}
    </section>
  </section>;
}

function NavButton({ label, icon, active, onClick }: { label: string; icon: ReactNode; active: boolean; onClick: () => void }) {
  return <button type="button" className={active ? 'active' : ''} onClick={onClick} aria-current={active ? 'page' : undefined}><span>{icon}</span><span>{label}</span></button>;
}

function WorkspaceCreateDialog({ onClose, onCreated }: { onClose: () => void; onCreated: (name: string) => Promise<void> }) {
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  async function submit(event: FormEvent) {
    event.preventDefault();
    const value = name.trim();
    if (!value) return setError('Workspace name is required');
    if (value.length > 50) return setError('Workspace name must be 50 characters or fewer');
    setSaving(true);
    setError('');
    try { await onCreated(value); } catch (cause) { setError(publicError(cause)); setSaving(false); }
  }
  return <InventoryDialog title="Create workspace" eyebrow="Inventory" className="workspace-create-dialog" onClose={onClose}>
    <form className="modal-form single workspace-create-form" onSubmit={submit} noValidate>
      <div className="workspace-dialog-intro"><span className="workspace-dialog-icon" aria-hidden="true"><Boxes size={19} /></span><div><strong>Set up an inventory boundary</strong><p>Products and components created here stay separate from other workspaces.</p></div></div>
      <Field label="Workspace name" help="A short, recognizable name for the inventory boundary your team will work in." required error={error} full><input autoFocus value={name} maxLength={50} onChange={(event) => { setName(event.target.value); if (error) setError(''); }} aria-invalid={Boolean(error)} placeholder="For example, Payments" /></Field>
      <div className="workspace-name-meta"><span>Use a team, platform, or business-domain name.</span><span>{name.length}/50</span></div>
      <footer><button className="button secondary" type="button" onClick={onClose}>Cancel</button><button className="button primary" type="submit" disabled={saving}>{saving ? 'Creating…' : 'Create workspace'}</button></footer>
    </form>
  </InventoryDialog>;
}

function EmptyWorkspaces({ onCreate }: { onCreate: () => void }) {
  return <section className="empty-state inventory-empty"><span><Boxes size={22} /></span><h1>Create your first workspace</h1><p>Workspaces keep product and component inventory separated.</p><button className="button primary" type="button" onClick={onCreate}><Plus size={15} />Create workspace</button></section>;
}

function ProductsPage({ products, status, error, navigate }: { products: Product[]; status: string; error: string; navigate: Navigate }) {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const query = search.trim().toLocaleLowerCase();
  const filtered = useMemo(() => products.filter((product) => !query || product.product_code.toLocaleLowerCase().includes(query) || product.name.toLocaleLowerCase().includes(query)), [products, query]);
  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const visible = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  function changeSearch(value: string) { setSearch(value); setPage(1); }
  return <section className="products-page">
    <PageHeader title="Products" description="Products in the active workspace." actions={products.length ? <button className="button primary" type="button" onClick={() => navigate({ kind: 'product-create' })}><Plus size={15} />Create product</button> : undefined} />
    {status === 'loading' ? <LoadingState label="Loading products" /> : error ? <RequestError message={error} /> : products.length === 0 ? <section className="empty-state"><span><Package size={22} /></span><strong>No products yet</strong><p>Create a product to start building this workspace inventory.</p><button className="button primary" type="button" onClick={() => navigate({ kind: 'product-create' })}>Create product</button></section> : <section className="panel table-panel products-catalog">
      <div className="table-toolbar"><SearchField label="Search products" value={search} onChange={changeSearch} placeholder="Search by name or code" /><span className="table-count">{filtered.length} products</span></div>
      {visible.length ? <div className="table-scroll" tabIndex={0} aria-label="Products table"><table className="data-table products-table inventory-products-table"><thead><tr><th>Name</th><th>Code</th><th>Criticality</th><th>Description</th></tr></thead><tbody>{visible.map((product) => <tr key={product.id}><td><button className="table-link entity-name" type="button" onClick={() => navigate({ kind: 'product', productKey: product.product_code })}><span><strong>{product.name}</strong></span></button></td><td className="product-code-cell">{product.product_code}</td><td><CriticalityBadge value={product.criticality} /></td><ProductDescriptionCell description={product.description} /></tr>)}</tbody></table></div> : <div className="inventory-no-results"><strong>No matching products</strong><p>Try a different product name or code.</p></div>}
      <div className="table-footer"><span>Page {currentPage} of {pageCount}</span><div className="pagination-actions"><button type="button" className="button secondary compact" disabled={currentPage === 1} onClick={() => setPage((value) => Math.max(1, value - 1))}><ChevronLeft size={14} />Previous</button><button type="button" className="button secondary compact" disabled={currentPage === pageCount} onClick={() => setPage((value) => Math.min(pageCount, value + 1))}>Next<ChevronRight size={14} /></button></div></div>
    </section>}
  </section>;
}

function ProductDescriptionCell({ description }: { description?: string | null }) {
  const value = description?.trim();
  if (!value) return <td><span className="product-description-empty">—</span></td>;
  return <td><TooltipTrigger ariaLabel={`Description: ${value}`} buttonClassName="product-description-preview" content={value} tooltipClassName="field-help-tooltip product-description-tooltip"><strong aria-hidden="true">...</strong></TooltipTrigger></td>;
}

function ProductCreatePage({ onCancel, onCreate }: { onCancel: () => void; onCreate: (input: { product_code: string; name: string; criticality: ProductCriticality; description?: string }) => Promise<void> }) {
  const codeRef = useRef<HTMLInputElement>(null);
  const nameRef = useRef<HTMLInputElement>(null);
  const descriptionRef = useRef<HTMLTextAreaElement>(null);
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [criticality, setCriticality] = useState<ProductCriticality>('BUSINESS-OPERATIONAL');
  const [description, setDescription] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  async function submit(event: FormEvent) {
    event.preventDefault();
    const next: Record<string, string> = {};
    if (!/^[A-Z]{1,10}$/.test(code)) next.code = 'Use 1–10 uppercase letters';
    if (!name.trim()) next.name = 'Product name is required';
    else if (name.trim().length > 50) next.name = 'Product name must be 50 characters or fewer';
    if (description.length > 1000) next.description = 'Description must be 1,000 characters or fewer';
    if (Object.keys(next).length) {
      setErrors(next);
      if (next.code) codeRef.current?.focus();
      else if (next.name) nameRef.current?.focus();
      else descriptionRef.current?.focus();
      return;
    }
    setSaving(true); setErrors({});
    try {
      await onCreate({ product_code: code, name: name.trim(), criticality, ...(optional(description) ? { description: description.trim() } : {}) });
    } catch (cause) { setErrors({ form: publicError(cause) }); setSaving(false); }
  }
  return <section className="product-create-page">
    <button className="back-link" type="button" onClick={onCancel}><ChevronLeft size={14} />Back to Products</button>
    <PageHeader title="Create product" description="Add a server-backed product to the active workspace." />
    <form className="product-create-form" onSubmit={submit} noValidate>
      <section className="product-form-section"><header><h2>Product details</h2></header><div className="create-fields">
        <Field label="Product code" help="A short uppercase identifier used in URLs, tables, and integrations." required error={errors.code}><input ref={codeRef} value={code} maxLength={10} onChange={(event) => setCode(event.target.value.toUpperCase())} aria-invalid={Boolean(errors.code)} /></Field>
        <Field label="Product name" help="The human-readable name shown across inventory and reports." required error={errors.name}><input ref={nameRef} value={name} maxLength={50} onChange={(event) => setName(event.target.value)} aria-invalid={Boolean(errors.name)} /></Field>
        <ProductCriticalityField value={criticality} onChange={setCriticality} />
        <Field label="Description" help="A brief explanation of what the product does and which business capability it supports." full error={errors.description}><textarea ref={descriptionRef} value={description} maxLength={1000} onChange={(event) => setDescription(event.target.value)} aria-invalid={Boolean(errors.description)} /></Field>
      </div></section>
      {errors.form ? <InlineError message={errors.form} /> : null}
      <div className="product-create-actions"><button className="button primary" type="submit" disabled={saving}>{saving ? 'Creating…' : 'Create product'}</button></div>
    </form>
  </section>;
}

const criticalityCopy: Record<ProductCriticality, string> = {
  'MISSION-CRITICAL': 'Mission critical',
  'BUSINESS-CRITICAL': 'Business critical',
  'BUSINESS-OPERATIONAL': 'Business operational',
  'OFFICE-PRODUCTIVITY': 'Office productivity',
};

function ProductCriticalityField({ value, onChange }: { value: ProductCriticality; onChange: (value: ProductCriticality) => void }) {
  const id = useId();
  const helpID = `${id}-help`;
  const selectID = `${id}-select`;
  return <div className="field full criticality-field">
    <FieldLabel htmlFor={selectID} label="Criticality" help="How severely the business is affected if this product becomes unavailable or compromised." required helpID={helpID} />
    <select id={selectID} value={value} aria-describedby={helpID} onChange={(event) => onChange(event.target.value as ProductCriticality)}>
      {productCriticalities.map((option) => <option key={option} value={option}>{criticalityCopy[option]}</option>)}
    </select>
  </div>;
}

function ProductPage({ product, components, status, error, navigate, createComponent, notify }: { product: Product; components: Component[]; status: string; error: string; navigate: Navigate; createComponent: (input: CreateComponentInput) => Promise<Component>; notify: (message: string) => void }) {
  const [createOpen, setCreateOpen] = useState(false);
  return <section className="products-page">
    <button className="back-link" type="button" onClick={() => navigate({ kind: 'products' })}><ChevronLeft size={14} />Back to Products</button>
    <PageHeader eyebrow={product.product_code} title={product.name} description={product.description || 'No description provided.'} actions={<CriticalityBadge value={product.criticality} />} />
    <nav className="tabs" aria-label="Product sections"><button className="active" type="button" aria-current="page">Overview</button><button type="button" onClick={() => navigate({ kind: 'product', productKey: product.product_code, tab: 'architecture' })}>Architecture map</button><button type="button" onClick={() => navigate({ kind: 'product', productKey: product.product_code, tab: 'threat-model' })}>Threat modeling</button></nav>
    <section className="panel table-panel">
      <div className="component-filter-toolbar"><h2>Components <span>{components.length}</span></h2><button className="button primary" type="button" onClick={() => setCreateOpen(true)}><Plus size={15} />Create component</button></div>
      {status === 'loading' ? <LoadingState label="Loading components" compact /> : error ? <RequestError message={error} compact /> : components.length ? <div className="table-scroll" tabIndex={0} aria-label="Components table; scroll horizontally to view all columns"><table className="data-table component-table inventory-component-table"><thead><tr><th>Name</th><th>Type</th><th>Details</th><th>APIs</th></tr></thead><tbody>{components.map((component) => <tr key={component.id}><td><button type="button" className="table-link entity-name" onClick={() => navigate({ kind: 'component', productKey: product.product_code, componentId: String(component.id) })}><ComponentGlyph type={component.type} /><span><strong>{component.name}</strong><small>#{component.id}</small></span></button></td><td>{component.type}</td><td>{detailsSummary(component)}</td><td>{component.apis.length}</td></tr>)}</tbody></table></div> : <section className="empty-state embedded"><span><Server size={21} /></span><strong>No components yet</strong><p>Add the first component for this product.</p><button className="button primary" type="button" onClick={() => setCreateOpen(true)}>Create component</button></section>}
    </section>
    {createOpen ? <ComponentCreateDialog product={product} onClose={() => setCreateOpen(false)} onCreate={async (input) => {
      const component = await createComponent(input);
      setCreateOpen(false);
      notify('Component created');
      navigate({ kind: 'component', productKey: product.product_code, componentId: String(component.id) });
    }} /> : null}
  </section>;
}

function ProductArchitecturePage({ product, components, status, error, navigate }: { product: Product; components: Component[]; status: string; error: string; navigate: Navigate }) {
  return <section className="products-page architecture-page">
    <button className="back-link" type="button" onClick={() => navigate({ kind: 'products' })}><ChevronLeft size={14} />Back to Products</button>
    <PageHeader eyebrow={product.product_code} title={product.name} description={product.description || 'No description provided.'} actions={<CriticalityBadge value={product.criticality} />} />
    <nav className="tabs" aria-label="Product sections"><button type="button" onClick={() => navigate({ kind: 'product', productKey: product.product_code })}>Overview</button><button className="active" type="button" aria-current="page">Architecture map</button><button type="button" onClick={() => navigate({ kind: 'product', productKey: product.product_code, tab: 'threat-model' })}>Threat modeling</button></nav>
    {status === 'loading' ? <section className="panel architecture-state"><LoadingState label="Loading components" /></section> : error ? <section className="panel architecture-state"><RequestError message={error} /></section> : components.length ? <ArchitectureMap product={product} components={components} onOpenComponent={(component) => navigate({ kind: 'component', productKey: product.product_code, componentId: String(component.id) })} /> : <section className="empty-state architecture-empty"><span><Network size={21} /></span><strong>No components yet</strong><p>Add components from the product overview to map their API relationships.</p><button className="button secondary" type="button" onClick={() => navigate({ kind: 'product', productKey: product.product_code })}>Open product overview</button></section>}
  </section>;
}

function ComponentCreateDialog({ product, onClose, onCreate }: { product: Product; onClose: () => void; onCreate: (input: CreateComponentInput) => Promise<void> }) {
  const [name, setName] = useState('');
  const [type, setType] = useState<ComponentType>('Backend Service');
  const [description, setDescription] = useState('');
  const [language, setLanguage] = useState('');
  const [languageVersion, setLanguageVersion] = useState('');
  const [framework, setFramework] = useState('');
  const [broker, setBroker] = useState<(typeof eventBrokers)[number]>('Kafka');
  const [system, setSystem] = useState('');
  const [version, setVersion] = useState('');
  const [networkAddress, setNetworkAddress] = useState('');
  const [apis, setAPIs] = useState<CreateComponentAPIInput[]>([]);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  function addAPI() { setAPIs((current) => [...current, { name: '', api_type: 'REST', network_exposure: 'internal' }]); }
  function updateAPI(index: number, patch: Partial<CreateComponentAPIInput>) { setAPIs((current) => current.map((api, itemIndex) => itemIndex === index ? { ...api, ...patch } : api)); }
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!name.trim()) return setError('Component name is required');
    if (name.trim().length > 50) return setError('Component name must be 50 characters or fewer');
    if (description.length > 1000) return setError('Description must be 1,000 characters or fewer');
    if (type === 'Infrastructure' ? !system.trim() : !language.trim()) return setError(type === 'Infrastructure' ? 'System is required' : 'Language is required');
    if (apis.some((api) => !api.name.trim())) return setError('Every provided API needs a name');
    const details = type === 'Infrastructure' ? { system, version, networkAddress } : type === 'Background Worker' ? { language, languageVersion, framework, broker } : { language, languageVersion, framework };
    setSaving(true); setError('');
    try { await onCreate(buildComponentInput(product.id, { name, type, description, details }, apis)); } catch (cause) { setError(publicError(cause)); setSaving(false); }
  }
  return <InventoryDialog title="Create component" eyebrow={product.product_code} onClose={onClose} wide><form className="modal-form inventory-component-form" onSubmit={submit} noValidate>
    <Field label="Component name" help="The human-readable name used to identify this component in the product inventory." required><input autoFocus value={name} maxLength={50} onChange={(event) => setName(event.target.value)} /></Field>
    <Field label="Component type" help="Controls which technical details and security checks apply to this component." required><select value={type} onChange={(event) => setType(event.target.value as ComponentType)}>{componentTypes.map((value) => <option key={value}>{value}</option>)}</select></Field>
    {type === 'Infrastructure' ? <>
      <Field label="System" help="The infrastructure technology or managed service, such as PostgreSQL or Redis." required><input value={system} maxLength={50} onChange={(event) => setSystem(event.target.value)} /></Field>
      <Field label="Version" help="The deployed system version, when it is known and relevant for security tracking."><input value={version} maxLength={50} onChange={(event) => setVersion(event.target.value)} /></Field>
      <Field label="Network address" help="The hostname, URL, or internal address used to reach this infrastructure component." full><input value={networkAddress} maxLength={50} onChange={(event) => setNetworkAddress(event.target.value)} /></Field>
    </> : <>
      <Field label="Language" help="The primary programming language used to implement this component." required><input value={language} maxLength={50} onChange={(event) => setLanguage(event.target.value)} /></Field>
      <Field label="Language version" help="The runtime or compiler version used by the deployed component."><input value={languageVersion} maxLength={50} onChange={(event) => setLanguageVersion(event.target.value)} /></Field>
      <Field label="Framework" help="The main application framework used by this component."><input value={framework} maxLength={50} onChange={(event) => setFramework(event.target.value)} /></Field>
      {type === 'Background Worker' ? <Field label="Broker" help="The messaging system from which this worker consumes jobs or events." required><select value={broker} onChange={(event) => setBroker(event.target.value as (typeof eventBrokers)[number])}>{eventBrokers.map((value) => <option key={value}>{value}</option>)}</select></Field> : null}
    </>}
    <Field label="Description" help="A brief explanation of the component responsibility and its place in the product." full><textarea value={description} maxLength={1000} onChange={(event) => setDescription(event.target.value)} /></Field>
    <section className="form-field full api-editor" aria-labelledby="provided-apis-heading"><header className="api-editor-heading"><div><span>Interfaces</span><h3 id="provided-apis-heading">Provided APIs</h3></div><button className="button secondary compact" type="button" onClick={addAPI}><Plus size={14} />Add API</button></header>{apis.map((api, index) => <section className="api-editor-card" key={index} role="group" aria-labelledby={`provided-api-${index}`}>
      <header><h4 id={`provided-api-${index}`}>API {index + 1}</h4><button className="icon-button" type="button" onClick={() => setAPIs((current) => current.filter((_, itemIndex) => itemIndex !== index))} aria-label={`Remove API ${index + 1}`}><Trash2 size={15} /></button></header>
      <div className="api-editor-fields"><Field label="API name" help="The name consumers use to recognize this provided interface." required><input value={api.name} maxLength={50} onChange={(event) => updateAPI(index, { name: event.target.value })} /></Field>
        <Field label="API type" help="The protocol or interface style exposed by this API."><select value={api.api_type} onChange={(event) => updateAPI(index, { api_type: event.target.value as APIType })}>{apiTypes.map((value) => <option key={value}>{value}</option>)}</select></Field>
        <Field label="Network exposure" help="Whether this API is reachable only inside trusted networks or from the internet."><select value={api.network_exposure} onChange={(event) => updateAPI(index, { network_exposure: event.target.value as NetworkExposure })}><option value="internal">internal</option><option value="internet">internet</option></select></Field>
      </div>
    </section>)}</section>
    {error ? <InlineError message={error} /> : null}
    <footer className="full"><button className="button secondary" type="button" onClick={onClose}>Cancel</button><button className="button primary" type="submit" disabled={saving}>{saving ? 'Creating…' : 'Create component'}</button></footer>
  </form></InventoryDialog>;
}

function ComponentPage({ product, component, components, navigate, addConsumerAPI, refreshComponent, notify }: { product: Product; component: Component; components: Component[]; navigate: Navigate; addConsumerAPI: (componentID: number, apiID: number) => Promise<Component>; refreshComponent: (componentID: number) => Promise<Component>; notify: (message: string) => void }) {
  const [relationshipOpen, setRelationshipOpen] = useState(false);
  const provided = component.apis.filter((api) => api.role === 'provider');
  const consumed = component.apis.filter((api) => api.role === 'consumer');
  function confirmRelationship() {
    setRelationshipOpen(false);
    notify('API relationship added');
  }
  return <section className="products-page">
    <button className="back-link" type="button" onClick={() => navigate({ kind: 'product', productKey: product.product_code })}><ChevronLeft size={14} />Back to {product.name}</button>
    <PageHeader eyebrow={component.type} title={component.name} description={component.description || 'No description provided.'} actions={<button className="button secondary" type="button" onClick={() => navigate({ kind: 'component', productKey: product.product_code, componentId: String(component.id), tab: 'security' })}><ShieldCheck size={15} />Security checks</button>} />
    <section className="component-summary-grid">
      <article className="panel component-summary-block component-description-block"><div className="block-heading">Component details</div><dl className="component-facts">{detailFacts(component).map(([term, value]) => <div key={term}><dt>{term}</dt><dd>{value || '—'}</dd></div>)}</dl></article>
      <article className="panel component-summary-block component-technologies-block"><div className="block-heading">Inventory identity</div><dl className="component-facts"><div><dt>Component ID</dt><dd>{component.id}</dd></div><div><dt>Product</dt><dd>{product.product_code}</dd></div></dl></article>
    </section>
    <div className="api-section-grid">
      <APIList title="APIs this component provides" help="Interfaces exposed by this component that other components can connect to." apis={provided} empty="This component does not provide APIs." />
      <APIList title="APIs this component uses" help="Interfaces from other components that this component calls or depends on." apis={consumed} empty="This component does not consume APIs." action={<button className="button secondary compact" type="button" onClick={() => setRelationshipOpen(true)}><Network size={14} />Add API relationship</button>} />
    </div>
    {relationshipOpen ? <RelationshipDialog component={component} candidates={relationshipCandidates(component, components)} onClose={() => setRelationshipOpen(false)} onConfirmed={confirmRelationship} onAdd={async (apiID) => {
      await addConsumerAPI(component.id, apiID);
      confirmRelationship();
    }} refreshComponent={refreshComponent} /> : null}
  </section>;
}

function RelationshipDialog({ component, candidates, onClose, onConfirmed, onAdd, refreshComponent }: { component: Component; candidates: RelationshipCandidate[]; onClose: () => void; onConfirmed: () => void; onAdd: (apiID: number) => Promise<void>; refreshComponent: (componentID: number) => Promise<Component> }) {
  const [apiID, setAPIID] = useState(candidates[0]?.api.id ?? 0);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!apiID) return setError('Choose a provider API');
    setSaving(true); setError('');
    try { await onAdd(apiID); } catch (cause) {
      if (cause instanceof InventoryRequestError && cause.status === 409) {
        setError('This API relationship already exists');
      } else {
        try {
          const refreshed = await refreshComponent(component.id);
          if (refreshed.apis.some((api) => api.id === apiID && api.role === 'consumer')) {
            onConfirmed();
            return;
          }
        } catch { /* Keep the original mutation outcome as unknown. */ }
        setError('The API relationship result could not be confirmed. Review the refreshed component before trying again.');
      }
      setSaving(false);
    }
  }
  return <InventoryDialog title="Add API relationship" eyebrow={component.name} onClose={onClose}><form className="modal-form single" onSubmit={submit} noValidate>
    {candidates.length ? <Field label="Provider API" help="The API this component consumes from another component in the active product." required full><select value={apiID} onChange={(event) => setAPIID(Number(event.target.value))}>{candidates.map(({ component: provider, api }) => <option key={api.id} value={api.id}>{provider.name} — {api.name} ({api.api_type})</option>)}</select></Field> : <div className="inventory-no-results"><strong>No available provider APIs</strong><p>Other components must provide an API before a relationship can be added.</p></div>}
    {error ? <InlineError message={error} /> : null}
    <footer><button className="button secondary" type="button" onClick={onClose}>Cancel</button><button className="button primary" type="submit" disabled={saving || candidates.length === 0}>{saving ? 'Adding…' : 'Add relationship'}</button></footer>
  </form></InventoryDialog>;
}

function APIList({ title, help, apis, empty, action }: { title: string; help: string; apis: ComponentAPI[]; empty: string; action?: ReactNode }) {
  return <section className="panel api-panel"><header className="panel-heading"><div><div className="api-panel-title"><h2>{title}</h2><FieldLabel label={title} help={help} /></div><p>{apis.length} {apis.length === 1 ? 'API' : 'APIs'}</p></div>{action}</header>{apis.length ? <div className="api-list">{apis.map((api) => <article key={`${api.role}-${api.id}`}><div><strong>{api.name}</strong><small>#{api.id}</small></div><span>{api.api_type}</span><span className={`state-badge ${api.network_exposure === 'internet' ? 'needs-review' : 'confirmed'}`}>{api.network_exposure}</span></article>)}</div> : <p className="api-empty">{empty}</p>}</section>;
}

function ContextTrail({ route, workspaceName, product, components, navigate }: { route: AtlasRoute; workspaceName: string; product?: Product; components: Component[]; navigate: Navigate }) {
  const segments: Array<{ type: string; name: string; destination?: AtlasRoute }> = [{ type: 'Workspace', name: workspaceName, destination: { kind: 'workspaces' } }];
  const belongsToProduct = ['product', 'component', 'component-check'].includes(route.kind);
  if (belongsToProduct && product) segments.push({ type: 'Product', name: product.name, destination: { kind: 'product', productKey: product.product_code } });
  if (route.kind === 'component' || route.kind === 'component-check') {
    const component = components.find((item) => String(item.id) === route.componentId);
    segments.push({ type: 'Component', name: component?.name ?? 'Component' });
  } else if (!belongsToProduct) {
    segments.push({ type: 'View', name: routeTitle(route, product, components) });
  }
  return <nav className="scope context-trail" aria-label="Current location"><ol>{segments.map((segment, index) => {
    const current = index === segments.length - 1;
    const destination = segment.destination;
    const label = <><small>{segment.type}</small><strong>{segment.name}</strong></>;
    return <li key={`${segment.type}-${segment.name}`}>{destination && !current
      ? <button className="context-trail-item context-trail-link" type="button" onClick={() => navigate(destination)} aria-label={`Open ${segment.type.toLowerCase()} ${segment.name}`}>{label}</button>
      : <span className="context-trail-item" aria-current={current ? 'page' : undefined}>{label}</span>}{!current ? <ChevronRight className="scope-separator" size={15} aria-hidden="true" /> : null}</li>;
  })}</ol></nav>;
}

function PageHeader({ eyebrow, title, description, actions }: { eyebrow?: string; title: string; description?: ReactNode; actions?: ReactNode }) {
  return <header className="page-header"><div>{eyebrow ? <span className="eyebrow">{eyebrow}</span> : null}<h1>{title}</h1>{description ? <p>{description}</p> : null}</div>{actions ? <div className="page-actions">{actions}</div> : null}</header>;
}

function Field({ label, help, required, error, full, children }: { label: string; help: string; required?: boolean; error?: string; full?: boolean; children: ReactElement<{ id?: string; 'aria-describedby'?: string }> }) {
  const id = useId();
  const helpID = `${id}-help`;
  const errorID = `${id}-error`;
  const describedBy = [children.props['aria-describedby'], helpID, error ? errorID : ''].filter(Boolean).join(' ');
  return <div className={`field ${full ? 'full' : ''}`}><FieldLabel label={label} help={help} required={required} htmlFor={id} helpID={helpID} />{cloneElement(children, { id, 'aria-describedby': describedBy })}{error ? <small id={errorID} className="field-error">{error}</small> : null}</div>;
}

function InlineError({ message }: { message: string }) {
  return <div className="inline-error full" role="alert"><AlertCircle size={15} aria-hidden="true" /><span>{message}</span></div>;
}

function LoadingState({ label, compact = false }: { label: string; compact?: boolean }) {
  return <div className={`inventory-loading ${compact ? 'compact' : ''}`} role="status"><span className="loading-dot" aria-hidden="true" />{label}…</div>;
}

function RequestError({ message, compact = false }: { message: string; compact?: boolean }) {
  return <div className={`inline-error request-error ${compact ? 'compact' : ''}`} role="alert"><AlertCircle size={17} /><span>{message || 'The inventory request could not be completed'}</span></div>;
}

function NotFound({ label, onBack }: { label: string; onBack: () => void }) {
  return <section className="empty-state inventory-empty"><span><AlertCircle size={22} /></span><h1>{label}</h1><p>The requested inventory record is not available in this workspace.</p><button className="button secondary" type="button" onClick={onBack}><ChevronLeft size={14} />Back</button></section>;
}

function CriticalityBadge({ value }: { value: ProductCriticality }) {
  return <span className={`severity-badge ${value.toLocaleLowerCase()}`}>{value}</span>;
}

function ComponentGlyph({ type }: { type: ComponentType }) {
  return <span className={`component-list-avatar ${type.toLocaleLowerCase().replaceAll(' ', '-')}`} aria-hidden="true">{type === 'Infrastructure' ? <Boxes size={16} /> : <Server size={16} />}</span>;
}

function detailsSummary(component: Component) {
  if (component.type === 'Infrastructure') return [component.details.system, component.details.version].filter(Boolean).join(' · ');
  return [component.details.language, component.details.language_version, component.details.framework, component.type === 'Background Worker' ? component.details.broker : ''].filter(Boolean).join(' · ');
}

function detailFacts(component: Component): Array<[string, string | number]> {
  if (component.type === 'Infrastructure') return [['System', component.details.system], ['Version', component.details.version], ['Network address', component.details.network_address]];
  const facts: Array<[string, string]> = [['Language', component.details.language], ['Language version', component.details.language_version], ['Framework', component.details.framework]];
  if (component.type === 'Background Worker') facts.push(['Broker', component.details.broker]);
  return facts;
}

function routeTitle(route: AtlasRoute, product?: Product, components: Component[] = []) {
  if (route.kind === 'overview') return 'Dashboard';
  if (route.kind === 'workspaces') return 'Workspace';
  if (route.kind === 'products') return 'Products';
  if (route.kind === 'templates') return 'Templates';
  if (route.kind === 'teams' || route.kind === 'team') return 'Teams';
  if (route.kind === 'settings') return 'Settings';
  if (route.kind === 'product-create') return 'Create product';
  if (route.kind === 'product') {
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

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toLocaleUpperCase()).join('') || 'WS';
}

function publicError(cause: unknown) {
  return cause instanceof InventoryRequestError ? cause.message : 'The inventory request could not be completed';
}

export function inventoryPath(route: AtlasRoute) {
  return serializeRoute(route);
}
