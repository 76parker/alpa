import { ChevronLeft, Network, Package, Plus } from '../../src/ui/icons';
import { lazy, Suspense, useMemo, useRef, useState, type FormEvent } from 'react';
import { productCriticalities, productCriticalityLabels, type Component, type Product, type ProductCriticality } from '../../lib/inventory/contracts';
import { SearchField } from '../search-field';
import { Badge, Button, CriticalityBadge, EmptyState, EmptyStateBody, EmptyStateFooter, Form, Pagination, Select, Tab, Tabs, TabTitleText, Table, Tbody, Td, TextArea, TextInput, Th, Thead, Toolbar, ToolbarContent, ToolbarItem, Tr, TypeSelect, type TypeSelectOption } from '../../src/ui';
import { ComponentInventoryTabs, ComponentInventoryToolbar, type ComponentInventoryView } from './component-pages';
import { PageHeader, Field, InlineError, LoadingState, RequestError, publicError } from './shared';
import { type Navigate, optional } from './component-input';

export const PAGE_SIZE = 20;

export const ArchitectureMap = lazy(() => import('./architecture-map').then((module) => ({ default: module.ArchitectureMap })));

const criticalityOptions: readonly TypeSelectOption<ProductCriticality>[] = [
  { value: 'mission-critical', label: 'Mission critical', description: 'Mission or safety impact', tone: 'danger' },
  { value: 'business-critical', label: 'Business critical', description: 'Severe customer or revenue impact', tone: 'warning' },
  { value: 'business-operational', label: 'Business operational', description: 'Material disruption to operations', tone: 'info' },
  { value: 'office-productivity', label: 'Office productivity', description: 'Limited internal productivity impact', tone: 'neutral' },
];

export function ProductsPage({ products, status, error, navigate }: { products: Product[]; status: string; error: string; navigate: Navigate }) {
  const [search, setSearch] = useState('');
  const [criticality, setCriticality] = useState('');
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(PAGE_SIZE);
  const [sort, setSort] = useState<{ index: number; direction: 'asc' | 'desc' }>({ index: 0, direction: 'asc' });
  const query = search.trim().toLocaleLowerCase();
  const filtered = useMemo(() => {
    const matching = products.filter((product) =>
      (!query || `${product.product_code} ${product.name}`.toLocaleLowerCase().includes(query)) &&
      (!criticality || product.criticality === criticality));
    const keys = ['name', 'product_code', 'criticality'] as const;
    const ranks = ['mission-critical', 'business-critical', 'business-operational', 'office-productivity'];
    return matching.sort((a, b) => {
      const order = sort.index === 2 ? ranks.indexOf(a.criticality) - ranks.indexOf(b.criticality) : a[keys[sort.index]].localeCompare(b[keys[sort.index]], undefined, { numeric: true });
      return sort.direction === 'asc' ? order : -order;
    });
  }, [products, query, criticality, sort]);
  const currentPage = Math.min(page, Math.max(1, Math.ceil(filtered.length / perPage)));
  const visible = filtered.slice((currentPage - 1) * perPage, currentPage * perPage);
  const reset = () => { setSearch(''); setCriticality(''); setPage(1); };
  return <section className="products-page">
    <PageHeader title="Products" description="Products in the active workspace." actions={<Button variant="primary" onClick={() => navigate({ kind: 'product-create' })} icon={<Plus />}>Create product</Button>} />
    {status === 'loading' ? <LoadingState label="Loading products" /> : error ? <RequestError message={error} /> : products.length === 0
      ? <EmptyState titleText="No products yet" headingLevel="h2" icon={Package} variant="sm"><EmptyStateBody>Create a product to start building this workspace inventory.</EmptyStateBody><EmptyStateFooter><Button variant="primary" onClick={() => navigate({ kind: 'product-create' })}>Create first product</Button></EmptyStateFooter></EmptyState>
      : <section className="products-catalog">
        <Toolbar className="table-toolbar" aria-label="Product filters"><ToolbarContent>
          <ToolbarItem><SearchField label="Search products" value={search} onChange={(value) => { setSearch(value); setPage(1); }} placeholder="Search by name or code" /></ToolbarItem>
          <ToolbarItem><Select aria-label="Filter by criticality" value={criticality} onChange={(event) => { setCriticality(event.target.value); setPage(1); }}><option value="">Criticality: All</option>{productCriticalities.map((item) => <option key={item.value} value={item.value}>{productCriticalityLabels[item.value]}</option>)}</Select></ToolbarItem>
          <ToolbarItem><Button variant="link" onClick={reset} isDisabled={!search && !criticality}>Reset</Button></ToolbarItem>
          <ToolbarItem align={{ default: 'alignEnd' }}><span className="table-count" aria-live="polite">{filtered.length} {filtered.length === 1 ? 'product' : 'products'}</span></ToolbarItem>
        </ToolbarContent></Toolbar>
        <div className="table-scroll" tabIndex={0} role="region" aria-label="Products table">
          <Table aria-label="Products" className="products-table"><Thead><Tr>{['Name', 'Code', 'Criticality'].map((title, index) => <Th key={title} sort={{ sortBy: sort, columnIndex: index, onSort: (_event, index, direction) => setSort({ index, direction }) }}>{title}</Th>)}<Th>Description</Th></Tr></Thead>
          <Tbody>{visible.length ? visible.map((product) => <Tr key={product.id}><Td dataLabel="Name"><Button variant="link" className="table-link" onClick={() => navigate({ kind: 'product', productKey: product.product_code })}>{product.name}</Button></Td><Td dataLabel="Code"><code>{product.product_code}</code></Td><Td dataLabel="Criticality"><CriticalityBadge value={product.criticality} /></Td><ProductDescriptionCell description={product.description} /></Tr>) : <Tr><Td colSpan={4}><EmptyState titleText="No matching products" headingLevel="h2" variant="xs"><EmptyStateBody>Try a different name or code, or reset the filters.</EmptyStateBody><EmptyStateFooter><Button variant="link" onClick={reset}>Reset filters</Button></EmptyStateFooter></EmptyState></Td></Tr>}</Tbody></Table>
        </div>
        <Pagination itemCount={filtered.length} page={currentPage} perPage={perPage} onSetPage={(_event, value) => setPage(value)} onPerPageSelect={(_event, value) => { setPerPage(value); setPage(1); }} perPageOptions={[{ title: '20', value: 20 }, { title: '50', value: 50 }, { title: '100', value: 100 }]} titles={{ paginationAriaLabel: 'Product pagination' }} />
      </section>}
  </section>;
}

