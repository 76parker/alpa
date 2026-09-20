import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Link,
  useNavigate,
  useParams,
  useSearchParams,
} from "react-router-dom";
import {
  BaseEdge,
  EdgeLabelRenderer,
  ReactFlow,
  ReactFlowProvider,
  getBezierPath,
  useNodesState,
  useReactFlow,
  type Connection,
  type EdgeProps,
  type Viewport,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { CircleHelp, Minus, Plus, X } from "lucide-react";
import { toast } from "sonner";
import type { ComponentType } from "@/api/types";
import { APIError } from "@/api/client";
import { useComponents, useInventoryMutation, useProduct } from "@/api/queries";
import { useWorkspace } from "@/app/workspace-context";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ConfirmDialog,
  CriticalityBadge,
  EmptyState,
  ErrorNotice,
  Loading,
  NotFound,
  SelectControl,
  useTitle,
} from "@/components/shared/controls";
import { CreateComponentButton } from "@/features/components/components-page";
import { ComponentDialog } from "@/features/components/component-dialog";
import { ComponentDetails } from "@/features/components/component-details";
import {
  BindingDialog,
  type BindingSelection,
} from "@/features/components/binding-dialog";
import { productPath } from "@/features/products/product-layout";
import { clientLabel, roleAction } from "@/domain/catalog";
import {
  GraphComponentNode,
  type ArchitectureNode,
  type PortSelection,
} from "./component-node";
import {
  canBind,
  graphEdges,
  immediateNeighborhood,
  mergePositions,
  readLayout,
  saveLayout,
  type BindingEdge,
  type PortSide,
} from "./model";
const nodeTypes = { component: GraphComponentNode };
function BindingLine(props: EdgeProps<BindingEdge>) {
  const [path, x, y] = getBezierPath(props);
  return (
    <>
      <BaseEdge
        id={props.id}
        path={path}
        style={props.style}
        markerEnd={props.markerEnd}
        interactionWidth={24}
      />
      <EdgeLabelRenderer>
        <button
          className={`edge-label nodrag nopan ${props.selected ? "selected" : ""}`}
          style={{
            transform: `translate(-50%, -50%) translate(${x}px,${y}px)`,
          }}
          onClick={() => props.data?.onSelect?.()}
          aria-label={`Connection ${props.data?.sourceComponent.name} to ${props.data?.targetComponent.name}`}
        >
          {props.label}
        </button>
      </EdgeLabelRenderer>
    </>
  );
}
const edgeTypes = { binding: BindingLine };
export default function ArchitecturePage() {
  const { workspaceID, productID } = useParams();
  return (
    <ReactFlowProvider key={`${workspaceID}:${productID}`}>
      <ArchitectureCanvas />
    </ReactFlowProvider>
  );
}
function ArchitectureCanvas() {
  const { productID, workspaceID } = useParams();
  const id = Number(productID);
  const product = useProduct(id);
  const inventory = useComponents(id);
  const { activeWorkspace } = useWorkspace();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const flow = useReactFlow<ArchitectureNode, BindingEdge>();
  const [nodes, setNodes, onNodesChange] = useNodesState<ArchitectureNode>([]);
  const [selectedID, setSelectedID] = useState<number | null>(
    () => Number(params.get("component")) || null,
  );
  const [edgeID, setEdgeID] = useState<string | null>(null);
  const [pending, setPending] = useState<BindingSelection | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [isFullscreen, setFullscreen] = useState(false);
  const [binding, setBinding] = useState<BindingSelection | null>(null);
  const [creating, setCreating] = useState<ComponentType | null>(null);
  const [deleting, setDeleting] = useState<PortSelection | null>(null);
  const [filter, setFilter] = useState("all");
  const [neighborsOnly, setNeighborsOnly] = useState(false);
  const [layoutBusy, setLayoutBusy] = useState(false);
  const [zoom, setZoom] = useState(0.8);
  const initialLayout = useMemo(() => readLayout(id), [id]);
  const [portSides, setPortSides] = useState(initialLayout.portSides || {});
  const portSidesRef = useRef(portSides);
  const positions = useRef(initialLayout.positions);
  const viewport = useRef(initialLayout.viewport);
  const mapRoot = useRef<HTMLDivElement>(null);
  const components = useMemo(() => inventory.data || [], [inventory.data]);
  const edges = useMemo(() => graphEdges(components), [components]);
  const neighbors = useMemo(
    () => (selectedID ? immediateNeighborhood(components, selectedID) : null),
    [components, selectedID],
  );
  const selected = components.find((item) => item.id === selectedID);
  const selectedEdge = edges.find((edge) => edge.id === edgeID);
  const remove = useInventoryMutation<void, PortSelection>({
    method: "DELETE",
    path: (selection) =>
      `/v1/components/${selection.component.id}/${selection.kind === "api" ? "apis" : "clients"}/${selection.port.id}`,
  });
  const resetRemove = remove.reset;
  useEffect(() => {
    const update = () => setFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", update);
    return () => document.removeEventListener("fullscreenchange", update);
  }, []);
  useTitle(
    product.data ? `${product.data.name} · Architecture` : "Architecture",
  );
  const onPort = useCallback(
    (selection: PortSelection) => {
      if (selection.kind === "client") {
        if (selection.port.api_id !== null) {
          setEdgeID(`client-${selection.port.id}`);
          setSelectedID(null);
          return;
        }
        setConnecting(false);
        setPending({
          sourceID: selection.component.id,
          clientID: selection.port.id,
        });
        setSelectedID(null);
        setEdgeID(null);
        return;
      }
      if (!pending) {
        setSelectedID(selection.component.id);
        return;
      }
      const source = components.find((item) => item.id === pending.sourceID);
      const client = source?.clients.find(
        (item) => item.id === pending.clientID,
      );
      if (!source || !client || !canBind(source, client, selection.component)) {
        toast.error("Choose an API on another component in this product.");
        return;
      }
      setBinding({ ...pending, targetAPIID: selection.port.id });
      setPending(null);
    },
    [pending, components],
  );
  const movePort = useCallback(
    (key: string, side: PortSide) => {
      const next = { ...portSidesRef.current, [key]: side };
      portSidesRef.current = next;
      setPortSides(next);
      saveLayout(id, {
        positions: positions.current,
        viewport: viewport.current,
        portSides: next,
      });
    },
    [id],
  );
  useEffect(() => {
    if (!inventory.isSuccess) return;
    setNodes((previous) => {
      const stored = {
        ...positions.current,
        ...Object.fromEntries(previous.map((node) => [node.id, node.position])),
      };
      positions.current = mergePositions(components, stored);
      return components.map((component) => ({
        id: String(component.id),
        type: "component",
        position: positions.current[String(component.id)],
        selected: component.id === selectedID,
        hidden:
          (filter === "services" && component.type === "infrastructure") ||
          (filter === "infrastructure" &&
            component.type !== "infrastructure") ||
          !!(neighborsOnly && neighbors && !neighbors.has(component.id)),
        data: {
          component,
          portSides,
          onMovePort: movePort,
          dimmed: !!(neighbors && !neighbors.has(component.id)),
          pendingClientID: pending?.clientID,
          onPort,
          onOpen: (item) => {
            setSelectedID(item.id);
            setEdgeID(null);
          },
          onRemove: (item) => {
            resetRemove();
            setDeleting(item);
          },
        },
      }));
    });
  }, [
    inventory.isSuccess,
    components,
    selectedID,
    neighbors,
    neighborsOnly,
    filter,
    pending?.clientID,
    onPort,
    setNodes,
    resetRemove,
    portSides,
    movePort,
  ]);
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setPending(null);
        setConnecting(false);
        if (!binding && !creating && !deleting) {
          setSelectedID(null);
          setEdgeID(null);
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [binding, creating, deleting]);
  const persist = useCallback(
    (nextViewport?: Viewport, movedNodes: ArchitectureNode[] = []) => {
      positions.current = Object.fromEntries(
        flow
          .getNodes()
          .map((node) => [
            node.id,
            movedNodes.find((moved) => moved.id === node.id)?.position ||
              node.position,
          ]),
      );
      if (nextViewport) viewport.current = nextViewport;
      saveLayout(id, {
        positions: positions.current,
        viewport: viewport.current,
        portSides: portSidesRef.current,
      });
    },
    [flow, id],
  );
  const connect = (connection: Connection) => {
    const source = components.find(
      (item) => String(item.id) === connection.source,
    );
    const target = components.find(
      (item) => String(item.id) === connection.target,
    );
    const client = source?.clients.find(
      (item) => `client-${item.id}` === connection.sourceHandle,
    );
    const api = target?.apis.find(
      (item) => `api-${item.id}` === connection.targetHandle,
    );
    if (source && target && client && api && canBind(source, client, target)) {
      setBinding({
        sourceID: source.id,
        clientID: client.id,
        targetAPIID: api.id,
      });
      setPending(null);
    }
  };
  const autoLayout = async () => {
    if (layoutBusy) return;
    setLayoutBusy(true);
    try {
      const { default: ELK } = await import("elkjs/lib/elk.bundled.js");
      const elk = new ELK();
      const result = await elk.layout({
        id: "product",
        layoutOptions: {
          "elk.algorithm": "layered",
          "elk.direction": "RIGHT",
          "elk.spacing.nodeNode": "70",
          "elk.layered.spacing.nodeNodeBetweenLayers": "160",
        },
        children: flow.getNodes().map((node) => ({
          id: node.id,
          width: node.measured?.width || 350,
          height: node.measured?.height || 200,
        })),
        edges: edges.map((edge) => ({
          id: edge.id,
          sources: [edge.source],
          targets: [edge.target],
        })),
      });
      const next = Object.fromEntries(
        (result.children || []).map((node) => [
          node.id,
          { x: node.x || 0, y: node.y || 0 },
        ]),
      );
      positions.current = next;
      setNodes((current) =>
        current.map((node) => ({
          ...node,
          position: next[node.id] || node.position,
        })),
      );
      saveLayout(id, { positions: next, portSides: portSidesRef.current });
      requestAnimationFrame(() => {
        void flow.fitView({ padding: 0.18, duration: 350 });
      });
    } catch {
      toast.error(
        "Automatic layout failed. You can still move components manually.",
      );
    } finally {
      setLayoutBusy(false);
    }
  };
  const focusNode = (componentID: number) => {
    setFilter("all");
    setNeighborsOnly(false);
    setSelectedID(componentID);
    setEdgeID(null);
    const node = flow.getNode(String(componentID));
    if (node)
      void flow.setCenter(
        node.position.x + (node.measured?.width || 350) / 2,
        node.position.y + (node.measured?.height || 200) / 2,
        { zoom: 1, duration: 400 },
      );
  };
  const close = () => {
    if (window.opener || window.history.length <= 1) window.close();
    navigate(product.data ? productPath(product.data) : "/products");
  };
  const fullscreen = async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await mapRoot.current?.requestFullscreen();
    } catch {
      toast.error("Full screen is not available in this browser.");
    }
  };
  if (
    !Number.isSafeInteger(id) ||
    id < 1 ||
    (product.error instanceof APIError && product.error.status === 404)
  )
    return <NotFound label="Product not found" />;
  if (product.isPending || inventory.isPending)
    return (
      <div className="map-loading">
        <Loading label="Loading architecture…" />
      </div>
    );
  if (product.isError || inventory.isError)
    return (
      <div className="map-loading">
        <Button variant="outline" asChild>
          <Link to="/products">Back to products</Link>
        </Button>
        <ErrorNotice
          error={product.error || inventory.error}
          retry={() => {
            void product.refetch();
            void inventory.refetch();
          }}
        />
      </div>
    );
  if (product.data.workspace_id !== Number(workspaceID))
    return <NotFound label="Product not found" />;
  const visibleIDs = new Set(
    nodes.filter((node) => !node.hidden).map((node) => node.id),
  );
  return (
    <div className="architecture-page" ref={mapRoot}>
      <header className="architecture-header">
        <h1>Architecture</h1>
        <span className="muted">/</span>
        <Link to={productPath(product.data)}>{product.data.name}</Link>
        <CriticalityBadge value={product.data.criticality} />
        <span className="map-workspace">
          {activeWorkspace?.name || "Workspace"}
        </span>
        <Button variant="ghost" onClick={close}>
          Close window
        </Button>
      </header>
      <div className="map-toolbar">
        <SelectControl
          label="Show components"
          value={filter}
          onChange={setFilter}
          options={[
            { value: "all", label: "All components" },
            { value: "services", label: "Services" },
            { value: "infrastructure", label: "Infrastructure" },
          ]}
          className="map-filter"
        />
        <Button
          variant={neighborsOnly ? "secondary" : "outline"}
          disabled={!selectedID}
          onClick={() => setNeighborsOnly(!neighborsOnly)}
        >
          Neighborhood
        </Button>
        <Button
          variant="outline"
          onClick={() => {
            setConnecting(true);
            setPending(null);
            setSelectedID(null);
            setEdgeID(null);
          }}
        >
          Connect
        </Button>
        <div className="map-create-actions">
          <Button
            variant="outline"
            onClick={() => setCreating("backend-service")}
          >
            <img src="/assets/3a0e0.svg" alt="" />
            Create backend
          </Button>
          <Button
            variant="outline"
            onClick={() => setCreating("frontend-service")}
          >
            <img src="/assets/10c79.svg" alt="" />
            Create frontend
          </Button>
          <Button
            variant="outline"
            onClick={() => setCreating("infrastructure")}
          >
            <img src="/assets/a01a7.svg" alt="" />
            Create infrastructure
          </Button>
        </div>
      </div>
      <div className="map-canvas">
        <ReactFlow
          nodes={nodes}
          edges={edges
            .filter(
              (edge) =>
                visibleIDs.has(edge.source) && visibleIDs.has(edge.target),
            )
            .map((edge) => ({
              ...edge,
              selected: edge.id === edgeID,
              data: {
                ...edge.data!,
                onSelect: () => {
                  setEdgeID(edge.id);
                  setSelectedID(null);
                },
              },
              style: {
                ...edge.style,
                opacity:
                  neighbors &&
                  (!neighbors.has(Number(edge.source)) ||
                    !neighbors.has(Number(edge.target)))
                    ? 0.18
                    : 1,
              },
            }))}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          onNodesChange={onNodesChange}
          onNodeClick={(_, node) => {
            setSelectedID(Number(node.id));
            setEdgeID(null);
          }}
          onEdgeClick={(_, edge) => {
            setEdgeID(edge.id);
            setSelectedID(null);
          }}
          onPaneClick={() => {
            setSelectedID(null);
            setEdgeID(null);
          }}
          onConnect={connect}
          onNodeDragStop={(_, node, draggedNodes) =>
            persist(undefined, draggedNodes.length ? draggedNodes : [node])
          }
          onMoveEnd={(_, next) => {
            setZoom(next.zoom);
            persist(next);
          }}
          defaultViewport={initialLayout.viewport || { x: 0, y: 0, zoom: 0.8 }}
          minZoom={0.2}
          maxZoom={2}
          fitView={!initialLayout.viewport}
          fitViewOptions={{ padding: 0.15, maxZoom: 0.8 }}
          deleteKeyCode={null}
          nodesConnectable
          onInit={() => {
            const target = Number(params.get("component"));
            if (target) requestAnimationFrame(() => focusNode(target));
          }}
          colorMode="dark"
          proOptions={{ hideAttribution: true }}
        ></ReactFlow>
        {!components.length ? (
          <div className="map-empty">
            <EmptyState
              title="Your architecture starts here"
              description="Create services and infrastructure, then connect their clients and APIs."
            >
              <CreateComponentButton onSelect={setCreating} />
            </EmptyState>
          </div>
        ) : null}
        {pending || connecting ? (
          <div className="connection-hint">
            <span>
              {pending
                ? "Select an API on another component to connect this client."
                : "Select a free client to start a connection."}
            </span>
            {pending ? (
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setBinding(pending);
                  setPending(null);
                }}
              >
                Choose target
              </Button>
            ) : null}
            <Button
              size="icon-sm"
              variant="ghost"
              aria-label="Cancel connection"
              onClick={() => {
                setPending(null);
                setConnecting(false);
              }}
            >
              <X />
            </Button>
          </div>
        ) : null}
        <div className="map-controls">
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Zoom out"
            onClick={() => void flow.zoomOut({ duration: 200 })}
          >
            <Minus />
          </Button>
          <span>{Math.round(zoom * 100)}%</span>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Zoom in"
            onClick={() => void flow.zoomIn({ duration: 200 })}
          >
            <Plus />
          </Button>
          <span className="header-divider" />
          <Button
            variant="ghost"
            aria-label="Fit to view"
            onClick={() => void flow.fitView({ padding: 0.15, duration: 350 })}
          >
            Fit to view
          </Button>
          <Button
            variant="ghost"
            disabled={layoutBusy || !components.length}
            onClick={() => void autoLayout()}
          >
            {layoutBusy ? "Arranging…" : "Auto layout"}
          </Button>
          <Button
            variant="ghost"
            aria-label="Full screen"
            onClick={() => void fullscreen()}
          >
            {isFullscreen ? "Window mode" : "Full screen"}
          </Button>
        </div>
        <div className="port-legend map-legend">
          <span className="api-legend">API</span>
          <span className="client-legend">Client</span>
        </div>
        {selected || selectedEdge ? (
          <aside
            className="map-details-panel"
            aria-label={selected ? "Component details" : "Connection details"}
          >
            {!selected ? (
              <div className="panel-top">
                <span>{selected ? "Component" : "Connection"}</span>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label="Close details"
                  onClick={() => {
                    setSelectedID(null);
                    setEdgeID(null);
                  }}
                >
                  <X />
                </Button>
              </div>
            ) : null}
            {selected ? (
              <ComponentDetails
                key={selected.id}
                component={selected}
                product={product.data}
                map
                onClosePanel={() => {
                  setSelectedID(null);
                  setEdgeID(null);
                }}
                onNeighborhood={() => setNeighborsOnly(!neighborsOnly)}
                neighborsOnly={neighborsOnly}
                onDeleted={() => setSelectedID(null)}
              />
            ) : selectedEdge?.data ? (
              <div className="connection-details">
                <h2>Connection</h2>
                <Badge>
                  {roleAction[selectedEdge.data.client.role].toUpperCase()}
                </Badge>
                <dl>
                  <div>
                    <dt>Source component</dt>
                    <dd>
                      <button
                        onClick={() =>
                          focusNode(selectedEdge.data!.sourceComponent.id)
                        }
                      >
                        {selectedEdge.data.sourceComponent.name}
                      </button>
                    </dd>
                  </div>
                  <div>
                    <dt>Client</dt>
                    <dd>{clientLabel(selectedEdge.data.client.client_name)}</dd>
                  </div>
                  <div>
                    <dt>Target component</dt>
                    <dd>
                      <button
                        onClick={() =>
                          focusNode(selectedEdge.data!.targetComponent.id)
                        }
                      >
                        {selectedEdge.data.targetComponent.name}
                      </button>
                    </dd>
                  </div>
                  <div>
                    <dt>Target API</dt>
                    <dd>
                      {
                        selectedEdge.data.targetComponent.apis.find(
                          (api) => api.id === selectedEdge.data!.apiID,
                        )?.name
                      }
                    </dd>
                  </div>
                  <div>
                    <dt>Communication</dt>
                    <dd>{selectedEdge.data.client.communication_type}</dd>
                  </div>
                  <div>
                    <dt>Secure connection</dt>
                    <dd>
                      {selectedEdge.data.client.secure_connection
                        ? "Yes"
                        : "No"}
                    </dd>
                  </div>
                </dl>
              </div>
            ) : null}
          </aside>
        ) : null}
      </div>
      <footer className="map-status">
        <span>
          {components.length} components · {edges.length} connections
        </span>
        <span>
          <CircleHelp size={13} />
          Drag to move · Scroll to zoom · Esc to cancel
        </span>
        <span>Saved locally</span>
      </footer>
      {creating ? (
        <ComponentDialog
          product={product.data}
          type={creating}
          onClose={() => setCreating(null)}
          onCreated={(component) => {
            setCreating(null);
            setSelectedID(component.id);
          }}
        />
      ) : null}
      {binding ? (
        <BindingDialog
          productID={id}
          selection={binding}
          onClose={() => setBinding(null)}
        />
      ) : null}
      <ConfirmDialog
        open={!!deleting}
        title={`Delete ${deleting?.kind === "api" ? "API" : "client"}?`}
        description={
          deleting?.kind === "api"
            ? "Clients connected to this API will become unbound. This cannot be undone."
            : "This client and its connection will be removed. This cannot be undone."
        }
        onCancel={() => setDeleting(null)}
        onConfirm={() => {
          if (!deleting || remove.isPending) return;
          void remove
            .mutateAsync(deleting)
            .then(() => {
              toast.success("Deleted");
              setDeleting(null);
            })
            .catch(() => {});
        }}
        busy={remove.isPending}
        error={remove.error}
      />
    </div>
  );
}
