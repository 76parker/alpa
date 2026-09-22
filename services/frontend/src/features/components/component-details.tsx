import { HoverCard } from "radix-ui";
import { useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { ArrowUpRight, Ellipsis, Minus, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import type {
  Component,
  ComponentAPI,
  ComponentClient,
  Product,
} from "@/api/types";
import { isInfrastructure } from "@/api/types";
import { useInventoryMutation } from "@/api/queries";
import {
  apiDisplayName,
  apiLabel,
  availableClientNames,
  unusedClientNames,
  apiCollectionLabel,
  technologyFor,
  clientLabel,
  languageLabel,
  titleCase,
} from "@/domain/catalog";
import { ComponentIcon, componentSubtitle, TypeIcon } from "@/domain/visuals";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ConfirmDialog, ImportancyBadge } from "@/components/shared/controls";
import {
  ArchitectureLink,
  productPath,
} from "@/features/products/product-layout";
import { APIDialog, ClientDialog } from "./port-dialogs";
import { BindingDialog, type BindingSelection } from "./binding-dialog";
import { ComponentNodeView } from "@/features/architecture/component-node";
import { serviceRepositoryURL } from "./services-table";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
export function ComponentDetails({
  component,
  product,
  onDeleted,
  map = false,
  onClosePanel,
}: {
  component: Component;
  product: Product;
  onDeleted: () => void;
  map?: boolean;
  onClosePanel?: () => void;
}) {
  const [apiEditor, setAPIEditor] = useState<ComponentAPI | "new" | null>(null);
  const [clientEditor, setClientEditor] = useState<
    ComponentClient | "new" | null
  >(null);
  const [deleting, setDeleting] = useState<{
    kind: "api" | "client" | "component";
    id: number;
    name: string;
  } | null>(null);
  const [binding, setBinding] = useState<BindingSelection | null>(null);
  const remove = useInventoryMutation<void, NonNullable<typeof deleting>>({
    method: "DELETE",
    path: (item) =>
      item.kind === "component"
        ? `/v1/components/${item.id}`
        : `/v1/components/${component.id}/${item.kind === "api" ? "apis" : "clients"}/${item.id}`,
  });
  const infrastructure = isInfrastructure(component);
  const supportsClients = availableClientNames(component).length > 0;
  const system = infrastructure
    ? technologyFor(component.details.technology_name)
    : null;
  const confirmDelete = async () => {
    if (!deleting || remove.isPending) return;
    try {
      await remove.mutateAsync(deleting);
      toast.success(`${titleCase(deleting.kind)} deleted`);
      if (deleting.kind === "component") onDeleted();
      setDeleting(null);
    } catch {
      /* Keep confirmation and error visible. */
    }
  };
  const actions = (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon-sm" aria-label="Component actions">
          <Ellipsis />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem
          variant="destructive"
          onSelect={() => {
            remove.reset();
            setDeleting({
              kind: "component",
              id: component.id,
              name: component.name,
            });
          }}
        >
          <Trash2 />
          Delete component
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
  return (
    <div
      className={`component-details ${map ? "map-component-details" : "component-overview-details"}`}
      data-component-type={component.type}
    >
      {map ? (
        <>
          <header className="map-component-heading">
            <h2>{component.name}</h2>
            <Button
              variant="ghost"
              onClick={onClosePanel}
              aria-label="Close details"
            >
              Close panel
            </Button>
          </header>
          <div className="map-component-summary">
            <ComponentIcon component={component} size={40} />
            <span>{componentSubtitle(component)}</span>
          </div>
          {component.description ? (
            <p className="map-component-description">{component.description}</p>
          ) : null}
          {infrastructure ? (
            <ImportancyBadge value={component.details.importancy} />
          ) : (
            <div className="map-component-repository">
              <span>Repository URL</span>
              {/^https?:\/\//i.test(serviceRepositoryURL(component)) ? (
                <a
                  href={serviceRepositoryURL(component)}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {serviceRepositoryURL(component)}
                </a>
              ) : (
                <small>
                  {serviceRepositoryURL(component) || "No repository URL"}
                </small>
              )}
            </div>
          )}
          <hr />
          <section className="detail-section">
            <div className="section-heading">
              <h3>
                {system ? apiCollectionLabel(system.apiType) : "API"}{" "}
                <span>{component.apis.length}/5</span>
              </h3>
              <Button
                variant="outline"
                size="icon-sm"
                aria-label="Add API"
                disabled={component.apis.length >= 5}
                onClick={() => setAPIEditor("new")}
              >
                <Plus />
              </Button>
            </div>
            {component.apis.map((api) => (
              <div className="map-port-row" key={api.id}>
                <APIDetailsBadge api={api} onEdit={() => setAPIEditor(api)} />
                <Button
                  variant="outline"
                  size="icon-sm"
                  aria-label={`Delete API ${apiDisplayName(api)}`}
                  onClick={() => {
                    remove.reset();
                    setDeleting({
                      kind: "api",
                      id: api.id,
                      name: apiDisplayName(api),
                    });
                  }}
                >
                  <Minus />
                </Button>
              </div>
            ))}
            {!component.apis.length ? (
              <p className="detail-empty">No APIs yet</p>
            ) : null}
          </section>
          {supportsClients || component.clients.length > 0 ? (
            <section className="detail-section">
              <div className="section-heading">
                <h3>
                  Clients <span>{component.clients.length}/5</span>
                </h3>
                {supportsClients ? (
                  <Button
                    variant="outline"
                    size="icon-sm"
                    aria-label="Add client"
                    disabled={
                      component.clients.length >= 5 ||
                      unusedClientNames(component).length === 0
                    }
                    onClick={() => setClientEditor("new")}
                  >
                    <Plus />
                  </Button>
                ) : null}
              </div>
              {component.clients.map((client) => (
                <div className="map-port-row" key={client.id}>
                  <button
                    className="map-client-badge"
                    onClick={() => setClientEditor(client)}
                    aria-label={`Edit client ${clientLabel(client.client_name)}`}
                  >
                    <span>{clientLabel(client.client_name)}</span>
                    <span className="map-client-metadata">
                      <span>{client.integrations.length} integrations</span>
                      <span data-secure={client.secure_connection}>
                        {client.secure_connection ? "secure" : "insecure"}
                      </span>
                    </span>
                  </button>
                  <Button
                    variant="outline"
                    size="icon-sm"
                    aria-label={`Delete client ${clientLabel(client.client_name)}`}
                    onClick={() => {
                      remove.reset();
                      setDeleting({
                        kind: "client",
                        id: client.id,
                        name: clientLabel(client.client_name),
                      });
                    }}
                  >
                    <Minus />
                  </Button>
                </div>
              ))}
              {!component.clients.length ? (
                <p className="detail-empty">No clients yet</p>
              ) : null}
            </section>
          ) : null}
          <div className="map-component-footer">
            <Link to={`${productPath(product)}/components/${component.id}`}>
              Open details <ArrowUpRight size={12} />
            </Link>
            {actions}
          </div>
        </>
      ) : (
        <ComponentOverviewContent
          component={component}
          product={product}
          actions={actions}
          onAddAPI={() => setAPIEditor("new")}
          onAddClient={() => setClientEditor("new")}
          onEditAPI={setAPIEditor}
          onEditClient={setClientEditor}
          onConnect={(client) =>
            setBinding({ sourceID: component.id, clientID: client.id })
          }
          onDeleteAPI={(api) => {
            remove.reset();
            setDeleting({
              kind: "api",
              id: api.id,
              name: apiDisplayName(api),
            });
          }}
          onDeleteClient={(client) => {
            remove.reset();
            setDeleting({
              kind: "client",
              id: client.id,
              name: clientLabel(client.client_name),
            });
          }}
        />
      )}
      {apiEditor ? (
        <APIDialog
          component={component}
          original={apiEditor === "new" ? undefined : apiEditor}
          onClose={() => setAPIEditor(null)}
        />
      ) : null}
      {clientEditor ? (
        <ClientDialog
          component={component}
          original={clientEditor === "new" ? undefined : clientEditor}
          onClose={() => setClientEditor(null)}
        />
      ) : null}
      {binding ? (
        <BindingDialog
          productID={product.id}
          selection={binding}
          onClose={() => setBinding(null)}
        />
      ) : null}
      <ConfirmDialog
        open={!!deleting}
        title={`Delete ${deleting?.kind === "api" ? "API" : deleting?.kind || "component"}?`}
        description={`Delete “${deleting?.name || ""}”? ${deleting?.kind === "api" ? "Integrations using this API will be removed." : deleting?.kind === "component" ? "Its APIs, clients and integrations will be removed." : "Its integrations will also be removed."} This cannot be undone.`}
        onCancel={() => setDeleting(null)}
        onConfirm={() => void confirmDelete()}
        busy={remove.isPending}
        error={remove.error}
      />
    </div>
  );
}
type ComponentOverviewProps = {
  component: Component;
  product: Product;
  actions: ReactNode;
  onAddAPI: () => void;
  onAddClient: () => void;
  onEditAPI: (api: ComponentAPI) => void;
  onDeleteAPI: (api: ComponentAPI) => void;
  onEditClient: (client: ComponentClient) => void;
  onDeleteClient: (client: ComponentClient) => void;
  onConnect: (client: ComponentClient) => void;
};

function ComponentOverviewContent(props: ComponentOverviewProps) {
  if (!isInfrastructure(props.component)) return <ServiceOverview {...props} />;
  return <InfrastructureOverview {...props} />;
}

function InfrastructureOverview({
  component,
  product,
  actions,
  onAddAPI,
  onAddClient,
  onEditAPI,
  onEditClient,
  onDeleteAPI,
  onDeleteClient,
  onConnect,
}: ComponentOverviewProps) {
  const infrastructure = isInfrastructure(component);
  const supportsClients = availableClientNames(component).length > 0;
  const system = infrastructure
    ? technologyFor(component.details.technology_name)
    : null;
  const repository = serviceRepositoryURL(component);
  return (
    <>
      <div className="component-overview-top">
        <div className="component-summary">
          <div className="component-summary-heading">
            {infrastructure ? (
              <ComponentIcon component={component} size={32} />
            ) : null}
            <h1>{component.name}</h1>
            {actions}
          </div>
          <Badge variant="outline" className="component-type-badge">
            <TypeIcon type={component.type} />
            {infrastructure
              ? "Infrastructure"
              : component.type === "frontend-service"
                ? "Frontend service"
                : "Backend service"}
          </Badge>
          {component.description ? (
            <p className="component-description">{component.description}</p>
          ) : null}
          {!infrastructure ? (
            <div className="component-repository">
              <span>Repository URL</span>
              {repository && /^https?:\/\//i.test(repository) ? (
                <a href={repository} target="_blank" rel="noopener noreferrer">
                  {repository}
                </a>
              ) : (
                <span className="repository-value">{repository || "—"}</span>
              )}
            </div>
          ) : null}
          <dl className="component-facts">
            {infrastructure ? (
              <>
                <div>
                  <dt>Importancy</dt>
                  <dd>
                    <ImportancyBadge value={component.details.importancy} />
                  </dd>
                </div>
              </>
            ) : (
              <div>
                <dt>Language</dt>
                <dd className="component-language">
                  <ComponentIcon component={component} size={28} />
                  {"language" in component.details
                    ? languageLabel(component.details.language)
                    : "—"}
                </dd>
              </div>
            )}
          </dl>
        </div>
        <div
          className="component-overview-preview"
          aria-label="Architecture preview"
        >
          <ComponentNodeView component={component} />
        </div>
      </div>
      <section
        className="detail-section"
        aria-labelledby="component-apis-heading"
      >
        <div className="section-heading">
          <h3 id="component-apis-heading">
            {system ? apiCollectionLabel(system.apiType) : "API"}{" "}
            <span>{component.apis.length}/5</span>
          </h3>
          <Button
            aria-label="Add API"
            title="Add API"
            variant="outline"
            size="icon-sm"
            disabled={component.apis.length >= 5}
            onClick={onAddAPI}
          >
            <Plus />
          </Button>
        </div>
        {component.apis.length ? (
          <Table className="component-api-table component-port-table">
            <colgroup>
              <col style={{ width: "60%" }} />
              <col style={{ width: "40%" }} />
            </colgroup>
            <TableHeader>
              <TableRow>
                <TableHead>API type</TableHead>
                <TableHead>Network exposure</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {component.apis.map((api) => (
                <TableRow key={api.id}>
                  <TableCell>
                    {apiLabel(api.api_type)} <small>#{api.id}</small>
                  </TableCell>
                  <TableCell>
                    <div className="port-value-actions">
                      <span>{titleCase(api.network_exposure)}</span>
                      <PortMenu
                        kind="API"
                        name={apiDisplayName(api)}
                        onEdit={() => onEditAPI(api)}
                        onDelete={() => onDeleteAPI(api)}
                      />
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <p className="detail-empty">No APIs yet</p>
        )}
      </section>
      {supportsClients || component.clients.length ? (
        <section
          className="detail-section"
          aria-labelledby="component-clients-heading"
        >
          <div className="section-heading">
            <h3 id="component-clients-heading">
              Clients <span>{component.clients.length}/5</span>
            </h3>
            {supportsClients ? (
              <Button
                aria-label="Add client"
                title="Add client"
                variant="outline"
                size="icon-sm"
                disabled={
                  component.clients.length >= 5 ||
                  unusedClientNames(component).length === 0
                }
                onClick={onAddClient}
              >
                <Plus />
              </Button>
            ) : null}
          </div>
          {component.clients.length ? (
            <Table className="component-client-table component-port-table">
              <colgroup>
                <col style={{ width: "36%" }} />
                <col style={{ width: "24%" }} />
                <col style={{ width: "40%" }} />
              </colgroup>
              <TableHeader>
                <TableRow>
                  <TableHead>Client name</TableHead>
                  <TableHead>Integrations</TableHead>
                  <TableHead>Communication</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {component.clients.map((client) => (
                  <TableRow key={client.id}>
                    <TableCell>{clientLabel(client.client_name)}</TableCell>
                    <TableCell>{client.integrations.length}</TableCell>
                    <TableCell>
                      <div className="port-value-actions">
                        <span>
                          {client.communication_type === "request-response"
                            ? "Request-response"
                            : titleCase(client.communication_type)}
                        </span>
                        <PortMenu
                          kind="client"
                          name={clientLabel(client.client_name)}
                          onEdit={() => onEditClient(client)}
                          onDelete={() => onDeleteClient(client)}
                          onConnect={() => onConnect(client)}
                        />
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="detail-empty">No clients yet</p>
          )}
        </section>
      ) : null}
      <div className="component-footer-actions">
        <Button variant="outline" className="detail-architecture" asChild>
          <ArchitectureLink product={product} componentID={component.id}>
            Open in architecture <ArrowUpRight />
          </ArchitectureLink>
        </Button>
      </div>
    </>
  );
}
function ServiceOverview({
  component,
  product,
  actions,
  onAddAPI,
  onAddClient,
  onEditAPI,
  onEditClient,
  onDeleteAPI,
  onDeleteClient,
  onConnect,
}: ComponentOverviewProps) {
  const repository = serviceRepositoryURL(component);
  const integrationCount = component.clients.reduce(
    (total, client) => total + client.integrations.length,
    0,
  );
  return (
    <div className="service-overview">
      <header className="service-overview-header">
        <div className="service-overview-title-row">
          <div className="service-overview-identity">
            <div className="component-summary-heading">
              <ComponentIcon component={component} size={42} />
              <h1>{component.name}</h1>
            </div>
            <Badge variant="secondary" className="component-type-badge">
              {"language" in component.details
                ? `${languageLabel(component.details.language)} `
                : ""}
              {component.type === "frontend-service"
                ? "Frontend service"
                : "Backend service"}
            </Badge>
          </div>
          <div className="service-overview-actions">
            <Button asChild>
              <ArchitectureLink product={product} componentID={component.id}>
                Open in architecture <ArrowUpRight data-icon="inline-end" />
              </ArchitectureLink>
            </Button>
            {actions}
          </div>
        </div>
        <dl className="service-overview-metadata">
          <div>
            <dt>Repository URL</dt>
            <dd>
              {/^https?:\/\//i.test(repository) ? (
                <a href={repository} target="_blank" rel="noopener noreferrer">
                  {repository}
                </a>
              ) : (
                repository || "Repository not configured"
              )}
            </dd>
          </div>
          <div>
            <dt>Description</dt>
            <dd>{component.description || "No description provided."}</dd>
          </div>
        </dl>
      </header>
      <section aria-label="Component inventory">
        <dl className="service-inventory-summary">
          {[
            { label: "API", count: component.apis.length },
            { label: "Clients", count: component.clients.length },
            { label: "Integrations", count: integrationCount },
          ].map(({ label, count }) => (
            <div key={label}>
              <dt>{label}</dt>
              <dd aria-label={`${label} count`}>{count}</dd>
            </div>
          ))}
        </dl>
      </section>
      <div className="service-overview-tables">
        <section aria-labelledby="component-apis-heading">
          <div className="section-heading">
            <h3 id="component-apis-heading">API {component.apis.length} / 5</h3>
            <Button
              variant="outline"
              size="icon-sm"
              aria-label="Add API"
              title="Add API"
              disabled={component.apis.length >= 5}
              onClick={onAddAPI}
            >
              <Plus />
            </Button>
          </div>
          {component.apis.length ? (
            <Table
              aria-label="Component APIs"
              className="component-api-table service-port-table"
            >
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="service-api-exposure">
                    Network exposure
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {component.apis.map((api) => (
                  <TableRow key={api.id}>
                    <TableCell className="service-port-id">{api.id}</TableCell>
                    <TableCell>{apiLabel(api.api_type)}</TableCell>
                    <TableCell className="service-api-exposure">
                      <div className="port-value-actions">
                        <span>{titleCase(api.network_exposure)}</span>
                        <PortMenu
                          kind="API"
                          name={apiDisplayName(api)}
                          onEdit={() => onEditAPI(api)}
                          onDelete={() => onDeleteAPI(api)}
                        />
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="detail-empty">No APIs yet</p>
          )}
        </section>
        <section aria-labelledby="component-clients-heading">
          <div className="section-heading">
            <h3 id="component-clients-heading">
              Clients {component.clients.length} / 5
            </h3>
            <Button
              variant="outline"
              size="icon-sm"
              aria-label="Add client"
              title="Add client"
              disabled={
                component.clients.length >= 5 ||
                unusedClientNames(component).length === 0
              }
              onClick={onAddClient}
            >
              <Plus />
            </Button>
          </div>
          {component.clients.length ? (
            <Table
              aria-label="Component clients"
              className="component-client-table service-port-table"
            >
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead className="service-client-integrations">
                    Integrations
                  </TableHead>
                  <TableHead>TLS/SSL</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {component.clients.map((client) => (
                  <TableRow key={client.id}>
                    <TableCell className="service-port-id">
                      {client.id}
                    </TableCell>
                    <TableCell>
                      <div className="port-value-actions">
                        <span>{clientLabel(client.client_name)}</span>
                        <PortMenu
                          kind="client"
                          name={clientLabel(client.client_name)}
                          onEdit={() => onEditClient(client)}
                          onDelete={() => onDeleteClient(client)}
                          onConnect={() => onConnect(client)}
                        />
                      </div>
                    </TableCell>
                    <TableCell className="service-client-integrations">
                      {client.integrations.length}
                    </TableCell>
                    <TableCell>
                      <span
                        className="service-tls-status"
                        data-secure={client.secure_connection}
                      >
                        {client.secure_connection ? "Enabled" : "Disabled"}
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="detail-empty">No clients yet</p>
          )}
        </section>
      </div>
    </div>
  );
}

function PortMenu({
  kind,
  name,
  onEdit,
  onDelete,
  onConnect,
}: {
  kind: string;
  name: string;
  onEdit: () => void;
  onDelete: () => void;
  onConnect?: () => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={`${kind} actions ${name}`}
        >
          <Ellipsis />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuGroup>
          <DropdownMenuItem onSelect={onEdit}>Edit {kind}</DropdownMenuItem>
          {onConnect ? (
            <DropdownMenuItem onSelect={onConnect}>
              Integrate {name}
            </DropdownMenuItem>
          ) : null}
          <DropdownMenuItem variant="destructive" onSelect={onDelete}>
            Delete {kind}
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function APIDetailsBadge({
  api,
  onEdit,
}: {
  api: ComponentAPI;
  onEdit: () => void;
}) {
  return (
    <HoverCard.Root openDelay={200} closeDelay={150}>
      <HoverCard.Trigger asChild>
        <button
          className="map-api-badge"
          onClick={onEdit}
          aria-label={`Edit API ${apiDisplayName(api)}`}
        >
          {apiLabel(api.api_type)}
        </button>
      </HoverCard.Trigger>
      <HoverCard.Portal
        container={
          typeof document === "undefined"
            ? undefined
            : document.fullscreenElement || undefined
        }
      >
        <HoverCard.Content
          className="api-details-hover"
          side="left"
          align="start"
          sideOffset={8}
          collisionPadding={12}
        >
          <h4>{apiDisplayName(api)}</h4>
          <dl>
            <div>
              <dt>API type</dt>
              <dd>{apiLabel(api.api_type)}</dd>
            </div>
            <div>
              <dt>Network exposure</dt>
              <dd>{titleCase(api.network_exposure)}</dd>
            </div>
          </dl>
        </HoverCard.Content>
      </HoverCard.Portal>
    </HoverCard.Root>
  );
}
