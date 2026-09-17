import { SearchInput } from '../src/ui';

export function SearchField({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (value: string) => void; placeholder?: string }) {
  return <SearchInput className="search-field" aria-label={label} value={value} placeholder={placeholder} onChange={(_event, next) => onChange(next)} onClear={() => onChange('')} resetButtonLabel="Clear search" />;
}
