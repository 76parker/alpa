import { ArrowLeft, Construction } from 'lucide-react';

export function DevelopmentNotice({ message, onBack }: { message: string; onBack: () => void }) {
  return <section className="development-notice" aria-labelledby="development-title">
    <div className="development-notice-inner">
      <span className="development-icon" aria-hidden="true"><Construction size={25} strokeWidth={1.7} /></span>
      <div>
        <span className="eyebrow">In development</span>
        <h1 id="development-title">{message}</h1>
        <p>This area is not available yet. Inventory data remains unchanged.</p>
      </div>
      <button className="button secondary" type="button" onClick={onBack}><ArrowLeft size={15} aria-hidden="true" />Back</button>
    </div>
  </section>;
}
