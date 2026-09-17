import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, expect, it, vi } from 'vitest';
import type { Product } from '../../lib/inventory/contracts';
import { ProductComponentsPage, ProductPage, ProductsPage } from './product-pages';

afterEach(cleanup);

const products: Product[] = Array.from({ length: 25 }, (_, index) => ({
  id: index + 1,
  workspace_id: 7,
  name: `Service ${String(index + 1).padStart(2, '0')}`,
  product_code: `S${index + 1}`,
  criticality: index === 0 ? 'mission-critical' : 'business-operational',
}));

it('resets pagination when searching or filtering and restores all products on reset', async () => {
  const user = userEvent.setup();
  render(<ProductsPage products={products} status="ready" error="" navigate={vi.fn()} />);
  await user.click(screen.getByRole('button', { name: 'Go to next page' }));
  expect(screen.getByRole('button', { name: 'Service 25' })).toBeTruthy();
  expect(screen.queryByRole('button', { name: 'Service 01' })).toBeNull();

  await user.selectOptions(screen.getByRole('combobox', { name: 'Filter by criticality' }), 'mission-critical');
  expect(screen.getByRole('button', { name: 'Service 01' })).toBeTruthy();
  expect(screen.queryByRole('button', { name: 'Service 25' })).toBeNull();
  await user.type(screen.getByRole('textbox', { name: 'Search products' }), 'not-found');
  expect(screen.getByRole('heading', { name: 'No matching products' })).toBeTruthy();
  await user.click(screen.getByRole('button', { name: 'Reset filters' }));
  expect(screen.getByRole('button', { name: 'Service 01' })).toBeTruthy();
  expect(screen.getByRole('button', { name: 'Service 20' })).toBeTruthy();
  expect((screen.getByRole('textbox', { name: 'Search products' }) as HTMLInputElement).value).toBe('');
});

it('sorts the full collection before pagination and opens the chosen product', async () => {
  const user = userEvent.setup();
  const navigate = vi.fn();
  render(<ProductsPage products={products} status="ready" error="" navigate={navigate} />);
  await user.click(screen.getByRole('button', { name: 'Name' }));
  const firstRow = screen.getAllByRole('row')[1];
  await user.click(within(firstRow).getByRole('button', { name: 'Service 25' }));
  expect(navigate).toHaveBeenCalledWith({ kind: 'product', productKey: 'S25' });
  expect(products[0].name).toBe('Service 01');
});

it('keeps product metadata under the description and uses the three product sections', () => {
  render(<ProductPage
    product={{ id: 41, workspace_id: 7, name: 'Trading Platform', product_code: 'TRADE', criticality: 'mission-critical', description: 'Product for high-frequency trading' }}
    navigate={vi.fn()}
  />);

  expect(screen.getByText('Product for high-frequency trading')).toBeTruthy();
  const metadata = screen.getByRole('group', { name: 'Product metadata' });
  expect(Array.from(metadata.children).map((item) => item.textContent)).toEqual(['TRADE', 'MISSION CRITICAL']);
  expect(within(metadata).queryByText('Mission critical')).toBeNull();
  expect(screen.getByRole('tab', { name: 'Overview' })).toBeTruthy();
  expect(screen.getByRole('tab', { name: 'Components' })).toBeTruthy();
  expect(screen.getByRole('tab', { name: 'Threat modeling' })).toBeTruthy();
  expect(screen.queryByRole('tab', { name: 'Architecture map' })).toBeNull();
  expect(screen.queryByRole('heading', { name: /Components \(/ })).toBeNull();
});

it('renders every criticality badge with one uppercase label style', () => {
  render(<ProductsPage
    products={[
      { id: 1, workspace_id: 7, name: 'Trading Platform', product_code: 'TRADE', criticality: 'mission-critical' },
      { id: 2, workspace_id: 7, name: 'Payments', product_code: 'PAY', criticality: 'business-critical' },
      { id: 3, workspace_id: 7, name: 'Operations', product_code: 'OPS', criticality: 'business-operational' },
      { id: 4, workspace_id: 7, name: 'Office', product_code: 'OFFICE', criticality: 'office-productivity' },
    ]}
    status="ready"
    error=""
    navigate={vi.fn()}
  />);

  expect(screen.getByText('MISSION CRITICAL')).toBeTruthy();
  expect(screen.getByText('BUSINESS CRITICAL')).toBeTruthy();
  expect(screen.getByText('BUSINESS OPERATIONAL')).toBeTruthy();
  expect(screen.getByText('OFFICE PRODUCTIVITY')).toBeTruthy();
  expect(screen.queryByText('●')).toBeNull();
});

it('renders the component view with a compact three-option control and a create action', () => {
  render(<ProductComponentsPage
    product={{ id: 41, workspace_id: 7, name: 'Trading Platform', product_code: 'TRADE', criticality: 'mission-critical', description: 'Product for high-frequency trading' }}
    components={[]}
    status="ready"
    error=""
    navigate={vi.fn()}
  />);

  const viewControl = screen.getByRole('group', { name: 'Component views' });
  expect(within(viewControl).getByRole('button', { name: /Services 0/ })).toBeTruthy();
  expect(within(viewControl).getByRole('button', { name: /Infrastructure 0/ })).toBeTruthy();
  expect(within(viewControl).getByRole('button', { name: /Architecture 0/ })).toBeTruthy();
  expect(within(viewControl.parentElement!).getByRole('button', { name: 'Create component' })).toBeTruthy();
  const emptyState = screen.getByRole('heading', { name: 'No services yet' }).closest('.pf-v6-c-empty-state');
  expect(emptyState).not.toBeNull();
  expect(emptyState?.querySelector('svg')).not.toBeNull();
});
