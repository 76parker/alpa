import {
  Background,
  Controls,
  Handle,
  Position,
  ReactFlow,
  applyNodeChanges,
  type NodeProps,
  type OnNodeDrag,
  type OnNodesChange,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import {
  Boxes,
  ExternalLink,
  GripVertical,
  Network,
  RotateCcw,
  Server,
} from "../../src/ui/icons";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import {
  apiTypeLabels,
  componentClientNameLabels,
  componentTypeLabels,
  systemTypeLabels,
  type Component,
  type InfrastructureDetails,
  type Product,
  type ServiceDetails,
} from "../../lib/inventory/contracts";
import {
  architectureClientHandleTop,
  architectureNodeHeight,
  architectureNodeWidth,
  architectureProviderHandleTop,
  apiHandleID,
  buildArchitectureGraph,
  clientHandleID,
  isQueueStreamInfrastructure,
  type ArchitectureGraph,
  type ArchitectureNode,
  type ArchitectureNodeData,
} from "../../lib/inventory/architecture-graph";
import {
  toGraphComponent,
  type GraphAPI,
  type GraphClient,
  type GraphComponent,
} from "../../lib/inventory/graph-model";
import { TooltipTrigger } from "../tooltip-trigger";
import { Button } from "../../src/ui";

const nodeTypes = { architecture: ArchitectureNodeCard };
const storagePrefix = "alpa:architecture-layout-v1:";
const keyboardNudge = 24;

type SavedPosition = { x: number; y: number };
type KeyboardMove = { nodeID: string; origin: SavedPosition };

type ArchitectureNodeActionContextValue = {
  interactive: boolean;
  keyboardMovingNodeID: string | null;
  onOpenComponentID?: (id: number) => void;
  beginKeyboardMove: (nodeID: string) => void;
  nudgeNode: (nodeID: string, x: number, y: number) => void;
  commitKeyboardMove: () => void;
  cancelKeyboardMove: () => void;
};

const ArchitectureNodeActionContext =
  createContext<ArchitectureNodeActionContextValue>({
    interactive: false,
    keyboardMovingNodeID: null,
    beginKeyboardMove: () => undefined,
    nudgeNode: () => undefined,
    commitKeyboardMove: () => undefined,
    cancelKeyboardMove: () => undefined,
  });

function storageKey(productID: number) {
  return `${storagePrefix}${productID}`;
}

function savedNodes(nodes: ArchitectureNode[], productID: number) {
  try {
    const saved = JSON.parse(
      window.localStorage.getItem(storageKey(productID)) ?? "{}",
    ) as Record<string, SavedPosition>;
    return nodes.map((node) =>
      saved[node.id] ? { ...node, position: saved[node.id] } : node,
    );
  } catch {
    return nodes;
  }
}

export function ArchitectureMap({
  product,
  components,
  onOpenComponent,
}: {
  product: Product;
  components: Component[];
  onOpenComponent: (component: Component) => void;
}) {
  const graph = useMemo(
    () => buildArchitectureGraph(components.map(toGraphComponent)),
    [components],
  );
  const [nodes, setNodes] = useState<ArchitectureNode[]>(() =>
    savedNodes(graph.nodes, product.id),
  );
  const nodeRef = useRef(nodes);
  const [layoutSaved, setLayoutSaved] = useState(false);
  const [keyboardMove, setKeyboardMove] = useState<KeyboardMove | null>(null);

  useEffect(() => {
    const next = savedNodes(graph.nodes, product.id);
    nodeRef.current = next;
    setNodes(next);
    setLayoutSaved(
      next.some(
        (node, index) =>
          node.position.x !== graph.nodes[index]?.position.x ||
          node.position.y !== graph.nodes[index]?.position.y,
      ),
    );
    setKeyboardMove(null);
  }, [graph, product.id]);

  const persistLayout = useCallback(
    (nextNodes: ArchitectureNode[]) => {
      const positions = Object.fromEntries(
        nextNodes.map((node) => [node.id, node.position]),
      );
      window.localStorage.setItem(
        storageKey(product.id),
        JSON.stringify(positions),
      );
      setLayoutSaved(true);
    },
    [product.id],
  );
  const onNodesChange: OnNodesChange<ArchitectureNode> = useCallback(
    (changes) => {
      setNodes((current) => {
        const next = applyNodeChanges(changes, current) as ArchitectureNode[];
        nodeRef.current = next;
        return next;
      });
    },
    [],
  );
  const onNodeDragStop: OnNodeDrag<ArchitectureNode> = useCallback(() => {
    persistLayout(nodeRef.current);
  }, [persistLayout]);
  const beginKeyboardMove = useCallback((nodeID: string) => {
    setKeyboardMove((current) => {
      if (current?.nodeID === nodeID) return current;
      const node = nodeRef.current.find((item) => item.id === nodeID);
      return node
        ? { nodeID, origin: { x: node.position.x, y: node.position.y } }
        : current;
    });
  }, []);
  const nudgeNode = useCallback((nodeID: string, x: number, y: number) => {
    setNodes((current) => {
      const next = current.map((node) =>
        node.id === nodeID
          ? {
              ...node,
              position: { x: node.position.x + x, y: node.position.y + y },
            }
          : node,
      );
      nodeRef.current = next;
      return next;
    });
  }, []);
  const commitKeyboardMove = useCallback(() => {
    if (!keyboardMove) return;
    persistLayout(nodeRef.current);
    setKeyboardMove(null);
  }, [keyboardMove, persistLayout]);
  const cancelKeyboardMove = useCallback(() => {
    if (!keyboardMove) return;
    setNodes((current) => {
      const next = current.map((node) =>
        node.id === keyboardMove.nodeID
          ? { ...node, position: keyboardMove.origin }
          : node,
      );
      nodeRef.current = next;
      return next;
    });
    setKeyboardMove(null);
  }, [keyboardMove]);
  const resetLayout = useCallback(() => {
    window.localStorage.removeItem(storageKey(product.id));
    nodeRef.current = graph.nodes;
    setNodes(graph.nodes);
    setLayoutSaved(false);
    setKeyboardMove(null);
  }, [graph.nodes, product.id]);

  return (
    <section
      className="topology-shell architecture-map"
      aria-label={`${product.name} architecture map`}
    >
      <header className="topology-toolbar">
        <div className="topology-context">
          <span className="live-dot" aria-hidden="true" />
          <div>
            <strong>Component relationships</strong>
            <small>
              {components.length} component{components.length === 1 ? "" : "s"}{" "}
              · {graph.edges.length} connection
              {graph.edges.length === 1 ? "" : "s"}
            </small>
          </div>
        </div>
        <div className="topology-tools">
          <span className="architecture-map-hint">
            <Network width={13} height={13} aria-hidden="true" />
            Drag cards to arrange, or use Move with a keyboard
          </span>
          {layoutSaved ? (
            <Button
              type="button"
              className="architecture-reset-layout"
              onClick={resetLayout}
            >
              <RotateCcw width={13} height={13} />
              Reset layout
            </Button>
          ) : null}
        </div>
      </header>
      <ArchitectureCanvas
        nodes={nodes}
        edges={graph.edges}
        ariaLabel={`${product.name} component relationship graph`}
        interactive
        onNodesChange={onNodesChange}
        onNodeDragStop={onNodeDragStop}
        onOpenComponentID={(id) => {
          const component = components.find((item) => item.id === id);
          if (component) onOpenComponent(component);
        }}
        keyboardMovingNodeID={keyboardMove?.nodeID ?? null}
        beginKeyboardMove={beginKeyboardMove}
        nudgeNode={nudgeNode}
        commitKeyboardMove={commitKeyboardMove}
        cancelKeyboardMove={cancelKeyboardMove}
      />
      <span className="sr-only" aria-live="polite">
        {keyboardMove
          ? `Moving ${nodes.find((node) => node.id === keyboardMove.nodeID)?.data.component.name}. Use arrow keys to reposition, Enter to save, or Escape to cancel.`
          : ""}
      </span>
    </section>
  );
}

export function ArchitecturePreview({
  component,
  label = "Component preview",
}: {
  component: Component;
  label?: string;
}) {
  const graph = useMemo(
    () => buildArchitectureGraph([toGraphComponent(component)]),
    [component],
  );
  return (
    <section
      className="architecture-preview"
      aria-label={label}
      data-testid="architecture-preview"
    >
      <ArchitectureCanvas
        nodes={graph.nodes}
        edges={graph.edges}
        ariaLabel={label}
      />
    </section>
  );
}

export function ArchitectureDraftPreview({
  component,
  label = "Component preview",
}: {
  component: GraphComponent;
  label?: string;
}) {
  const graph = useMemo(() => buildArchitectureGraph([component]), [component]);
  return (
    <section
      className="architecture-preview"
      aria-label={label}
      data-testid="architecture-preview"
    >
      <ArchitectureCanvas
        nodes={graph.nodes}
        edges={graph.edges}
        ariaLabel={label}
      />
    </section>
  );
}

export function ArchitectureCanvas({
  nodes,
  edges,
  ariaLabel,
  interactive = false,
  onNodesChange,
  onNodeDragStop,
  onOpenComponentID,
  keyboardMovingNodeID = null,
  beginKeyboardMove = () => undefined,
  nudgeNode = () => undefined,
  commitKeyboardMove = () => undefined,
  cancelKeyboardMove = () => undefined,
}: {
  nodes: ArchitectureNode[];
  edges: ArchitectureGraph["edges"];
  ariaLabel: string;
  interactive?: boolean;
  onNodesChange?: OnNodesChange<ArchitectureNode>;
  onNodeDragStop?: OnNodeDrag<ArchitectureNode>;
  onOpenComponentID?: (id: number) => void;
  keyboardMovingNodeID?: string | null;
  beginKeyboardMove?: (nodeID: string) => void;
  nudgeNode?: (nodeID: string, x: number, y: number) => void;
  commitKeyboardMove?: () => void;
  cancelKeyboardMove?: () => void;
}) {
  return (
    <ArchitectureNodeActionContext.Provider
      value={{
        interactive,
        keyboardMovingNodeID,
        onOpenComponentID,
        beginKeyboardMove,
        nudgeNode,
        commitKeyboardMove,
        cancelKeyboardMove,
      }}
    >
      <div
        className="topology-canvas architecture-canvas"
        data-testid="architecture-canvas"
      >
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          onNodesChange={onNodesChange}
          onNodeDragStop={onNodeDragStop}
          nodesDraggable={interactive}
          nodesConnectable={false}
          nodesFocusable={interactive}
          elementsSelectable={interactive}
          panOnDrag
          zoomOnScroll
          zoomOnPinch
          zoomOnDoubleClick={false}
          fitView
          fitViewOptions={{ padding: 0.24, minZoom: 0.45, maxZoom: 1.1 }}
          aria-label={ariaLabel}
        >
          <Background color="#d2d7df" gap={24} size={1} />
          <Controls showInteractive={false} />
        </ReactFlow>
      </div>
    </ArchitectureNodeActionContext.Provider>
  );
}

function ArchitectureNodeCard({ data }: NodeProps<ArchitectureNode>) {
  const { component, apis, clients } = data as ArchitectureNodeData;
  const height = architectureNodeHeight(component);
  const width = architectureNodeWidth(component);
  const hasAPIs = apis.length > 0;
  const hasClients = clients.length > 0;
  const queueStreamInfrastructure = isQueueStreamInfrastructure(component);

  return (
    <article
      className={`architecture-node architecture-node-client-model ${hasAPIs ? "has-provider-apis has-apis" : "without-provider-apis"} ${hasClients ? "has-clients" : ""} ${queueStreamInfrastructure ? "queue-stream-infrastructure" : ""}`}
      data-testid={`architecture-node-${component.id}`}
      style={{ height, width }}
    >
      {apis.map((api, index) => (
        <Handle
          key={api.id}
          id={apiHandleID(api.id)}
          type="target"
          position={Position.Left}
          className="architecture-api-handle architecture-provider-handle"
          style={{
            top: architectureProviderHandleTop(component, index, apis.length),
            left: -1,
          }}
          aria-label={`API connection for ${api.name}`}
        />
      ))}
      {clients.map((client, index) => (
        <Handle
          key={client.id}
          id={clientHandleID(client.id)}
          type="source"
          position={Position.Right}
          className="architecture-client-handle architecture-consumer-handle"
          style={{
            top: architectureClientHandleTop(component, index, clients.length),
            right: -1,
          }}
          aria-label={`Client connection for ${componentClientNameLabels[client.clientName]}`}
        />
      ))}
      <TooltipTrigger
        ariaLabel={`Show details for ${component.name}`}
        buttonClassName="architecture-node-trigger nodrag nopan"
        content={<ComponentTooltip component={component} />}
        accessibleContent={componentTooltipText(component)}
        tooltipClassName="architecture-tooltip"
      >
        <span className="sr-only">Show details for {component.name}</span>
      </TooltipTrigger>
      {queueStreamInfrastructure ? (
        <>
          <ArchitectureNodeActions component={component} />
          <QueueStreamNodeContent
            component={component}
            apis={apis}
            clients={clients}
          />
        </>
      ) : (
        <div className="architecture-node-client-grid">
          {hasAPIs ? (
            <div
              className="architecture-api-rail"
              aria-label={`APIs for ${component.name}`}
            >
              {apis.map((api) => (
                <div className="architecture-api-row" key={api.id}>
                  <APIBadge api={api} />
                </div>
              ))}
            </div>
          ) : null}
          <div className="architecture-node-body architecture-node-body-client">
            <ComponentHeading component={component} />
          </div>
          {hasClients ? (
            <div
              className="architecture-client-rail"
              aria-label={`Clients for ${component.name}`}
            >
              {clients.map((client) => (
                <div className="architecture-client-row" key={client.id}>
                  <ClientBadge client={client} />
                </div>
              ))}
            </div>
          ) : null}
          <ArchitectureNodeActions component={component} />
        </div>
      )}
    </article>
  );
}

function QueueStreamNodeContent({
  component,
  apis,
  clients,
}: {
  component: GraphComponent;
  apis: GraphAPI[];
  clients: GraphClient[];
}) {
  const details = component.details as InfrastructureDetails;
  return (
    <>
      <header className="architecture-stream-header">
        <span className="architecture-node-heading" aria-hidden="true">
          <span className="architecture-node-icon infrastructure">
            <Boxes width={16} height={16} />
          </span>
          <span className="architecture-node-copy">
            <span className="architecture-stream-title-line">
              <strong>{component.name}</strong>
              <span className="architecture-stream-system-type">
                {systemTypeLabels[details.system_type]}
              </span>
            </span>
            <small>{componentTypeLabels[component.type]}</small>
          </span>
        </span>
      </header>
      {apis.length ? (
        <div
          className="architecture-stream-api-list"
          aria-label={`APIs for ${component.name}`}
        >
          {apis.map((api) => (
            <QueueStreamAPIRow api={api} key={api.id} />
          ))}
        </div>
      ) : null}
      {clients.length ? (
        <div
          className="architecture-stream-client-list"
          aria-label={`Clients for ${component.name}`}
        >
          {clients.map((client) => (
            <ClientBadge client={client} key={client.id} />
          ))}
        </div>
      ) : null}
    </>
  );
}

function QueueStreamAPIRow({ api }: { api: GraphAPI }) {
  return (
    <div className="architecture-stream-api-row">
      <TooltipTrigger
        ariaLabel={`Show details for API ${api.name}`}
        buttonClassName="architecture-stream-api-trigger nodrag nopan"
        content={<APITooltip api={api} />}
        accessibleContent={apiTooltipText(api)}
        tooltipClassName="architecture-tooltip"
        title={apiTooltipText(api)}
      >
        <span className="architecture-stream-api-type">
          {apiTypeLabels[api.apiType]}
        </span>
        <strong className="architecture-stream-api-name">{api.name}</strong>
      </TooltipTrigger>
    </div>
  );
}

function ComponentHeading({ component }: { component: GraphComponent }) {
  return (
    <>
      <span
        className={`architecture-node-icon ${component.type === "infrastructure" ? "infrastructure" : ""}`}
      >
        {component.type === "infrastructure" ? (
          <Boxes width={16} height={16} />
        ) : (
          <Server width={16} height={16} />
        )}
      </span>
      <span className="architecture-node-copy">
        <strong>{component.name}</strong>
        <small>{componentTypeLabels[component.type]}</small>
      </span>
    </>
  );
}

function ArchitectureNodeActions({ component }: { component: GraphComponent }) {
  const { interactive, onOpenComponentID } = useContext(
    ArchitectureNodeActionContext,
  );
  if (!interactive) return null;
  return (
    <span className="architecture-node-actions">
      <MoveHandle component={component} />
      {component.componentID !== undefined && onOpenComponentID ? (
        <Button
          type="button"
          className="architecture-node-open nodrag nopan"
          aria-label={`Open component ${component.name}`}
          onClick={() => onOpenComponentID(component.componentID!)}
        >
          <ExternalLink width={18} height={18} aria-hidden="true" />
        </Button>
      ) : null}
    </span>
  );
}

function MoveHandle({ component }: { component: GraphComponent }) {
  const {
    keyboardMovingNodeID,
    beginKeyboardMove,
    nudgeNode,
    commitKeyboardMove,
    cancelKeyboardMove,
  } = useContext(ArchitectureNodeActionContext);
  const moving = keyboardMovingNodeID === component.id;

  function onKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    const distance = event.shiftKey ? keyboardNudge * 3 : keyboardNudge;
    const offsets: Record<string, [number, number]> = {
      ArrowUp: [0, -distance],
      ArrowDown: [0, distance],
      ArrowLeft: [-distance, 0],
      ArrowRight: [distance, 0],
    };
    if (event.key === "Escape") {
      event.preventDefault();
      cancelKeyboardMove();
      return;
    }
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      if (moving) commitKeyboardMove();
      else beginKeyboardMove(component.id);
      return;
    }
    const offset = offsets[event.key];
    if (!offset) return;
    event.preventDefault();
    if (!moving) beginKeyboardMove(component.id);
    nudgeNode(component.id, ...offset);
  }

  return (
    <Button
      type="button"
      className="architecture-node-drag-handle"
      aria-label={`Move component ${component.name}`}
      aria-pressed={moving}
      onClick={() => {
        if (moving) commitKeyboardMove();
        else beginKeyboardMove(component.id);
      }}
      onBlur={() => {
        if (moving) commitKeyboardMove();
      }}
      onKeyDown={onKeyDown}
    >
      <GripVertical width={18} height={18} aria-hidden="true" />
    </Button>
  );
}

