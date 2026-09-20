import { useEffect, useState, type ReactNode } from "react";
import {
  LoaderCircle,
  AlertCircle,
  Construction,
  Inbox,
  ArrowLeft,
} from "lucide-react";
import { Link, useBlocker } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Field,
  FieldLabel,
  FieldDescription,
  FieldError,
} from "@/components/ui/field";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { criticalityLabel, impact } from "@/domain/catalog";
import type { Criticality, Importancy } from "@/api/types";
import { errorMessage } from "@/api/client";
import { cn } from "@/lib/utils";

export function FormField({
  label,
  id,
  error,
  hint,
  children,
  required,
  disabled,
}: {
  label: string;
  id: string;
  error?: string;
  hint?: ReactNode;
  children: ReactNode;
  required?: boolean;
  disabled?: boolean;
}) {
  return (
    <Field
      data-invalid={!!error || undefined}
      data-disabled={disabled || undefined}
    >
      <FieldLabel htmlFor={id}>
        {label}
        {required ? " *" : ""}
      </FieldLabel>
      {children}
      {hint ? (
        <FieldDescription id={`${id}-hint`}>{hint}</FieldDescription>
      ) : null}
      {error ? <FieldError id={`${id}-error`}>{error}</FieldError> : null}
    </Field>
  );
}
export type Option = { value: string; label: ReactNode; text?: string };
export function SelectControl({
  id,
  label,
  value,
  onChange,
  options,
  disabled,
  invalid,
  className,
}: {
  id?: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Option[];
  disabled?: boolean;
  invalid?: boolean;
  className?: string;
}) {
  return (
    <Select value={value} onValueChange={onChange} disabled={disabled}>
      <SelectTrigger
        id={id}
        aria-label={label}
        aria-invalid={invalid || undefined}
        className={cn("w-full", className)}
      >
        <SelectValue placeholder="Select…" />
      </SelectTrigger>
      <SelectContent position="popper">
        <SelectGroup>
          {options.map((item) => (
            <SelectItem
              key={item.value}
              value={item.value}
              textValue={item.text}
            >
              {item.label}
            </SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  );
}
export function CriticalityBadge({ value }: { value: Criticality }) {
  return (
    <Badge className="criticality-badge" data-criticality={value}>
      {criticalityLabel(value)}
    </Badge>
  );
}
export function ImportancyBadge({ value }: { value: Importancy | null }) {
  if (!value) return <span className="muted">Not specified</span>;
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Badge
          tabIndex={0}
          className="importancy-badge"
          data-importancy={value}
        >
          {value.toUpperCase()}
          <span aria-hidden="true">?</span>
        </Badge>
      </TooltipTrigger>
      <TooltipContent className="max-w-72">
        {impact[value]?.description || value}
      </TooltipContent>
    </Tooltip>
  );
}
export function PageHeading({
  title,
  description,
  children,
}: {
  title: ReactNode;
  description?: string;
  children?: ReactNode;
}) {
  return (
    <header className="page-heading">
      <div>
        <h1>{title}</h1>
        {description ? <p>{description}</p> : null}
      </div>
      {children ? <div className="heading-actions">{children}</div> : null}
    </header>
  );
}
export function ErrorNotice({
  error,
  retry,
}: {
  error: unknown;
  retry?: () => void;
}) {
  return (
    <Alert variant="destructive" role="alert">
      <AlertCircle />
      <AlertTitle>Something went wrong</AlertTitle>
      <AlertDescription>
        {errorMessage(error)}
        {retry ? (
          <Button size="sm" variant="outline" onClick={retry}>
            Retry
          </Button>
        ) : null}
      </AlertDescription>
    </Alert>
  );
}
export function Loading({ label = "Loading inventory…" }: { label?: string }) {
  return (
    <div role="status" aria-label={label} className="loading-state">
      <span className="sr-only">{label}</span>
      <Skeleton className="h-8 w-52" />
      <Skeleton className="h-9 w-80 max-w-full" />
      {[0, 1, 2].map((key) => (
        <Skeleton key={key} className="h-16 w-full" />
      ))}
    </div>
  );
}
export function EmptyState({
  title,
  description,
  children,
  development = false,
}: {
  title: string;
  description: string;
  children?: ReactNode;
  development?: boolean;
}) {
  return (
    <Empty className="empty-state">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          {development ? <Construction /> : <Inbox />}
        </EmptyMedia>
        <EmptyTitle>{title}</EmptyTitle>
        <EmptyDescription>{description}</EmptyDescription>
      </EmptyHeader>
      {children ? <EmptyContent>{children}</EmptyContent> : null}
    </Empty>
  );
}
export function DevelopmentPage({
  title,
  back = "/products",
  nested = false,
}: {
  title: string;
  back?: string;
  nested?: boolean;
}) {
  useTitle(title);
  return (
    <>
      {!nested ? <PageHeading title={title} /> : null}
      <EmptyState
        development
        title="In development"
        description={`${title} is not available yet. You can continue exploring products and their architecture.`}
      >
        <Button variant="outline" asChild>
          <Link to={back}>
            <ArrowLeft data-icon="inline-start" />
            Back
          </Link>
        </Button>
      </EmptyState>
    </>
  );
}
export function NotFound({
  label = "Page not found",
  back = "/products",
}: {
  label?: string;
  back?: string;
}) {
  return (
    <EmptyState
      title={label}
      description="This page may have been removed or the link is no longer valid."
    >
      <Button variant="outline" asChild>
        <Link to={back}>Back to inventory</Link>
      </Button>
    </EmptyState>
  );
}
export function SubmitButton({
  busy,
  children,
}: {
  busy: boolean;
  children: ReactNode;
}) {
  return (
    <Button type="submit" disabled={busy}>
      {busy ? (
        <LoaderCircle className="animate-spin" data-icon="inline-start" />
      ) : null}
      {busy ? "Saving…" : children}
    </Button>
  );
}
export function ConfirmDialog({
  open,
  title,
  description,
  onCancel,
  onConfirm,
  busy = false,
  error,
  label = "Delete",
}: {
  open: boolean;
  title: string;
  description: string;
  onCancel: () => void;
  onConfirm: () => void;
  busy?: boolean;
  error?: unknown;
  label?: string;
}) {
  return (
    <AlertDialog
      open={open}
      onOpenChange={(value) => {
        if (!value && !busy) onCancel();
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        {error ? <ErrorNotice error={error} /> : null}
        <AlertDialogFooter>
          <Button variant="outline" onClick={onCancel} disabled={busy}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={onConfirm} disabled={busy}>
            {busy ? "Saving…" : label}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
export function FormDialog({
  title,
  description,
  children,
  onClose,
  dirty = false,
  busy = false,
  className,
}: {
  title: string;
  description: string;
  children: ReactNode;
  onClose: () => void;
  dirty?: boolean;
  busy?: boolean;
  className?: string;
}) {
  const [discard, setDiscard] = useState(false);
  const blocker = useBlocker(
    ({ historyAction }) => dirty && historyAction === "POP",
  );
  const close = () => {
    if (busy) return;
    if (dirty) setDiscard(true);
    else onClose();
  };
  useEffect(() => {
    if (!dirty) return;
    const guard = (event: BeforeUnloadEvent) => {
      event.preventDefault();
    };
    window.addEventListener("beforeunload", guard);
    return () => window.removeEventListener("beforeunload", guard);
  }, [dirty]);
  return (
    <>
      <Dialog
        open
        onOpenChange={(value) => {
          if (!value) close();
        }}
      >
        <DialogContent
          className={cn("form-dialog", className)}
          onEscapeKeyDown={(event) => {
            if (busy) event.preventDefault();
          }}
        >
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription>{description}</DialogDescription>
          </DialogHeader>
          <div className="dialog-body">{children}</div>
        </DialogContent>
      </Dialog>
      <ConfirmDialog
        open={discard || blocker.state === "blocked"}
        busy={busy}
        title="Discard unsaved changes?"
        description="Your changes have not been saved. Discard this draft or continue editing."
        label="Discard draft"
        onCancel={() => {
          setDiscard(false);
          if (blocker.state === "blocked") blocker.reset();
        }}
        onConfirm={() => {
          if (blocker.state === "blocked") blocker.proceed();
          else onClose();
        }}
      />
    </>
  );
}
export function useTitle(title: string) {
  useEffect(() => {
    document.title = `${title} · Alpa`;
  }, [title]);
}
