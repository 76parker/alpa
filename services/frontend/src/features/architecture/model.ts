import { MarkerType, type Edge, type XYPosition } from "@xyflow/react";
import { validPortPosition, type PortPosition } from "./geometry";
import type { ConnectionStyle } from "./connection-style";
import type { Component, ComponentClient, Integration } from "@/api/types";
export type BindingEdge = Edge<{
  client: ComponentClient;
  sourceComponent: Component;
  targetComponent: Component;
  apiID: number;
  integration: Integration;
  onSelect?: () => void;
  connectionStyle?: ConnectionStyle;
}>;
export function graphEdges(components: Component[]): BindingEdge[] {
  const apis = new Map(
    components.flatMap((component) =>
      component.apis.map((api) => [api.id, component] as const),
    ),
  );
  return components.flatMap((source) =>
    source.clients.flatMap((client) =>
      client.integrations.flatMap((integration) => {
        const target = apis.get(integration.api_id);
        if (!target) return [];
        return [
          {
            id: `integration-${integration.id}`,
            source: String(source.id),
            target: String(target.id),
            sourceHandle: `client-${client.id}`,
            targetHandle: `api-${integration.api_id}`,
            type: "binding",
            label: integration.action,
            data: {
              client,
              sourceComponent: source,
              targetComponent: target,
              apiID: integration.api_id,
              integration,
            },
            markerEnd: {
              type: MarkerType.ArrowClosed,
              color: client.secure_connection ? "#21b8ff" : "#737b90",
              width: 16,
              height: 16,
            },
            style: {
              stroke: client.secure_connection ? "#21b8ff" : "#737b90",
              strokeWidth: client.secure_connection ? 2 : 1.5,
              strokeDasharray: client.secure_connection ? undefined : "6 5",
            },
          },
        ];
      }),
    ),
  );
}
export function immediateNeighborhood(
  components: Component[],
  componentID: number,
): Set<number> {
  const result = new Set([componentID]);
  for (const edge of graphEdges(components))
    if (
      edge.source === String(componentID) ||
      edge.target === String(componentID)
    ) {
      result.add(Number(edge.source));
      result.add(Number(edge.target));
    }
  return result;
}
export function canBind(
  source: Component,
  client: ComponentClient,
  target: Component,
  apiID?: number,
): boolean {
  return (
    !client.integrations.some((integration) => integration.api_id === apiID) &&
    (apiID === undefined || target.apis.some((api) => api.id === apiID)) &&
    source.id !== target.id &&
    source.product_id === target.product_id
  );
}
export function mergePositions(
  components: Component[],
  stored: Record<string, XYPosition> = {},
): Record<string, XYPosition> {
  return Object.fromEntries(
    components.map((component, index) => {
      const candidate = stored[String(component.id)];
      return [
        String(component.id),
        candidate &&
        Number.isFinite(candidate.x) &&
        Number.isFinite(candidate.y)
          ? candidate
          : {
              x: 150 + (index % 3) * 470,
              y: 120 + Math.floor(index / 3) * 310,
            },
      ];
    }),
  );
}
export type LayoutSnapshot = {
  positions: Record<string, XYPosition>;
  viewport?: { x: number; y: number; zoom: number };
  portPositions?: Record<string, PortPosition>;
  portSides?: Record<string, PortSide>;
};
export type PortSide = "left" | "right" | "bottom";
export function readLayout(productID: number): LayoutSnapshot {
  try {
    const value = JSON.parse(
      localStorage.getItem(`alpa:map:v1:${productID}`) || "{}",
    );
    const legacySides =
      value.portSides && typeof value.portSides === "object"
        ? value.portSides
        : {};
    const legacyPositions = Object.fromEntries(
      Object.entries(legacySides).flatMap(([key, side]) => {
        if (!/^\d+:(api|client)-\d+$/.test(key)) return [];
        const point =
          side === "left"
            ? { x: 0, y: 0.65 }
            : side === "right"
              ? { x: 1, y: 0.65 }
              : side === "bottom"
                ? { x: 0.5, y: 1 }
                : null;
        return point ? [[key, point]] : [];
      }),
    );
    return {
      portPositions: {
        ...legacyPositions,
        ...Object.fromEntries(
          Object.entries(value.portPositions || {}).filter(
            ([key, point]) =>
              /^\d+:(api|client)-\d+$/.test(key) && validPortPosition(point),
          ),
        ),
      } as Record<string, PortPosition>,
      portSides:
        value.portSides && typeof value.portSides === "object"
          ? (Object.fromEntries(
              Object.entries(value.portSides).filter(
                ([key, side]) =>
                  /^\d+:(api|client)-\d+$/.test(key) &&
                  ["left", "right", "bottom"].includes(String(side)),
              ),
            ) as Record<string, PortSide>)
          : {},
      positions:
        value.positions && typeof value.positions === "object"
          ? value.positions
          : {},
      viewport:
        value.viewport &&
        [value.viewport.x, value.viewport.y, value.viewport.zoom].every(
          Number.isFinite,
        ) &&
        value.viewport.zoom >= 0.2 &&
        value.viewport.zoom <= 2
          ? value.viewport
          : undefined,
    };
  } catch {
    return { positions: {} };
  }
}
export function saveLayout(productID: number, value: LayoutSnapshot) {
  try {
    localStorage.setItem(`alpa:map:v1:${productID}`, JSON.stringify(value));
  } catch {
    /* The map remains usable when local storage is unavailable. */
  }
}
