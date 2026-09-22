import { beforeEach, afterEach, expect, it, vi } from "vitest";
import {
  readConnectionStyles,
  saveConnectionStyle,
  connectionStyleEvent,
} from "./connection-style";

beforeEach(() => {
  const storage = new Map<string, string>();
  vi.stubGlobal("localStorage", {
    getItem: (key: string) => storage.get(key) ?? null,
    setItem: (key: string, value: string) => storage.set(key, value),
  });
});
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});
it("stores styles independently by product and integration", () => {
  const style = { shape: "straight", stroke: "dotted", arrow: "open" } as const;
  saveConnectionStyle(1, 10, style);
  saveConnectionStyle(1, 11, { ...style, shape: "smoothstep" });
  expect(readConnectionStyles(1)).toEqual({
    10: style,
    11: { ...style, shape: "smoothstep" },
  });
  expect(readConnectionStyles(2)).toEqual({});
});
it("ignores corrupted and unsupported preferences", () => {
  localStorage.setItem(
    "alpa:connections:v1:1",
    '{"10":{"shape":"invalid"},"11":null}',
  );
  expect(readConnectionStyles(1)).toEqual({});
  localStorage.setItem("alpa:connections:v1:1", "broken");
  expect(readConnectionStyles(1)).toEqual({});
});
it("keeps the current map updated even if browser persistence is unavailable", () => {
  vi.spyOn(localStorage, "setItem").mockImplementation(() => {
    throw new Error("quota");
  });
  const handler = vi.fn();
  window.addEventListener(connectionStyleEvent, handler);
  const style = { shape: "bezier", stroke: "solid", arrow: "closed" } as const;
  expect(() => saveConnectionStyle(1, 10, style)).not.toThrow();
  expect(handler).toHaveBeenCalledWith(
    expect.objectContaining({
      detail: { productID: 1, styles: { 10: style } },
    }),
  );
  window.removeEventListener(connectionStyleEvent, handler);
});
