import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, expect, it, vi } from 'vitest';
import { WorkspaceSwitcher } from './workspace-switcher';

afterEach(cleanup);

const workspaces = [
  { id: 7, name: 'default' },
  { id: 8, name: 'Platform' },
  { id: 9, name: 'Customer Identity' },
];

it('opens workspace menu, selects one, and opens creation', async () => {
  const user = userEvent.setup();
  const onSelect = vi.fn();
  const onCreate = vi.fn();
  render(<WorkspaceSwitcher workspaces={workspaces} activeWorkspaceID={7} onSelect={onSelect} onCreate={onCreate} />);

  const trigger = screen.getByRole('button', { name: 'Workspace default' });
  expect(trigger.getAttribute('aria-expanded')).toBe('false');

  await user.click(trigger);
  expect(trigger.getAttribute('aria-expanded')).toBe('true');
  const choices = screen.getByRole('menu', { name: 'Workspace options' });
  expect(within(choices).getByRole('menuitem', { name: 'default' }).getAttribute('aria-current')).toBe('page');

  await user.click(within(choices).getByRole('menuitem', { name: 'Platform' }));
  expect(onSelect).toHaveBeenCalledWith(8);
  expect(trigger.getAttribute('aria-expanded')).toBe('false');

  await user.click(trigger);
  await user.click(within(screen.getByRole('menu', { name: 'Workspace options' })).getByRole('menuitem', { name: 'Create workspace' }));
  expect(onCreate).toHaveBeenCalledOnce();
  expect(trigger.getAttribute('aria-expanded')).toBe('false');
});

it('closes on Escape or outside click and restores focus to the trigger', async () => {
  const user = userEvent.setup();
  render(<div><WorkspaceSwitcher workspaces={workspaces} activeWorkspaceID={7} onSelect={() => undefined} onCreate={() => undefined} /><button type="button">Outside</button></div>);

  const trigger = screen.getByRole('button', { name: 'Workspace default' });
  await user.click(trigger);
  await user.keyboard('{Escape}');
  expect(trigger.getAttribute('aria-expanded')).toBe('false');
  expect(document.activeElement).toBe(trigger);

  await user.click(trigger);
  await user.click(screen.getByRole('button', { name: 'Outside' }));
  expect(trigger.getAttribute('aria-expanded')).toBe('false');
  await waitFor(() => expect(screen.queryByRole('menu', { name: 'Workspace options' })).toBeNull());
});
