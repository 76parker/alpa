import { describe, expect, it } from "vitest";
import {
  projectToPerimeter,
  facingAnchor,
  portSide,
  nudgePort,
} from "./geometry";

describe("continuous port geometry", () => {
  it("keeps the exact offset along all four edges, including the top", () => {
    expect(projectToPerimeter(2, 73, 350, 200)).toEqual({ x: 0, y: 0.365 });
    expect(projectToPerimeter(349, 141, 350, 200)).toEqual({ x: 1, y: 0.705 });
    expect(projectToPerimeter(127, 199, 350, 200)).toEqual({
      x: 127 / 350,
      y: 1,
    });
    expect(projectToPerimeter(250, -20, 350, 200)).toEqual({
      x: 250 / 350,
      y: 0,
    });
  });
  it("clamps drags beyond a corner and handles zero-sized nodes", () => {
    expect(projectToPerimeter(-200, 400, 350, 200)).toEqual({ x: 0, y: 1 });
    expect(projectToPerimeter(1, 1, 0, 0)).toEqual({ x: 0, y: 0.5 });
  });
  it("automatically faces a client to the right, left, above or below", () => {
    const rect = { x: 100, y: 100, width: 300, height: 200 };
    expect(facingAnchor(rect, { x: 650, y: 200 })).toEqual({ x: 1, y: 0.5 });
    expect(facingAnchor(rect, { x: 0, y: 200 })).toEqual({ x: 0, y: 0.5 });
    expect(facingAnchor(rect, { x: 250, y: -200 })).toEqual({ x: 0.5, y: 0 });
    expect(facingAnchor(rect, { x: 250, y: 600 })).toEqual({ x: 0.5, y: 1 });
    expect(portSide(facingAnchor(rect, { x: 650, y: 250 }))).toBe("right");
  });
  it("supports fine keyboard movement around corners", () => {
    expect(nudgePort({ x: 0, y: 0.5 }, "ArrowDown")).toEqual({ x: 0, y: 0.55 });
    expect(nudgePort({ x: 0, y: 1 }, "ArrowRight")).toEqual({ x: 0.05, y: 1 });
  });
});
