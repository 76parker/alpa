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
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Boxes, ExternalLink, GripVertical, Network, RotateCcw, Server } from 'lucide-react';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import type { Component, ComponentAPI, Product } from '../../lib/inventory/contracts';
import {
  architectureNodeHeight,
  architectureNodeWidth,
  buildArchitectureGraph,
  componentNodeID,
  consumerHandleID,
  providerHandleID,
  type ArchitectureNode,
  type ArchitectureNodeData,
} from '../../lib/inventory/architecture-graph';
import { TooltipTrigger } from '../tooltip-trigger';

const nodeTypes = { architecture: ArchitectureNodeCard };
const layoutStoragePrefix = 'alpa:architecture-layout-v1:';
const keyboardNudge = 24;

type SavedPosition = { x: number; y: number };
type KeyboardMove = { nodeID: string; origin: SavedPosition };

type ArchitectureNodeInteractions = {
  canDrag: boolean;
  keyboardMovingNodeID: string | null;
  onOpenComponent: (component: Component) => void;
  beginKeyboardMove: (nodeID: string) => void;
  nudgeNode: (nodeID: string, x: number, y: number) => void;
  commitKeyboardMove: () => void;
  cancelKeyboardMove: () => void;
};

const ArchitectureNodeInteractionsContext = createContext<ArchitectureNodeInteractions | null>(null);

function layoutStorageKey(productID: number) {
  return `${layoutStoragePrefix}${productID}`;
}

function readSavedPositions(productID: number): Record<string, SavedPosition> {
  if (typeof window === 'undefined') return {};
  try {
    const value: unknown = JSON.parse(window.localStorage.getItem(layoutStorageKey(productID)) ?? '{}');
    if (!value || typeof value !== 'object') return {};
    return Object.fromEntries(Object.entries(value).flatMap(([nodeID, position]) => {
      if (!position || typeof position !== 'object') return [];
      const { x, y } = position as Partial<SavedPosition>;
      return typeof x === 'number' && Number.isFinite(x) && typeof y === 'number' && Number.isFinite(y) ? [[nodeID, { x, y }]] : [];
    }));
  } catch {
    return {};
  }
}

function restoreSavedPositions(nodes: ArchitectureNode[], productID: number) {
  const saved = readSavedPositions(productID);
  return nodes.map((node) => saved[node.id] ? { ...node, position: saved[node.id] } : node);
}

function hasSavedLayout(productID: number) {
  return Object.keys(readSavedPositions(productID)).length > 0;
}

function saveNodePositions(productID: number, nodes: ArchitectureNode[]) {
  if (typeof window === 'undefined') return;
  const positions = Object.fromEntries(nodes.map((node) => [node.id, { x: node.position.x, y: node.position.y }]));
  window.localStorage.setItem(layoutStorageKey(productID), JSON.stringify(positions));
}

function useFinePointer() {
  const [finePointer, setFinePointer] = useState(() => typeof window === 'undefined' || !window.matchMedia || window.matchMedia('(hover: hover) and (pointer: fine)').matches);

  useEffect(() => {
    if (!window.matchMedia) return;
    const query = window.matchMedia('(hover: hover) and (pointer: fine)');
    const update = () => setFinePointer(query.matches);
    update();
    query.addEventListener?.('change', update);
    return () => query.removeEventListener?.('change', update);
  }, []);

  return finePointer;
}