export function ProductDescriptionCell({ description }: { description?: string | null }) {
  return <Td dataLabel="Description" className="product-description-cell"><span>{description?.trim() || '—'}</span></Td>;
}

export function ProductCreatePage({ onCancel, onCreate }: { onCancel: () => void; onCreate: (input: { product_code: string; name: string; criticality: ProductCriticality; description?: string }) => Promise<void> }) {
  const codeRef = useRef<HTMLInputElement>(null);
  const nameRef = useRef<HTMLInputElement>(null);
  const descriptionRef = useRef<HTMLTextAreaElement>(null);
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [criticality, setCriticality] = useState<ProductCriticality>('business-operational');
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
    <Button variant="link" className="back-link" type="button" onClick={onCancel}><ChevronLeft width={14} height={14} />Back to Products</Button>
    <PageHeader title="Create product" description="Add a product to the active workspace." />
    <Form className="product-create-form" onSubmit={submit} noValidate>
      <section className="product-form-section"><header><h2>Product details</h2></header><div className="create-fields">
        <Field label="Product code" help="A short uppercase identifier used in URLs, tables, and integrations." required error={errors.code}><TextInput ref={codeRef} value={code} maxLength={10} onChange={(event) => setCode(event.target.value.toUpperCase())} aria-invalid={Boolean(errors.code)} /></Field>
        <Field label="Product name" help="The human-readable name shown across inventory and reports." required error={errors.name}><TextInput ref={nameRef} value={name} maxLength={50} onChange={(event) => setName(event.target.value)} aria-invalid={Boolean(errors.name)} /></Field>
        <ProductCriticalityField value={criticality} onChange={setCriticality} />
        <Field label="Description" help="A brief explanation of what the product does and which business capability it supports." full error={errors.description}><TextArea ref={descriptionRef} value={description} maxLength={1000} onChange={(event) => setDescription(event.target.value)} aria-invalid={Boolean(errors.description)} /></Field>
      </div></section>
      {errors.form ? <InlineError message={errors.form} /> : null}
      <div className="product-create-actions"><Button variant="primary" className="button primary" type="submit" disabled={saving}>{saving ? 'Creating…' : 'Create product'}</Button></div>
    </Form>
  </section>;
}

