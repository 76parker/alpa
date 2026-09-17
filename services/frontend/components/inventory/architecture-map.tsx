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
import { Boxes, ExternalLink, GripVertical, Network, RotateCcw, Server } from '../../src/ui/icons';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { apiTypeLabels, componentClientTypeLabels, componentTypeLabels, systemTypeLabels, type Component, type ComponentAPI, type ComponentClient, type Product } from '../../lib/inventory/contracts';
import {
  architectureNodeHeight,
  architectureNodeWidth,
  architectureClientHandleTop,
  architectureProviderHandleTop,
  apiHandleID,
  clientHandleID,
  buildArchitectureGraph,
  componentNodeID,
  consumerHandleID,
  isQueueStreamInfrastructure,
  providerHandleID,
  type ArchitectureNode,
  type ArchitectureNodeData,
} from '../../lib/inventory/architecture-graph';
import { TooltipTrigger } from '../tooltip-trigger';
import { Button } from '../../src/ui';

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
      <div className="topology-tools"><span className="architecture-map-hint"><Network width={13} height={13} aria-hidden="true" />{canDrag ? 'Drag cards to arrange' : 'View-only on touch devices'}</span>{layoutSaved ? <Button type="button" className="architecture-reset-layout" onClick={resetLayout}><RotateCcw width={13} height={13} aria-hidden="true" />Reset layout</Button> : null}</div>
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
        <Background color="#d2d7df" gap={24} size={1} />
        <Controls showInteractive={false} />
      </ReactFlow>
    </div>
    <span className="sr-only" aria-live="polite">{keyboardMove ? `Moving ${nodes.find((node) => node.id === keyboardMove.nodeID)?.data.component.name}. Use arrow keys to reposition, Enter to save, or Escape to cancel.` : ''}</span>
  </section></ArchitectureNodeInteractionsContext>;
}

function ArchitectureNodeCard({ data }: NodeProps<ArchitectureNode>) {
  const { component, providerAPIs } = data as ArchitectureNodeData;
  if (component.clients !== undefined) return <ClientArchitectureNodeCard data={data as ArchitectureNodeData} />;
  const consumerAPIs = component.apis.filter((api) => api.role === 'consumer');
  const height = architectureNodeHeight(component);
  const width = architectureNodeWidth(component);
  const queueStreamInfrastructure = isQueueStreamInfrastructure(component);

  return <article className={`architecture-node ${providerAPIs.length ? 'has-provider-apis' : 'without-provider-apis'} ${queueStreamInfrastructure ? 'queue-stream-infrastructure' : ''}`} data-testid={`architecture-node-${component.id}`} style={{ height, width }}>
    {providerAPIs.map((api, index) => <Handle
      key={providerHandleID(api.id)}
      id={providerHandleID(api.id)}
      type="target"
      position={Position.Left}
      className="architecture-provider-handle"
      style={{ top: architectureProviderHandleTop(component, index, providerAPIs.length), left: 0 }}
      aria-label={`Provided API connection for ${api.name}`}
    />)}
    {consumerAPIs.map((api, index) => {
      return <Handle
        key={consumerHandleID(api.id)}
        id={consumerHandleID(api.id)}
        type="source"
        position={Position.Right}
        className="architecture-consumer-handle"
        style={{ top: handlePercent(index, consumerAPIs.length), right: 0 }}
        aria-label={`Consumed API connection for ${api.name}`}
      />;
    })}
    <TooltipTrigger
      ariaLabel={`Show details for ${component.name}`}
      buttonClassName="architecture-node-trigger nodrag nopan"
      content={<ComponentTooltip component={component} />}
      accessibleContent={componentTooltipText(component)}
      tooltipClassName="architecture-tooltip"
    ><span className="sr-only">Show details for {component.name}</span></TooltipTrigger>
    {queueStreamInfrastructure
      ? <>
        <ArchitectureNodeActions component={component} />
        <QueueStreamNodeContent component={component} providerAPIs={providerAPIs} />
      </>
      : <>
        {providerAPIs.length ? <div className="architecture-provider-rail" aria-label={`Provided APIs for ${component.name}`}>
          {providerAPIs.map((api) => <div className="architecture-provider-row" data-testid={`architecture-provider-api-${api.id}`} key={api.id}><APIBadge api={api} /></div>)}
        </div> : null}
        <div className={`architecture-node-body ${providerAPIs.length ? '' : 'full'}`}>
          <ComponentHeading component={component} />
          <ArchitectureNodeActions component={component} />
        </div>
      </>}
  </article>;
}

