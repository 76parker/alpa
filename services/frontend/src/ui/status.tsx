import { Label, type LabelProps } from '@patternfly/react-core';
import { productCriticalityLabels, type ProductCriticality } from '../../lib/inventory/contracts';

const criticalityColors: Record<ProductCriticality, LabelProps['color']> = {
  'mission-critical': 'red',
  'business-critical': 'orange',
  'business-operational': 'blue',
  'office-productivity': 'grey',
};

export function CriticalityBadge({ value }: { value: ProductCriticality }) {
  return <Label isCompact color={criticalityColors[value]}>{productCriticalityLabels[value].toUpperCase()}</Label>;
}

export function NetworkExposureLabel({ value }: { value: 'internal' | 'internet' }) {
  return <Label isCompact color={value === 'internet' ? 'orange' : 'grey'}>{value}</Label>;
}
