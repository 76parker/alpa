import { CircleHelp } from '../src/ui/icons';
import { type ReactNode } from 'react';
import { TooltipTrigger } from './tooltip-trigger';

type FieldLabelProps = {
  children?: ReactNode;
  help: string;
  helpID?: string;
  htmlFor?: string;
  label?: ReactNode;
  required?: boolean;
};

export function FieldLabel({ children, label, help, required = false, htmlFor, helpID }: FieldLabelProps) {
  const content = label ?? children;
  const accessibleLabel = typeof content === 'string' ? content : 'field';

  const labelContent = <>{content}{required ? <span className="field-required-marker" aria-hidden="true">*</span> : null}</>;

  return <span className="field-label">
    {htmlFor ? <label className="field-label-text" htmlFor={htmlFor}>{labelContent}</label> : <span className="field-label-text">{labelContent}</span>}
    <span className="field-help">
      <TooltipTrigger ariaLabel={`About ${accessibleLabel}`} buttonClassName="field-help-control" content={help} descriptionID={helpID}>
        <CircleHelp width={13} height={13} aria-hidden="true" />
      </TooltipTrigger>
    </span>
  </span>;
}