export function ArchitectureMap({ product, components, onOpenComponent }: { product: Product; components: Component[]; onOpenComponent: (component: Component) => void }) {
  const graph = useMemo(() => buildArchitectureGraph(components), [components]);
  const canDrag = useFinePointer();
  const [nodes, setNodes] = useState<ArchitectureNode[]>(() => restoreSavedPositions(graph.nodes, product.id));
  const nodesRef = useRef(nodes);
  const [layoutSaved, setLayoutSaved] = useState(() => hasSavedLayout(product.id));
  const [keyboardMove, setKeyboardMove] = useState<KeyboardMove | null>(null);

  useEffect(() => {
    const restored = restoreSavedPositions(graph.nodes, product.id);
    nodesRef.current = restored;
    setNodes(restored);
    setLayoutSaved(hasSavedLayout(product.id));
    setKeyboardMove(null);
  }, [graph, product.id]);

  useEffect(() => {
    nodesRef.current = nodes;
  }, [nodes]);

  const persistLayout = useCallback((nextNodes: ArchitectureNode[]) => {
    saveNodePositions(product.id, nextNodes);
    setLayoutSaved(true);
  }, [product.id]);

  const onNodesChange: OnNodesChange<ArchitectureNode> = (changes) => {
    setNodes((current) => {
      const nextNodes = applyNodeChanges(changes, current) as ArchitectureNode[];
      nodesRef.current = nextNodes;
      return nextNodes;
    });
  };

  const onNodeDragStop: OnNodeDrag<ArchitectureNode> = (_event, node) => {
    setNodes((current) => {
      const nextNodes = current.map((item) => item.id === node.id ? { ...item, position: node.position } : item);
      nodesRef.current = nextNodes;
      persistLayout(nextNodes);
      return nextNodes;
    });
  };

  const beginKeyboardMove = useCallback((nodeID: string) => {
    if (!canDrag) return;
    setKeyboardMove((current) => {
      if (current?.nodeID === nodeID) return current;
      const node = nodesRef.current.find((item) => item.id === nodeID);
      return node ? { nodeID, origin: { x: node.position.x, y: node.position.y } } : current;
    });
  }, [canDrag]);

  const nudgeNode = useCallback((nodeID: string, x: number, y: number) => {
    if (!canDrag) return;
    setNodes((current) => {
      const nextNodes = current.map((node) => node.id === nodeID ? { ...node, position: { x: node.position.x + x, y: node.position.y + y } } : node);
      nodesRef.current = nextNodes;
      return nextNodes;
    });
  }, [canDrag]);

  const commitKeyboardMove = useCallback(() => {
    if (!keyboardMove) return;
    persistLayout(nodesRef.current);
    setKeyboardMove(null);
  }, [keyboardMove, persistLayout]);

  const cancelKeyboardMove = useCallback(() => {
    if (!keyboardMove) return;
    setNodes((current) => {
      const nextNodes = current.map((node) => node.id === keyboardMove.nodeID ? { ...node, position: keyboardMove.origin } : node);
      nodesRef.current = nextNodes;
      return nextNodes;
    });
    setKeyboardMove(null);
  }, [keyboardMove]);

  const resetLayout = useCallback(() => {
    window.localStorage.removeItem(layoutStorageKey(product.id));
    nodesRef.current = graph.nodes;
    setNodes(graph.nodes);
    setLayoutSaved(false);
    setKeyboardMove(null);
  }, [graph.nodes, product.id]);

  const interactions = useMemo<ArchitectureNodeInteractions>(() => ({
    canDrag,
    keyboardMovingNodeID: keyboardMove?.nodeID ?? null,
    onOpenComponent,
    beginKeyboardMove,
    nudgeNode,
    commitKeyboardMove,
    cancelKeyboardMove,
  }), [beginKeyboardMove, canDrag, cancelKeyboardMove, commitKeyboardMove, keyboardMove?.nodeID, nudgeNode, onOpenComponent]);

  return <ArchitectureNodeInteractionsContext value={interactions}><section className="topology-shell architecture-map" aria-label={`${product.name} architecture map`}>
    <header className="topology-toolbar">
      <div className="topology-context"><span className="live-dot" aria-hidden="true" /><div><strong>Component relationships</strong><small>{components.length} {components.length === 1 ? 'component' : 'components'} · {graph.edges.length} {graph.edges.length === 1 ? 'connection' : 'connections'}</small></div></div>
      <div className="topology-tools"><span className="architecture-map-hint"><Network size={13} aria-hidden="true" />{canDrag ? 'Drag cards to arrange' : 'View-only on touch devices'}</span>{layoutSaved ? <button type="button" className="architecture-reset-layout" onClick={resetLayout}><RotateCcw size={13} aria-hidden="true" />Reset layout</button> : null}</div>
    </header>
    <div className="topology-canvas architecture-canvas" data-testid="architecture-canvas">
      <ReactFlow
        nodes={nodes}
        edges={graph.edges}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        onNodeDragStop={onNodeDragStop}
        nodesDraggable={canDrag}
        nodesConnectable={false}
        elementsSelectable={false}
        panOnDrag
        zoomOnScroll
        zoomOnPinch
        zoomOnDoubleClick={false}
        fitView
        fitViewOptions={{ padding: 0.24, minZoom: 0.45, maxZoom: 1.1 }}
        aria-label={`${product.name} component relationship graph`}
      >
        <Background color="rgba(120,199,255,.11)" gap={24} size={1} />
        <Controls showInteractive={false} />
      </ReactFlow>
    </div>
    <span className="sr-only" aria-live="polite">{keyboardMove ? `Moving ${nodes.find((node) => node.id === keyboardMove.nodeID)?.data.component.name}. Use arrow keys to reposition, Enter to save, or Escape to cancel.` : ''}</span>
  </section></ArchitectureNodeInteractionsContext>;
}

