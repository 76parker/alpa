import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterEach, expect, it } from 'vitest';
import { FieldLabel } from './field-label';

afterEach(cleanup);

it('keeps create-form labels on one alignment row', () => {
  const styles = readFileSync(resolve(process.cwd(), 'globals.css'), 'utf8');

  expect(styles).toContain('.final-app .create-fields .field-label { display: inline-flex; align-items: center; }');
  expect(styles).toContain('.field-help-tooltip { position: fixed; z-index: var(--z-tooltip);');
});

it('portals field help outside clipping form containers and dismisses it without moving focus', async () => {
  const user = userEvent.setup();
  render(<FieldLabel label="Product code" help="Short identifier used in URLs." required />);

  const label = screen.getByText('Product code').closest('.field-label');
  expect(label?.textContent).toContain('Product code*');
  const help = screen.getByRole('button', { name: 'About Product code' });
  expect(label?.querySelector('.field-required-marker')?.textContent).toBe('*');
  expect(help.classList.contains('field-help-control')).toBe(true);
  expect(help.querySelector('svg')).not.toBeNull();
  expect(document.getElementById(help.getAttribute('aria-describedby') ?? '')?.textContent).toBe('Short identifier used in URLs.');
  expect(screen.queryByRole('tooltip')).toBeNull();

  await user.hover(help);
  const pointerTooltip = await screen.findByRole('tooltip');
  expect(pointerTooltip.closest('.field-label')).toBeNull();
  expect(pointerTooltip.parentElement).toBe(document.body);

  await user.unhover(help);
  await waitFor(() => expect(screen.queryByRole('tooltip')).toBeNull());

  await user.tab();
  expect(document.activeElement).toBe(help);
  expect((await screen.findByRole('tooltip')).textContent).toBe('Short identifier used in URLs.');
  await user.keyboard('{Escape}');
  expect(document.activeElement).toBe(help);
  expect(screen.queryByRole('tooltip')).toBeNull();
});
