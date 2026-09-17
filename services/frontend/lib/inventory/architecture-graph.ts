import { MarkerType, type Edge, type Node } from '@xyflow/react';
import { componentClientTypeLabels, componentTypeLabels, type APIType, type Component, type ComponentAPI, type ComponentClient, type ComponentClientType } from './contracts';

export type ArchitectureNodeData = {
  component: Component;
  apis: ComponentAPI[];
  clients: ComponentClient[];
  /** Legacy alias retained for existing consumers of the graph model. */
  providerAPIs: ComponentAPI[];
  clientHandleIDs: Record<number, string>;
};

export type ArchitectureNode = Node<ArchitectureNodeData, 'architecture'>;

export type ArchitectureGraph = {
  nodes: ArchitectureNode[];
  edges: Edge[];
};

const COLUMN_GAP = 96;
const LEGACY_COLUMN_GAP = 80;
const NODE_GAP = 36;
const ORIGIN_X = 80;
const ORIGIN_Y = 80;
const NODE_CONTENT_MIN_WIDTH = 238;
const NODE_LABEL_CHARACTER_WIDTH = 7;
const NODE_ICON_AND_PADDING_WIDTH = 96;
const API_RAIL_WIDTH = 88;
const CLIENT_RAIL_WIDTH = 130;
const QUEUE_STREAM_NODE_MIN_WIDTH = 320;
const QUEUE_STREAM_NODE_MAX_WIDTH = 440;
const QUEUE_STREAM_NAME_CHARACTER_WIDTH = 7;
const QUEUE_STREAM_HORIZONTAL_PADDING = 48;
const QUEUE_STREAM_HEADER_HEIGHT = 76;
const QUEUE_STREAM_API_ROW_HEIGHT = 60;
const QUEUE_STREAM_BOTTOM_PADDING = 6;
const NODE_BORDER_WIDTH = 2;
const COMPONENT_TYPE_ORDER: Component['type'][] = ['backend-service', 'infrastructure', 'frontend-service'];

export function buildArchitectureGraph(components: Component[]): ArchitectureGraph {
  const newModel = components.some((component) => component.clients !== undefined);
  const positions = newModel ? groupedPositions(components) : legacyDependencyPositions(components);
  const apiByID = new Map<number, { component: Component; api: ComponentAPI }>();
  for (const component of components) {
    for (const api of architectureAPIs(component)) {
      if (!apiByID.has(api.id)) apiByID.set(api.id, { component, api });
    }
  }

  const nodes: ArchitectureNode[] = components.map((component) => {
    const apis = architectureAPIs(component);
    const clients = architectureClients(component);
    const clientHandleIDs = Object.fromEntries(clients.map((client) => [client.id, client.legacyAPIID ? consumerHandleID(client.legacyAPIID) : clientHandleID(client.id)]));
    return {
      id: componentNodeID(component.id),
      type: 'architecture',
      position: positions.get(component.id) ?? { x: ORIGIN_X, y: ORIGIN_Y },
      dragHandle: '.architecture-node-drag-handle',
      style: { width: architectureNodeWidth(component) },
      data: {
        component,
        apis,
        clients,
        providerAPIs: apis,
        clientHandleIDs,
      },
    };
  });

  const edges = newModel ? buildClientEdges(components, apiByID) : buildLegacyEdges(components, apiByID);
  return { nodes, edges };
}

function buildClientEdges(components: Component[], apiByID: Map<number, { component: Component; api: ComponentAPI }>) {
  const edges: Edge[] = [];
  for (const component of components) {
    for (const client of architectureClients(component)) {
      const apiID = client.api_id;
      if (!apiID) continue;
      const target = apiByID.get(apiID);
      if (!target || target.component.id === component.id) continue;
      edges.push({
        id: clientEdgeID(component.id, client.id, apiID),
        source: componentNodeID(component.id),
        sourceHandle: clientHandleID(client.id),
        target: componentNodeID(target.component.id),
        targetHandle: apiHandleID(target.api.id),
        type: 'smoothstep',
        markerEnd: { type: MarkerType.ArrowClosed },
        ariaLabel: `${component.name} ${componentClientTypeLabels[client.client_type]} connects to ${target.component.name} ${target.api.name}`,
        data: { client, api: target.api },
      });
    }
  }
  return edges;
}

