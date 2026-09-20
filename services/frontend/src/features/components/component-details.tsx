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
import { useComponents, useInventoryMutation } from "@/api/queries";
import {
  apiLabel,
  clientLabel,
  languageLabel,
  titleCase,
  roleAction,
} from "@/domain/catalog";
import { ComponentIcon, componentSubtitle, TypeIcon } from "@/domain/visuals";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
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
  onNeighborhood,
  neighborsOnly = false,
}: {
  component: Component;
  product: Product;
  onDeleted: () => void;
  map?: boolean;
  onClosePanel?: () => void;
  onNeighborhood?: () => void;
  neighborsOnly?: boolean;
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
  const inventory = useComponents(product.id);
  const infrastructure = isInfrastructure(component);
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
                API <span>{component.apis.length}/5</span>
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
                <button
                  className="map-api-badge"
                  onClick={() => setAPIEditor(api)}
                  aria-label={`Edit API ${api.name}`}
                >
                  {api.name}
                </button>
                <Button
                  variant="outline"
                  size="icon-sm"
                  aria-label={`Delete API ${api.name}`}
                  onClick={() => {
                    remove.reset();
                    setDeleting({ kind: "api", id: api.id, name: api.name });
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
          {!infrastructure || component.clients.length > 0 ? (
            <section className="detail-section">
              <div className="section-heading">
                <h3>
                  Clients <span>{component.clients.length}/5</span>
                </h3>
                {!infrastructure ? (
                  <Button
                    variant="outline"
                    size="icon-sm"
                    aria-label="Add client"
                    disabled={component.clients.length >= 5}
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
                      <span>{client.role.toUpperCase()}</span>
                      <span data-secure={client.secure_connection}>
                        {client.secure_connection ? "SECURE" : "INSECURE"}
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
          <div className="map-component-actions">
            {!infrastructure ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    disabled={
                      !component.clients.some(
                        (client) => client.api_id === null,
                      )
                    }
                  >
                    Connect client
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  {component.clients
                    .filter((client) => client.api_id === null)
                    .map((client) => (
                      <DropdownMenuItem
                        key={client.id}
                        onSelect={() =>
                          setBinding({
                            sourceID: component.id,
                            clientID: client.id,
                          })
                        }
                      >
                        {clientLabel(client.client_name)} · {client.role}
                      </DropdownMenuItem>
                    ))}
                </DropdownMenuContent>
              </DropdownMenu>
            ) : null}
            <Button variant="outline" onClick={onNeighborhood}>
              {neighborsOnly
                ? "Show all components"
                : "Show immediate neighborhood"}
            </Button>
          </div>
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
          inventory={inventory.data || []}
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
            setDeleting({ kind: "api", id: api.id, name: api.name });
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
        description={`Delete “${deleting?.name || ""}”? ${deleting?.kind === "api" ? "Clients connected to this API will become unbound." : deleting?.kind === "component" ? "Its APIs, clients and connections will be removed." : "Its connection will also be removed."} This cannot be undone.`}
        onCancel={() => setDeleting(null)}
        onConfirm={() => void confirmDelete()}
        busy={remove.isPending}
        error={remove.error}
      />
    </div>
  );
}
function ComponentOverviewContent({
  component,
  product,
  inventory,
  actions,
  onAddAPI,
  onAddClient,
  onEditAPI,
  onEditClient,
  onDeleteAPI,
  onDeleteClient,
  onConnect,
}: {
  component: Component;
  product: Product;
  inventory: Component[];
  actions: ReactNode;
  onAddAPI: () => void;
  onAddClient: () => void;
  onEditAPI: (api: ComponentAPI) => void;
  onDeleteAPI: (api: ComponentAPI) => void;
  onEditClient: (client: ComponentClient) => void;
  onDeleteClient: (client: ComponentClient) => void;
  onConnect: (client: ComponentClient) => void;
}) {
  const infrastructure = isInfrastructure(component);
  const repository = serviceRepositoryURL(component);
  const targetFor = (id: number | null) => {
    const target = inventory.find((item) =>
      item.apis.some((api) => api.id === id),
    );
    return target
      ? { component: target, api: target.apis.find((api) => api.id === id)! }
      : null;
  };
  const incoming = inventory.flatMap((source) =>
    source.clients.flatMap((client) => {
      const api = component.apis.find((api) => api.id === client.api_id);
      return api ? [{ source, client, api }] : [];
    }),
  );
  return (
    <>
      <div className="component-overview-top">
        <div className="component-summary">
          <div className="component-summary-heading">
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
                  <dt>SystemName</dt>
                  <dd className="component-language">
                    <ComponentIcon component={component} size={28} />
                    {component.name}
                  </dd>
                </div>
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
            API <span>{component.apis.length}/5</span>
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
              <col style={{ width: "42%" }} />
              <col style={{ width: "29%" }} />
              <col style={{ width: "29%" }} />
            </colgroup>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>API type</TableHead>
                <TableHead>Network exposure</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {component.apis.map((api) => (
                <TableRow key={api.id}>
                  <TableCell>{api.name}</TableCell>
                  <TableCell>{apiLabel(api.api_type)}</TableCell>
                  <TableCell>
                    <div className="port-value-actions">
                      <span>{titleCase(api.network_exposure)}</span>
                      <PortMenu
                        kind="API"
                        name={api.name}
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
      {!infrastructure || component.clients.length ? (
        <section
          className="detail-section"
          aria-labelledby="component-clients-heading"
        >
          <div className="section-heading">
            <h3 id="component-clients-heading">
              Clients <span>{component.clients.length}/5</span>
            </h3>
            {!infrastructure ? (
              <Button
                aria-label="Add client"
                title="Add client"
                variant="outline"
                size="icon-sm"
                disabled={component.clients.length >= 5}
                onClick={onAddClient}
              >
                <Plus />
              </Button>
            ) : null}
          </div>
          {component.clients.length ? (
            <Table className="component-client-table component-port-table">
              <colgroup>
                <col style={{ width: "23%" }} />
                <col style={{ width: "14%" }} />
                <col style={{ width: "22%" }} />
                <col style={{ width: "41%" }} />
              </colgroup>
              <TableHeader>
                <TableRow>
                  <TableHead>Client name</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Communication</TableHead>
                  <TableHead>Bound API</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {component.clients.map((client) => {
                  const target = targetFor(client.api_id);
                  return (
                    <TableRow key={client.id}>
                      <TableCell>{clientLabel(client.client_name)}</TableCell>
                      <TableCell>
                        <span className={`client-role role-${client.role}`}>
                          {client.role.toUpperCase()}
                        </span>
                      </TableCell>
                      <TableCell>
                        {client.communication_type === "request-response"
                          ? "Request-response"
                          : titleCase(client.communication_type)}
                      </TableCell>
                      <TableCell>
                        <div className="port-value-actions">
                          <div>
                            {client.api_id === null ? (
                              <>
                                <span className="muted">Unbound · </span>
                                <button
                                  className="connect-client-link"
                                  aria-label={`Connect ${clientLabel(client.client_name)}`}
                                  onClick={() => onConnect(client)}
                                >
                                  Connect
                                </button>
                              </>
                            ) : target ? (
                              <Link
                                className="bound-api-link"
                                to={`${productPath(product)}/components/${target.component.id}`}
                              >
                                {target.component.name} · {target.api.name}
                              </Link>
                            ) : (
                              `API #${client.api_id}`
                            )}
                          </div>
                          <PortMenu
                            kind="client"
                            name={clientLabel(client.client_name)}
                            onEdit={() => onEditClient(client)}
                            onDelete={() => onDeleteClient(client)}
                          />
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          ) : (
            <p className="detail-empty">No clients yet</p>
          )}
        </section>
      ) : null}
      <section className="component-dependencies">
        <h3>Dependencies</h3>
        {component.clients.some((client) => client.api_id !== null) ? (
          component.clients
            .filter((client) => client.api_id !== null)
            .map((client) => {
              const target = targetFor(client.api_id);
              return (
                <p key={client.id}>
                  <span>Outgoing · </span>
                  {target?.component.name || `API #${client.api_id}`} —{" "}
                  {roleAction[client.role]} →{" "}
                  {target?.api.name || `API #${client.api_id}`}
                </p>
              );
            })
        ) : (
          <p>Outgoing · None</p>
        )}
        {incoming.length ? (
          incoming.map(({ source, client, api }) => (
            <p key={`${source.id}-${client.id}`}>
              <span>Incoming · </span>
              {source.name} — {roleAction[client.role]} → {api.name}
            </p>
          ))
        ) : (
          <p>Incoming · None</p>
        )}
      </section>
      <div className="component-footer-actions">
        <Button variant="outline" className="detail-architecture" asChild>
          <ArchitectureLink product={product} componentID={component.id}>
            Open in architecture <ArrowUpRight />
          </ArchitectureLink>
        </Button>{" "}
        <Link
          className="component-security-link"
          to={`${productPath(product)}/components/${component.id}/security-checks`}
        >
          Security checks <ArrowUpRight size={12} />
        </Link>
      </div>
    </>
  );
}
function PortMenu({
  kind,
  name,
  onEdit,
  onDelete,
}: {
  kind: string;
  name: string;
  onEdit: () => void;
  onDelete: () => void;
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
        <DropdownMenuItem onSelect={onEdit}>Edit {kind}</DropdownMenuItem>
        <DropdownMenuItem variant="destructive" onSelect={onDelete}>
          Delete {kind}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
