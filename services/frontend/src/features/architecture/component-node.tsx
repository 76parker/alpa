import { memo, useLayoutEffect, type ReactNode } from "react";
import {
  Handle,
  Position,
  useUpdateNodeInternals,
  type Node,
  type NodeProps,
} from "@xyflow/react";
import { ArrowUpRight, Grip } from "lucide-react";
import type { Component, ComponentAPI, ComponentClient } from "@/api/types";
import { isInfrastructure } from "@/api/types";
import {
  apiDisplayName,
  apiLabel,
  clientLabel,
  transportProtocol,
} from "@/domain/catalog";
import { ComponentIcon, componentSubtitle } from "@/domain/visuals";
import { ImportancyBadge } from "@/components/shared/controls";
import { type PortPosition } from "./geometry";
export type PortSelection =
  | { component: Component; kind: "api"; port: ComponentAPI }
  | { component: Component; kind: "client"; port: ComponentClient };
export type ComponentNodeData = {
  component: Component;
  portPositions?: Record<string, PortPosition>;
  dimmed?: boolean;
  interactionsDisabled?: boolean;
  hideImportancy?: boolean;
  pendingClientID?: number;
  onPort?: (selection: PortSelection) => void;
  onRemove?: (selection: PortSelection) => void;
  onOpen?: (component: Component) => void;
};
export type ArchitectureNode = Node<ComponentNodeData, "component">;
function Port({
  children,
  id,
  kind,
  graph,
  selected,
  bound,
  onClick,
  onRemove,
  name,
  position,
}: {
  children: ReactNode;
  id: number;
  kind: "api" | "client";
  graph: boolean;
  selected?: boolean;
  bound?: boolean;
  onClick?: () => void;
  onRemove?: () => void;
  name: string;
  position: PortPosition;
}) {
  const side = position.x >= 0.5 ? "right" : "left";
  return (
    <div
      data-side={side}
      data-port={`${kind}-${id}`}
      className={`node-port ${kind} ${selected ? "pending" : ""} ${bound ? "bound" : ""}`}
    >
      <button
        type="button"
        className="port-label nodrag nopan"
        disabled={!graph}
        tabIndex={graph ? 0 : -1}
        aria-label={`${kind === "api" ? "Integrate with API" : "Integrate client"} ${name}`}
        onClick={(event) => {
          event.stopPropagation();
          onClick?.();
        }}
      >
        {children}
      </button>
      {(["left", "right"] as const).map((handleSide) =>
        graph ? (
          <Handle
            key={handleSide}
            id={`${kind}-${id}${handleSide === side ? "" : "-alternate"}`}
            type={kind === "api" ? "target" : "source"}
            position={handleSide === "left" ? Position.Left : Position.Right}
            data-port-side={handleSide}
            className={`port-handle ${kind}`}
            isConnectable
            onClick={(event) => {
              event.stopPropagation();
              onClick?.();
            }}
            aria-label={`${kind} port ${name}, ${handleSide}`}
          />
        ) : (
          <span
            key={handleSide}
            data-port-side={handleSide}
            className={`preview-port-dot ${kind}`}
          />
        ),
      )}
      {onRemove && (
        <button
          type="button"
          className="port-remove nodrag nopan"
          aria-label={`Delete ${kind === "api" ? "API" : "client"} ${name}`}
          onClick={(event) => {
            event.stopPropagation();
            onRemove();
          }}
        >
          ×
        </button>
      )}
    </div>
  );
}
export function ComponentNodeView({
  component,
  graph = false,
  dimmed,
  hideImportancy,
  portPositions = {},
  pendingClientID,
  interactionsDisabled,
  onPort,
  onRemove,
  onOpen,
}: ComponentNodeData & { graph?: boolean }) {
  const infrastructure = isInfrastructure(component);
  const renderPorts = () => (
    <>
      {component.apis.map((api, index) => {
        const key = `${component.id}:api-${api.id}`;
        return (
          <Port
            key={key}
            id={api.id}
            kind="api"
            graph={graph}
            position={
              portPositions[key] || {
                x: 0,
                y: 0.5 + (index * 0.45) / Math.max(1, component.apis.length),
              }
            }
            name={apiDisplayName(api)}
            onClick={() => onPort?.({ component, kind: "api", port: api })}
            onRemove={
              onRemove
                ? () => onRemove({ component, kind: "api", port: api })
                : undefined
            }
          >
            <span className="port-primary">
              <span className="port-type">
                {apiLabel(api.api_type)}
                <small>{transportProtocol(api.api_type)}</small>
              </span>
            </span>
            <span className="resource-name">
              {api.name || `API #${api.id}`}
            </span>
          </Port>
        );
      })}
      {component.clients.map((client, index) => {
        const key = `${component.id}:client-${client.id}`;
        return (
          <Port
            key={key}
            id={client.id}
            kind="client"
            graph={graph}
            position={
              portPositions[key] || {
                x: 1,
                y: 0.5 + (index * 0.45) / Math.max(1, component.clients.length),
              }
            }
            name={clientLabel(client.client_name)}
            bound={client.integrations.length > 0}
            selected={pendingClientID === client.id}
            onClick={() =>
              onPort?.({ component, kind: "client", port: client })
            }
            onRemove={
              onRemove
                ? () => onRemove({ component, kind: "client", port: client })
                : undefined
            }
          >
            <span>
              {clientLabel(client.client_name).replace("protocol ", "")}
            </span>
            <span className="client-security">
              TLS/SSL: {client.secure_connection ? "ON" : "OFF"}
            </span>
          </Port>
        );
      })}
    </>
  );
  return (
    <article
      inert={interactionsDisabled}
      className={`component-node stacked-port-node ${infrastructure ? "infrastructure-node" : "service-node"} ${dimmed ? "dimmed" : ""}`}
      aria-label={component.name}
    >
      <header className="node-heading">
        <ComponentIcon component={component} size={40} />
        <div className="node-title">
          <strong>{component.name}</strong>
          <span>{componentSubtitle(component)}</span>
          {infrastructure && !hideImportancy ? (
            <ImportancyBadge value={component.details.importancy} />
          ) : null}
        </div>
        {graph ? (
          <div className="node-header-actions">
            <span className="drag-handle" title="Drag component">
              <Grip size={15} />
            </span>
            <button
              className="nodrag nopan"
              aria-label={`Open ${component.name}`}
              onClick={(event) => {
                event.stopPropagation();
                onOpen?.(component);
              }}
            >
              <ArrowUpRight size={15} />
            </button>
          </div>
        ) : null}
      </header>
      <div
        className={`node-interfaces ${infrastructure ? "infrastructure-ports" : ""}`}
      >
        {renderPorts()}
        {!component.apis.length && !component.clients.length ? (
          <span className="node-empty">No integrations</span>
        ) : null}
      </div>
      <footer className="node-bottom" />
    </article>
  );
}
export const GraphComponentNode = memo(function GraphComponentNode({
  data,
  id,
}: NodeProps<ArchitectureNode>) {
  const updateNodeInternals = useUpdateNodeInternals();
  const portLayout = JSON.stringify([
    ...data.component.apis.map(
      (api) => data.portPositions?.[`${id}:api-${api.id}`],
    ),
    ...data.component.clients.map(
      (client) => data.portPositions?.[`${id}:client-${client.id}`],
    ),
  ]);
  useLayoutEffect(() => {
    updateNodeInternals(id);
  }, [
    id,
    portLayout,
    data.component.apis.length,
    data.component.clients.length,
    updateNodeInternals,
  ]);
  return <ComponentNodeView {...data} graph />;
});
