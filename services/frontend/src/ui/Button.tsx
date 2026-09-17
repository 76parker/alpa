import { Button as PatternFlyButton, type ButtonProps } from '@patternfly/react-core';
import { forwardRef } from 'react';

/** Compact application actions, with native disabled/ref semantics. */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button({ disabled, isDisabled, size = 'sm', variant = 'plain', type = 'button', ...props }, ref) {
  return <PatternFlyButton {...props} ref={ref} type={type} variant={variant} size={size} isDisabled={isDisabled ?? disabled} />;
});
