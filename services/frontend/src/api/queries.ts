import {
  QueryClient,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { useEffect } from "react";
import { apiRequest, APIError, listAll } from "./client";
import type { Component, Product, Workspace } from "./types";
import {
  normalizeComponent,
  type ComponentResponse,
} from "./component-response";
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 15_000,
      retry: (count, error) =>
        !(error instanceof APIError && error.status < 500) && count < 1,
      refetchOnWindowFocus: true,
    },
    mutations: { retry: false },
  },
});
const key = "alpa:inventory-change";
export function useInventorySync() {
  const client = useQueryClient();
  useEffect(() => {
    const channel =
      typeof BroadcastChannel !== "undefined"
        ? new BroadcastChannel(key)
        : null;
    const refresh = () => {
      void client.invalidateQueries({ queryKey: ["inventory"] });
    };
    const onStorage = (event: StorageEvent) => {
      if (event.key === key) refresh();
    };
    if (channel) channel.onmessage = refresh;
    window.addEventListener("storage", onStorage);
    return () => {
      channel?.close();
      window.removeEventListener("storage", onStorage);
    };
  }, [client]);
}
function announceChange() {
  if (typeof BroadcastChannel !== "undefined") {
    const channel = new BroadcastChannel(key);
    channel.postMessage("changed");
    channel.close();
  } else {
    try {
      localStorage.setItem(key, String(Date.now()));
    } catch {
      /* Cross-tab updates are optional when storage is blocked. */
    }
  }
}
export const useWorkspaces = () =>
  useQuery({
    queryKey: ["inventory", "workspaces"],
    queryFn: ({ signal }) => listAll<Workspace>("/v1/workspaces", signal),
  });
export const useProducts = (workspaceID?: number) =>
  useQuery({
    queryKey: ["inventory", "products", workspaceID],
    queryFn: ({ signal }) =>
      listAll<Product>(`/v1/workspaces/${workspaceID}/products`, signal),
    enabled: Boolean(workspaceID),
  });
export const useProduct = (productID?: number) =>
  useQuery({
    queryKey: ["inventory", "product", productID],
    queryFn: ({ signal }) =>
      apiRequest<Product>(`/v1/products/${productID}`, { signal }),
    enabled: Boolean(productID),
  });
export const useComponents = (productID?: number) =>
  useQuery({
    queryKey: ["inventory", "components", productID],
    queryFn: async ({ signal }): Promise<Component[]> =>
      (
        await listAll<ComponentResponse>(
          `/v1/products/${productID}/components`,
          signal,
        )
      ).map(normalizeComponent),
    enabled: Boolean(productID),
  });
export function useInventoryMutation<T, Variables>({
  path,
  method,
  body,
}: {
  path: (variables: Variables) => string;
  method: "POST" | "PUT" | "DELETE";
  body?: (variables: Variables) => unknown;
}) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (variables: Variables) =>
      apiRequest<T>(path(variables), {
        method,
        ...(body ? { body: JSON.stringify(body(variables)) } : {}),
      }),
    onSuccess: async () => {
      announceChange();
      await client.invalidateQueries({ queryKey: ["inventory"] });
    },
    onError: async (error) => {
      if (
        error instanceof APIError &&
        (error.status === 409 || error.status === 404)
      )
        await client.invalidateQueries({ queryKey: ["inventory"] });
    },
  });
}
