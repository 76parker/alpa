import { Boxes, ChevronLeft, ChevronRight, Network, Plus, Server, ShieldCheck, Trash2 } from '../../src/ui/icons';
import { useId, useState, type FormEvent, type ReactNode } from 'react';
import { InventoryRequestError } from '../../lib/inventory/client';
import { apiTypes, apiTypeLabels, componentClientTypes, componentTypeLabels, systemTypes, systemTypeLabels, type APIType, type Component, type ComponentAPI, type ComponentClient, type ComponentType, type CreateComponentAPIInput, type CreateComponentInput, type NetworkExposure, type Product, type SystemType } from '../../lib/inventory/contracts';
import { FieldLabel } from '../field-label';
import { InventoryDialog } from './inventory-dialog';
import { DescriptionList, DescriptionListGroup, DescriptionListTerm, DescriptionListDescription, EmptyState, EmptyStateBody, EmptyStateFooter, Badge, Button, Form, NetworkExposureLabel, Select, Table, Tbody, Td, TextArea, TextInput, Th, Thead, Tr, TypeSelect, type TypeSelectOption } from '../../src/ui';
import { PageHeader, Field, InlineError, publicError } from './shared';
import { type Navigate, type RelationshipCandidate, relationshipCandidates, optional, buildComponentInput } from './component-input';

export const COMPONENT_GROUP_PREVIEW_SIZE = 5;

export type ComponentInventoryCategory = 'services' | 'infrastructure';
export type ComponentInventoryView = ComponentInventoryCategory | 'architecture';

export const componentInventoryCategories = [
  { value: 'services', label: 'Services' },
  { value: 'infrastructure', label: 'Infrastructure' },
] as const satisfies ReadonlyArray<{ value: ComponentInventoryCategory; label: string }>;

export function ComponentInventoryViewControl({ components, activeView, onChange }: { components: Component[]; activeView: ComponentInventoryView; onChange: (view: ComponentInventoryView) => void }) {
  const options: Array<{ value: ComponentInventoryView; label: string; count: number }> = [
    { value: 'services', label: 'Services', count: components.filter((component) => componentInventoryCategory(component) === 'services').length },
    { value: 'infrastructure', label: 'Infrastructure', count: components.filter((component) => componentInventoryCategory(component) === 'infrastructure').length },
    { value: 'architecture', label: 'Architecture', count: components.length },
  ];
  return <div className="component-view-control" role="group" aria-label="Component views">
    {options.map((option) => <Button key={option.value} variant="plain" className={`component-view-option ${activeView === option.value ? 'is-active' : ''}`} aria-label={`${option.label} ${option.count}`} aria-pressed={activeView === option.value} onClick={() => onChange(option.value)}>
      <span>{option.label}</span><Badge isRead>{option.count}</Badge>
    </Button>)}
  </div>;
}

export function ComponentInventoryToolbar({ components, activeView, onChange, onCreate }: { components: Component[]; activeView: ComponentInventoryView; onChange: (view: ComponentInventoryView) => void; onCreate?: () => void }) {
  return <header className="component-register-toolbar"><ComponentInventoryViewControl components={components} activeView={activeView} onChange={onChange} />{onCreate ? <Button variant="primary" onClick={onCreate} icon={<Plus />}>Create component</Button> : null}</header>;
}

export function ComponentInventoryTabs({ components, productCode, navigate, onArchitecture, onCreate }: { components: Component[]; productCode: string; navigate: Navigate; onArchitecture: () => void; onCreate?: () => void }) {
  const [activeCategory, setActiveCategory] = useState<string | number>('services');
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  return <section className="component-register">
    <ComponentInventoryToolbar components={components} activeView={activeCategory as ComponentInventoryCategory} onChange={(view) => view === 'architecture' ? onArchitecture() : setActiveCategory(view)} onCreate={onCreate} />
    {componentInventoryCategories.map((category) => {
      const items = components.filter((component) => componentInventoryCategory(component) === category.value);
      if (activeCategory !== category.value) return null;
      return <section key={category.value} className="component-register-content" role="region" aria-label={`${category.label} components`}>
        <ComponentInventoryTable label={category.label} components={items} productCode={productCode} navigate={navigate} expanded={Boolean(expanded[category.value])} onExpandedChange={(value) => setExpanded((current) => ({ ...current, [category.value]: value }))} />
      </section>;
    })}
  </section>;
}

