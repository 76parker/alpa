'use client';

import {
  Background,
  Controls,
  Handle,
  MarkerType,
  Position,
  ReactFlow,
  type Edge,
  type Node,
  type NodeProps,
} from '@xyflow/react';
import { Boxes, Database, ExternalLink, List, Network, Plus, Rows3 } from 'lucide-react';
import { useMemo } from 'react';
import type {
  ApplicationResource,
  Component,
  Locale,
  Team,
  TopologyEdge,
  TopologyNode,
} from '../lib/domain';

type MapNodeData = {
  label: string;
  subtitle: string;
  owner: string;
  source: string;
  state: 'Suggested' | 'Confirmed';
  kind: TopologyNode['kind'];
  componentKind?: Component['kind'];
};

type MapProps = {
  locale: Locale;
  nodes: TopologyNode[];
  edges: TopologyEdge[];
  teams: Team[];
  components: Component[];
  resources: ApplicationResource[];
  listMode: boolean;
  onToggleMode: () => void;
  onSelect: (kind: 'node' | 'edge', id: string) => void;
  onAddRelation: () => void;
};

const positions: Record<string, { x: number; y: number }> = {
  customer: { x: 0, y: 170 },
  'checkout-web': { x: 205, y: 170 },
  'orders-api': { x: 440, y: 170 },
  'orders-db': { x: 690, y: 30 },
  'payment-queue': { x: 690, y: 250 },
  'payment-worker': { x: 940, y: 250 },
  'payment-provider': { x: 1180, y: 250 },
  'auth-sdk': { x: 440, y: 390 },
};

function AtlasNode({ data }: NodeProps<Node<MapNodeData>>) {
  const Icon = data.kind === 'Resource' || data.componentKind === 'Infrastructure Component' ? Database : data.kind === 'External System' ? ExternalLink : data.kind === 'Actor' ? Rows3 : Boxes;
  return (
    <div className={`flow-node flow-${data.kind.toLowerCase().replace(' ', '-')}`}>
      <Handle type="target" position={Position.Left} />
      <Handle type="target" position={Position.Top} id="top" />
      <div className="flow-icon"><Icon size={16} strokeWidth={1.8} /></div>
      <div className="flow-copy"><strong>{data.label}</strong><small>{data.subtitle}</small></div>
      <span className={`flow-source ${data.state.toLowerCase()}`}>{data.source}</span>
      <div className="flow-owner">{data.owner}</div>
      <Handle type="source" position={Position.Right} />
      <Handle type="source" position={Position.Bottom} id="bottom" />
    </div>
  );
}

const nodeTypes = { atlas: AtlasNode };