function buildLegacyEdges(components: Component[], apiByID: Map<number, { component: Component; api: ComponentAPI }>) {
  const edges: Edge[] = [];
  for (const component of components) {
    for (const api of component.apis) {
      if (api.role !== 'consumer') continue;
      const target = apiByID.get(api.id);
      if (!target || target.component.id === component.id) continue;
      edges.push({
        id: edgeID(component.id, api.id),
        source: componentNodeID(component.id),
        sourceHandle: consumerHandleID(api.id),
        target: componentNodeID(target.component.id),
        targetHandle: apiHandleID(target.api.id),
        type: 'smoothstep',
        markerEnd: { type: MarkerType.ArrowClosed },
        data: { api },
      });
    }
  }
  return edges;
}

function architectureAPIs(component: Component) {
  return component.clients !== undefined ? component.apis : component.apis.filter((api) => api.role !== 'consumer');
}

type ArchitectureClient = ComponentClient & { legacyAPIID?: number };

export function architectureClients(component: Component): ArchitectureClient[] {
  if (component.clients !== undefined) return component.clients;
  return component.apis.filter((api) => api.role === 'consumer').map((api) => ({
    id: api.id,
    client_type: legacyClientType(api.api_type),
    description: '',
    api_id: api.id,
    legacyAPIID: api.id,
  }));
}

function legacyClientType(apiType: APIType): ComponentClientType {
  const mapping: Partial<Record<APIType, ComponentClientType>> = {
    rest: 'rest-client', graphql: 'graphql-client', grpc: 'grpc-client', 'json-rpc': 'json-rpc-client', soap: 'soap-client', websocket: 'websocket-client', odata: 'odata-client', sse: 'sse-client',
  };
  return mapping[apiType] ?? 'native-protocol-client';
}

function groupedPositions(components: Component[]) {
  const positions = new Map<number, { x: number; y: number }>();
  let x = ORIGIN_X;
  for (const type of COMPONENT_TYPE_ORDER) {
    const members = components.filter((component) => component.type === type);
    if (!members.length) continue;
    let y = ORIGIN_Y;
    for (const component of members) {
      positions.set(component.id, { x, y });
      y += architectureNodeHeight(component) + NODE_GAP;
    }
    x += Math.max(...members.map(architectureNodeWidth)) + COLUMN_GAP;
  }
  return positions;
}

function legacyDependencyPositions(components: Component[]) {
  const providerByAPI = new Map<number, Component>();
  for (const component of components) for (const api of component.apis) if (api.role === 'provider' && !providerByAPI.has(api.id)) providerByAPI.set(api.id, component);
  const adjacency = new Map<number, Set<number>>(components.map((component) => [component.id, new Set()]));
  for (const component of components) for (const api of component.apis) {
    if (api.role !== 'consumer') continue;
    const provider = providerByAPI.get(api.id);
    if (!provider || provider.id === component.id) continue;
    adjacency.get(component.id)?.add(provider.id);
  }
  const layers = dependencyLayers(components.map((component) => component.id), adjacency);
  const layerMembers = new Map<number, Component[]>();
  for (const component of components) {
    const layer = layers.get(component.id) ?? 0;
    layerMembers.set(layer, [...(layerMembers.get(layer) ?? []), component]);
  }
  const maxLayerHeight = Math.max(0, ...Array.from(layerMembers.values(), layerHeight));
  const positions = new Map<number, { x: number; y: number }>();
  let x = ORIGIN_X;
  for (const [, members] of Array.from(layerMembers.entries()).sort(([first], [second]) => first - second)) {
    let y = ORIGIN_Y + (maxLayerHeight - layerHeight(members)) / 2;
    for (const component of members) {
      positions.set(component.id, { x, y });
      y += architectureNodeHeight(component) + NODE_GAP;
    }
    x += Math.max(...members.map(architectureNodeWidth)) + LEGACY_COLUMN_GAP;
  }
  return positions;
}

