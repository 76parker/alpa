import { useState } from 'react';
import type { Workspace } from '../../lib/inventory/contracts';
import { Divider, Dropdown, DropdownItem, DropdownList, MenuToggle } from '../../src/ui';
import { Check, Plus } from '../../src/ui/icons';

type WorkspaceSwitcherProps = {
  activeWorkspaceID: number | null;
  onCreate: () => void;
  onSelect: (workspaceID: number) => void;
  workspaces: Workspace[];
};

export function WorkspaceSwitcher({ workspaces, activeWorkspaceID, onSelect, onCreate }: WorkspaceSwitcherProps) {
  const [open, setOpen] = useState(false);
  const activeName = workspaces.find((workspace) => workspace.id === activeWorkspaceID)?.name ?? workspaces[0]?.name ?? 'Choose workspace';
  return <div className="workspace-switcher-shell">
    <span className="workspace-label">Workspace</span>
    <Dropdown isOpen={open} onOpenChange={setOpen} onSelect={() => setOpen(false)}
      toggle={(ref) => <MenuToggle ref={ref} className="workspace-switcher" isFullWidth isExpanded={open} onClick={() => setOpen(!open)} aria-label={`Workspace ${activeName}`}>{activeName}</MenuToggle>}>
      <DropdownList aria-label="Workspace options">
        {workspaces.map((workspace) => <DropdownItem key={workspace.id} onClick={() => onSelect(workspace.id)} icon={workspace.id === activeWorkspaceID ? <Check /> : undefined} isActive={workspace.id === activeWorkspaceID}>{workspace.name}</DropdownItem>)}
        <Divider />
        <DropdownItem icon={<Plus />} onClick={onCreate}>Create workspace</DropdownItem>
      </DropdownList>
    </Dropdown>
  </div>;
}