export function TopologyMap({ locale, nodes, edges, teams, components, resources, listMode, onToggleMode, onSelect, onAddRelation }: MapProps) {
  const flowNodes = useMemo<Node<MapNodeData>[]>(() => {
    const teamName = (id?: string) => teams.find((team) => team.id === id)?.name ?? (locale === 'ru' ? 'Не назначена' : 'Unassigned');
    const trustZone: Node<MapNodeData> = {
      id: 'production-trust-zone',
      type: 'group',
      position: { x: 160, y: 0 },
      selectable: false,
      draggable: false,
      data: { label: 'Production trust zone', subtitle: '', owner: '', source: 'Manual', state: 'Confirmed', kind: 'Component' },
      style: { width: 1090, height: 520, zIndex: -1 },
      className: 'trust-zone',
    };
    return [trustZone, ...nodes.map((node, index) => {
      const component = components.find((item) => item.id === node.refId);
      const resource = resources.find((item) => item.id === node.refId);
      const subtitle = component?.kind ?? resource?.kind ?? node.kind;
      return {
        id: node.id,
        type: 'atlas',
        position: positions[node.id] ?? { x: 210 + (index % 4) * 230, y: 550 + Math.floor(index / 4) * 150 },
        draggable: false,
        selectable: true,
        data: {
          label: node.name,
          subtitle,
          owner: teamName(node.ownerTeamId),
          source: node.source,
          state: node.state,
          kind: node.kind,
          componentKind: component?.kind,
        },
      };
    })];
  }, [components, locale, nodes, resources, teams]);

  const flowEdges = useMemo<Edge[]>(() => edges.map((edge) => ({
    id: edge.id,
    source: edge.sourceId,
    target: edge.targetId,
    label: edge.type.replaceAll('_', ' ').toLowerCase(),
    markerEnd: { type: MarkerType.ArrowClosed, width: 14, height: 14, color: edge.crossesTrustBoundary ? '#d99a4a' : '#7890aa' },
    style: { stroke: edge.crossesTrustBoundary ? '#d99a4a' : '#7890aa', strokeWidth: 1.4 },
    labelStyle: { fill: '#aab6c4', fontSize: 8, fontWeight: 650 },
    labelBgStyle: { fill: '#151c25', fillOpacity: .96 },
    labelBgPadding: [4, 3],
    labelBgBorderRadius: 4,
  })), [edges]);

  return (
    <section className="topology-shell">
      <div className="topology-toolbar">
        <div className="topology-context"><span className="live-dot" /><strong>{locale === 'ru' ? 'Production topology' : 'Production topology'}</strong><small>{nodes.length} nodes · {edges.length} flows</small></div>
        <div className="topology-tools">
          <button type="button" className="button secondary compact" onClick={onToggleMode}>{listMode ? <Network size={14} /> : <List size={14} />}{listMode ? (locale === 'ru' ? 'Граф' : 'Graph') : (locale === 'ru' ? 'Список' : 'List')}</button>
          <button type="button" className="button primary compact" onClick={onAddRelation}><Plus size={14} />{locale === 'ru' ? 'Добавить связь' : 'Add relation'}</button>
        </div>
      </div>

      {listMode ? (
        <div className="topology-list table-scroll">
          <table className="data-table">
            <thead><tr><th>{locale === 'ru' ? 'Источник' : 'Source'}</th><th>{locale === 'ru' ? 'Связь' : 'Relation'}</th><th>{locale === 'ru' ? 'Назначение' : 'Target'}</th><th>Protocol</th><th>Trust</th><th>{locale === 'ru' ? 'Происхождение' : 'Provenance'}</th></tr></thead>
            <tbody>{edges.map((edge) => {
              const source = nodes.find((node) => node.id === edge.sourceId);
              const target = nodes.find((node) => node.id === edge.targetId);
              return (
                <tr key={edge.id} onClick={() => onSelect('edge', edge.id)}>
                  <td><button className="table-link" type="button" onClick={(event) => { event.stopPropagation(); onSelect('edge', edge.id); }}><strong>{source?.name}</strong></button></td><td><span className="relation-chip">{edge.type.replaceAll('_', ' ')}</span></td><td><strong>{target?.name}</strong></td>
                  <td>{edge.protocol ?? '—'}</td><td>{edge.crossesTrustBoundary ? 'Crosses boundary' : 'Internal'}</td><td><span className={`source-pill ${edge.state.toLowerCase()}`}>{edge.source} · {edge.confidence}%</span></td>
                </tr>
              );
            })}</tbody>
          </table>
        </div>
      ) : (
        <div className="topology-canvas" aria-label="Application topology map">
          <ReactFlow
            nodes={flowNodes}
            edges={flowEdges}
            nodeTypes={nodeTypes}
            fitView
            fitViewOptions={{ padding: .16 }}
            minZoom={.35}
            maxZoom={1.4}
            nodesDraggable={false}
            nodesConnectable={false}
            elementsSelectable
            onNodeClick={(_, node) => { if (node.id !== 'production-trust-zone') onSelect('node', node.id); }}
            onEdgeClick={(_, edge) => onSelect('edge', edge.id)}
            proOptions={{ hideAttribution: true }}
          >
            <Background gap={22} size={1} color="#2b3542" />
            <Controls showInteractive={false} position="bottom-right" />
          </ReactFlow>
        </div>
      )}
    </section>
  );
}
