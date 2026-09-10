import { Search, X } from 'lucide-react';
import { useId, useRef } from 'react';

export function SearchField({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (value: string) => void; placeholder?: string }) {
  const id = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  return <div className="search-box search-field">
    <label htmlFor={id} className="sr-only">{label}</label>
    <Search size={14} aria-hidden="true" />
    <input ref={inputRef} id={id} type="search" value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} />
    {value ? <button type="button" className="search-clear" onClick={() => { onChange(''); inputRef.current?.focus(); }} aria-label="Clear search"><X size={13} aria-hidden="true" /></button> : null}
  </div>;
}