export function componentInventoryCategory(component: Component): ComponentInventoryCategory {
  if (component.type === 'infrastructure') return 'infrastructure';
  return 'services';
}

const componentTypeOptions: readonly TypeSelectOption<ComponentType>[] = [
  { value: 'backend-service', label: 'Backend service', description: 'Server-side application or API', icon: <Server width={16} height={16} /> },
  { value: 'frontend-service', label: 'Frontend service', description: 'Browser or user-facing application', icon: <Boxes width={16} height={16} /> },
  { value: 'infrastructure', label: 'Infrastructure', description: 'Database, queue, or managed platform', icon: <Boxes width={16} height={16} /> },
];

export function ComponentInventoryTable({ label, components, productCode, navigate, expanded, onExpandedChange }: { label: string; components: Component[]; productCode: string; navigate: Navigate; expanded: boolean; onExpandedChange: (value: boolean) => void }) {
  const tableID = useId();
  const visible = expanded ? components : components.slice(0, COMPONENT_GROUP_PREVIEW_SIZE);
  const remaining = components.length - visible.length;
  if (!components.length) return <EmptyState titleText={`No ${label.toLocaleLowerCase()} yet`} headingLevel="h3" icon={Boxes} variant="sm"><EmptyStateBody>Create a component to populate this register.</EmptyStateBody><EmptyStateFooter><Button variant="primary" onClick={() => navigate({ kind: 'component-create', productKey: productCode })}>Create component</Button></EmptyStateFooter></EmptyState>;

  return <>
    <div id={tableID} className="table-scroll component-register-scroll" tabIndex={0} aria-label={`${label} table; scroll horizontally to view all columns`}>
      <Table aria-label={`${label} components`} className="component-register-table">
        <caption className="sr-only">{label} components</caption>
        <Thead><Tr><Th scope="col">Name</Th><Th scope="col">Type</Th><Th scope="col">API</Th></Tr></Thead>
        <Tbody>{visible.map((component) => <ComponentInventoryRow key={component.id} component={component} productCode={productCode} navigate={navigate} />)}</Tbody>
      </Table>
    </div>
    {components.length > COMPONENT_GROUP_PREVIEW_SIZE ? <footer className="component-register-footer"><span>Showing {visible.length} of {components.length}</span><Button className="component-register-toggle" type="button" aria-expanded={expanded} aria-controls={tableID} onClick={() => onExpandedChange(!expanded)}>{expanded ? 'Show fewer' : `Show ${remaining} more`}<ChevronRight width={13} height={13} aria-hidden="true" /></Button></footer> : null}
  </>;
}

export function ComponentInventoryRow({ component, productCode, navigate }: { component: Component; productCode: string; navigate: Navigate }) {
  const name = <Td><Button variant="link" type="button" className="table-link entity-name" onClick={() => navigate({ kind: 'component', productKey: productCode, componentId: String(component.id) })}><ComponentGlyph type={component.type} /><span><strong>{component.name}</strong><small>#{component.id}</small></span></Button></Td>;
  return <Tr>
    {name}
    <Td><ComponentInventoryTypeBadge component={component} /></Td>
    <Td><ComponentAPIBadges apis={component.apis} /></Td>
  </Tr>;
}

export function ComponentInventoryTypeBadge({ component }: { component: Component }) {
  return <span>{component.type === 'infrastructure' ? systemTypeLabels[component.details.system_type] : component.type === 'backend-service' ? 'Backend' : 'Frontend'}</span>;
}

export function ComponentAPIBadges({ apis }: { apis: ComponentAPI[] }) {
  const counts = new Map<APIType, number>();
  for (const api of apis) {
    if (api.role !== 'provider') continue;
    counts.set(api.api_type, (counts.get(api.api_type) ?? 0) + 1);
  }
  const summaries = apiTypes.flatMap((option) => {
    const count = counts.get(option.value) ?? 0;
    return count ? [{ type: option.value, label: option.label, count }] : [];
  });
  if (!summaries.length) return <span className="component-api-empty">—</span>;
  return <span className="component-api-badges">{summaries.map((summary) => <span className={`component-api-badge api-${summary.type}`} key={summary.type}>{summary.label}{summary.count > 1 ? ` ×${summary.count}` : ''}</span>)}</span>;
}

