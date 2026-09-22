export const connectionShapes = ["bezier", "smoothstep", "straight"] as const;
export const connectionStrokes = ["solid", "dashed", "dotted"] as const;
export const connectionArrows = ["closed", "open", "none"] as const;
export type ConnectionStyle = {
  shape: (typeof connectionShapes)[number];
  stroke: (typeof connectionStrokes)[number];
  arrow: (typeof connectionArrows)[number];
};
export const defaultConnectionStyle: ConnectionStyle = {
  shape: "bezier",
  stroke: "solid",
  arrow: "closed",
};
export const connectionStyleEvent = "alpa:connection-style";
export function readConnectionStyles(
  productID: number,
): Record<string, ConnectionStyle> {
  try {
    const raw = JSON.parse(
      localStorage.getItem(`alpa:connections:v1:${productID}`) || "{}",
    );
    return Object.fromEntries(
      Object.entries(raw).filter(([id, value]) => {
        if (!/^\d+$/.test(id) || !value || typeof value !== "object")
          return false;
        const style = value as ConnectionStyle;
        return (
          connectionShapes.includes(style.shape) &&
          connectionStrokes.includes(style.stroke) &&
          connectionArrows.includes(style.arrow)
        );
      }),
    ) as Record<string, ConnectionStyle>;
  } catch {
    return {};
  }
}
export function saveConnectionStyle(
  productID: number,
  integrationID: number,
  style: ConnectionStyle,
) {
  const styles = { ...readConnectionStyles(productID), [integrationID]: style };
  try {
    localStorage.setItem(
      `alpa:connections:v1:${productID}`,
      JSON.stringify(styles),
    );
  } catch {
    /* A private or full store must not prevent connection creation. */
  }
  window.dispatchEvent(
    new CustomEvent(connectionStyleEvent, { detail: { productID, styles } }),
  );
}