function APIBadge({ api }: { api: GraphAPI }) {
  return (
    <TooltipTrigger
      ariaLabel={`Show details for API ${api.name}`}
      buttonClassName={`architecture-api-badge ${apiBadgeToneClass(api.apiType)} nodrag nopan`}
      content={<APITooltip api={api} />}
      accessibleContent={apiTooltipText(api)}
      tooltipClassName="architecture-tooltip"
      title={apiTooltipText(api)}
    >
      {apiTypeLabels[api.apiType]}
    </TooltipTrigger>
  );
}

function ClientBadge({ client }: { client: GraphClient }) {
  const label = componentClientNameLabels[client.clientName];
  return (
    <TooltipTrigger
      ariaLabel={`Show details for ${label}`}
      buttonClassName="architecture-client-badge nodrag nopan"
      content={<ClientTooltip client={client} />}
      accessibleContent={clientTooltipText(client)}
      tooltipClassName="architecture-tooltip"
      title={clientTooltipText(client)}
    >
      {label}
    </TooltipTrigger>
  );
}

function apiBadgeToneClass(apiType: GraphAPI["apiType"]) {
  if (["rest", "websocket", "exchange"].includes(apiType))
    return "api-tone-cyan";
  if (["graphql", "odata", "topic"].includes(apiType)) return "api-tone-purple";
  if (["grpc", "sse"].includes(apiType)) return "api-tone-green";
  if (apiType === "json-rpc") return "api-tone-teal";
  if (["soap", "event-consumer", "queue"].includes(apiType))
    return "api-tone-yellow";
  return "api-tone-muted";
}

