import { MarkerType, type Edge, type Node } from "@xyflow/react";
import {
  componentClientNameLabels,
  componentTypeLabels,
  type InfrastructureDetails,
} from "./contracts";
import type { GraphAPI, GraphClient, GraphComponent } from "./graph-model";

export type ArchitectureNodeData = {
  component: GraphComponent;
  apis: GraphAPI[];
  clients: GraphClient[];
};

export type ArchitectureNode = Node<ArchitectureNodeData, "architecture">;
export type ArchitectureGraph = { nodes: ArchitectureNode[]; edges: Edge[] };

const columnGap = 96;
const nodeGap = 36;
const origin = 80;
const contentMinWidth = 238;
const apiRailWidth = 88;
const clientRailWidth = 130;
const queueStreamMinWidth = 320;
const queueStreamMaxWidth = 440;
const queueStreamHeaderHeight = 76;
const queueStreamAPIRowHeight = 60;
const queueStreamBottomPadding = 6;
const queueStreamClientListBorder = 1;
const queueStreamClientListTopPadding = 6;
const queueStreamClientListBottomPadding = 12;
const queueStreamClientRowHeight = 60;
const queueStreamClientRowGap = 6;
const componentTypeOrder: GraphComponent["type"][] = [
  "backend-service",
  "infrastructure",
  "frontend-service",
];

export function buildArchitectureGraph(
  components: GraphComponent[],
): ArchitectureGraph {
  const positions = groupedPositions(components);
  const apiByID = new Map<
    string,
    { component: GraphComponent; api: GraphAPI }
  >();
  for (const component of components)
    for (const api of component.apis) apiByID.set(api.id, { component, api });
  return {
    nodes: components.map((component) => ({
      id: componentNodeID(component.id),
      type: "architecture",
      position: positions.get(component.id) ?? { x: origin, y: origin },
      dragHandle: ".architecture-node-drag-handle",
      style: { width: architectureNodeWidth(component) },
      data: { component, apis: component.apis, clients: component.clients },
    })),
    edges: components.flatMap((component) =>
      component.clients.flatMap((client) => {
        if (!client.apiID) return [];
        const target = apiByID.get(client.apiID);
        if (!target || target.component.id === component.id) return [];
        return [
          {
            id: `edge-${component.id}-${client.id}-${client.apiID}`,
            source: componentNodeID(component.id),
            sourceHandle: clientHandleID(client.id),
            target: componentNodeID(target.component.id),
            targetHandle: apiHandleID(target.api.id),
            type: "smoothstep",
            markerEnd: { type: MarkerType.ArrowClosed },
            ariaLabel: `${component.name} ${componentClientNameLabels[client.clientName]} connects to ${target.component.name} ${target.api.name}`,
          },
        ];
      }),
    ),
  };
}

function groupedPositions(components: GraphComponent[]) {
  const positions = new Map<string, { x: number; y: number }>();
  let x = origin;
  for (const type of componentTypeOrder) {
    const members = components.filter((component) => component.type === type);
    if (!members.length) continue;
    let y = origin;
    for (const component of members) {
      positions.set(component.id, { x, y });
      y += architectureNodeHeight(component) + nodeGap;
    }
    x += Math.max(...members.map(architectureNodeWidth)) + columnGap;
  }
  return positions;
}

export function architectureNodeHeight(component: GraphComponent) {
  if (isQueueStreamInfrastructure(component)) {
    if (!component.apis.length && !component.clients.length) return 116;
    const apiSectionHeight = component.apis.length
      ? component.apis.length * queueStreamAPIRowHeight +
        queueStreamBottomPadding
      : 0;
    const clientSectionHeight = component.clients.length
      ? queueStreamClientListBorder +
        queueStreamClientListTopPadding +
        queueStreamClientListBottomPadding +
        component.clients.length * queueStreamClientRowHeight +
        Math.max(0, component.clients.length - 1) * queueStreamClientRowGap
      : 0;
    return 2 + queueStreamHeaderHeight + apiSectionHeight + clientSectionHeight;
  }
  return Math.max(
    132,
    76 + Math.max(component.apis.length, component.clients.length) * 32,
  );
}

export function architectureNodeWidth(component: GraphComponent) {
  if (isQueueStreamInfrastructure(component)) {
    const longestLabel = Math.max(
      Array.from(component.name).length,
      ...component.apis.map((api) => Array.from(api.name).length),
      ...component.clients.map(
        (client) =>
          Array.from(componentClientNameLabels[client.clientName]).length,
      ),
    );
    return Math.min(
      queueStreamMaxWidth,
      Math.max(queueStreamMinWidth, 48 + longestLabel * 7),
    );
  }
  const titleWidth = Math.max(
    contentMinWidth,
    96 +
      Math.max(
        Array.from(component.name).length,
        Array.from(componentTypeLabels[component.type]).length,
      ) *
        7,
  );
  return (
    (component.apis.length ? apiRailWidth : 0) +
    titleWidth +
    (component.clients.length ? clientRailWidth : 0)
  );
}

export function architectureProviderHandleTop(
  component: GraphComponent,
  index: number,
  count: number,
) {
  if (isQueueStreamInfrastructure(component))
    return `${1 + queueStreamHeaderHeight + (index + 0.5) * queueStreamAPIRowHeight}px`;
  return `${((index + 0.5) / Math.max(count, 1)) * 100}%`;
}

export function architectureClientHandleTop(
  component: GraphComponent,
  index: number,
  count: number,
) {
  if (isQueueStreamInfrastructure(component)) {
    const apiSectionHeight = component.apis.length
      ? component.apis.length * queueStreamAPIRowHeight +
        queueStreamBottomPadding
      : 0;
    const firstClientCenter =
      1 +
      queueStreamHeaderHeight +
      apiSectionHeight +
      queueStreamClientListBorder +
      queueStreamClientListTopPadding +
      queueStreamClientRowHeight / 2;
    return `${firstClientCenter + index * (queueStreamClientRowHeight + queueStreamClientRowGap)}px`;
  }
  return `${((index + 0.5) / Math.max(count, 1)) * 100}%`;
}

export function componentNodeID(componentID: string) {
  return componentID;
}
export function apiHandleID(apiID: string) {
  return apiID;
}
export function clientHandleID(clientID: string) {
  return clientID;
}

export function isQueueStreamInfrastructure(
  component: GraphComponent,
): boolean {
  return (
    component.type === "infrastructure" &&
    (component.details as InfrastructureDetails).system_type === "queue/stream"
  );
}
