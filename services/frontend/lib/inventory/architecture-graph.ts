import { MarkerType, type Edge, type Node } from '@xyflow/react';
import type { Component, ComponentAPI } from './contracts';

export type ArchitectureNodeData = {
  component: Component;
  providerAPIs: ComponentAPI[];
};

export type ArchitectureNode = Node<ArchitectureNodeData, 'architecture'>;

export type ArchitectureGraph = {
  nodes: ArchitectureNode[];
  edges: Edge[];
};

const COLUMN_GAP = 300;
const NODE_GAP = 36;
const ORIGIN_X = 80;
const ORIGIN_Y = 80;

export function buildArchitectureGraph(components: Component[]): ArchitectureGraph {
  const providerByAPI = new Map<number, Component>();
  for (const component of components) {
    for (const api of component.apis) {
      if (api.role === 'provider' && !providerByAPI.has(api.id)) providerByAPI.set(api.id, component);
    }
  }

  const adjacency = new Map<number, Set<number>>();
  for (const component of components) {
    const providers = new Set<number>();
    for (const api of component.apis) {
      if (api.role !== 'consumer') continue;
      const provider = providerByAPI.get(api.id);
      if (provider && provider.id !== component.id) providers.add(provider.id);
    }
    adjacency.set(component.id, providers);
  }

  const layers = dependencyLayers(components.map((component) => component.id), adjacency);
  const layerMembers = new Map<number, Component[]>();
  for (const component of components) {
    const layer = layers.get(component.id) ?? 0;
    const members = layerMembers.get(layer) ?? [];
    members.push(component);
    layerMembers.set(layer, members);
  }

  const maxLayerHeight = Math.max(0, ...Array.from(layerMembers.values(), layerHeight));
  const positions = new Map<number, { x: number; y: number }>();
  for (const [layer, members] of layerMembers) {
    let y = ORIGIN_Y + (maxLayerHeight - layerHeight(members)) / 2;
    for (const component of members) {
      positions.set(component.id, { x: ORIGIN_X + layer * COLUMN_GAP, y });
      y += architectureNodeHeight(component) + NODE_GAP;
    }
  }

  const nodes: ArchitectureNode[] = components.map((component) => ({
    id: componentNodeID(component.id),
    type: 'architecture',
    position: positions.get(component.id) ?? { x: ORIGIN_X, y: ORIGIN_Y },
    data: {
      component,
      providerAPIs: component.apis.filter((api) => api.role === 'provider'),
    },
  }));

  const edges: Edge[] = [];
  for (const component of components) {
    for (const api of component.apis) {
      if (api.role !== 'consumer') continue;
      const provider = providerByAPI.get(api.id);
      if (!provider || provider.id === component.id) continue;
      edges.push({
        id: edgeID(component.id, api.id),
        source: componentNodeID(component.id),
        sourceHandle: consumerHandleID(api.id),
        target: componentNodeID(provider.id),
        targetHandle: providerHandleID(api.id),
        type: 'smoothstep',
        markerEnd: { type: MarkerType.ArrowClosed },
        data: { api },
      });
    }
  }

  return { nodes, edges };
}

export function architectureNodeHeight(component: Component) {
  return Math.max(96, 68 + component.apis.filter((api) => api.role === 'provider').length * 32);
}

export function componentNodeID(componentID: number) {
  return `component-${componentID}`;
}

export function edgeID(componentID: number, apiID: number) {
  return `edge-${componentID}-${apiID}`;
}

export function providerHandleID(apiID: number) {
  return `provider-api-${apiID}`;
}

export function consumerHandleID(apiID: number) {
  return `consumer-api-${apiID}`;
}

function layerHeight(components: Component[]) {
  return components.reduce((height, component) => height + architectureNodeHeight(component), 0) + Math.max(0, components.length - 1) * NODE_GAP;
}

function dependencyLayers(componentIDs: number[], adjacency: Map<number, Set<number>>) {
  const stronglyConnected = stronglyConnectedComponents(componentIDs, adjacency);
  const componentToGroup = new Map<number, number>();
  stronglyConnected.forEach((members, group) => members.forEach((componentID) => componentToGroup.set(componentID, group)));

  const incoming = new Map<number, Set<number>>();
  stronglyConnected.forEach((_, group) => incoming.set(group, new Set()));
  for (const [componentID, providers] of adjacency) {
    const sourceGroup = componentToGroup.get(componentID)!;
    for (const providerID of providers) {
      const targetGroup = componentToGroup.get(providerID)!;
      if (sourceGroup !== targetGroup) incoming.get(targetGroup)?.add(sourceGroup);
    }
  }

  const groupLayers = new Map<number, number>();
  function groupLayer(group: number): number {
    const known = groupLayers.get(group);
    if (known !== undefined) return known;
    const sources = incoming.get(group) ?? new Set<number>();
    const value = sources.size ? Math.max(...Array.from(sources, groupLayer)) + 1 : 0;
    groupLayers.set(group, value);
    return value;
  }

  const result = new Map<number, number>();
  for (const componentID of componentIDs) result.set(componentID, groupLayer(componentToGroup.get(componentID)!));
  return result;
}

function stronglyConnectedComponents(componentIDs: number[], adjacency: Map<number, Set<number>>) {
  let nextIndex = 0;
  const indices = new Map<number, number>();
  const lowLinks = new Map<number, number>();
  const stack: number[] = [];
  const onStack = new Set<number>();
  const groups: number[][] = [];

  function visit(componentID: number) {
    indices.set(componentID, nextIndex);
    lowLinks.set(componentID, nextIndex);
    nextIndex += 1;
    stack.push(componentID);
    onStack.add(componentID);

    for (const providerID of adjacency.get(componentID) ?? []) {
      if (!indices.has(providerID)) {
        visit(providerID);
        lowLinks.set(componentID, Math.min(lowLinks.get(componentID)!, lowLinks.get(providerID)!));
      } else if (onStack.has(providerID)) {
        lowLinks.set(componentID, Math.min(lowLinks.get(componentID)!, indices.get(providerID)!));
      }
    }

    if (lowLinks.get(componentID) !== indices.get(componentID)) return;
    const group: number[] = [];
    let member: number;
    do {
      member = stack.pop()!;
      onStack.delete(member);
      group.push(member);
    } while (member !== componentID);
    groups.push(group);
  }

  for (const componentID of componentIDs) if (!indices.has(componentID)) visit(componentID);
  return groups;
}