function ComponentTooltip({ component }: { component: GraphComponent }) {
  return (
    <TooltipRows
      title={component.name}
      rows={[
        ["Type", componentTypeLabels[component.type]],
        ...componentFacts(component),
        ["APIs", String(component.apis.length)],
        ["Clients", String(component.clients.length)],
      ]}
    />
  );
}

function APITooltip({ api }: { api: GraphAPI }) {
  return (
    <TooltipRows
      rows={[
        ["Name", api.name],
        ["Type", apiTypeLabels[api.apiType]],
        ["Network exposure", api.networkExposure],
      ]}
    />
  );
}

function ClientTooltip({ client }: { client: GraphClient }) {
  return (
    <TooltipRows
      rows={[
        ["Client", componentClientNameLabels[client.clientName]],
        ["Role", client.role],
        ["Communication", client.communicationType],
        ["Description", client.description],
        ["API", client.apiID ?? "Unbound"],
      ]}
    />
  );
}

function TooltipRows({
  title,
  rows,
}: {
  title?: string;
  rows: Array<[string, string]>;
}) {
  return (
    <span className="architecture-tooltip-content">
      {title ? (
        <strong
          className="architecture-tooltip-title"
          role="heading"
          aria-level={3}
        >
          {title}
        </strong>
      ) : null}
      {rows.map(([label, value]) => (
        <span className="architecture-tooltip-row" key={label}>
          <strong>{label}:</strong>
          <span>{value || "—"}</span>
        </span>
      ))}
    </span>
  );
}

