import { describe, expect, it } from "vitest";
import {
  buildComponentInput,
  createComponentDraft,
  validClientOptions,
} from "./component-input";

describe("component aggregate drafts", () => {
  it("omits empty child collections and trims service details", () => {
    const draft = createComponentDraft({
      name: " Checkout ",
      details: { language: " Go ", languageVersion: "", framework: "" },
    });

    expect(buildComponentInput(9, draft)).toEqual({
      product_id: 9,
      name: "Checkout",
      type: "backend-service",
      details: { language: "Go" },
    });
  });

  it("constrains asynchronous and streaming client fields to backend-valid values", () => {
    expect(validClientOptions("kafka-client")).toEqual({
      roles: ["producer", "consumer"],
      communicationTypes: ["events"],
    });
    expect(validClientOptions("websocket-client")).toEqual({
      roles: ["listener"],
      communicationTypes: ["stream"],
    });
  });
});
