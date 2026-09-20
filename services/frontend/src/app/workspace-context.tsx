import {
  createContext,
  useContext,
  useState,
  useEffect,
  type ReactNode,
} from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useWorkspaces, useInventorySync } from "@/api/queries";
import { WorkspaceDialog } from "@/features/workspaces/workspace-dialog";
import type { Workspace } from "@/api/types";
const storageKey = "alpa:active-workspace";
function storedWorkspace() {
  try {
    const value = Number(localStorage.getItem(storageKey));
    return Number.isSafeInteger(value) && value > 0 ? value : null;
  } catch {
    return null;
  }
}
const WorkspaceContext = createContext<ReturnType<
  typeof useWorkspaceState
> | null>(null);
function useWorkspaceState() {
  const workspaces = useWorkspaces();
  const location = useLocation();
  const navigate = useNavigate();
  const [selectedID, setSelectedID] = useState(storedWorkspace);
  const [creating, setCreating] = useState(false);
  const routeID = Number(
    location.pathname.match(/^\/workspaces\/(\d+)(?:\/|$)/)?.[1],
  );
  const activeID =
    routeID ||
    (workspaces.data?.some((item) => item.id === selectedID)
      ? selectedID
      : workspaces.data?.[0]?.id) ||
    null;
  const activeWorkspace = workspaces.data?.find((item) => item.id === activeID);
  const remember = (id: number | null) => {
    setSelectedID(id);
    try {
      if (id) localStorage.setItem(storageKey, String(id));
      else localStorage.removeItem(storageKey);
    } catch {
      /* Session navigation still works when storage is unavailable. */
    }
  };
  useEffect(() => {
    if (routeID && activeWorkspace && selectedID !== routeID) {
      setSelectedID(routeID);
      try {
        localStorage.setItem(storageKey, String(routeID));
      } catch {
        /* Navigation remains available without persistence. */
      }
    }
  }, [routeID, activeWorkspace, selectedID]);
  const selectWorkspace = (id: number) => {
    remember(id);
    navigate(`/workspaces/${id}/products`);
  };
  const onCreated = (workspace: Workspace) => {
    setCreating(false);
    selectWorkspace(workspace.id);
  };
  return {
    workspaces,
    activeID,
    activeWorkspace,
    selectWorkspace,
    remember,
    creating,
    setCreating,
    onCreated,
  };
}
export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const state = useWorkspaceState();
  useInventorySync();
  return (
    <WorkspaceContext.Provider value={state}>
      {children}
      {state.creating ? (
        <WorkspaceDialog
          onClose={() => state.setCreating(false)}
          onCreated={state.onCreated}
        />
      ) : null}
    </WorkspaceContext.Provider>
  );
}
export function useWorkspace() {
  const context = useContext(WorkspaceContext);
  if (!context) throw new Error("WorkspaceProvider is required");
  return context;
}
