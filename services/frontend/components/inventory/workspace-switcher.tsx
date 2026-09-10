import { Check, ChevronDown, Plus } from 'lucide-react';
import { useEffect, useId, useRef, useState } from 'react';
import type { Workspace } from '../../lib/inventory/contracts';

type WorkspaceSwitcherProps = {
  activeWorkspaceID: number | null;
  onCreate: () => void;
  onSelect: (workspaceID: number) => void;
  workspaces: Workspace[];
};

export function WorkspaceSwitcher({ workspaces, activeWorkspaceID, onSelect, onCreate }: WorkspaceSwitcherProps) {
  const regionID = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const activeWorkspace = workspaces.find((workspace) => workspace.id === activeWorkspaceID) ?? workspaces[0];
  const activeName = activeWorkspace?.name ?? 'Choose workspace';

  useEffect(() => {
    if (!open) return;

    const dismissOutside = (event: PointerEvent) => {
      if (rootRef.current?.contains(event.target as Node)) return;
      setOpen(false);
    };
    const dismissWithEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      setOpen(false);
      triggerRef.current?.focus();
    };

    document.addEventListener('pointerdown', dismissOutside);
    document.addEventListener('keydown', dismissWithEscape);
    return () => {
      document.removeEventListener('pointerdown', dismissOutside);
      document.removeEventListener('keydown', dismissWithEscape);
    };
  }, [open]);

  function select(workspaceID: number) {
    setOpen(false);
    onSelect(workspaceID);
  }

  function create() {
    setOpen(false);
    onCreate();
  }

  return <div className="workspace-switcher-shell" ref={rootRef} data-open={open}>
    <button
      ref={triggerRef}
      className="workspace-switcher sidebar-workspace"
      type="button"
      aria-controls={regionID}
      aria-expanded={open}
      aria-label={`Workspace ${activeName}`}
      onClick={() => setOpen((current) => !current)}
    >
      <span><small>Workspace</small><strong>{activeName}</strong></span>
      <ChevronDown className="workspace-switcher-chevron" size={14} aria-hidden="true" />
    </button>
    <div className="workspace-inline-collapse" data-open={open}>
      <div className="workspace-inline-overflow">
        <div
          id={regionID}
          className="workspace-inline-panel"
          role="region"
          aria-label="Workspace options"
          aria-hidden={!open}
          inert={!open}
        >
          <div className="workspace-inline-list">
            {workspaces.map((workspace) => {
              const active = workspace.id === activeWorkspaceID;
              return <button
                key={workspace.id}
                className="workspace-inline-option"
                type="button"
                aria-pressed={active}
                onClick={() => select(workspace.id)}
              >
                <span className="workspace-inline-avatar" aria-hidden="true">{initials(workspace.name)}</span>
                <span className="workspace-inline-name">{workspace.name}</span>
                {active ? <span className="workspace-inline-current"><Check size={12} aria-hidden="true" />Active workspace</span> : null}
              </button>;
            })}
          </div>
          <button className="workspace-inline-create" type="button" onClick={create}><Plus size={14} aria-hidden="true" />Create workspace</button>
        </div>
      </div>
    </div>
  </div>;
}

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toLocaleUpperCase()).join('') || 'WS';
}
