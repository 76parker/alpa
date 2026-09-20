import { memo, useEffect, useRef, useState, type ReactNode } from "react";
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
import { apiLabel, clientLabel } from "@/domain/catalog";
import { ComponentIcon, componentSubtitle } from "@/domain/visuals";
import { ImportancyBadge } from "@/components/shared/controls";
import { nearestPortSide, type PortSide } from "./model";
export type PortSelection =
  | { component: Component; kind: "api"; port: ComponentAPI }
  | { component: Component; kind: "client"; port: ComponentClient };
export type ComponentNodeData = {
  component: Component;
  portSides?: Record<string, PortSide>;
  onMovePort?: (key: string, side: PortSide) => void;
  dimmed?: boolean;
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
  side,
  onMove,
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
  side: PortSide;
  onMove?: (side: PortSide) => void;
}) {
  const start = useRef<{ x: number; y: number } | null>(null);
  const suppressClick = useRef(false);
  const [dragging, setDragging] = useState<PortSide | null>(null);
  const destination = (event: React.PointerEvent<HTMLButtonElement>) => {
    const bounds = event.currentTarget
      .closest(".component-node")!
      .getBoundingClientRect();
    return nearestPortSide(
      event.clientX - bounds.left,
      event.clientY - bounds.top,
      bounds.width,
      bounds.height,
    );
  };
  return (
    <div
      data-side={side}
      data-port={`${kind}-${id}`}
      data-drop-side={dragging || undefined}
      className={`node-port ${kind} ${selected ? "pending" : ""} ${bound ? "bound" : ""} ${dragging ? "port-dragging" : ""}`}
    >
      <button
        type="button"
        className="port-label nodrag nopan"
        disabled={!graph}
        onPointerDown={(event) => {
          if (!onMove || event.button !== 0) return;
          event.stopPropagation();
          start.current = { x: event.clientX, y: event.clientY };
          suppressClick.current = false;
          event.currentTarget.setPointerCapture(event.pointerId);
        }}
        onPointerMove={(event) => {
          if (!start.current || !onMove) return;
          if (
            Math.hypot(
              event.clientX - start.current.x,
              event.clientY - start.current.y,
            ) < 5 &&
            !suppressClick.current
          )
            return;
          suppressClick.current = true;
          setDragging(destination(event));
        }}
        onPointerUp={(event) => {
          if (!start.current) return;
          event.stopPropagation();
          if (suppressClick.current) {
            event.preventDefault();
            onMove?.(destination(event));
          }
          start.current = null;
          setDragging(null);
          if (event.currentTarget.hasPointerCapture(event.pointerId))
            event.currentTarget.releasePointerCapture(event.pointerId);
        }}
        onPointerCancel={() => {
          start.current = null;
          suppressClick.current = true;
          setDragging(null);
        }}
        onKeyDown={(event) => {
          if (!onMove) return;
          if (event.key === "Escape" && start.current) {
            event.stopPropagation();
            start.current = null;
            suppressClick.current = true;
            setDragging(null);
          }
          const next = {
            ArrowLeft: "left",
            ArrowRight: "right",
            ArrowDown: "bottom",
          }[event.key] as PortSide | undefined;
          if (event.altKey && next) {
            event.preventDefault();
            event.stopPropagation();
            onMove(next);
          }
        }}
        tabIndex={graph ? 0 : -1}
        aria-label={`${kind === "api" ? "Connect to API" : "Connect from client"} ${name}`}
        onClick={(event) => {
          event.stopPropagation();
          if (!suppressClick.current || event.detail === 0) onClick?.();
        }}
        title={
          graph
            ? "Drag to Left, Right or Bottom. Alt + arrow keys moves the badge."
            : undefined
        }
      >
        {children}
      </button>
      {graph ? (
        <Handle
          id={`${kind}-${id}`}
          type={kind === "api" ? "target" : "source"}
          position={
            side === "left"
              ? Position.Left
              : side === "right"
                ? Position.Right
                : Position.Bottom
          }
          className={`port-handle ${kind}`}
          isConnectable={kind === "api" || !bound}
          onClick={(event) => {
            event.stopPropagation();
            onClick?.();
          }}
          aria-label={`${kind} port ${name}`}
        />
      ) : (
        <span className={`preview-port-dot ${kind}`} />
      )}
      {onRemove ? (
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
      ) : null}
    </div>
  );
}
export function ComponentNodeView({
  component,
  graph = false,
  dimmed,
  hideImportancy,
  portSides = {},
  onMovePort,
  pendingClientID,
  onPort,
  onRemove,
  onOpen,
}: ComponentNodeData & { graph?: boolean }) {
  const infrastructure = isInfrastructure(component);
  return (
    <article
      className={`component-node ${infrastructure ? "infrastructure-node" : "service-node"} ${dimmed ? "dimmed" : ""}`}
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
        {(["left", "right", "bottom"] as const).map((side) => (
          <div key={side} className={`port-side port-side-${side}`}>
            {component.apis
              .filter(
                (api) =>
                  (portSides[`${component.id}:api-${api.id}`] || "left") ===
                  side,
              )
              .map((api) => (
                <Port
                  key={`api-${api.id}`}
                  id={api.id}
                  kind="api"
                  graph={graph}
                  side={side}
                  name={api.name}
                  onMove={
                    graph && onMovePort
                      ? (next) =>
                          onMovePort(`${component.id}:api-${api.id}`, next)
                      : undefined
                  }
                  onClick={() =>
                    onPort?.({ component, kind: "api", port: api })
                  }
                  onRemove={
                    onRemove
                      ? () => onRemove({ component, kind: "api", port: api })
                      : undefined
                  }
                >
                  {infrastructure ? (
                    <>
                      <span>
                        {apiLabel(api.api_type)} <small>TCP</small>
                      </span>
                      <span className="resource-name">{api.name}</span>
                    </>
                  ) : (
                    <span>{apiLabel(api.api_type)}</span>
                  )}
                </Port>
              ))}
            {component.clients
              .filter(
                (client) =>
                  (portSides[`${component.id}:client-${client.id}`] ||
                    "right") === side,
              )
              .map((client) => (
                <Port
                  key={`client-${client.id}`}
                  id={client.id}
                  kind="client"
                  graph={graph}
                  side={side}
                  name={clientLabel(client.client_name)}
                  bound={client.api_id !== null}
                  selected={pendingClientID === client.id}
                  onMove={
                    graph && onMovePort
                      ? (next) =>
                          onMovePort(
                            `${component.id}:client-${client.id}`,
                            next,
                          )
                      : undefined
                  }
                  onClick={() =>
                    onPort?.({ component, kind: "client", port: client })
                  }
                  onRemove={
                    onRemove
                      ? () =>
                          onRemove({ component, kind: "client", port: client })
                      : undefined
                  }
                >
                  <span>
                    {clientLabel(client.client_name).replace("protocol ", "")}
                  </span>
                </Port>
              ))}
          </div>
        ))}
        {!component.apis.length && !component.clients.length ? (
          <span className="node-empty">No integrations</span>
        ) : null}
      </div>
      {graph ? (
        <div className="port-drop-guides" aria-hidden="true">
          <span className="drop-left">Left</span>
          <span className="drop-right">Right</span>
          <span className="drop-bottom">Bottom</span>
        </div>
      ) : null}
      <footer className="node-bottom" />
    </article>
  );
}
export const GraphComponentNode = memo(function GraphComponentNode({
  data,
  id,
}: NodeProps<ArchitectureNode>) {
  const updateNodeInternals = useUpdateNodeInternals();
  useEffect(() => {
    updateNodeInternals(id);
  }, [
    id,
    data.portSides,
    data.component.apis.length,
    data.component.clients.length,
    updateNodeInternals,
  ]);
  return <ComponentNodeView {...data} graph />;
});