function ClientArchitectureNodeCard({ data }: { data: ArchitectureNodeData }) {
  const { component, apis, clients, clientHandleIDs } = data;
  const height = architectureNodeHeight(component);
  const width = architectureNodeWidth(component);
  const hasAPIs = apis.length > 0;
  const hasClients = clients.length > 0;

  return <article className={`architecture-node architecture-node-client-model ${hasAPIs ? 'has-provider-apis has-apis' : 'without-provider-apis'} ${hasClients ? 'has-clients' : ''}`} data-testid={`architecture-node-${component.id}`} style={{ height, width }}>
    {apis.map((api, index) => <Handle
      key={apiHandleID(api.id)}
      id={apiHandleID(api.id)}
      type="target"
      position={Position.Left}
      className="architecture-api-handle architecture-provider-handle"
      style={{ top: architectureProviderHandleTop(component, index, apis.length), left: -1 }}
      aria-label={`API connection for ${api.name}`}
    />)}
    {clients.map((client, index) => {
      const handleID = clientHandleIDs[client.id] ?? clientHandleID(client.id);
      return <Handle
        key={handleID}
        id={handleID}
        type="source"
        position={Position.Right}
        className="architecture-client-handle architecture-consumer-handle"
        style={{ top: architectureClientHandleTop(index, clients.length), right: -1 }}
        aria-label={`Client connection for ${componentClientTypeLabels[client.client_type]}`}
      />;
    })}
    <TooltipTrigger
      ariaLabel={`Show details for ${component.name}`}
      buttonClassName="architecture-node-trigger nodrag nopan"
      content={<ComponentTooltip component={component} />}
      accessibleContent={componentTooltipText(component)}
      tooltipClassName="architecture-tooltip"
    ><span className="sr-only">Show details for {component.name}</span></TooltipTrigger>
    <div className="architecture-node-client-grid">
      {hasAPIs ? <div className="architecture-api-rail" aria-label={`APIs for ${component.name}`}>
        {apis.map((api) => <div className="architecture-api-row" data-testid={`architecture-api-${api.id}`} key={api.id}><APIBadge api={api} /></div>)}
      </div> : null}
      <div className="architecture-node-body architecture-node-body-client">
        <ComponentHeading component={component} />
        {!hasClients ? <ArchitectureNodeActions component={component} /> : null}
      </div>
      {hasClients ? <div className="architecture-client-rail" aria-label={`Clients for ${component.name}`}>
        <ArchitectureNodeActions component={component} />
        {clients.map((client) => <div className="architecture-client-row" data-testid={`architecture-client-${client.id}`} key={client.id}><ClientBadge client={client} /></div>)}
      </div> : null}
    </div>
  </article>;
}

function ClientBadge({ client }: { client: ComponentClient }) {
  const label = componentClientTypeLabels[client.client_type];
  return <TooltipTrigger
    ariaLabel={`Show details for ${label}`}
    buttonClassName="architecture-client-badge nodrag nopan"
    content={<ClientTooltip client={client} />}
    accessibleContent={clientTooltipText(client)}
    tooltipClassName="architecture-tooltip"
    title={clientTooltipText(client)}
  >{label}</TooltipTrigger>;
}

function ClientTooltip({ client }: { client: ComponentClient }) {
  return <TooltipRows title={componentClientTypeLabels[client.client_type]} rows={[
    ['Type', componentClientTypeLabels[client.client_type]],
    ['ID', String(client.id)],
    ['Description', client.description],
    ['API ID', client.api_id ? String(client.api_id) : '—'],
  ]} />;
}

