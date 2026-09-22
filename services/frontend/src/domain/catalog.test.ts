import { describe, expect, it } from "vitest";
import { integrationActions } from "./catalog";
import type { CommunicationType } from "@/api/types";

describe("integration actions", () => {
  it.each<[CommunicationType, string[]]>([
    ["events", ["produce", "consume"]],
    ["stream", ["listen-events"]],
    ["request-response", ["call"]],
    ["polling", ["call"]],
    ["long-polling", ["call"]],
  ])("offers the API-supported actions for %s", (communication, actions) => {
    expect(integrationActions(communication)).toEqual(actions);
  });
});

it.each(["http-proxy-client", "grpc-proxy-client"] as const)(
  "derives proxy action for %s",
  (name) => {
    expect(integrationActions("request-response", name)).toEqual(["proxy"]);
  },
);
