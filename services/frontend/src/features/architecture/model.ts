import { MarkerType, type Edge, type XYPosition } from "@xyflow/react";
import type { Component, ComponentClient } from "@/api/types";
import { roleAction } from "@/domain/catalog";
export type BindingEdge = Edge<{
  client: ComponentClient;
  sourceComponent: Component;
  targetComponent: Component;
  apiID: number;
  onSelect?: () => void;
}>;
export function graphEdges(components: Component[]): BindingEdge[] {
  const apis = new Map(
    components.flatMap((component) =>
      component.apis.map((api) => [api.id, component] as const),
    ),
  );
  return components.flatMap((source) =>
    source.clients.flatMap((client) => {
      const target =
        client.api_id === null ? undefined : apis.get(client.api_id);
      if (!target || client.api_id === null) return [];
      return [
        {
          id: `client-${client.id}`,
          source: String(source.id),
          target: String(target.id),
          sourceHandle: `client-${client.id}`,
          targetHandle: `api-${client.api_id}`,
          type: "binding",
          label: roleAction[client.role].toUpperCase(),
          data: {
            client,
            sourceComponent: source,
            targetComponent: target,
            apiID: client.api_id,
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
): boolean {
  return (
    client.api_id === null &&
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
  portSides?: Record<string, PortSide>;
};
export type PortSide = "left" | "right" | "bottom";
export function nearestPortSide(
  x: number,
  y: number,
  width: number,
  height: number,
): PortSide {
  const distances: [PortSide, number][] = [
    ["left", Math.abs(x)],
    ["right", Math.abs(width - x)],
    ["bottom", Math.abs(height - y)],
  ];
  return distances.sort((a, b) => a[1] - b[1])[0][0];
}
export function readLayout(productID: number): LayoutSnapshot {
  try {
    const value = JSON.parse(
      localStorage.getItem(`alpa:map:v1:${productID}`) || "{}",
    );
    return {
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