export function architectureNodeHeight(component: Component) {
  if (component.clients !== undefined) return Math.max(132, 76 + Math.max(component.apis.length, component.clients.length) * 32);
  if (isQueueStreamInfrastructure(component)) {
    const providerCount = component.apis.filter((api) => api.role === 'provider').length;
    return providerCount ? NODE_BORDER_WIDTH + QUEUE_STREAM_HEADER_HEIGHT + providerCount * QUEUE_STREAM_API_ROW_HEIGHT + QUEUE_STREAM_BOTTOM_PADDING : 116;
  }
  return Math.max(116, 68 + component.apis.filter((api) => api.role === 'provider').length * 32);
}

export function architectureNodeWidth(component: Component) {
  if (component.clients !== undefined) {
    const longestType = Array.from(componentTypeLabels[component.type]).length;
    // Client labels live in a fixed-width rail. They wrap inside that rail so a
    // verbose client type cannot make otherwise identical component cards wider.
    const contentWidth = Math.max(NODE_CONTENT_MIN_WIDTH, NODE_ICON_AND_PADDING_WIDTH + Math.max(Array.from(component.name).length, longestType) * NODE_LABEL_CHARACTER_WIDTH);
    return (component.apis.length ? API_RAIL_WIDTH : 0) + contentWidth + (component.clients?.length ? CLIENT_RAIL_WIDTH : 0);
  }
  if (isQueueStreamInfrastructure(component)) {
    const longestLabelLength = Math.max(Array.from(component.name).length, ...component.apis.filter((api) => api.role === 'provider').map((api) => Array.from(api.name).length));
    return Math.min(QUEUE_STREAM_NODE_MAX_WIDTH, Math.max(QUEUE_STREAM_NODE_MIN_WIDTH, QUEUE_STREAM_HORIZONTAL_PADDING + longestLabelLength * QUEUE_STREAM_NAME_CHARACTER_WIDTH));
  }
  const longestLabelLength = Math.max(Array.from(component.name).length, Array.from(componentTypeLabels[component.type]).length);
  return 78 + Math.max(NODE_CONTENT_MIN_WIDTH, NODE_ICON_AND_PADDING_WIDTH + longestLabelLength * NODE_LABEL_CHARACTER_WIDTH);
}

export function architectureProviderHandleTop(component: Component, index: number, count: number) {
  if (component.clients === undefined && isQueueStreamInfrastructure(component)) return `${NODE_BORDER_WIDTH / 2 + QUEUE_STREAM_HEADER_HEIGHT + (index + 0.5) * QUEUE_STREAM_API_ROW_HEIGHT}px`;
  return `${((index + 0.5) / Math.max(count, 1)) * 100}%`;
}

export function architectureClientHandleTop(index: number, count: number) {
  return `${((index + 0.5) / Math.max(count, 1)) * 100}%`;
}

export function isQueueStreamInfrastructure(component: Component): component is Extract<Component, { type: 'infrastructure' }> {
  return component.type === 'infrastructure' && component.details.system_type === 'queue/stream';
}

export function componentNodeID(componentID: number) { return `component-${componentID}`; }
export function edgeID(componentID: number, apiID: number) { return `edge-${componentID}-${apiID}`; }
export function clientEdgeID(componentID: number, clientID: number, apiID: number) { return `edge-client-${componentID}-${clientID}-api-${apiID}`; }
export function apiHandleID(apiID: number) { return `provider-api-${apiID}`; }
export function providerHandleID(apiID: number) { return apiHandleID(apiID); }
export function clientHandleID(clientID: number) { return `client-${clientID}`; }
export function consumerHandleID(apiID: number) { return `consumer-api-${apiID}`; }

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
      } else if (onStack.has(providerID)) lowLinks.set(componentID, Math.min(lowLinks.get(componentID)!, indices.get(providerID)!));
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
