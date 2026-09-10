import {
  Background,
  Controls,
  Handle,
  Position,
  ReactFlow,
  applyNodeChanges,
  type NodeProps,
  type OnNodesChange,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Boxes, Network, Server } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import type { Component, ComponentAPI, Product } from '../../lib/inventory/contracts';
import {
  architectureNodeHeight,
  buildArchitectureGraph,
  consumerHandleID,
  providerHandleID,
  type ArchitectureNode,
  type ArchitectureNodeData,
} from '../../lib/inventory/architecture-graph';
import { TooltipTrigger } from '../tooltip-trigger';

const nodeTypes = { architecture: ArchitectureNodeCard };

export function ArchitectureMap({ product, components }: { product: Product; components: Component[] }) {
  const graph = useMemo(() => buildArchitectureGraph(components), [components]);
  const [nodes, setNodes] = useState<ArchitectureNode[]>(graph.nodes);

  useEffect(() => setNodes(graph.nodes), [graph.nodes]);

  const onNodesChange: OnNodesChange<ArchitectureNode> = (changes) => {
    setNodes((current) => applyNodeChanges(changes, current) as ArchitectureNode[]);
  };

  return <section className="topology-shell architecture-map" aria-label={`${product.name} architecture map`}>
    <header className="topology-toolbar">
      <div className="topology-context"><span className="live-dot" aria-hidden="true" /><div><strong>Component relationships</strong><small>{components.length} {components.length === 1 ? 'component' : 'components'} · {graph.edges.length} {graph.edges.length === 1 ? 'connection' : 'connections'}</small></div></div>
      <div className="topology-tools"><span className="architecture-map-hint"><Network size={13} aria-hidden="true" />Read-only map</span></div>
    </header>
    <div className="topology-canvas architecture-canvas" data-testid="architecture-canvas">
      <ReactFlow
        nodes={nodes}
        edges={graph.edges}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        nodesDraggable
        nodesConnectable={false}
        elementsSelectable
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
  </section>;
}

function ArchitectureNodeCard({ data }: NodeProps<ArchitectureNode>) {
  const { component, providerAPIs } = data as ArchitectureNodeData;
  const consumerAPIs = component.apis.filter((api) => api.role === 'consumer');
  const height = architectureNodeHeight(component);

  return <article className={`architecture-node ${providerAPIs.length ? 'has-provider-apis' : ''}`} data-testid={`architecture-node-${component.id}`} style={{ height }}>
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
    {providerAPIs.length ? <div className="architecture-provider-rail" aria-label={`Provided APIs for ${component.name}`}>
      {providerAPIs.map((api) => <div className="architecture-provider-row" data-testid={`architecture-provider-api-${api.id}`} key={api.id}><APIBadge api={api} /></div>)}
    </div> : null}
    <div className={`architecture-node-body ${providerAPIs.length ? '' : 'full'}`}>
      <TooltipTrigger
        ariaLabel={`Show details for ${component.name}`}
        buttonClassName="architecture-node-trigger nodrag"
        content={<ComponentTooltip component={component} />}
        accessibleContent={componentTooltipText(component)}
        tooltipClassName="architecture-tooltip"
      >
        <span className="architecture-node-heading">
          <span className={`architecture-node-icon ${component.type === 'Infrastructure' ? 'infrastructure' : ''}`} aria-hidden="true">
            {component.type === 'Infrastructure' ? <Boxes size={16} /> : <Server size={16} />}
          </span>
          <span className="architecture-node-copy"><strong>{component.name}</strong><small>{component.type}</small></span>
        </span>
      </TooltipTrigger>
    </div>
  </article>;
}

function APIBadge({ api }: { api: ComponentAPI }) {
  return <TooltipTrigger
    ariaLabel={`Show details for API ${api.name}`}
    buttonClassName="architecture-api-badge nodrag nopan"
    content={<APITooltip api={api} />}
    accessibleContent={apiTooltipText(api)}
    tooltipClassName="architecture-tooltip"
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
