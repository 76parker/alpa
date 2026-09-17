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
} from "react";
import {
  apiTypeLabels,
  componentClientNameLabels,
  componentTypeLabels,
  type Component,
  type Product,
} from "../../lib/inventory/contracts";
import {
  architectureClientHandleTop,
  architectureNodeHeight,
  architectureNodeWidth,
  architectureProviderHandleTop,
  apiHandleID,
  buildArchitectureGraph,
  clientHandleID,
  type ArchitectureGraph,
  type ArchitectureNode,
  type ArchitectureNodeData,
} from "../../lib/inventory/architecture-graph";
import {
  toGraphComponent,
  type GraphComponent,
} from "../../lib/inventory/graph-model";
import { Button } from "../../src/ui";

const nodeTypes = { architecture: ArchitectureNodeCard };
const storagePrefix = "alpa:architecture-layout-v1:";

function storageKey(productID: number) {
  return `${storagePrefix}${productID}`;
}

function savedNodes(nodes: ArchitectureNode[], productID: number) {
  try {
    const saved = JSON.parse(
      window.localStorage.getItem(storageKey(productID)) ?? "{}",
    ) as Record<string, { x: number; y: number }>;
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
  }, [graph, product.id]);

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
    const positions = Object.fromEntries(
      nodeRef.current.map((node) => [node.id, node.position]),
    );
    window.localStorage.setItem(
      storageKey(product.id),
      JSON.stringify(positions),
    );
    setLayoutSaved(true);
  }, [product.id]);
  const resetLayout = useCallback(() => {
    window.localStorage.removeItem(storageKey(product.id));
    nodeRef.current = graph.nodes;
    setNodes(graph.nodes);
    setLayoutSaved(false);
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
            Drag cards to arrange
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
      />
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
}: {
  nodes: ArchitectureNode[];
  edges: ArchitectureGraph["edges"];
  ariaLabel: string;
  interactive?: boolean;
  onNodesChange?: OnNodesChange<ArchitectureNode>;
  onNodeDragStop?: OnNodeDrag<ArchitectureNode>;
  onOpenComponentID?: (id: number) => void;
}) {
  return (
    <ArchitectureNodeActionContext.Provider
      value={{ interactive, onOpenComponentID }}
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
          elementsSelectable={false}
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

const ArchitectureNodeActionContext = createContext<{
  interactive: boolean;
  onOpenComponentID?: (id: number) => void;
}>({ interactive: false });

function ArchitectureNodeCard({ data }: NodeProps<ArchitectureNode>) {
  const { component, apis, clients } = data as ArchitectureNodeData;
  const { interactive, onOpenComponentID } = useContext(
    ArchitectureNodeActionContext,
  );
  const height = architectureNodeHeight(component);
  const width = architectureNodeWidth(component);
  const hasAPIs = apis.length > 0;
  const hasClients = clients.length > 0;
  return (
    <article
      className={`architecture-node architecture-node-client-model ${hasAPIs ? "has-provider-apis has-apis" : "without-provider-apis"} ${hasClients ? "has-clients" : ""}`}
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
            top: architectureClientHandleTop(index, clients.length),
            right: -1,
          }}
          aria-label={`Client connection for ${componentClientNameLabels[client.clientName]}`}
        />
      ))}
      <div className="architecture-node-client-grid">
        {hasAPIs ? (
          <div
            className="architecture-api-rail"
            aria-label={`APIs for ${component.name}`}
          >
            {apis.map((api) => (
              <div className="architecture-api-row" key={api.id}>
                <span className="architecture-api-badge nodrag nopan">
                  {apiTypeLabels[api.apiType]}
                </span>
              </div>
            ))}
          </div>
        ) : null}
        <div className="architecture-node-body architecture-node-body-client">
          <span className="architecture-node-icon">
            <ComponentIcon type={component.type} />
          </span>
          <span className="architecture-node-copy">
            <strong>{component.name}</strong>
            <small>{componentTypeLabels[component.type]}</small>
          </span>
        </div>
        {hasClients ? (
          <div
            className="architecture-client-rail"
            aria-label={`Clients for ${component.name}`}
          >
            {clients.map((client) => (
              <div className="architecture-client-row" key={client.id}>
                <span className="architecture-client-badge nodrag nopan">
                  {componentClientNameLabels[client.clientName]}
                </span>
              </div>
            ))}
          </div>
        ) : null}
      </div>
      {interactive &&
      component.componentID !== undefined &&
      onOpenComponentID ? (
        <span className="architecture-node-actions">
          <Button
            type="button"
            className="architecture-node-open nodrag nopan"
            aria-label={`Open component ${component.name}`}
            onClick={() => onOpenComponentID(component.componentID!)}
          >
            <ExternalLink width={18} height={18} />
          </Button>
        </span>
      ) : null}
    </article>
  );
}

function ComponentIcon({ type }: { type: Component["type"] }) {
  return type === "infrastructure" ? (
    <Boxes width={16} height={16} />
  ) : (
    <Server width={16} height={16} />
  );
}
