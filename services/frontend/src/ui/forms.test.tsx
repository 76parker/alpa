import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, expect, it, vi } from 'vitest';
import { TypeSelect } from './forms';

afterEach(cleanup);

it('shows descriptive type choices and selects one from the accessible menu', async () => {
  const onChange = vi.fn();
  const user = userEvent.setup();
  render(<TypeSelect
    aria-label="Component type"
    value="backend"
    onChange={onChange}
    options={[
      { value: 'backend', label: 'Backend service', description: 'Server-side application or API' },
      { value: 'infrastructure', label: 'Infrastructure', description: 'Database, queue, or managed platform' },
    ]}
  />);

  const toggle = screen.getByRole('button', { name: 'Component type' });
  expect(toggle.textContent).toContain('Backend service');
  expect(toggle.textContent).toContain('Server-side application or API');

  await user.click(toggle);
  const listbox = screen.getByRole('listbox', { name: 'Component type options' });
  expect(within(listbox).getByRole('option', { name: /Infrastructure/ }).textContent).toContain('Database, queue, or managed platform');
  await user.click(within(listbox).getByRole('option', { name: /Infrastructure/ }));

  expect(onChange).toHaveBeenCalledWith('infrastructure');
  expect(toggle.getAttribute('aria-expanded')).toBe('false');
});
