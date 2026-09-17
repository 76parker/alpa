import { AlertCircle, CircleHelp } from "../../src/ui/icons";
import { cloneElement, useId, type ReactElement, type ReactNode } from "react";
import { InventoryRequestError } from "../../lib/inventory/client";
import { TooltipTrigger } from "../tooltip-trigger";
import {
  Alert,
  Button,
  EmptyState,
  EmptyStateBody,
  EmptyStateFooter,
  FormGroup,
  FormHelperText,
  HelperText,
  HelperTextItem,
  Spinner,
  Title,
} from "../../src/ui";

export function PageHeader({
  eyebrow,
  title,
  titleMeta,
  description,
  descriptionMeta,
  actions,
}: {
  eyebrow?: string;
  title: string;
  titleMeta?: ReactNode;
  description?: ReactNode;
  descriptionMeta?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <header className="page-header">
      <div>
        <div className="page-title-row">
          <Title headingLevel="h1" size="2xl">
            {title}
          </Title>
          {titleMeta ??
            (eyebrow ? (
              <code className="page-identifier">{eyebrow}</code>
            ) : null)}
        </div>
        {descriptionMeta ? (
          <div className="page-description-meta">{descriptionMeta}</div>
        ) : null}
        {description ? <p>{description}</p> : null}
      </div>
      {actions ? <div className="page-actions">{actions}</div> : null}
    </header>
  );
}

export function Field({
  label,
  help,
  required,
  error,
  full,
  className,
  children,
}: {
  label: string;
  help?: string;
  required?: boolean;
  error?: string;
  full?: boolean;
  className?: string;
  children: ReactElement<{
    id?: string;
    "aria-describedby"?: string;
    "aria-invalid"?: boolean;
    required?: boolean;
  }>;
}) {
  const id = useId();
  const helpID = `${id}-help`;
  const errorID = `${id}-error`;
  const describedBy = [
    children.props["aria-describedby"],
    help ? helpID : "",
    error ? errorID : "",
  ]
    .filter(Boolean)
    .join(" ");
  return (
    <FormGroup
      className={[full ? "full" : "", className].filter(Boolean).join(" ")}
      label={label}
      isRequired={required}
      fieldId={id}
      labelHelp={
        help ? (
          <TooltipTrigger
            ariaLabel={`About ${label}`}
            buttonClassName="field-help-control"
            content={help}
            descriptionID={helpID}
          >
            <CircleHelp width={13} height={13} />
          </TooltipTrigger>
        ) : undefined
      }
    >
      {cloneElement(children, {
        id,
        "aria-describedby": describedBy,
        "aria-invalid": Boolean(error),
        required,
      })}
      {error ? (
        <FormHelperText>
          <HelperText>
            <HelperTextItem id={errorID} variant="error">
              {error}
            </HelperTextItem>
          </HelperText>
        </FormHelperText>
      ) : null}
    </FormGroup>
  );
}

export function InlineError({ message }: { message: string }) {
  return (
    <Alert
      className="full"
      role="alert"
      isInline
      variant="danger"
      title={message}
    />
  );
}

export function LoadingState({
  label,
  compact = false,
}: {
  label: string;
  compact?: boolean;
}) {
  return (
    <div
      className={`inventory-loading ${compact ? "compact" : ""}`}
      role="status"
    >
      <Spinner size="md" aria-label={label} />
      <span>{label}…</span>
    </div>
  );
}

export function RequestError({
  message,
  compact = false,
}: {
  message: string;
  compact?: boolean;
}) {
  return (
    <Alert
      className={`request-error ${compact ? "compact" : ""}`}
      role="alert"
      isInline
      variant="danger"
      title={message || "The inventory request could not be completed"}
    >
      <p>Check the connection and try again.</p>
      <Button variant="link" onClick={() => window.location.reload()}>
        Retry
      </Button>
    </Alert>
  );
}

export function NotFound({
  label,
  onBack,
}: {
  label: string;
  onBack: () => void;
}) {
  return (
    <EmptyState
      titleText={label}
      headingLevel="h1"
      icon={AlertCircle}
      variant="sm"
    >
      <EmptyStateBody>
        The requested inventory record is not available in this workspace.
      </EmptyStateBody>
      <EmptyStateFooter>
        <Button variant="secondary" onClick={onBack}>
          Back
        </Button>
      </EmptyStateFooter>
    </EmptyState>
  );
}

export function publicError(cause: unknown) {
  return cause instanceof InventoryRequestError
    ? cause.message
    : "The inventory request could not be completed";
}
