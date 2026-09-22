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
  SelectionMode,
  getBezierPath,
  getSmoothStepPath,
  getStraightPath,
  MarkerType,
  Position,
  useInternalNode,
  useNodesState,
  useReactFlow,
  type Connection,
  type EdgeProps,
  type Viewport,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { CircleHelp, Minus, Plus, X } from "lucide-react";
import { toast } from "sonner";
import type { Component, ComponentType } from "@/api/types";
import { APIError, errorMessage } from "@/api/client";
import { useComponents, useInventoryMutation, useProduct } from "@/api/queries";
import { useWorkspace } from "@/app/workspace-context";
import { Button } from "@/components/ui/button";

import {
  connectionStyleEvent,
  defaultConnectionStyle,
  readConnectionStyles,
} from "./connection-style";
import {
  ConfirmDialog,
  CriticalityBadge,
  EmptyState,
  ErrorNotice,
  Loading,
  NotFound,
  useTitle,
} from "@/components/shared/controls";
import { CreateComponentButton } from "@/features/components/components-page";
import { ComponentDialog } from "@/features/components/component-dialog";
import { IntegrationDetails } from "@/features/components/integration-details";
import { ComponentDetails } from "@/features/components/component-details";
import {
  BindingDialog,
  type BindingSelection,
} from "@/features/components/binding-dialog";
import { productPath } from "@/features/products/product-layout";
import { apiDisplayName, clientLabel } from "@/domain/catalog";
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
} from "./model";
import { MapTools, type MapTool } from "./map-tools";
const nodeTypes = { component: GraphComponentNode };
function targetAPIName(
  component: Component | undefined,
  apiID: number | undefined,
) {
  const api = component?.apis.find((candidate) => candidate.id === apiID);
  return api ? apiDisplayName(api) : "API";
}
function BindingLine(props: EdgeProps<BindingEdge>) {
  const source = useInternalNode(props.source);
  const target = useInternalNode(props.target);
  const preferences = props.data?.connectionStyle || defaultConnectionStyle;
  const endpoint = {
    sourceX: props.sourceX,
    sourceY: props.sourceY,
    sourcePosition: props.sourcePosition,
    targetX: props.targetX,
    targetY: props.targetY,
    targetPosition: props.targetPosition,
  };
  if (source && target && props.data) {
    const sourceRight =
      source.internals.positionAbsolute.x +
        (source.measured.width || 350) / 2 >=
      target.internals.positionAbsolute.x + (target.measured.width || 350) / 2;
    // Resolve both ends from the actual squares, including connections sharing a port.
    for (const [kind, node, portID, position] of [
      [
        "source",
        source,
        `client-${props.data.client.id}`,
        sourceRight ? Position.Left : Position.Right,
      ],
      [
        "target",
        target,
        `api-${props.data.apiID}`,
        sourceRight ? Position.Right : Position.Left,
      ],
    ] as const) {
      const handle = node.internals.handleBounds?.[kind]?.find(
        (candidate) =>
          candidate.position === position &&
          (candidate.id === portID || candidate.id === `${portID}-alternate`),
      );
      if (handle) {
        endpoint[`${kind}X`] =
          node.internals.positionAbsolute.x + handle.x + handle.width / 2;
        endpoint[`${kind}Y`] =
          node.internals.positionAbsolute.y + handle.y + handle.height / 2;
        endpoint[`${kind}Position`] = position;
      }
    }
  }
  const pathOptions = { ...props, ...endpoint };
  const [path, x, y] =
    preferences.shape === "straight"
      ? getStraightPath(pathOptions)
      : preferences.shape === "smoothstep"
        ? getSmoothStepPath({ ...pathOptions, borderRadius: 12 })
        : getBezierPath(pathOptions);
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
          aria-label={`Integration ${props.data?.sourceComponent.name} to ${props.data?.targetComponent.name} / ${targetAPIName(props.data?.targetComponent, props.data?.apiID)}`}
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
  const [selectionMode, setSelectionMode] = useState(false);
  const [bulkTargets, setBulkTargets] = useState<number[] | null>(null);
  const [bulkBusy, setBulkBusy] = useState(false);
  const [bulkError, setBulkError] = useState<Error | null>(null);
  const selectedNodes = nodes.filter((node) => node.selected && !node.hidden);
  const removeComponent = useInventoryMutation<void, number>({
    method: "DELETE",
    path: (componentID) => `/v1/components/${componentID}`,
  });
  const clearSelection = useCallback(() => {
    setNodes((current) =>
      current.map((node) => ({ ...node, selected: false })),
    );
  }, [setNodes]);
  const deleteSelected = async () => {
    if (!bulkTargets || bulkBusy) return;
    setBulkBusy(true);
    setBulkError(null);
    const failed: number[] = [];
    const failures: string[] = [];
    for (const componentID of bulkTargets) {
      try {
        await removeComponent.mutateAsync(componentID);
      } catch (error) {
        if (error instanceof APIError && error.status === 404) continue;
        failed.push(componentID);
        failures.push(errorMessage(error));
      }
    }
    setBulkBusy(false);
    if (failed.length) {
      setBulkTargets(failed);
      setBulkError(
        new APIError(
          `${failed.length} ${failed.length === 1 ? "component" : "components"} could not be deleted. ${failures[0]} Retry to delete the remaining selection.`,
          "partial_delete",
          500,
        ),
      );
      setNodes((current) =>
        current.map((node) => ({
          ...node,
          selected: failed.includes(Number(node.id)),
        })),
      );
    } else {
      setBulkTargets(null);
      clearSelection();
      toast.success("Selected components deleted");
    }
  };
  const [edgeID, setEdgeID] = useState<string | null>(null);
  const [pending, setPending] = useState<BindingSelection | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [openTool, setOpenTool] = useState<MapTool | null>(null);
  const [newConnectionStyle, setNewConnectionStyle] = useState(
    defaultConnectionStyle,
  );
  const activateTool = (tool: MapTool) => {
    setOpenTool(openTool === tool ? null : tool);
    if (openTool === tool) {
      if (tool === "select") {
        setSelectionMode(false);
        clearSelection();
      }
      if (tool === "connect") {
        setConnecting(false);
        setPending(null);
      }
      return;
    }
    if (
      (tool === "select" && selectionMode) ||
      (tool === "connect" && (connecting || pending))
    )
      return;
    setPending(null);
    setConnecting(tool === "connect");
    if (tool !== "filter") {
      clearSelection();
      setSelectedID(null);
      setEdgeID(null);
      setNeighborsOnly(false);
    }
    setSelectionMode(tool === "select");
  };
  const [isFullscreen, setFullscreen] = useState(false);
  const [binding, setBinding] = useState<BindingSelection | null>(null);
  const [creating, setCreating] = useState<ComponentType | null>(null);
  const [deleting, setDeleting] = useState<PortSelection | null>(null);
  const [filter, setFilter] = useState("all");
  const [neighborsOnly, setNeighborsOnly] = useState(false);
  const [layoutBusy, setLayoutBusy] = useState(false);
  const [zoom, setZoom] = useState(0.8);
  const initialLayout = useMemo(() => readLayout(id), [id]);
  const [connectionStyles, setConnectionStyles] = useState(() =>
    readConnectionStyles(id),
  );
  useEffect(() => {
    const update = (event: Event) => {
      if (event instanceof CustomEvent && event.detail.productID === id)
        setConnectionStyles(event.detail.styles);
      else if (event instanceof StorageEvent)
        setConnectionStyles(readConnectionStyles(id));
    };
    window.addEventListener(connectionStyleEvent, update);
    window.addEventListener("storage", update);
    return () => {
      window.removeEventListener(connectionStyleEvent, update);
      window.removeEventListener("storage", update);
    };
  }, [id]);
  const positions = useRef(initialLayout.positions);
  const viewport = useRef(initialLayout.viewport);
  const mapRoot = useRef<HTMLDivElement>(null);
  const components = useMemo(() => inventory.data || [], [inventory.data]);
  const edges = useMemo(() => graphEdges(components), [components]);
  const renderedNodes = useMemo(() => {
    const centers = new Map(
      nodes.map((node) => [
        node.id,
        node.position.x + (node.measured?.width || 350) / 2,
      ]),
    );
    return nodes.map((node) => {
      const positions: Record<string, { x: number; y: number }> = {};
      const center = centers.get(node.id)!;
      for (const [kind, ports] of [
        ["api", node.data.component.apis],
        ["client", node.data.component.clients],
      ] as const) {
        for (const port of ports) {
          const peers = edges
            .filter((edge) =>
              kind === "api"
                ? edge.target === node.id && edge.data?.apiID === port.id
                : edge.source === node.id && edge.data?.client.id === port.id,
            )
            .map((edge) =>
              centers.get(kind === "api" ? edge.source : edge.target)!,
            )
            .filter((value) => value !== undefined);
          positions[`${node.id}:${kind}-${port.id}`] = {
            x: peers.length
              ? Number(
                  peers.reduce((sum, value) => sum + value, 0) / peers.length >=
                    center,
                )
              : Number(kind === "client"),
            y: 0.5,
          };
        }
      }
      return { ...node, data: { ...node.data, portPositions: positions } };
    });
  }, [nodes, edges]);
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
      if (
        client?.integrations.some((item) => item.api_id === selection.port.id)
      ) {
        toast.error(
          "An integration with this API already exists. Choose another API.",
        );
        return;
      }
      if (
        !source ||
        !client ||
        !canBind(source, client, selection.component, selection.port.id)
      ) {
        toast.error("Choose an API on another component in this product.");
        return;
      }
      setBinding({ ...pending, targetAPIID: selection.port.id });
      setPending(null);
    },
    [pending, components],
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
        ...previous.find((node) => node.id === String(component.id)),
        id: String(component.id),
        type: "component",
        ariaLabel: component.name,
        position: positions.current[String(component.id)],
        selected: selectionMode
          ? !!previous.find((node) => node.id === String(component.id))
              ?.selected &&
            (filter === "all" ||
              (filter === "infrastructure") ===
                (component.type === "infrastructure"))
          : component.id === selectedID,
        hidden:
          (filter === "services" && component.type === "infrastructure") ||
          (filter === "infrastructure" &&
            component.type !== "infrastructure") ||
          !!(neighborsOnly && neighbors && !neighbors.has(component.id)),
        data: {
          component,
          interactionsDisabled: selectionMode,
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
    selectionMode,
    components,
    selectedID,
    neighbors,
    neighborsOnly,
    filter,
    pending?.clientID,
    onPort,
    setNodes,
    resetRemove,
  ]);
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (
        (event.target as HTMLElement)?.closest?.(
          '[role="dialog"], [role="alertdialog"], input, textarea, [contenteditable="true"]',
        )
      )
        return;
      if (bulkTargets || binding || creating || deleting) return;
      // A focused tool's tooltip may consume Escape; it must not block canvas cancellation.
      const toolFocused = (event.target as HTMLElement)?.closest?.(
        ".map-tool-rail",
      );
      if (event.key === "Escape" && (!event.defaultPrevented || toolFocused)) {
        if (openTool) {
          mapRoot.current
            ?.querySelector<HTMLButtonElement>(`[data-tool="${openTool}"]`)
            ?.focus();
          setOpenTool(null);
          return;
        }
        if (selectionMode) clearSelection();
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
  }, [
    binding,
    creating,
    deleting,
    bulkTargets,
    selectionMode,
    clearSelection,
    openTool,
  ]);
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
      (item) =>
        `client-${item.id}` ===
        connection.sourceHandle?.replace(/-alternate$/, ""),
    );
    const api = target?.apis.find(
      (item) =>
        `api-${item.id}` ===
        connection.targetHandle?.replace(/-alternate$/, ""),
    );
    if (
      source &&
      target &&
      client &&
      api &&
      canBind(source, client, target, api.id)
    ) {
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
      saveLayout(id, {
        positions: next,
      });
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
    <div
      className={`architecture-page ${selectionMode ? "map-selection-mode" : ""}`}
      ref={mapRoot}
    >
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
      <div className="map-canvas">
        <MapTools
          open={openTool}
          onTool={activateTool}
          onClose={() => setOpenTool(null)}
          selectionMode={selectionMode}
          connecting={connecting || !!pending}
          pending={!!pending}
          count={selectedNodes.length}
          busy={layoutBusy || bulkBusy}
          onSelectAll={() =>
            setNodes((current) =>
              current.map((node) => ({ ...node, selected: !node.hidden })),
            )
          }
          onClear={clearSelection}
          onDelete={() => {
            setBulkError(null);
            setBulkTargets(selectedNodes.map((node) => Number(node.id)));
          }}
          onCancelConnection={() => {
            setPending(null);
            setConnecting(false);
            setOpenTool(null);
          }}
          onCreate={(type) => {
            setOpenTool(null);
            setCreating(type);
          }}
          filter={filter}
          onFilter={(value) => {
            clearSelection();
            setFilter(value);
          }}
          neighborsOnly={neighborsOnly}
          hasSelected={!!selectedID}
          onNeighbors={() => setNeighborsOnly(!neighborsOnly)}
          connectionStyle={newConnectionStyle}
          onConnectionStyle={setNewConnectionStyle}
        />
        <ReactFlow
          nodes={renderedNodes}
          edges={edges
            .filter(
              (edge) =>
                visibleIDs.has(edge.source) && visibleIDs.has(edge.target),
            )
            .map((edge) => ({
              ...edge,
              selected: edge.id === edgeID,
              markerEnd:
                (
                  connectionStyles[edge.data!.integration.id] ||
                  defaultConnectionStyle
                ).arrow === "none"
                  ? undefined
                  : {
                      type:
                        (
                          connectionStyles[edge.data!.integration.id] ||
                          defaultConnectionStyle
                        ).arrow === "open"
                          ? MarkerType.Arrow
                          : MarkerType.ArrowClosed,
                      color: edge.style?.stroke as string,
                      width: 16,
                      height: 16,
                    },
              data: {
                ...edge.data!,
                connectionStyle:
                  connectionStyles[edge.data!.integration.id] ||
                  defaultConnectionStyle,
                onSelect: () => {
                  if (selectionMode) return;
                  setEdgeID(edge.id);
                  setSelectedID(null);
                },
              },
              style: {
                ...edge.style,
                strokeDasharray: {
                  solid: undefined,
                  dashed: "8 5",
                  dotted: "2 5",
                }[
                  (
                    connectionStyles[edge.data!.integration.id] ||
                    defaultConnectionStyle
                  ).stroke
                ],
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
            if (selectionMode) return;
            setSelectedID(Number(node.id));
            setEdgeID(null);
          }}
          onEdgeClick={(_, edge) => {
            if (selectionMode) return;
            setEdgeID(edge.id);
            setSelectedID(null);
          }}
          onPaneClick={() => {
            if (openTool) {
              mapRoot.current
                ?.querySelector<HTMLButtonElement>(`[data-tool="${openTool}"]`)
                ?.focus();
              setOpenTool(null);
              return;
            }
            if (selectionMode) clearSelection();
            setSelectedID(null);
            setEdgeID(null);
          }}
          selectionOnDrag={selectionMode}
          selectionMode={SelectionMode.Partial}
          selectionKeyCode={null}
          multiSelectionKeyCode={selectionMode ? "Shift" : null}
          panOnDrag={selectionMode ? [1, 2] : true}
          edgesFocusable={!selectionMode}
          onSelectionDragStop={(_, movedNodes) =>
            persist(undefined, movedNodes)
          }
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
          nodesConnectable={!selectionMode}
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
              description="Create services and infrastructure, then integrate their clients and APIs."
            >
              <CreateComponentButton onSelect={setCreating} />
            </EmptyState>
          </div>
        ) : null}
        {(pending || connecting) && openTool !== "connect" ? (
          <div className="connection-hint">
            <span>
              {pending
                ? "Select an API on another component for this integration."
                : "Select a client to create an integration."}
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
              aria-label="Cancel integration"
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
            aria-label={selected ? "Component details" : "Integration details"}
          >
            {!selected ? (
              <div className="panel-top">
                <span>{selected ? "Component" : "Integration"}</span>
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
                onDeleted={() => setSelectedID(null)}
              />
            ) : selectedEdge?.data ? (
              <div className="connection-details">
                <h2>Integration</h2>
                <span className="connection-action">
                  {selectedEdge.data.integration.action}
                </span>
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
                      {targetAPIName(
                        selectedEdge.data.targetComponent,
                        selectedEdge.data.apiID,
                      )}
                    </dd>
                  </div>
                  <div>
                    <dt>Communication</dt>
                    <dd>{selectedEdge.data.client.communication_type}</dd>
                  </div>
                  <div>
                    <dt>Secure integration</dt>
                    <dd>
                      {selectedEdge.data.client.secure_connection
                        ? "Yes"
                        : "No"}
                    </dd>
                  </div>
                </dl>
                <IntegrationDetails
                  key={selectedEdge.data.integration.id}
                  integration={selectedEdge.data.integration}
                  onDeleted={() => setEdgeID(null)}
                />
              </div>
            ) : null}
          </aside>
        ) : null}
      </div>
      <footer className="map-status">
        <span>
          <CircleHelp size={13} />
          {selectionMode
            ? "Drag a box to select · Shift-click to add · Drag selection to move · Esc to clear"
            : "Drag to move · Scroll to zoom · Esc to cancel"}
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
          connectionStyle={newConnectionStyle}
          onClose={() => setBinding(null)}
        />
      ) : null}
      <ConfirmDialog
        open={bulkTargets !== null}
        title={`Delete ${bulkTargets?.length || 0} selected ${bulkTargets?.length === 1 ? "component" : "components"}?`}
        description="The selected components, their APIs, clients and related integrations will be permanently deleted. This cannot be undone."
        label="Delete selected"
        busy={bulkBusy}
        error={bulkError}
        onCancel={() => {
          if (!bulkBusy) setBulkTargets(null);
        }}
        onConfirm={() => void deleteSelected()}
      />
      <ConfirmDialog
        open={!!deleting}
        title={`Delete ${deleting?.kind === "api" ? "API" : "client"}?`}
        description={
          deleting?.kind === "api"
            ? "Integrations using this API will be removed. This cannot be undone."
            : "This client and its integrations will be removed. This cannot be undone."
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
