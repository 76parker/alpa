import { useId, useLayoutEffect, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

type TooltipTriggerProps = {
  ariaLabel: string;
  buttonClassName: string;
  children: ReactNode;
  content: string;
  descriptionID?: string;
  tooltipClassName?: string;
};

export function TooltipTrigger({ ariaLabel, buttonClassName, children, content, descriptionID: providedDescriptionID, tooltipClassName = 'field-help-tooltip' }: TooltipTriggerProps) {
  const generatedID = useId();
  const descriptionID = providedDescriptionID ?? `${generatedID}-description`;
  const tooltipID = `${generatedID}-tooltip`;
  const controlRef = useRef<HTMLButtonElement>(null);
  const tooltipRef = useRef<HTMLSpanElement>(null);
  const [open, setOpen] = useState(false);
  const portalRoot = typeof document === 'undefined' ? null : document.body;
  const [position, setPosition] = useState({ left: 0, top: 0, side: 'bottom' as 'top' | 'bottom' });

  useLayoutEffect(() => {
    if (!open || !portalRoot) return;

    const positionTooltip = () => {
      const control = controlRef.current;
      const tooltip = tooltipRef.current;
      if (!control || !tooltip) return;

      const controlRect = control.getBoundingClientRect();
      const tooltipRect = tooltip.getBoundingClientRect();
      const viewportMargin = 10;
      const gap = 8;
      const width = Math.min(tooltipRect.width, Math.max(0, window.innerWidth - viewportMargin * 2));
      const height = tooltipRect.height;
      const spaceBelow = window.innerHeight - controlRect.bottom;
      const side = spaceBelow >= height + gap || spaceBelow >= controlRect.top ? 'bottom' : 'top';
      const preferredTop = side === 'bottom' ? controlRect.bottom + gap : controlRect.top - height - gap;
      const top = Math.min(
        Math.max(viewportMargin, preferredTop),
        Math.max(viewportMargin, window.innerHeight - height - viewportMargin),
      );
      const centeredLeft = controlRect.left + controlRect.width / 2 - width / 2;
      const left = Math.min(
        Math.max(viewportMargin, centeredLeft),
        Math.max(viewportMargin, window.innerWidth - width - viewportMargin),
      );

      setPosition({ left, top, side });
    };

    positionTooltip();
    window.addEventListener('resize', positionTooltip);
    window.addEventListener('scroll', positionTooltip, true);
    return () => {
      window.removeEventListener('resize', positionTooltip);
      window.removeEventListener('scroll', positionTooltip, true);
    };
  }, [open, portalRoot]);

  function dismissTooltip(event: KeyboardEvent<HTMLButtonElement>) {
    if (event.key !== 'Escape') return;
    event.preventDefault();
    event.stopPropagation();
    setOpen(false);
  }

  return <>
    <button
      ref={controlRef}
      className={buttonClassName}
      type="button"
      aria-label={ariaLabel}
      aria-describedby={descriptionID}
      aria-controls={tooltipID}
      aria-expanded={open}
      onBlur={() => setOpen(false)}
      onClick={() => setOpen(true)}
      onFocus={() => setOpen(true)}
      onKeyDown={dismissTooltip}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      {children}
    </button>
    <span id={descriptionID} className="sr-only">{content}</span>
    {open && portalRoot ? createPortal(
      <span
        ref={tooltipRef}
        id={tooltipID}
        className={tooltipClassName}
        data-side={position.side}
        role="tooltip"
        style={{ left: position.left, top: position.top }}
      >
        {content}
      </span>,
      portalRoot,
    ) : null}
  </>;
}