function ArchitectureNodeCard({ data }: NodeProps<ArchitectureNode>) {
  const { component, providerAPIs } = data as ArchitectureNodeData;
  const interactions = useArchitectureNodeInteractions();
  const consumerAPIs = component.apis.filter((api) => api.role === 'consumer');
  const height = architectureNodeHeight(component);
  const width = architectureNodeWidth(component);

  return <article className={`architecture-node ${providerAPIs.length ? 'has-provider-apis' : ''}`} data-testid={`architecture-node-${component.id}`} style={{ height, width }}>
    {providerAPIs.map((api, index) => <Handle
      key={providerHandleID(api.id)}
      id={providerHandleID(api.id)}
      type="target"
      position={Position.Left}
      className="architecture-provider-handle"
      style={{ top: handlePercent(index, providerAPIs.length), left: 0 }}
      aria-label={`Provided API connection for ${api.name}`}
    />)}
    {consumerAPIs.map((api, index) => <Handle
      key={consumerHandleID(api.id)}
      id={consumerHandleID(api.id)}
      type="source"
      position={Position.Right}
      className="architecture-consumer-handle"
      style={{ top: handlePercent(index, consumerAPIs.length), right: 0 }}
      aria-label={`Consumed API connection for ${api.name}`}
    />)}
    <TooltipTrigger
      ariaLabel={`Show details for ${component.name}`}
      buttonClassName="architecture-node-trigger nodrag nopan"
      content={<ComponentTooltip component={component} />}
      accessibleContent={componentTooltipText(component)}
      tooltipClassName="architecture-tooltip"
    ><span className="sr-only">Show details for {component.name}</span></TooltipTrigger>
    {providerAPIs.length ? <div className="architecture-provider-rail" aria-label={`Provided APIs for ${component.name}`}>
      {providerAPIs.map((api) => <div className="architecture-provider-row" data-testid={`architecture-provider-api-${api.id}`} key={api.id}><APIBadge api={api} /></div>)}
    </div> : null}
    <div className={`architecture-node-body ${providerAPIs.length ? '' : 'full'}`}>
      <span className="architecture-node-heading" aria-hidden="true">
        <span className={`architecture-node-icon ${component.type === 'Infrastructure' ? 'infrastructure' : ''}`}>
          {component.type === 'Infrastructure' ? <Boxes size={16} /> : <Server size={16} />}
        </span>
        <span className="architecture-node-copy"><strong>{component.name}</strong><small>{component.type}</small></span>
      </span>
      <span className="architecture-node-actions">
        {interactions.canDrag ? <MoveHandle component={component} /> : null}
        <button type="button" className="architecture-node-open nodrag nopan" aria-label={`Open component ${component.name}`} onClick={() => interactions.onOpenComponent(component)}><ExternalLink size={18} aria-hidden="true" /></button>
      </span>
    </div>
  </article>;
}

