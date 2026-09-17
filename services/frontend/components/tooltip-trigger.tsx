import { useId, type ReactNode } from 'react';
import { Button, Tooltip } from '../src/ui';

type TooltipTriggerProps = {
  ariaLabel: string;
  buttonClassName: string;
  children: ReactNode;
  content: ReactNode;
  accessibleContent?: string;
  descriptionID?: string;
  tooltipClassName?: string;
  onClick?: () => void;
  title?: string;
};

export function TooltipTrigger({ ariaLabel, buttonClassName, children, content, accessibleContent, descriptionID: providedID, tooltipClassName, onClick, title }: TooltipTriggerProps) {
  const generatedID = useId();
  const descriptionID = providedID ?? `${generatedID}-description`;
  return <>
    <Tooltip content={content} className={tooltipClassName} entryDelay={100} position="auto" aria="none" trigger="mouseenter focus click" isContentLeftAligned>
      <Button className={buttonClassName} variant="plain" aria-label={ariaLabel} aria-describedby={descriptionID} onClick={onClick} title={title}>{children}</Button>
    </Tooltip>
    <span id={descriptionID} className="sr-only">{accessibleContent ?? (typeof content === 'string' ? content : '')}</span>
  </>;
}