export function ComponentCreatePage({ product, onClose, onCreate }: { product: Product; onClose: () => void; onCreate: (input: CreateComponentInput) => Promise<void> }) {
  const [name, setName] = useState('');
  const [type, setType] = useState<ComponentType>('backend-service');
  const [description, setDescription] = useState('');
  const [language, setLanguage] = useState('');
  const [languageVersion, setLanguageVersion] = useState('');
  const [framework, setFramework] = useState('');
  const [system, setSystem] = useState('');
  const [systemType, setSystemType] = useState<SystemType>('sql-database');
  const [version, setVersion] = useState('');
  const [networkAddresses, setNetworkAddresses] = useState<string[]>([]);
  const [apis, setAPIs] = useState<CreateComponentAPIInput[]>([]);
  const [validation, setValidation] = useState<Record<string, string>>({});
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  function clearValidation(key: string) {
    setValidation((current) => { const next = { ...current }; delete next[key]; return next; });
  }
  function addAPI() { setAPIs((current) => [...current, { name: '', api_type: 'rest', network_exposure: 'internal' }]); }
  function updateAPI(index: number, patch: Partial<CreateComponentAPIInput>) { clearValidation(`api-${index}`); setAPIs((current) => current.map((api, itemIndex) => itemIndex === index ? { ...api, ...patch } : api)); }
  function addNetworkAddress() { setNetworkAddresses((current) => current.length >= 10 ? current : [...current, '']); }
  function updateNetworkAddress(index: number, value: string) { setNetworkAddresses((current) => current.map((address, itemIndex) => itemIndex === index ? value : address)); }
  function removeNetworkAddress(index: number) { setNetworkAddresses((current) => current.filter((_, itemIndex) => itemIndex !== index)); }
  async function submit(event: FormEvent) {
    event.preventDefault();
    const errors: Record<string, string> = {};
    if (!name.trim()) errors.name = 'Component name is required';
    else if (name.trim().length > 50) errors.name = 'Component name must be 50 characters or fewer';
    if (description.length > 1000) errors.description = 'Description must be 1,000 characters or fewer';
    if (type === 'infrastructure' && !system.trim()) errors.system = 'System is required';
    if (type !== 'infrastructure' && !language.trim()) errors.language = 'Language is required';
    apis.forEach((api, index) => { if (!api.name.trim()) errors[`api-${index}`] = 'API name is required'; });
    setValidation(errors);
    if (Object.keys(errors).length) return;
    const details = type === 'infrastructure' ? { system, systemType, version, networkAddresses } : { language, languageVersion, framework };
    setSaving(true); setError('');
    try { await onCreate(buildComponentInput(product.id, { name, type, description, details }, apis)); } catch (cause) { setError(publicError(cause)); setSaving(false); }
  }
  return <section className="component-create-page"><PageHeader title="Create component" description={`Add a component to ${product.name}.`} /><Form className="modal-form inventory-component-form" onSubmit={submit} noValidate>
    <Field error={validation.name} label="Component name" help="The human-readable name used to identify this component in the product inventory." required><TextInput autoFocus value={name} maxLength={50} onChange={(event) => { setName(event.target.value); clearValidation('name'); }} /></Field>
    <Field label="Component type" help="Controls which technical details and security checks apply to this component." required><TypeSelect aria-label="Component type" value={type} options={componentTypeOptions} onChange={setType} /></Field>
    {type === 'infrastructure' ? <>
      <Field error={validation.system} label="System" help="The infrastructure technology or managed service, such as PostgreSQL or Redis." required><TextInput value={system} maxLength={50} onChange={(event) => { setSystem(event.target.value); clearValidation('system'); }} /></Field>
      <Field label="System type" help="The kind of infrastructure system represented by this component." required><Select value={systemType} onChange={(event) => setSystemType(event.target.value as SystemType)}>{systemTypes.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</Select></Field>
      <Field label="Version" help="The deployed system version, when it is known and relevant for security tracking."><TextInput value={version} maxLength={50} onChange={(event) => setVersion(event.target.value)} /></Field>
      <section className="form-field full api-editor network-address-editor" aria-labelledby="network-addresses-heading"><header className="api-editor-heading"><div><span>Connectivity</span><h3 id="network-addresses-heading">Network addresses</h3></div><Button variant="secondary" className="button secondary compact" type="button" onClick={addNetworkAddress} disabled={networkAddresses.length >= 10}><Plus width={14} height={14} />Add network address</Button></header>{networkAddresses.length ? networkAddresses.map((address, index) => <section className="api-editor-card network-address-card" key={index} role="group" aria-labelledby={`network-address-${index}`}>
        <header><h4 id={`network-address-${index}`}>Network address {index + 1}</h4><Button className="icon-button" type="button" onClick={() => removeNetworkAddress(index)} aria-label={`Remove network address ${index + 1}`}><Trash2 width={15} height={15} /></Button></header>
        <div className="network-address-fields"><Field label={`Network address ${index + 1}`} help="The hostname, URL, or internal address used to reach this infrastructure component."><TextInput value={address} maxLength={50} onChange={(event) => updateNetworkAddress(index, event.target.value)} /></Field></div>
      </section>) : <p className="api-empty">No network addresses added.</p>}<small className="network-address-count">{networkAddresses.length}/10 addresses</small></section>
    </> : <>
      <Field error={validation.language} label="Language" help="The primary programming language used to implement this component." required><TextInput value={language} maxLength={50} onChange={(event) => { setLanguage(event.target.value); clearValidation('language'); }} /></Field>
      <Field label="Language version" help="The runtime or compiler version used by the deployed component."><TextInput value={languageVersion} maxLength={50} onChange={(event) => setLanguageVersion(event.target.value)} /></Field>
      <Field label="Framework" help="The main application framework used by this component."><TextInput value={framework} maxLength={50} onChange={(event) => setFramework(event.target.value)} /></Field>
    </>}
    <Field error={validation.description} label="Description" help="A brief explanation of the component responsibility and its place in the product." full><TextArea value={description} maxLength={1000} onChange={(event) => { setDescription(event.target.value); clearValidation('description'); }} /></Field>
    <section className="form-field full api-editor" aria-labelledby="provided-apis-heading"><header className="api-editor-heading"><div><span>Interfaces</span><h3 id="provided-apis-heading">Provided APIs</h3></div><Button variant="secondary" className="button secondary compact" type="button" onClick={addAPI}><Plus width={14} height={14} />Add API</Button></header>{apis.map((api, index) => <section className="api-editor-card" key={index} role="group" aria-labelledby={`provided-api-${index}`}>
      <header><h4 id={`provided-api-${index}`}>API {index + 1}</h4><Button className="icon-button" type="button" onClick={() => setAPIs((current) => current.filter((_, itemIndex) => itemIndex !== index))} aria-label={`Remove API ${index + 1}`}><Trash2 width={15} height={15} /></Button></header>
      <div className="api-editor-fields"><Field error={validation[`api-${index}`]} label="API name" help="The name consumers use to recognize this provided interface." required><TextInput value={api.name} maxLength={50} onChange={(event) => updateAPI(index, { name: event.target.value })} /></Field>
        <Field label="API type" help="The protocol or interface style exposed by this API."><Select value={api.api_type} onChange={(event) => updateAPI(index, { api_type: event.target.value as APIType })}>{apiTypes.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</Select></Field>
        <Field label="Network exposure" help="Whether this API is reachable only inside trusted networks or from the internet."><Select value={api.network_exposure} onChange={(event) => updateAPI(index, { network_exposure: event.target.value as NetworkExposure })}><option value="internal">internal</option><option value="internet">internet</option></Select></Field>
      </div>
    </section>)}</section>
    {error ? <InlineError message={error} /> : null}
    <footer className="full"><Button variant="secondary" className="button secondary" type="button" onClick={onClose}>Cancel</Button><Button variant="primary" className="button primary" type="submit" isLoading={saving} disabled={saving}>{saving ? 'Creating…' : 'Create component'}</Button></footer>
  </Form></section>;
}

export function ComponentPage({ product, component, components, navigate, addConsumerAPI, createComponentClient, refreshComponent, notify }: { product: Product; component: Component; components: Component[]; navigate: Navigate; addConsumerAPI: (componentID: number, apiID: number) => Promise<Component>; createComponentClient: (componentID: number, input: { client_type: ComponentClient['client_type']; description?: string }) => Promise<Component>; refreshComponent: (componentID: number) => Promise<Component>; notify: (message: string) => void }) {
  const [relationshipOpen, setRelationshipOpen] = useState(false);
  const [clientCreateOpen, setClientCreateOpen] = useState(false);
  const provided = component.apis.filter((api) => api.role !== 'consumer');
  const consumed = component.apis.filter((api) => api.role === 'consumer');
  function confirmRelationship() {
    setRelationshipOpen(false);
    notify('API relationship added');
  }
  const newClientModel = component.clients !== undefined;
  return <section className="products-page">
    <Button variant="link" className="back-link" type="button" onClick={() => navigate({ kind: 'product', productKey: product.product_code })}><ChevronLeft width={14} height={14} />Back to {product.name}</Button>
    <PageHeader eyebrow={componentTypeLabels[component.type]} title={component.name} description={component.description || 'No description provided.'} actions={<Button variant="secondary" className="button secondary" type="button" onClick={() => navigate({ kind: 'component', productKey: product.product_code, componentId: String(component.id), tab: 'security' })}><ShieldCheck width={15} height={15} />Security checks</Button>} />
    <section className="component-summary-grid">
      <article className="panel component-summary-block component-description-block"><div className="block-heading">Component details</div><DescriptionList isCompact isHorizontal className="component-facts">{detailFacts(component).map(([term, value]) => <DescriptionListGroup key={term}><DescriptionListTerm>{term}</DescriptionListTerm><DescriptionListDescription>{value || '—'}</DescriptionListDescription></DescriptionListGroup>)}</DescriptionList></article>
      <article className="panel component-summary-block component-technologies-block"><div className="block-heading">Inventory identity</div><DescriptionList isCompact isHorizontal className="component-facts"><DescriptionListGroup><DescriptionListTerm>Component ID</DescriptionListTerm><DescriptionListDescription>{component.id}</DescriptionListDescription></DescriptionListGroup><DescriptionListGroup><DescriptionListTerm>Product</DescriptionListTerm><DescriptionListDescription>{product.product_code}</DescriptionListDescription></DescriptionListGroup></DescriptionList></article>
    </section>
    <div className="api-section-grid">
      <APIList title="APIs this component provides" help="Interfaces exposed by this component that other components can connect to." apis={provided} empty="This component does not provide APIs." />
      {newClientModel
        ? <ClientList clients={component.clients ?? []} onCreate={() => setClientCreateOpen(true)} />
        : <APIList title="APIs this component uses" help="Interfaces from other components that this component calls or depends on." apis={consumed} empty="This component does not consume APIs." action={<Button variant="secondary" className="button secondary compact" type="button" onClick={() => setRelationshipOpen(true)}><Network width={14} height={14} />Add API relationship</Button>} />}
    </div>
    {clientCreateOpen ? <ComponentClientCreateDialog component={component} onClose={() => setClientCreateOpen(false)} onCreated={async (input) => {
      await createComponentClient(component.id, input);
      setClientCreateOpen(false);
      notify('Component client created');
    }} /> : null}
    {!newClientModel && relationshipOpen ? <RelationshipDialog component={component} candidates={relationshipCandidates(component, components)} onClose={() => setRelationshipOpen(false)} onConfirmed={confirmRelationship} onAdd={async (apiID) => {
      await addConsumerAPI(component.id, apiID);
      confirmRelationship();
    }} refreshComponent={refreshComponent} /> : null}
  </section>;
}

export function ClientList({ clients, onCreate }: { clients: ComponentClient[]; onCreate: () => void }) {
  return <section className="panel api-panel client-panel"><header className="panel-heading"><div><div className="api-panel-title"><h2>Component clients</h2><FieldLabel label="Component clients" help="Client interfaces this component uses to connect to APIs." /></div><p>{clients.length} {clients.length === 1 ? 'client' : 'clients'}</p></div><Button variant="secondary" className="button secondary compact" type="button" onClick={onCreate}><Plus width={14} height={14} />Create component client</Button></header>{clients.length ? <div className="api-list">{clients.map((client) => <article key={client.id}><div><strong>{componentClientTypes.find((option) => option.value === client.client_type)?.label ?? client.client_type}</strong><small>#{client.id}</small></div><span>{client.api_id ? `API #${client.api_id}` : 'Unbound'}</span></article>)}</div> : <p className="api-empty">This component does not have clients yet.</p>}</section>;
}

export function ComponentClientCreateDialog({ component, onClose, onCreated }: { component: Component; onClose: () => void; onCreated: (input: { client_type: ComponentClient['client_type']; description?: string }) => Promise<void> }) {
  const [clientType, setClientType] = useState<ComponentClient['client_type']>('rest-client');
  const [description, setDescription] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  async function submit(event: FormEvent) {
    event.preventDefault();
    setSaving(true); setError('');
    try { await onCreated({ client_type: clientType, ...(optional(description) ? { description: optional(description) } : {}) }); }
    catch (cause) { setError(publicError(cause)); setSaving(false); }
  }
  return <InventoryDialog title="Create component client" eyebrow={component.name} onClose={onClose}><Form className="modal-form single" onSubmit={submit} noValidate>
    <Field label="Client type" help="The protocol or messaging client this component uses." required><Select value={clientType} onChange={(event) => setClientType(event.target.value as ComponentClient['client_type'])}>{componentClientTypes.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</Select></Field>
    <Field label="Description" help="A short description of what this client connects to."><TextArea className="resize-none" value={description} maxLength={1000} onChange={(event) => setDescription(event.target.value)} /></Field>
    {error ? <InlineError message={error} /> : null}
    <footer><Button variant="secondary" className="button secondary" type="button" onClick={onClose}>Cancel</Button><Button variant="primary" className="button primary" type="submit" isLoading={saving} disabled={saving}>{saving ? 'Creating…' : 'Create client'}</Button></footer>
  </Form></InventoryDialog>;
}

export function RelationshipDialog({ component, candidates, onClose, onConfirmed, onAdd, refreshComponent }: { component: Component; candidates: RelationshipCandidate[]; onClose: () => void; onConfirmed: () => void; onAdd: (apiID: number) => Promise<void>; refreshComponent: (componentID: number) => Promise<Component> }) {
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
  return <InventoryDialog title="Add API relationship" eyebrow={component.name} onClose={onClose}><Form className="modal-form single" onSubmit={submit} noValidate>
    {candidates.length ? <Field label="Provider API" help="The API this component consumes from another component in the active product." required full><Select value={apiID} onChange={(event) => setAPIID(Number(event.target.value))}>{candidates.map(({ component: provider, api }) => <option key={api.id} value={api.id}>{provider.name} — {api.name} ({apiTypeLabels[api.api_type]})</option>)}</Select></Field> : <div className="inventory-no-results"><strong>No available provider APIs</strong><p>Other components must provide an API before a relationship can be added.</p></div>}
    {error ? <InlineError message={error} /> : null}
    <footer><Button variant="secondary" className="button secondary" type="button" onClick={onClose}>Cancel</Button><Button variant="primary" className="button primary" type="submit" disabled={saving || candidates.length === 0}>{saving ? 'Adding…' : 'Add relationship'}</Button></footer>
  </Form></InventoryDialog>;
}

export function APIList({ title, help, apis, empty, action }: { title: string; help: string; apis: ComponentAPI[]; empty: string; action?: ReactNode }) {
  return <section className="panel api-panel"><header className="panel-heading"><div><div className="api-panel-title"><h2>{title}</h2><FieldLabel label={title} help={help} /></div><p>{apis.length} {apis.length === 1 ? 'API' : 'APIs'}</p></div>{action}</header>{apis.length ? <div className="api-list">{apis.map((api) => <article key={`${api.role}-${api.id}`}><div><strong>{api.name}</strong><small>#{api.id}</small></div><span>{apiTypeLabels[api.api_type]}</span><NetworkExposureLabel value={api.network_exposure} /></article>)}</div> : <p className="api-empty">{empty}</p>}</section>;
}

export function ComponentGlyph({ type }: { type: ComponentType }) {
  return <span className={`component-list-avatar ${type}`} aria-hidden="true">{type === 'infrastructure' ? <Boxes width={16} height={16} /> : <Server width={16} height={16} />}</span>;
}

export function detailFacts(component: Component): Array<[string, string | number]> {
  if (component.type === 'infrastructure') return [['System', component.details.system], ['System type', systemTypeLabels[component.details.system_type]], ['Version', component.details.version], ['Network addresses', component.details.network_address.join(', ')]];
  const facts: Array<[string, string]> = [['Language', component.details.language], ['Language version', component.details.language_version], ['Framework', component.details.framework]];
  return facts;
}