export function ProductCriticalityField({ value, onChange }: { value: ProductCriticality; onChange: (value: ProductCriticality) => void }) {
  return <Field label="Criticality" help="How severely the business is affected if this product becomes unavailable or compromised." required full><TypeSelect aria-label="Criticality" value={value} options={criticalityOptions} onChange={onChange} /></Field>;
}

function ProductPageHeader({ product }: { product: Product }) {
  return <PageHeader
    title={product.name}
    description={product.description || 'No description provided.'}
    descriptionMeta={<span className="product-metadata" role="group" aria-label="Product metadata"><Badge isRead className="product-code-badge">{product.product_code}</Badge><CriticalityBadge value={product.criticality} /></span>}
  />;
}

export function ProductPage({ product, navigate }: { product: Product; navigate: Navigate }) {
  return <section className="products-page">
    <ProductPageHeader product={product} />
    <ProductTabs product={product} active="overview" navigate={navigate} />
  </section>;
}

export function ProductComponentsPage({ product, components, status, error, navigate }: { product: Product; components: Component[]; status: string; error: string; navigate: Navigate }) {
  return <section className="products-page">
    <ProductPageHeader product={product} />
    <ProductTabs product={product} active="components" navigate={navigate} />
    <section className="component-inventory" aria-label="Components">
      {status === 'loading' ? <LoadingState label="Loading components" compact /> : error ? <RequestError message={error} compact /> : <ComponentInventoryTabs components={components} productCode={product.product_code} navigate={navigate} onArchitecture={() => navigate({ kind: 'product', productKey: product.product_code, tab: 'architecture' })} onCreate={() => navigate({ kind: 'component-create', productKey: product.product_code })} />}
    </section>
  </section>;
}

export function ProductTabs({ product, active, navigate }: { product: Product; active: string; navigate: Navigate }) {
  return <Tabs tabListAriaLabel="Product sections" className="product-tabs" activeKey={active} aria-label="Product sections" onSelect={(_event, key) => navigate({ kind: 'product', productKey: product.product_code, ...(key === 'overview' ? {} : { tab: key as 'components' | 'threat-model' }) })}>
    <Tab eventKey="overview" title={<TabTitleText>Overview</TabTitleText>} />
    <Tab eventKey="components" title={<TabTitleText>Components</TabTitleText>} />
    <Tab eventKey="threat-model" title={<TabTitleText>Threat modeling</TabTitleText>} />
  </Tabs>;
}

export function ProductArchitecturePage({ product, components, status, error, navigate }: { product: Product; components: Component[]; status: string; error: string; navigate: Navigate }) {
  return <section className="products-page architecture-page">
    <Button variant="link" className="back-link" type="button" onClick={() => navigate({ kind: 'products' })}><ChevronLeft width={14} height={14} />Back to Products</Button>
    <ProductPageHeader product={product} />
    <ProductTabs product={product} active="components" navigate={navigate} />
    <ComponentInventoryToolbar components={components} activeView="architecture" onChange={(view: ComponentInventoryView) => { if (view !== 'architecture') navigate({ kind: 'product', productKey: product.product_code, tab: 'components' }); }} onCreate={() => navigate({ kind: 'component-create', productKey: product.product_code })} />
    {status === 'loading' ? <section className="panel architecture-state"><LoadingState label="Loading components" /></section> : error ? <section className="panel architecture-state"><RequestError message={error} /></section> : components.length ? <Suspense fallback={<LoadingState label="Loading architecture map" />}><ArchitectureMap product={product} components={components} onOpenComponent={(component) => navigate({ kind: 'component', productKey: product.product_code, componentId: String(component.id) })} /></Suspense> : <section className="empty-state architecture-empty"><span><Network width={21} height={21} /></span><strong>No components yet</strong><p>Add components from the product overview to map their API relationships.</p><Button variant="secondary" className="button secondary" type="button" onClick={() => navigate({ kind: 'product', productKey: product.product_code })}>Open product overview</Button></section>}
  </section>;
}
