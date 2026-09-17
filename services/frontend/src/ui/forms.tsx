import { FormSelect, MenuToggle, Select as PatternFlySelect, SelectList, SelectOption, TextArea as PatternFlyTextArea, TextInput as PatternFlyTextInput, type TextInputProps } from '@patternfly/react-core';
import { forwardRef, useState, type ChangeEvent, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react';

/** Native change events and refs keep application validation independent of the library. */
export const TextInput = forwardRef<HTMLInputElement, Omit<TextInputProps, 'onChange'> & { onChange?: (event: ChangeEvent<HTMLInputElement>) => void }>(function TextInput({ onChange, 'aria-invalid': invalid, ...props }, ref) {
  return <PatternFlyTextInput {...props} ref={ref} aria-invalid={invalid} validated={invalid === true || invalid === 'true' ? 'error' : 'default'} onChange={(event) => onChange?.(event as ChangeEvent<HTMLInputElement>)} />;
});

export const TextArea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(function TextArea({ onChange, disabled, required, value, 'aria-invalid': invalid, ...props }, ref) {
  return <PatternFlyTextArea {...props} ref={ref} value={value as string} isDisabled={disabled} isRequired={required} aria-invalid={invalid} validated={invalid === true || invalid === 'true' ? 'error' : 'default'} resizeOrientation="vertical" onChange={(event) => onChange?.(event as ChangeEvent<HTMLTextAreaElement>)} />;
});

export function Select({ onChange, disabled, required, children, ...props }: Omit<SelectHTMLAttributes<HTMLSelectElement>, 'onFocus' | 'onBlur'>) {
  return <FormSelect {...props} isDisabled={disabled} isRequired={required} onChange={(event) => onChange?.(event as ChangeEvent<HTMLSelectElement>)}>{children}</FormSelect>;
}

export type TypeSelectOption<Value extends string> = {
  value: Value;
  label: string;
  description: string;
  icon?: ReactNode;
  tone?: 'danger' | 'warning' | 'info' | 'neutral';
};

type TypeSelectProps<Value extends string> = {
  id?: string;
  value: Value;
  options: readonly TypeSelectOption<Value>[];
  onChange: (value: Value) => void;
  disabled?: boolean;
  required?: boolean;
  className?: string;
  'aria-label'?: string;
  'aria-describedby'?: string;
  'aria-invalid'?: boolean | 'true' | 'false';
};

/** Rich PatternFly select for domain types that benefit from visible meaning, not just a label. */
export function TypeSelect<Value extends string>({ id, value, options, onChange, disabled, required, className = '', 'aria-label': ariaLabel, 'aria-describedby': describedBy, 'aria-invalid': invalid }: TypeSelectProps<Value>) {
  const [open, setOpen] = useState(false);
  const selected = options.find((option) => option.value === value) ?? options[0];
  const optionVisual = (option: TypeSelectOption<Value>) => option.icon
    ? <span className="type-select-icon" aria-hidden="true">{option.icon}</span>
    : <span className={`type-select-marker ${option.tone ?? 'neutral'}`} aria-hidden="true" />;

  return <PatternFlySelect
    className={`type-select-menu ${className}`.trim()}
    isOpen={open}
    selected={value}
    shouldFocusFirstItemOnOpen
    shouldFocusToggleOnSelect
    onOpenChange={setOpen}
    onSelect={(_event, next) => {
      onChange(next as Value);
      setOpen(false);
    }}
    toggle={(toggleRef) => <MenuToggle
      ref={toggleRef}
      id={id}
      className="type-select-toggle"
      isExpanded={open}
      isDisabled={disabled}
      isFullWidth
      aria-label={ariaLabel}
      aria-describedby={describedBy}
      aria-invalid={invalid}
      aria-required={required}
      onClick={() => setOpen((current) => !current)}
    >
      {selected ? <span className="type-select-value">{optionVisual(selected)}<span className="type-select-copy"><strong>{selected.label}</strong><small>{selected.description}</small></span></span> : null}
    </MenuToggle>}
  >
    <SelectList aria-label={`${ariaLabel ?? 'Type'} options`}>
      {options.map((option) => <SelectOption key={option.value} value={option.value} icon={optionVisual(option)} description={option.description} isSelected={option.value === value}>{option.label}</SelectOption>)}
    </SelectList>
  </PatternFlySelect>;
}
