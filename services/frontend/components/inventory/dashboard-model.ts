import { productCriticalities, type Product, type ProductCriticality } from '../../lib/inventory/contracts';

const criticalityLabels: Record<ProductCriticality, string> = {
  'MISSION-CRITICAL': 'Mission critical',
  'BUSINESS-CRITICAL': 'Business critical',
  'BUSINESS-OPERATIONAL': 'Business operational',
  'OFFICE-PRODUCTIVITY': 'Office productivity',
};

const priority = new Map<ProductCriticality, number>(productCriticalities.map((value, index) => [value, index]));

export type DashboardAttentionItem = {
  product: Product;
  reasons: string[];
};

export function buildDashboardSummary(products: Product[]) {
  const distribution = productCriticalities.map((value) => ({
    value,
    label: criticalityLabels[value],
    count: products.filter((product) => product.criticality === value).length,
  }));

  const attention = products
    .map((product): DashboardAttentionItem => {
      const reasons: string[] = [];
      if (product.criticality === 'MISSION-CRITICAL' || product.criticality === 'BUSINESS-CRITICAL') {
        reasons.push(criticalityLabels[product.criticality]);
      }
      if (!product.description?.trim()) reasons.push('Missing description');
      return { product, reasons };
    })
    .filter((item) => item.reasons.length > 0)
    .sort((left, right) => {
      const criticalityDifference = (priority.get(left.product.criticality) ?? 99) - (priority.get(right.product.criticality) ?? 99);
      if (criticalityDifference !== 0) return criticalityDifference;
      const leftMissing = left.reasons.includes('Missing description') ? 0 : 1;
      const rightMissing = right.reasons.includes('Missing description') ? 0 : 1;
      if (leftMissing !== rightMissing) return leftMissing - rightMissing;
      return left.product.name.localeCompare(right.product.name);
    });

  return {
    total: products.length,
    highCriticality: products.filter((product) => product.criticality === 'MISSION-CRITICAL' || product.criticality === 'BUSINESS-CRITICAL').length,
    missingDescriptions: products.filter((product) => !product.description?.trim()).length,
    distribution,
    attention,
  };
}
