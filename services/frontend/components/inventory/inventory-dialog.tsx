import { X } from 'lucide-react';
import { useEffect, useId, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

export function InventoryDialog({
  title,
  eyebrow,
  onClose,
  children,
  wide = false,
  className = '',
}: {
  title: string;
  eyebrow?: string;
  onClose: () => void;
  children: ReactNode;
  wide?: boolean;
  className?: string;
}) {
  const titleID = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const previouslyFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    const backdrop = dialogRef.current?.parentElement;
    const background = Array.from(document.body.children)
      .filter((element): element is HTMLElement => element instanceof HTMLElement && element !== backdrop)
      .map((element) => ({
        element,
        inert: element.inert,
        ariaHidden: element.getAttribute('aria-hidden'),
      }));
    document.body.style.overflow = 'hidden';
    for (const item of background) {
      item.element.inert = true;
      item.element.setAttribute('aria-hidden', 'true');
    }
    const initialFocus = dialogRef.current?.querySelector<HTMLElement>(
      '[autofocus], form input:not([disabled]), form select:not([disabled]), form textarea:not([disabled]), .workspace-options button:not([disabled])',
    );
    (initialFocus ?? closeRef.current)?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key !== 'Tab' || !dialogRef.current) return;
      const focusable = Array.from(dialogRef.current.querySelectorAll<HTMLElement>(
        'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [href], [tabindex]:not([tabindex="-1"])',
      ));
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = previousOverflow;
      for (const item of background) {
        item.element.inert = item.inert;
        if (item.ariaHidden === null) item.element.removeAttribute('aria-hidden');
        else item.element.setAttribute('aria-hidden', item.ariaHidden);
      }
      previouslyFocused?.focus();
    };
  }, [onClose]);

  return createPortal(
    <div className="modal-backdrop" onMouseDown={(event) => {
      if (event.currentTarget === event.target) onClose();
    }}>
      <div ref={dialogRef} className={`modal ${wide ? 'wide' : ''} ${className}`.trim()} role="dialog" aria-modal="true" aria-labelledby={titleID}>
        <header>
          <div>{eyebrow ? <span>{eyebrow}</span> : null}<h2 id={titleID}>{title}</h2></div>
          <button ref={closeRef} type="button" onClick={onClose} aria-label="Close dialog"><X size={18} aria-hidden="true" /></button>
        </header>
        {children}
      </div>
    </div>,
    document.body,
  );
}
