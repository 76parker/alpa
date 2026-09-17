import { Button, EmptyState, EmptyStateBody, EmptyStateFooter } from '../../src/ui';
import { ArrowLeft, Construction } from '../../src/ui/icons';

export function DevelopmentNotice({ message, onBack }: { message: string; onBack: () => void }) {
  return <EmptyState className="development-notice" titleText={message} headingLevel="h1" icon={Construction} variant="sm">
    <EmptyStateBody>This area is not available yet. Open the product inventory to manage products and components.</EmptyStateBody>
    <EmptyStateFooter><Button variant="secondary" onClick={onBack} icon={<ArrowLeft />}>Back</Button></EmptyStateFooter>
  </EmptyState>;
}