function MoveHandle({ component }: { component: Component }) {
  const { keyboardMovingNodeID, beginKeyboardMove, nudgeNode, commitKeyboardMove, cancelKeyboardMove } = useArchitectureNodeInteractions();
  const moving = keyboardMovingNodeID === componentNodeID(component.id);

  function onKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    const distance = event.shiftKey ? keyboardNudge * 3 : keyboardNudge;
    const offsets: Record<string, [number, number]> = {
      ArrowUp: [0, -distance],
      ArrowDown: [0, distance],
      ArrowLeft: [-distance, 0],
      ArrowRight: [distance, 0],
    };
    if (event.key === 'Escape') {
      event.preventDefault();
      cancelKeyboardMove();
      return;
    }
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      if (moving) commitKeyboardMove();
      else beginKeyboardMove(componentNodeID(component.id));
      return;
    }
    const offset = offsets[event.key];
    if (!offset) return;
    event.preventDefault();
    if (!moving) beginKeyboardMove(componentNodeID(component.id));
    nudgeNode(componentNodeID(component.id), ...offset);
  }

  return <button
    type="button"
    className="architecture-node-drag-handle"
    aria-label={`Move component ${component.name}`}
    aria-pressed={moving}
    onBlur={() => { if (moving) commitKeyboardMove(); }}
    onKeyDown={onKeyDown}
  ><GripVertical size={18} aria-hidden="true" /></button>;
}

function useArchitectureNodeInteractions() {
  const interactions = useContext(ArchitectureNodeInteractionsContext);
  if (!interactions) throw new Error('Architecture nodes must render inside ArchitectureMap.');
  return interactions;
}

function APIBadge({ api }: { api: ComponentAPI }) {
  return <TooltipTrigger
    ariaLabel={`Show details for API ${api.name}`}
    buttonClassName="architecture-api-badge nodrag nopan"
    content={<APITooltip api={api} />}
    accessibleContent={apiTooltipText(api)}
    tooltipClassName="architecture-tooltip"
    title={apiTooltipText(api)}
  >{api.api_type}</TooltipTrigger>;
}

function ComponentTooltip({ component }: { component: Component }) {
  return <TooltipRows rows={[
    ['Description', component.description || 'No description provided.'],
    ['ID', String(component.id)],
    ['Type', component.type],
    ...componentFacts(component),
    ['Provider APIs', String(component.apis.filter((api) => api.role === 'provider').length)],
    ['Consumer APIs', String(component.apis.filter((api) => api.role === 'consumer').length)],
  ]} />;
}

function APITooltip({ api }: { api: ComponentAPI }) {
  return <TooltipRows rows={[
    ['Name', api.name],
    ['ID', String(api.id)],
    ['Type', api.api_type],
    ['Network exposure', api.network_exposure],
    ['Role', api.role],
  ]} />;
}

function TooltipRows({ rows }: { rows: Array<[string, string]> }) {
  return <span className="architecture-tooltip-content">{rows.map(([label, value]) => <span className="architecture-tooltip-row" key={label}><strong>{label}:</strong><span>{value || '—'}</span></span>)}</span>;
}

function componentFacts(component: Component): Array<[string, string]> {
  if (component.type === 'Infrastructure') return [
    ['System', component.details.system],
    ['Version', component.details.version],
    ['Network address', component.details.network_address],
  ];

  const facts: Array<[string, string]> = [
    ['Language', component.details.language],
    ['Language version', component.details.language_version],
    ['Framework', component.details.framework],
  ];
  if (component.type === 'Background Worker') facts.push(['Broker', component.details.broker]);
  return facts;
}

function componentTooltipText(component: Component) {
  return [
    ['Description', component.description || 'No description provided.'],
    ['ID', String(component.id)],
    ['Type', component.type],
    ...componentFacts(component),
    ['Provider APIs', String(component.apis.filter((api) => api.role === 'provider').length)],
    ['Consumer APIs', String(component.apis.filter((api) => api.role === 'consumer').length)],
  ].map(([label, value]) => `${label}: ${value || '—'}`).join(' · ');
}

function apiTooltipText(api: ComponentAPI) {
  return [
    ['Name', api.name],
    ['ID', String(api.id)],
    ['Type', api.api_type],
    ['Network exposure', api.network_exposure],
    ['Role', api.role],
  ].map(([label, value]) => `${label}: ${value || '—'}`).join(' · ');
}

function handlePercent(index: number, count: number) {
  return `${((index + 0.5) / Math.max(count, 1)) * 100}%`;
}
