import { expect, it } from 'vitest';
import type { Product } from '../../lib/inventory/contracts';
import { buildDashboardSummary } from './dashboard-model';

const products: Product[] = [
  { id: 1, workspace_id: 7, product_code: 'OPS', name: 'Operations', criticality: 'BUSINESS-OPERATIONAL', description: 'Runs internal operations' },
  { id: 2, workspace_id: 7, product_code: 'PAY', name: 'Payments', criticality: 'MISSION-CRITICAL', description: '' },
  { id: 3, workspace_id: 7, product_code: 'CRM', name: 'Customer records', criticality: 'BUSINESS-CRITICAL', description: 'Stores customer records' },
  { id: 4, workspace_id: 7, product_code: 'DOC', name: 'Documents', criticality: 'OFFICE-PRODUCTIVITY', description: null },
  { id: 5, workspace_id: 7, product_code: 'AUTH', name: 'Identity', criticality: 'MISSION-CRITICAL', description: 'Authenticates users' },
];

it('derives honest portfolio metrics and a deterministic attention queue', () => {
  const summary = buildDashboardSummary(products);

  expect(summary.total).toBe(5);
  expect(summary.highCriticality).toBe(3);
  expect(summary.missingDescriptions).toBe(2);
  expect(summary.distribution).toEqual([
    { value: 'MISSION-CRITICAL', label: 'Mission critical', count: 2 },
    { value: 'BUSINESS-CRITICAL', label: 'Business critical', count: 1 },
    { value: 'BUSINESS-OPERATIONAL', label: 'Business operational', count: 1 },
    { value: 'OFFICE-PRODUCTIVITY', label: 'Office productivity', count: 1 },
  ]);
  expect(summary.attention.map((item) => [item.product.product_code, item.reasons])).toEqual([
    ['PAY', ['Mission critical', 'Missing description']],
    ['AUTH', ['Mission critical']],
    ['CRM', ['Business critical']],
    ['DOC', ['Missing description']],
  ]);
});

it('returns stable zero values for an empty workspace', () => {
  expect(buildDashboardSummary([])).toMatchObject({
    total: 0,
    highCriticality: 0,
    missingDescriptions: 0,
    attention: [],
  });
});
