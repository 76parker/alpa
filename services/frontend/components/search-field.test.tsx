import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, expect, it, vi } from 'vitest';
import { cleanup } from '@testing-library/react';
import { useState } from 'react';
import { SearchField } from './search-field';

afterEach(cleanup);

it('clears immediately and restores focus to its labelled input', async () => {
  const user = userEvent.setup();
  const onChange = vi.fn();
  render(<SearchField label="Search products" value="checkout" onChange={onChange} />);

  const input = screen.getByLabelText('Search products') as HTMLInputElement;
  await user.click(screen.getByRole('button', { name: 'Clear search' }));

  expect(onChange).toHaveBeenCalledWith('');
  expect(document.activeElement).toBe(input);
});

it('clears a controlled field with keyboard activation', async () => {
  const user = userEvent.setup();
  function ControlledSearch() {
    const [value, setValue] = useState('checkout');
    return <SearchField label="Search products" value={value} onChange={setValue} />;
  }

  render(<ControlledSearch />);
  const input = screen.getByLabelText('Search products') as HTMLInputElement;
  input.focus();
  await user.tab();
  await user.keyboard('{Enter}');

  expect(input.value).toBe('');
  expect(document.activeElement).toBe(input);
});
