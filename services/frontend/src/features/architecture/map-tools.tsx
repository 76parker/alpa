import { useRef, type CSSProperties, type ReactNode } from "react";
import {
  MousePointer2,
  Plus,
  SlidersHorizontal,
  Spline,
  X,
  Trash2,
} from "lucide-react";
import type { ComponentType } from "@/api/types";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { SelectControl } from "@/components/shared/controls";
import { ConnectionStyleFields } from "./connection-style-fields";
import type { ConnectionStyle } from "./connection-style";
export type MapTool = "select" | "connect" | "add" | "filter";
type Props = {
  open: MapTool | null;
  onTool: (tool: MapTool) => void;
  onClose: () => void;
  selectionMode: boolean;
  connecting: boolean;
  pending: boolean;
  count: number;
  busy: boolean;
  onSelectAll: () => void;
  onClear: () => void;
  onDelete: () => void;
  onCancelConnection: () => void;
  onCreate: (type: ComponentType) => void;
  filter: string;
  onFilter: (value: string) => void;
  neighborsOnly: boolean;
  hasSelected: boolean;
  onNeighbors: () => void;
  connectionStyle: ConnectionStyle;
  onConnectionStyle: (value: ConnectionStyle) => void;
};
const tools = [
  { id: "select", label: "Select", icon: MousePointer2 },
  { id: "connect", label: "Create integration", icon: Spline },
  { id: "add", label: "Add component", icon: Plus },
  { id: "filter", label: "Filters", icon: SlidersHorizontal },
] as const;
export function MapTools(props: Props) {
  const root = useRef<HTMLDivElement>(null);
  const close = () => {
    root.current
      ?.querySelector<HTMLButtonElement>(`[data-tool="${props.open}"]`)
      ?.focus();
    props.onClose();
  };
  let content: ReactNode;
  switch (props.open) {
    case "select":
      content = (
        <>
          <p role="status">{props.count} selected</p>
          <Button variant="outline" onClick={props.onSelectAll}>
            Select all
          </Button>
          <Button
            variant="outline"
            disabled={!props.count}
            onClick={props.onClear}
          >
            Clear selection
          </Button>
          <Button
            variant="destructive"
            disabled={!props.count || props.busy}
            onClick={props.onDelete}
          >
            <Trash2 />
            Delete selected
          </Button>
        </>
      );
      break;
    case "connect":
      content = (
        <>
          <p role="status">
            {props.pending
              ? "Choose a target API on another component."
              : "Choose a client, then a target API on the map."}
          </p>
          <ConnectionStyleFields
            value={props.connectionStyle}
            onChange={props.onConnectionStyle}
          />
          <Button variant="outline" onClick={props.onCancelConnection}>
            Cancel integration
          </Button>
        </>
      );
      break;
    case "add":
      content = (
        <div className="map-create-actions">
          {(
            [
              ["backend-service", "Create backend", "3a0e0"],
              ["frontend-service", "Create frontend", "10c79"],
              ["infrastructure", "Create infrastructure", "a01a7"],
            ] as const
          ).map(([type, label, asset]) => (
            <Button
              key={type}
              variant="ghost"
              onClick={() => props.onCreate(type)}
            >
              <img src={`/assets/${asset}.svg`} alt="" />
              {label}
            </Button>
          ))}
        </div>
      );
      break;
    case "filter":
      content = (
        <>
          <SelectControl
            label="Show components"
            value={props.filter}
            onChange={props.onFilter}
            options={[
              { value: "all", label: "All components" },
              { value: "services", label: "Services" },
              { value: "infrastructure", label: "Infrastructure" },
            ]}
          />
          <Button
            variant={props.neighborsOnly ? "secondary" : "outline"}
            disabled={!props.hasSelected}
            aria-pressed={props.neighborsOnly}
            onClick={props.onNeighbors}
          >
            Show only integrated services
          </Button>
          {!props.hasSelected && (
            <p>Select a component to filter its integrations.</p>
          )}
        </>
      );
  }
  return (
    <div
      ref={root}
      className="map-tools nodrag nopan nowheel"
      onPointerDown={(event) => event.stopPropagation()}
      onClick={(event) => event.stopPropagation()}
      onDoubleClick={(event) => event.stopPropagation()}
      onWheel={(event) => event.stopPropagation()}
      onKeyDown={(event) => {
        if (event.key === "Escape" && !event.defaultPrevented && props.open) {
          event.preventDefault();
          event.stopPropagation();
          close();
        }
      }}
    >
      <div
        className="map-tool-rail"
        role="toolbar"
        aria-label="Architecture tools"
        aria-orientation="vertical"
        onKeyDown={(event) => {
          if (!["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key))
            return;
          const buttons = Array.from(
            event.currentTarget.querySelectorAll<HTMLButtonElement>(
              "button:not(:disabled)",
            ),
          );
          const index = buttons.indexOf(
            document.activeElement as HTMLButtonElement,
          );
          const next =
            event.key === "Home"
              ? 0
              : event.key === "End"
                ? buttons.length - 1
                : (index +
                    (event.key === "ArrowDown" ? 1 : -1) +
                    buttons.length) %
                  buttons.length;
          event.preventDefault();
          buttons[next]?.focus();
        }}
      >
        {tools.map(({ id, label, icon: Icon }) => (
          <Tooltip key={id}>
            <TooltipTrigger asChild>
              <Button
                data-tool={id}
                variant="ghost"
                size="icon"
                aria-label={label}
                aria-pressed={
                  id === "select"
                    ? props.selectionMode
                    : id === "connect"
                      ? props.connecting
                      : id === "filter"
                        ? props.filter !== "all" || props.neighborsOnly
                        : props.open === id
                }
                aria-expanded={props.open === id}
                aria-controls={props.open === id ? "map-tool-panel" : undefined}
                disabled={props.busy && id !== "filter"}
                onClick={() => props.onTool(id)}
              >
                <Icon />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right" sideOffset={12}>
              {label}
            </TooltipContent>
          </Tooltip>
        ))}
      </div>
      {props.open && (
        <section
          id="map-tool-panel"
          className="map-tool-panel"
          style={
            {
              "--tool-offset": `${tools.findIndex((tool) => tool.id === props.open) * 48}px`,
            } as CSSProperties
          }
          aria-label={tools.find((tool) => tool.id === props.open)!.label}
        >
          <header>
            <strong>
              {tools.find((tool) => tool.id === props.open)!.label}
            </strong>
            <Button
              size="icon"
              variant="ghost"
              aria-label="Close tool settings"
              onClick={close}
            >
              <X />
            </Button>
          </header>
          {content}
        </section>
      )}
    </div>
  );
}