function componentFacts(component: GraphComponent): Array<[string, string]> {
  if (component.type === "infrastructure") {
    const details = component.details as InfrastructureDetails;
    return [
      ["System", details.system],
      ["System type", systemTypeLabels[details.system_type]],
      ["Version", details.version],
      ["Network addresses", details.network_address.join(", ")],
    ];
  }
  const details = component.details as ServiceDetails;
  return [
    ["Language", details.language],
    ["Language version", details.language_version],
    ["Framework", details.framework],
  ];
}

function componentTooltipText(component: GraphComponent) {
  return [
    ["Type", componentTypeLabels[component.type]],
    ...componentFacts(component),
    ["APIs", String(component.apis.length)],
    ["Clients", String(component.clients.length)],
  ]
    .map(([label, value]) => `${label}: ${value || "—"}`)
    .join(" · ");
}

function apiTooltipText(api: GraphAPI) {
  return [
    ["Name", api.name],
    ["Type", apiTypeLabels[api.apiType]],
    ["Network exposure", api.networkExposure],
  ]
    .map(([label, value]) => `${label}: ${value || "—"}`)
    .join(" · ");
}

function clientTooltipText(client: GraphClient) {
  return [
    ["Client", componentClientNameLabels[client.clientName]],
    ["Role", client.role],
    ["Communication", client.communicationType],
    ["Description", client.description],
    ["API", client.apiID ?? "Unbound"],
  ]
    .map(([label, value]) => `${label}: ${value || "—"}`)
    .join(" · ");
}