function QueueStreamNodeContent({ component, providerAPIs }: { component: Extract<Component, { type: 'infrastructure' }>; providerAPIs: ComponentAPI[] }) {
  return <>
    <header className="architecture-stream-header">
      <span className="architecture-node-heading" aria-hidden="true">
        <span className="architecture-node-icon infrastructure"><Boxes width={16} height={16} /></span>
        <span className="architecture-node-copy">
          <span className="architecture-stream-title-line">
            <strong>{component.name}</strong>
            <span className="architecture-stream-system-type">{systemTypeLabels[component.details.system_type]}</span>
          </span>
          <small>{componentTypeLabels[component.type]}</small>
        </span>
      </span>
    </header>
    {providerAPIs.length ? <div className="architecture-stream-api-list" aria-label={`Provided APIs for ${component.name}`}>
      {providerAPIs.map((api) => <QueueStreamAPIRow api={api} key={api.id} />)}
    </div> : null}
  </>;
}

function QueueStreamAPIRow({ api }: { api: ComponentAPI }) {
  return <div className="architecture-stream-api-row" data-testid={`architecture-provider-api-${api.id}`}>
    <TooltipTrigger
      ariaLabel={`Show details for API ${api.name}`}
      buttonClassName="architecture-stream-api-trigger nodrag nopan"
      content={<APITooltip api={api} />}
      accessibleContent={apiTooltipText(api)}
      tooltipClassName="architecture-tooltip"
      title={apiTooltipText(api)}
    >
      <span className="architecture-stream-api-type">{apiTypeLabels[api.api_type]}</span>
      <strong className="architecture-stream-api-name">{api.name}</strong>
    </TooltipTrigger>
  </div>;
}

function ComponentHeading({ component }: { component: Component }) {
  return <span className="architecture-node-heading" aria-hidden="true">
    <span className={`architecture-node-icon ${component.type === 'infrastructure' ? 'infrastructure' : ''}`}>
      {component.type === 'infrastructure' ? <Boxes width={16} height={16} /> : <Server width={16} height={16} />}
    </span>
    <span className="architecture-node-copy"><strong>{component.name}</strong><small>{componentTypeLabels[component.type]}</small></span>
  </span>;
}

function ArchitectureNodeActions({ component }: { component: Component }) {
  const interactions = useArchitectureNodeInteractions();
  return <span className="architecture-node-actions">
    {interactions.canDrag ? <MoveHandle component={component} /> : null}
    <Button type="button" className="architecture-node-open nodrag nopan" aria-label={`Open component ${component.name}`} onClick={() => interactions.onOpenComponent(component)}><ExternalLink width={18} height={18} aria-hidden="true" /></Button>
  </span>;
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

  return <Button
    type="button"
    className="architecture-node-drag-handle"
    aria-label={`Move component ${component.name}`}
    aria-pressed={moving}
    onClick={() => { if (moving) commitKeyboardMove(); else beginKeyboardMove(componentNodeID(component.id)); }}
    onBlur={() => { if (moving) commitKeyboardMove(); }}
    onKeyDown={onKeyDown}
  ><GripVertical width={18} height={18} aria-hidden="true" /></Button>;
}

function useArchitectureNodeInteractions() {
  const interactions = useContext(ArchitectureNodeInteractionsContext);
  if (!interactions) throw new Error('Architecture nodes must render inside ArchitectureMap.');
  return interactions;
}

function APIBadge({ api }: { api: ComponentAPI }) {
  return <TooltipTrigger
    ariaLabel={`Show details for API ${api.name}`}
    buttonClassName={`architecture-api-badge ${apiBadgeToneClass(api.api_type)} nodrag nopan`}
    content={<APITooltip api={api} />}
    accessibleContent={apiTooltipText(api)}
    tooltipClassName="architecture-tooltip"
    title={apiTooltipText(api)}
  >{apiTypeLabels[api.api_type]}</TooltipTrigger>;
}

