import type { XYPosition } from "@xyflow/react";

// Normalized coordinates keep a port attached to the same point when a card resizes.
export type PortPosition = { x: number; y: number };
export type PortSide = "left" | "right" | "top" | "bottom";
export type NodeRect = XYPosition & { width: number; height: number };
const clamp = (value: number) => Math.max(0, Math.min(1, value));
export function portSide(point: PortPosition): PortSide {
  if (point.x === 0) return "left";
  if (point.x === 1) return "right";
  return point.y === 0 ? "top" : "bottom";
}
export function projectToPerimeter(
  x: number,
  y: number,
  width: number,
  height: number,
): PortPosition {
  if (width <= 0 || height <= 0) return { x: 0, y: 0.5 };
  const candidates: [PortPosition, number][] = [
    [{ x: 0, y: clamp(y / height) }, Math.abs(x)],
    [{ x: 1, y: clamp(y / height) }, Math.abs(width - x)],
    [{ x: clamp(x / width), y: 0 }, Math.abs(y)],
    [{ x: clamp(x / width), y: 1 }, Math.abs(height - y)],
  ];
  return candidates.sort((a, b) => a[1] - b[1])[0][0];
}
export function facingAnchor(rect: NodeRect, other: XYPosition): PortPosition {
  const dx = other.x - rect.x - rect.width / 2;
  const dy = other.y - rect.y - rect.height / 2;
  const scale = Math.max(
    Math.abs(dx) / (rect.width / 2),
    Math.abs(dy) / (rect.height / 2),
  );
  if (!Number.isFinite(scale) || scale === 0) return { x: 0, y: 0.5 };
  return projectToPerimeter(
    rect.width / 2 + dx / scale,
    rect.height / 2 + dy / scale,
    rect.width,
    rect.height,
  );
}
export function nudgePort(point: PortPosition, key: string): PortPosition {
  const delta = 0.05;
  const side = portSide(point);
  if (key === "ArrowUp")
    return projectToPerimeter(point.x, point.y - delta, 1, 1);
  if (key === "ArrowDown")
    return projectToPerimeter(point.x, point.y + delta, 1, 1);
  if (key === "ArrowLeft")
    return (side === "left" || side === "right") && point.y > 0 && point.y < 1
      ? { x: 0, y: point.y }
      : projectToPerimeter(point.x - delta, point.y, 1, 1);
  if (key === "ArrowRight")
    return (side === "left" || side === "right") && point.y > 0 && point.y < 1
      ? { x: 1, y: point.y }
      : projectToPerimeter(point.x + delta, point.y, 1, 1);
  return point;
}
export function validPortPosition(value: unknown): value is PortPosition {
  if (!value || typeof value !== "object") return false;
  const { x, y } = value as PortPosition;
  return (
    Number.isFinite(x) &&
    Number.isFinite(y) &&
    x >= 0 &&
    x <= 1 &&
    y >= 0 &&
    y <= 1 &&
    (x === 0 || x === 1 || y === 0 || y === 1)
  );
}
