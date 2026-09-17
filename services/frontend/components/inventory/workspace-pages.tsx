import { Boxes, Check, Plus } from '../../src/ui/icons';
import { useState, type FormEvent } from 'react';
import { InventoryDialog } from './inventory-dialog';
import { useInventory } from './inventory-context';
import { Button, EmptyState, EmptyStateBody, EmptyStateFooter, Form, TextInput } from '../../src/ui';
import { PageHeader, Field, publicError } from './shared';

export function WorkspacesPage({ workspaces, activeWorkspaceID, onCreate, onSelect }: { workspaces: ReturnType<typeof useInventory>['workspaces']; activeWorkspaceID: number | null; onCreate: () => void; onSelect: (id: number) => void }) {
  return <section className="workspaces-page">
    <PageHeader title="Workspace" description="Choose the inventory boundary you want to work in." actions={<Button variant="primary" className="button primary" type="button" onClick={onCreate}><Plus width={15} height={15} />Create workspace</Button>} />
    <section className="panel workspace-panel" aria-label="Available workspaces">
      <div className="workspace-panel-heading"><div><h2>Available workspaces</h2><p>Products and components stay isolated inside their workspace.</p></div><span>{workspaces.length}</span></div>
      {workspaces.length ? <div className="workspace-page-list">{workspaces.map((workspace) => {
        const active = workspace.id === activeWorkspaceID;
        return <Button key={workspace.id} type="button" className={active ? 'active' : ''} onClick={() => onSelect(workspace.id)} aria-current={active ? 'page' : undefined}>
          <span className="workspace-page-avatar" aria-hidden="true">{initials(workspace.name)}</span>
          <span><strong>{workspace.name}</strong><small>{workspace.name === 'default' ? 'Default workspace' : `Workspace #${workspace.id}`}</small></span>
          {active ? <span className="workspace-active"><Check width={14} height={14} aria-hidden="true" />Active workspace</span> : <span className="workspace-select">Switch</span>}
        </Button>;
      })}</div> : <div className="workspace-page-empty"><Boxes width={22} height={22} aria-hidden="true" /><strong>No workspaces yet</strong><p>Create a workspace to start organizing inventory.</p></div>}
    </section>
  </section>;
}

export function WorkspaceCreateDialog({ onClose, onCreated }: { onClose: () => void; onCreated: (name: string) => Promise<void> }) {
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  async function submit(event: FormEvent) {
    event.preventDefault();
    const value = name.trim();
    if (!value) return setError('Workspace name is required');
    if (value.length > 50) return setError('Workspace name must be 50 characters or fewer');
    setSaving(true);
    setError('');
    try { await onCreated(value); } catch (cause) { setError(publicError(cause)); setSaving(false); }
  }
  return <InventoryDialog title="Create workspace" eyebrow="Inventory" className="workspace-create-dialog" onClose={onClose}>
    <Form className="modal-form single workspace-create-form" onSubmit={submit} noValidate>
      <div className="workspace-dialog-intro"><span className="workspace-dialog-icon" aria-hidden="true"><Boxes width={19} height={19} /></span><div><strong>Set up an inventory boundary</strong><p>Products and components created here stay separate from other workspaces.</p></div></div>
      <Field label="Workspace name" help="A short, recognizable name for the inventory boundary your team will work in." required error={error} full><TextInput autoFocus value={name} maxLength={50} onChange={(event) => { setName(event.target.value); if (error) setError(''); }} aria-invalid={Boolean(error)} placeholder="For example, Payments" /></Field>
      <div className="workspace-name-meta"><span>Use a team, platform, or business-domain name.</span><span>{name.length}/50</span></div>
      <footer><Button variant="secondary" className="button secondary" type="button" onClick={onClose}>Cancel</Button><Button variant="primary" className="button primary" type="submit" disabled={saving}>{saving ? 'Creating…' : 'Create workspace'}</Button></footer>
    </Form>
  </InventoryDialog>;
}

export function EmptyWorkspaces({ onCreate }: { onCreate: () => void }) {
  return <EmptyState titleText="Create your first workspace" headingLevel="h1" icon={Boxes} variant="sm"><EmptyStateBody>Workspaces keep product and component inventory separated. Create one to start organizing your products.</EmptyStateBody><EmptyStateFooter><Button variant="primary" onClick={onCreate} icon={<Plus />}>Create workspace</Button></EmptyStateFooter></EmptyState>;
}

export function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toLocaleUpperCase()).join('') || 'WS';
}
