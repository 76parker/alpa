import {
  Boxes,
  ChevronLeft,
  ChevronRight,
  Plus,
  Server,
  ShieldCheck,
  Trash2,
} from "../../src/ui/icons";
import {
  useId,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import {
  apiTypes,
  apiTypeLabels,
  componentClientNameLabels,
  componentClientNames,
  componentTypeLabels,
  clientRoleLabels,
  communicationTypeLabels,
  systemTypes,
  systemTypeLabels,
  type APIType,
  type ClientRole,
  type CommunicationType,
  type Component,
  type ComponentAPI,
  type ComponentClient,
  type ComponentClientName,
  type ComponentType,
  type CreateAPIInput,
  type CreateClientInput,
  type NetworkExposure,
  type Product,
  type SystemType,
} from "../../lib/inventory/contracts";
import { FieldLabel } from "../field-label";
import { InventoryDialog } from "./inventory-dialog";
import {
  ArchitectureDraftPreview,
  ArchitecturePreview,
} from "./architecture-map";
import {
  DescriptionList,
  DescriptionListDescription,
  DescriptionListGroup,
  DescriptionListTerm,
  EmptyState,
  EmptyStateBody,
  EmptyStateFooter,
  Badge,
  Button,
  Form,
  NetworkExposureLabel,
  Select,
  Table,
  Tbody,
  Td,
  TextArea,
  TextInput,
  Th,
  Thead,
  Tr,
  TypeSelect,
  type TypeSelectOption,
} from "../../src/ui";
import { PageHeader, Field, InlineError, publicError } from "./shared";
import {
  buildComponentInput,
  createComponentDraft,
  optional,
  type ComponentDraft,
  type DraftAPI,
  type DraftClient,
  type Navigate,
  validClientOptions,
} from "./component-input";
import { toDraftGraphComponent } from "../../lib/inventory/graph-model";

export const COMPONENT_GROUP_PREVIEW_SIZE = 5;
export type ComponentInventoryCategory = "services" | "infrastructure";
export type ComponentInventoryView =
  ComponentInventoryCategory | "architecture";
export const componentInventoryCategories = [
  { value: "services", label: "Services" },
  { value: "infrastructure", label: "Infrastructure" },
] as const satisfies ReadonlyArray<{
  value: ComponentInventoryCategory;
  label: string;
}>;

export function ComponentInventoryViewControl({
  components,
  activeView,
  onChange,
}: {
  components: Component[];
  activeView: ComponentInventoryView;
  onChange: (view: ComponentInventoryView) => void;
}) {
  const options: Array<{
    value: ComponentInventoryView;
    label: string;
    count: number;
  }> = [
    {
      value: "services",
      label: "Services",
      count: components.filter(
        (component) => componentInventoryCategory(component) === "services",
      ).length,
    },
    {
      value: "infrastructure",
      label: "Infrastructure",
      count: components.filter(
        (component) =>
          componentInventoryCategory(component) === "infrastructure",
      ).length,
    },
    { value: "architecture", label: "Architecture", count: components.length },
  ];
  return (
    <div
      className="component-view-control"
      role="group"
      aria-label="Component views"
    >
      {options.map((option) => (
        <Button
          key={option.value}
          variant="plain"
          className={`component-view-option ${activeView === option.value ? "is-active" : ""}`}
          aria-label={`${option.label} ${option.count}`}
          aria-pressed={activeView === option.value}
          onClick={() => onChange(option.value)}
        >
          <span>{option.label}</span>
          <Badge isRead>{option.count}</Badge>
        </Button>
      ))}
    </div>
  );
}

export function ComponentInventoryToolbar({
  components,
  activeView,
  onChange,
  onCreate,
}: {
  components: Component[];
  activeView: ComponentInventoryView;
  onChange: (view: ComponentInventoryView) => void;
  onCreate?: () => void;
}) {
  return (
    <header className="component-register-toolbar">
      <ComponentInventoryViewControl
        components={components}
        activeView={activeView}
        onChange={onChange}
      />
      {onCreate ? (
        <Button variant="primary" onClick={onCreate} icon={<Plus />}>
          Create component
        </Button>
      ) : null}
    </header>
  );
}

export function ComponentInventoryTabs({
  components,
  productCode,
  navigate,
  onArchitecture,
  onCreate,
}: {
  components: Component[];
  productCode: string;
  navigate: Navigate;
  onArchitecture: () => void;
  onCreate?: () => void;
}) {
  const [activeCategory, setActiveCategory] =
    useState<ComponentInventoryCategory>("services");
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  return (
    <section className="component-register">
      <ComponentInventoryToolbar
        components={components}
        activeView={activeCategory}
        onChange={(view) =>
          view === "architecture" ? onArchitecture() : setActiveCategory(view)
        }
        onCreate={onCreate}
      />
      {componentInventoryCategories.map((category) =>
        activeCategory !== category.value ? null : (
          <section
            key={category.value}
            className="component-register-content"
            role="region"
            aria-label={`${category.label} components`}
          >
            <ComponentInventoryTable
              label={category.label}
              components={components.filter(
                (component) =>
                  componentInventoryCategory(component) === category.value,
              )}
              productCode={productCode}
              navigate={navigate}
              expanded={Boolean(expanded[category.value])}
              onExpandedChange={(value) =>
                setExpanded((current) => ({
                  ...current,
                  [category.value]: value,
                }))
              }
            />
          </section>
        ),
      )}
    </section>
  );
}

export function componentInventoryCategory(
  component: Component,
): ComponentInventoryCategory {
  return component.type === "infrastructure" ? "infrastructure" : "services";
}

const componentTypeOptions: readonly TypeSelectOption<ComponentType>[] = [
  {
    value: "backend-service",
    label: "Backend service",
    description: "Server-side application or API",
    icon: <Server width={16} height={16} />,
  },
  {
    value: "frontend-service",
    label: "Frontend service",
    description: "Browser or user-facing application",
    icon: <Boxes width={16} height={16} />,
  },
  {
    value: "infrastructure",
    label: "Infrastructure",
    description: "Database, queue, or managed platform",
    icon: <Boxes width={16} height={16} />,
  },
];

export function ComponentInventoryTable({
  label,
  components,
  productCode,
  navigate,
  expanded,
  onExpandedChange,
}: {
  label: string;
  components: Component[];
  productCode: string;
  navigate: Navigate;
  expanded: boolean;
  onExpandedChange: (value: boolean) => void;
}) {
  const tableID = useId();
  const visible = expanded
    ? components
    : components.slice(0, COMPONENT_GROUP_PREVIEW_SIZE);
  const remaining = components.length - visible.length;
  if (!components.length)
    return (
      <EmptyState
        titleText={`No ${label.toLocaleLowerCase()} yet`}
        headingLevel="h3"
        icon={Boxes}
        variant="sm"
      >
        <EmptyStateBody>
          Create a component to populate this register.
        </EmptyStateBody>
        <EmptyStateFooter>
          <Button
            variant="primary"
            onClick={() =>
              navigate({ kind: "component-create", productKey: productCode })
            }
          >
            Create component
          </Button>
        </EmptyStateFooter>
      </EmptyState>
    );
  return (
    <>
      <div
        id={tableID}
        className="table-scroll component-register-scroll"
        tabIndex={0}
        aria-label={`${label} table; scroll horizontally to view all columns`}
      >
        <Table
          aria-label={`${label} components`}
          className="component-register-table"
        >
          <caption className="sr-only">{label} components</caption>
          <Thead>
            <Tr>
              <Th scope="col">Name</Th>
              <Th scope="col">Type</Th>
              <Th scope="col">API</Th>
            </Tr>
          </Thead>
          <Tbody>
            {visible.map((component) => (
              <ComponentInventoryRow
                key={component.id}
                component={component}
                productCode={productCode}
                navigate={navigate}
              />
            ))}
          </Tbody>
        </Table>
      </div>
      {components.length > COMPONENT_GROUP_PREVIEW_SIZE ? (
        <footer className="component-register-footer">
          <span>
            Showing {visible.length} of {components.length}
          </span>
          <Button
            className="component-register-toggle"
            type="button"
            aria-expanded={expanded}
            aria-controls={tableID}
            onClick={() => onExpandedChange(!expanded)}
          >
            {expanded ? "Show fewer" : `Show ${remaining} more`}
            <ChevronRight width={13} height={13} />
          </Button>
        </footer>
      ) : null}
    </>
  );
}

function ComponentInventoryRow({
  component,
  productCode,
  navigate,
}: {
  component: Component;
  productCode: string;
  navigate: Navigate;
}) {
  return (
    <Tr>
      <Td>
        <Button
          variant="link"
          type="button"
          className="table-link entity-name"
          onClick={() =>
            navigate({
              kind: "component",
              productKey: productCode,
              componentId: String(component.id),
            })
          }
        >
          <ComponentGlyph type={component.type} />
          <span>
            <strong>{component.name}</strong>
            <small>#{component.id}</small>
          </span>
        </Button>
      </Td>
      <Td>
        <ComponentInventoryTypeBadge component={component} />
      </Td>
      <Td>
        <ComponentAPIBadges apis={component.apis} />
      </Td>
    </Tr>
  );
}
export function ComponentInventoryTypeBadge({
  component,
}: {
  component: Component;
}) {
  return (
    <span>
      {component.type === "infrastructure"
        ? systemTypeLabels[component.details.system_type]
        : component.type === "backend-service"
          ? "Backend"
          : "Frontend"}
    </span>
  );
}
export function ComponentAPIBadges({ apis }: { apis: ComponentAPI[] }) {
  if (!apis.length) return <span className="component-api-empty">—</span>;
  const counts = new Map<APIType, number>();
  for (const api of apis)
    counts.set(api.api_type, (counts.get(api.api_type) ?? 0) + 1);
  return (
    <span className="component-api-badges">
      {apiTypes.flatMap((option) => {
        const count = counts.get(option.value) ?? 0;
        return count
          ? [
              <span
                className={`component-api-badge api-${option.value}`}
                key={option.value}
              >
                {option.label}
                {count > 1 ? ` ×${count}` : ""}
              </span>,
            ]
          : [];
      })}
    </span>
  );
}

export function ComponentCreatePage({
  product,
  onClose,
  onCreate,
}: {
  product: Product;
  onClose: () => void;
  onCreate: (input: ReturnType<typeof buildComponentInput>) => Promise<void>;
}) {
  const [name, setName] = useState("");
  const [type, setType] = useState<ComponentType>("backend-service");
  const [description, setDescription] = useState("");
  const [language, setLanguage] = useState("");
  const [languageVersion, setLanguageVersion] = useState("");
  const [framework, setFramework] = useState("");
  const [system, setSystem] = useState("");
  const [systemType, setSystemType] = useState<SystemType>("sql-database");
  const [version, setVersion] = useState("");
  const [networkAddresses, setNetworkAddresses] = useState<string[]>([]);
  const [apis, setAPIs] = useState<DraftAPI[]>([]);
  const [clients, setClients] = useState<DraftClient[]>([]);
  const [validation, setValidation] = useState<Record<string, string>>({});
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const key = useRef(0);
  const draft = useMemo(
    () =>
      createComponentDraft({
        name,
        type,
        description,
        details: (type === "infrastructure"
          ? { system, systemType, version, networkAddresses }
          : {
              language,
              languageVersion,
              framework,
            }) as ComponentDraft["details"],
        apis,
        clients,
      }),
    [
      apis,
      clients,
      description,
      framework,
      language,
      languageVersion,
      name,
      networkAddresses,
      system,
      systemType,
      type,
      version,
    ],
  );
  const clear = (field: string) =>
    setValidation((current) => {
      const next = { ...current };
      delete next[field];
      return next;
    });
  const addAPI = () =>
    setAPIs((current) => [
      ...current,
      {
        key: `api-${key.current++}`,
        name: "",
        api_type: "rest",
        network_exposure: "internal",
      },
    ]);
  const addClient = () =>
    setClients((current) => [
      ...current,
      {
        key: `client-${key.current++}`,
        client_name: "rest-client",
        role: "caller",
        communication_type: "request-response",
      },
    ]);
  const addNetworkAddress = () =>
    setNetworkAddresses((current) =>
      current.length < 10 ? [...current, ""] : current,
    );
  const updateNetworkAddress = (index: number, value: string) =>
    setNetworkAddresses((current) =>
      current.map((address, item) => (item === index ? value : address)),
    );
  const removeNetworkAddress = (index: number) =>
    setNetworkAddresses((current) =>
      current.filter((_, item) => item !== index),
    );
  const updateAPI = (index: number, patch: Partial<CreateAPIInput>) =>
    setAPIs((current) =>
      current.map((api, item) => (item === index ? { ...api, ...patch } : api)),
    );
  const updateClient = (index: number, patch: Partial<CreateClientInput>) =>
    setClients((current) =>
      current.map((client, item) =>
        item === index ? { ...client, ...patch } : client,
      ),
    );
  async function submit(event: FormEvent) {
    event.preventDefault();
    const errors: Record<string, string> = {};
    if (!name.trim()) errors.name = "Component name is required";
    if (type === "infrastructure" && !system.trim())
      errors.system = "System is required";
    if (type !== "infrastructure" && !language.trim())
      errors.language = "Language is required";
    apis.forEach((api, index) => {
      if (!api.name.trim()) errors[`api-${index}`] = "API name is required";
    });
    setValidation(errors);
    if (Object.keys(errors).length) return;
    setSaving(true);
    setError("");
    try {
      await onCreate(buildComponentInput(product.id, draft));
    } catch (cause) {
      setError(publicError(cause));
      setSaving(false);
    }
  }
  return (
    <section className="component-create-page">
      <PageHeader
        title="Create component"
        description={`Add a component to ${product.name}.`}
      />
      <div className="component-create-layout">
        <Form
          className="modal-form inventory-component-form"
          onSubmit={submit}
          noValidate
        >
          <Field
            className="component-create-left-field"
            error={validation.name}
            label="Component name"
            required
          >
            <TextInput
              autoFocus
              value={name}
              maxLength={50}
              onChange={(event) => {
                setName(event.target.value);
                clear("name");
              }}
            />
          </Field>
          <Field label="Component type" required>
            <TypeSelect
              aria-label="Component type"
              value={type}
              options={componentTypeOptions}
              onChange={setType}
            />
          </Field>
          {type === "infrastructure" ? (
            <>
              <Field error={validation.system} label="System" required>
                <TextInput
                  value={system}
                  maxLength={50}
                  onChange={(event) => {
                    setSystem(event.target.value);
                    clear("system");
                  }}
                />
              </Field>
              <Field label="System type" required>
                <Select
                  value={systemType}
                  onChange={(event) =>
                    setSystemType(event.target.value as SystemType)
                  }
                >
                  {systemTypes.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Version">
                <TextInput
                  value={version}
                  maxLength={50}
                  onChange={(event) => setVersion(event.target.value)}
                />
              </Field>
              <section
                className="api-editor network-address-editor full"
                aria-labelledby="network-addresses-heading"
              >
                <header className="api-editor-heading">
                  <div>
                    <h2 id="network-addresses-heading">Network addresses</h2>
                    <p>Add the endpoints used to reach this system.</p>
                  </div>
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={addNetworkAddress}
                    disabled={networkAddresses.length >= 10}
                    icon={<Plus width={14} height={14} />}
                  >
                    Add address
                  </Button>
                </header>
                {networkAddresses.length ? (
                  networkAddresses.map((address, index) => (
                    <section className="api-editor-card" key={index}>
                      <header>
                        <h3>Address {index + 1}</h3>
                        <Button
                          type="button"
                          variant="plain"
                          aria-label={`Remove network address ${index + 1}`}
                          onClick={() => removeNetworkAddress(index)}
                        >
                          <Trash2 width={16} height={16} />
                        </Button>
                      </header>
                      <div className="network-address-fields">
                        <Field label={`Network address ${index + 1}`}>
                          <TextInput
                            value={address}
                            maxLength={200}
                            onChange={(event) =>
                              updateNetworkAddress(index, event.target.value)
                            }
                          />
                        </Field>
                      </div>
                    </section>
                  ))
                ) : (
                  <p className="api-empty">No network addresses added.</p>
                )}
                <small className="network-address-count">
                  {networkAddresses.length}/10 addresses
                </small>
              </section>
            </>
          ) : (
            <>
              <Field
                className="component-create-left-field"
                error={validation.language}
                label="Language"
                required
              >
                <TextInput
                  value={language}
                  maxLength={50}
                  onChange={(event) => {
                    setLanguage(event.target.value);
                    clear("language");
                  }}
                />
              </Field>
              <Field label="Language version">
                <TextInput
                  value={languageVersion}
                  maxLength={50}
                  onChange={(event) => setLanguageVersion(event.target.value)}
                />
              </Field>
              <Field className="component-create-left-field" label="Framework">
                <TextInput
                  value={framework}
                  maxLength={50}
                  onChange={(event) => setFramework(event.target.value)}
                />
              </Field>
            </>
          )}
          <Field className="component-create-left-field" label="Description" full>
            <TextArea
              value={description}
              maxLength={1000}
              onChange={(event) => setDescription(event.target.value)}
            />
          </Field>
          <ChildAPIEditor
            apis={apis}
            validation={validation}
            onAdd={addAPI}
            onChange={updateAPI}
            onRemove={(index) =>
              setAPIs((current) => current.filter((_, item) => item !== index))
            }
          />
          <ChildClientEditor
            clients={clients}
            onAdd={addClient}
            onChange={updateClient}
            onRemove={(index) =>
              setClients((current) =>
                current.filter((_, item) => item !== index),
              )
            }
          />
          {error ? <InlineError message={error} /> : null}
          <footer className="full">
            <Button variant="secondary" type="button" onClick={onClose}>
              Cancel
            </Button>
            <Button
              variant="primary"
              type="submit"
              isLoading={saving}
              disabled={saving}
            >
              {saving ? "Creating…" : "Create component"}
            </Button>
          </footer>
        </Form>
        <aside className="component-create-preview">
          <ArchitectureDraftPreview component={toDraftGraphComponent(draft)} />
        </aside>
      </div>
    </section>
  );
}

function ChildAPIEditor({
  apis,
  validation,
  onAdd,
  onChange,
  onRemove,
}: {
  apis: DraftAPI[];
  validation: Record<string, string>;
  onAdd: () => void;
  onChange: (index: number, patch: Partial<CreateAPIInput>) => void;
  onRemove: (index: number) => void;
}) {
  return (
    <section className="form-field full api-editor" aria-label="Provided APIs">
      <header className="api-editor-heading">
        <h3>Provided APIs</h3>
        <Button
          variant="secondary"
          type="button"
          onClick={onAdd}
          disabled={apis.length >= 5}
        >
          <Plus width={14} height={14} />
          Add API
        </Button>
      </header>
      {apis.map((api, index) => (
        <section className="api-editor-card" key={api.key}>
          <header>
            <h4>API {index + 1}</h4>
            <Button
              type="button"
              aria-label={`Remove API ${index + 1}`}
              onClick={() => onRemove(index)}
            >
              <Trash2 width={15} height={15} />
            </Button>
          </header>
          <div className="api-editor-fields">
            <Field error={validation[`api-${index}`]} label="API name" required>
              <TextInput
                value={api.name}
                onChange={(event) =>
                  onChange(index, { name: event.target.value })
                }
              />
            </Field>
            <Field label="API type">
              <Select
                value={api.api_type}
                onChange={(event) =>
                  onChange(index, { api_type: event.target.value as APIType })
                }
              >
                {apiTypes.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Network exposure">
              <Select
                value={api.network_exposure}
                onChange={(event) =>
                  onChange(index, {
                    network_exposure: event.target.value as NetworkExposure,
                  })
                }
              >
                <option value="internal">internal</option>
                <option value="internet">internet</option>
              </Select>
            </Field>
          </div>
        </section>
      ))}
    </section>
  );
}

function ChildClientEditor({
  clients,
  onAdd,
  onChange,
  onRemove,
}: {
  clients: DraftClient[];
  onAdd: () => void;
  onChange: (index: number, patch: Partial<CreateClientInput>) => void;
  onRemove: (index: number) => void;
}) {
  return (
    <section
      className="form-field full api-editor"
      aria-label="Component clients"
    >
      <header className="api-editor-heading">
        <h3>Component clients</h3>
        <Button
          variant="secondary"
          type="button"
          onClick={onAdd}
          disabled={clients.length >= 5}
        >
          <Plus width={14} height={14} />
          Add client
        </Button>
      </header>
      {clients.map((client, index) => {
        const options = validClientOptions(client.client_name);
        return (
          <section className="api-editor-card" key={client.key}>
            <header>
              <h4>Client {index + 1}</h4>
              <Button
                type="button"
                aria-label={`Remove client ${index + 1}`}
                onClick={() => onRemove(index)}
              >
                <Trash2 width={15} height={15} />
              </Button>
            </header>
            <div className="api-editor-fields">
              <Field label="Client name">
                <Select
                  value={client.client_name}
                  onChange={(event) => {
                    const name = event.target.value as ComponentClientName;
                    const next = validClientOptions(name);
                    onChange(index, {
                      client_name: name,
                      role: next.roles[0],
                      communication_type: next.communicationTypes[0],
                    });
                  }}
                >
                  {componentClientNames.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Role">
                <Select
                  value={client.role}
                  onChange={(event) =>
                    onChange(index, { role: event.target.value as ClientRole })
                  }
                >
                  {options.roles.map((role) => (
                    <option key={role} value={role}>
                      {role}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Communication type">
                <Select
                  value={client.communication_type}
                  onChange={(event) =>
                    onChange(index, {
                      communication_type: event.target
                        .value as CommunicationType,
                    })
                  }
                >
                  {options.communicationTypes.map((communication) => (
                    <option key={communication} value={communication}>
                      {communication}
                    </option>
                  ))}
                </Select>
              </Field>
            </div>
            <Field label="Description">
              <TextArea
                value={client.description ?? ""}
                onChange={(event) =>
                  onChange(index, { description: event.target.value })
                }
              />
            </Field>
          </section>
        );
      })}
    </section>
  );
}

export function ComponentPage({
  product,
  component,
  components,
  navigate,
  createComponentAPI,
  createComponentClient,
  bindComponentClient,
  notify,
}: {
  product: Product;
  component: Component;
  components: Component[];
  navigate: Navigate;
  createComponentAPI: (
    componentID: number,
    input: CreateAPIInput,
  ) => Promise<Component>;
  createComponentClient: (
    componentID: number,
    input: CreateClientInput,
  ) => Promise<Component>;
  bindComponentClient: (
    componentID: number,
    clientID: number,
    apiID: number,
  ) => Promise<Component>;
  notify: (message: string) => void;
}) {
  const [apiOpen, setAPIOpen] = useState(false);
  const [clientOpen, setClientOpen] = useState(false);
  const [bindingClient, setBindingClient] = useState<ComponentClient | null>(
    null,
  );
  return (
    <section className="products-page">
      <Button
        variant="link"
        className="back-link"
        type="button"
        onClick={() =>
          navigate({ kind: "product", productKey: product.product_code })
        }
      >
        <ChevronLeft width={14} height={14} />
        Back to {product.name}
      </Button>
      <PageHeader
        eyebrow={componentTypeLabels[component.type]}
        title={component.name}
        description={component.description || "No description provided."}
        actions={
          <Button
            variant="secondary"
            type="button"
            onClick={() =>
              navigate({
                kind: "component",
                productKey: product.product_code,
                componentId: String(component.id),
                tab: "security",
              })
            }
          >
            <ShieldCheck width={15} height={15} />
            Security checks
          </Button>
        }
      />
      <ArchitecturePreview
        component={component}
        label={`${component.name} visual model`}
      />
      <section className="component-summary-grid">
        <article className="panel component-summary-block">
          <div className="block-heading">Component details</div>
          <DescriptionList isCompact isHorizontal className="component-facts">
            {detailFacts(component).map(([term, value]) => (
              <DescriptionListGroup key={term}>
                <DescriptionListTerm>{term}</DescriptionListTerm>
                <DescriptionListDescription>
                  {value || "—"}
                </DescriptionListDescription>
              </DescriptionListGroup>
            ))}
          </DescriptionList>
        </article>
      </section>
      <div className="api-section-grid">
        <APIList
          title="Component APIs"
          help="Interfaces exposed by this component."
          apis={component.apis}
          empty="This component does not provide APIs."
          action={
            <Button
              variant="secondary"
              type="button"
              onClick={() => setAPIOpen(true)}
            >
              <Plus width={14} height={14} />
              Create API
            </Button>
          }
        />
        <ClientList
          clients={component.clients}
          onCreate={() => setClientOpen(true)}
          onBind={setBindingClient}
        />
      </div>
      {apiOpen ? (
        <APICreateDialog
          component={component}
          onClose={() => setAPIOpen(false)}
          onCreated={async (input) => {
            await createComponentAPI(component.id, input);
            setAPIOpen(false);
            notify("Component API created");
          }}
        />
      ) : null}
      {clientOpen ? (
        <ComponentClientCreateDialog
          component={component}
          onClose={() => setClientOpen(false)}
          onCreated={async (input) => {
            await createComponentClient(component.id, input);
            setClientOpen(false);
            notify("Component client created");
          }}
        />
      ) : null}
      {bindingClient ? (
        <ClientBindingDialog
          component={component}
          components={components}
          onClose={() => setBindingClient(null)}
          onBound={async (apiID) => {
            await bindComponentClient(component.id, bindingClient.id, apiID);
            setBindingClient(null);
            notify("Client bound to API");
          }}
        />
      ) : null}
    </section>
  );
}

function APIList({
  title,
  help,
  apis,
  empty,
  action,
}: {
  title: string;
  help: string;
  apis: ComponentAPI[];
  empty: string;
  action?: ReactNode;
}) {
  return (
    <section className="panel api-panel">
      <header className="panel-heading">
        <div>
          <div className="api-panel-title">
            <h2>{title}</h2>
            <FieldLabel label={title} help={help} />
          </div>
          <p>{apis.length} APIs</p>
        </div>
        {action}
      </header>
      {apis.length ? (
        <div className="api-list">
          {apis.map((api) => (
            <article key={api.id}>
              <div>
                <strong>{api.name}</strong>
                <small>#{api.id}</small>
              </div>
              <span>{apiTypeLabels[api.api_type]}</span>
              <NetworkExposureLabel value={api.network_exposure} />
            </article>
          ))}
        </div>
      ) : (
        <p className="api-empty">{empty}</p>
      )}
    </section>
  );
}
function ClientList({
  clients,
  onCreate,
  onBind,
}: {
  clients: ComponentClient[];
  onCreate: () => void;
  onBind: (client: ComponentClient) => void;
}) {
  return (
    <section className="panel api-panel client-panel">
      <header className="panel-heading">
        <div>
          <div className="api-panel-title">
            <h2>Component clients</h2>
            <FieldLabel
              label="Component clients"
              help="Client interfaces this component uses."
            />
          </div>
          <p>{clients.length} clients</p>
        </div>
        <Button variant="secondary" type="button" onClick={onCreate}>
          <Plus width={14} height={14} />
          Create client
        </Button>
      </header>
      {clients.length ? (
        <div className="api-list">
          {clients.map((client) => (
            <article key={client.id}>
              <div>
                <strong>{componentClientNameLabels[client.client_name]}</strong>
                <small>
                  #{client.id} · {clientRoleLabels[client.role]} ·{" "}
                  {communicationTypeLabels[client.communication_type]}
                </small>
                {client.description ? (
                  <span className="client-list-description">
                    {client.description}
                  </span>
                ) : null}
              </div>
              <span>
                {client.api_id ? (
                  `API #${client.api_id}`
                ) : (
                  <Button
                    variant="link"
                    type="button"
                    onClick={() => onBind(client)}
                  >
                    Bind client
                  </Button>
                )}
              </span>
            </article>
          ))}
        </div>
      ) : (
        <p className="api-empty">This component does not have clients yet.</p>
      )}
    </section>
  );
}
function APICreateDialog({
  component,
  onClose,
  onCreated,
}: {
  component: Component;
  onClose: () => void;
  onCreated: (input: CreateAPIInput) => Promise<void>;
}) {
  const [name, setName] = useState("");
  const [type, setType] = useState<APIType>("rest");
  const [exposure, setExposure] = useState<NetworkExposure>("internal");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  async function submit(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      await onCreated({
        name: name.trim(),
        api_type: type,
        network_exposure: exposure,
      });
    } catch (cause) {
      setError(publicError(cause));
      setSaving(false);
    }
  }
  return (
    <InventoryDialog
      title="Create API"
      eyebrow={component.name}
      onClose={onClose}
    >
      <Form className="modal-form single" onSubmit={submit}>
        <Field label="API name" required>
          <TextInput
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
        </Field>
        <Field label="API type">
          <Select
            value={type}
            onChange={(event) => setType(event.target.value as APIType)}
          >
            {apiTypes.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Network exposure">
          <Select
            value={exposure}
            onChange={(event) =>
              setExposure(event.target.value as NetworkExposure)
            }
          >
            <option value="internal">internal</option>
            <option value="internet">internet</option>
          </Select>
        </Field>
        {error ? <InlineError message={error} /> : null}
        <footer>
          <Button variant="secondary" type="button" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="primary"
            type="submit"
            disabled={saving || !name.trim()}
          >
            {saving ? "Creating…" : "Create API"}
          </Button>
        </footer>
      </Form>
    </InventoryDialog>
  );
}
function ComponentClientCreateDialog({
  component,
  onClose,
  onCreated,
}: {
  component: Component;
  onClose: () => void;
  onCreated: (input: CreateClientInput) => Promise<void>;
}) {
  const [name, setName] = useState<ComponentClientName>("rest-client");
  const allowed = validClientOptions(name);
  const [role, setRole] = useState<ClientRole>("caller");
  const [communication, setCommunication] =
    useState<CommunicationType>("request-response");
  const [description, setDescription] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  function selectName(next: ComponentClientName) {
    const choices = validClientOptions(next);
    setName(next);
    setRole(choices.roles[0]);
    setCommunication(choices.communicationTypes[0]);
  }
  async function submit(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      await onCreated({
        client_name: name,
        role,
        communication_type: communication,
        ...(optional(description)
          ? { description: optional(description) }
          : {}),
      });
    } catch (cause) {
      setError(publicError(cause));
      setSaving(false);
    }
  }
  return (
    <InventoryDialog
      title="Create component client"
      eyebrow={component.name}
      onClose={onClose}
    >
      <Form className="modal-form single" onSubmit={submit}>
        <Field label="Client name">
          <Select
            value={name}
            onChange={(event) =>
              selectName(event.target.value as ComponentClientName)
            }
          >
            {componentClientNames.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Role">
          <Select
            value={role}
            onChange={(event) => setRole(event.target.value as ClientRole)}
          >
            {allowed.roles.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Communication type">
          <Select
            value={communication}
            onChange={(event) =>
              setCommunication(event.target.value as CommunicationType)
            }
          >
            {allowed.communicationTypes.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Description">
          <TextArea
            value={description}
            onChange={(event) => setDescription(event.target.value)}
          />
        </Field>
        {error ? <InlineError message={error} /> : null}
        <footer>
          <Button variant="secondary" type="button" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" type="submit" disabled={saving}>
            {saving ? "Creating…" : "Create client"}
          </Button>
        </footer>
      </Form>
    </InventoryDialog>
  );
}
function ClientBindingDialog({
  component,
  components,
  onClose,
  onBound,
}: {
  component: Component;
  components: Component[];
  onClose: () => void;
  onBound: (apiID: number) => Promise<void>;
}) {
  const candidates = components.flatMap((item) =>
    item.id === component.id
      ? []
      : item.apis.map((api) => ({ component: item, api })),
  );
  const [apiID, setAPIID] = useState(candidates[0]?.api.id ?? 0);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!apiID) return setError("Choose an API");
    setSaving(true);
    setError("");
    try {
      await onBound(apiID);
    } catch (cause) {
      setError(publicError(cause));
      setSaving(false);
    }
  }
  return (
    <InventoryDialog
      title="Bind client"
      eyebrow={component.name}
      onClose={onClose}
    >
      <Form className="modal-form single" onSubmit={submit}>
        {candidates.length ? (
          <Field label="Provider API">
            <Select
              value={apiID}
              onChange={(event) => setAPIID(Number(event.target.value))}
            >
              {candidates.map(({ component: provider, api }) => (
                <option key={api.id} value={api.id}>
                  {provider.name} — {api.name}
                </option>
              ))}
            </Select>
          </Field>
        ) : (
          <p className="api-empty">No APIs are available to bind.</p>
        )}
        {error ? <InlineError message={error} /> : null}
        <footer>
          <Button variant="secondary" type="button" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" type="submit" disabled={saving || !apiID}>
            {saving ? "Binding…" : "Bind client"}
          </Button>
        </footer>
      </Form>
    </InventoryDialog>
  );
}
export function ComponentGlyph({ type }: { type: ComponentType }) {
  return (
    <span className={`component-list-avatar ${type}`} aria-hidden="true">
      {type === "infrastructure" ? (
        <Boxes width={16} height={16} />
      ) : (
        <Server width={16} height={16} />
      )}
    </span>
  );
}
function detailFacts(component: Component): Array<[string, string | number]> {
  return component.type === "infrastructure"
    ? [
        ["System", component.details.system],
        ["System type", systemTypeLabels[component.details.system_type]],
        ["Version", component.details.version],
        ["Network addresses", component.details.network_address.join(", ")],
      ]
    : [
        ["Language", component.details.language],
        ["Language version", component.details.language_version],
        ["Framework", component.details.framework],
      ];
}