function apiBadgeToneClass(apiType: ComponentAPI['api_type']) {
  if (['rest', 'websocket', 'exchange'].includes(apiType)) return 'api-tone-cyan';
  if (['graphql', 'odata', 'topic'].includes(apiType)) return 'api-tone-purple';
  if (['grpc', 'sse'].includes(apiType)) return 'api-tone-green';
  if (apiType === 'json-rpc') return 'api-tone-teal';
  if (['soap', 'event', 'event-consumer', 'queue'].includes(apiType)) return 'api-tone-yellow';
  return 'api-tone-muted';
}

function ComponentTooltip({ component }: { component: Component }) {
  const providerCount = component.apis.filter((api) => api.role !== 'consumer').length;
  const clientCount = component.clients?.length ?? component.apis.filter((api) => api.role === 'consumer').length;
  return <TooltipRows title={component.name} rows={[
    ['Description', component.description || 'No description provided.'],
    ['ID', String(component.id)],
    ['Type', componentTypeLabels[component.type]],
    ...componentFacts(component),
    ['APIs', String(providerCount)],
    ['Clients', String(clientCount)],
  ]} />;
}

function APITooltip({ api }: { api: ComponentAPI }) {
  return <TooltipRows rows={[
    ['Name', api.name],
    ['ID', String(api.id)],
    ['Type', apiTypeLabels[api.api_type]],
    ['Network exposure', api.network_exposure],
    ...(api.role ? [['Role', api.role] as [string, string]] : []),
  ]} />;
}

function TooltipRows({ title, rows }: { title?: string; rows: Array<[string, string]> }) {
  return <span className="architecture-tooltip-content">{title ? <strong className="architecture-tooltip-title" role="heading" aria-level={3}>{title}</strong> : null}{rows.map(([label, value]) => <span className="architecture-tooltip-row" key={label}><strong>{label}:</strong><span>{value || '—'}</span></span>)}</span>;
}

function componentFacts(component: Component): Array<[string, string]> {
  if (component.type === 'infrastructure') return [
    ['System', component.details.system],
    ['System type', systemTypeLabels[component.details.system_type]],
    ['Version', component.details.version],
    ['Network addresses', component.details.network_address.join(', ')],
  ];

  const facts: Array<[string, string]> = [
    ['Language', component.details.language],
    ['Language version', component.details.language_version],
    ['Framework', component.details.framework],
  ];
  return facts;
}

function componentTooltipText(component: Component) {
  const providerCount = component.apis.filter((api) => api.role !== 'consumer').length;
  const clientCount = component.clients?.length ?? component.apis.filter((api) => api.role === 'consumer').length;
  return [
    ['Description', component.description || 'No description provided.'],
    ['ID', String(component.id)],
    ['Type', componentTypeLabels[component.type]],
    ...componentFacts(component),
    ['APIs', String(providerCount)],
    ['Clients', String(clientCount)],
  ].map(([label, value]) => `${label}: ${value || '—'}`).join(' · ');
}

function apiTooltipText(api: ComponentAPI) {
  return [
    ['Name', api.name],
    ['ID', String(api.id)],
    ['Type', apiTypeLabels[api.api_type]],
    ['Network exposure', api.network_exposure],
    ...(api.role ? [['Role', api.role] as [string, string]] : []),
  ].map(([label, value]) => `${label}: ${value || '—'}`).join(' · ');
}

function clientTooltipText(client: ComponentClient) {
  return [
    ['Type', componentClientTypeLabels[client.client_type]],
    ['ID', String(client.id)],
    ['Description', client.description],
    ['API ID', client.api_id ? String(client.api_id) : '—'],
  ].map(([label, value]) => `${label}: ${value || '—'}`).join(' · ');
}

function handlePercent(index: number, count: number) {
  return `${((index + 0.5) / Math.max(count, 1)) * 100}%`;
}
