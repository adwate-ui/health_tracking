import type { InputHTMLAttributes, ReactNode } from 'react';
import { forwardRef, useId } from 'react';

interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size'> {
  label?: string;
  helperText?: string;
  errorMessage?: string | undefined;
  required?: boolean;
  leadingIcon?: ReactNode;
  trailingAffix?: ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, helperText, errorMessage, required, leadingIcon, trailingAffix, id, className = '', ...rest },
  ref,
) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const helperId = helperText || errorMessage ? `${inputId}-helper` : undefined;
  const hasError = Boolean(errorMessage);

  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label htmlFor={inputId} className="text-small text-text-secondary font-medium">
          {label}
          {required && <span className="text-action-accent ml-0.5">*</span>}
        </label>
      )}
      <div className="relative">
        {leadingIcon && (
          <div className="absolute inset-y-0 left-0 flex items-center pl-3 text-text-tertiary pointer-events-none">
            {leadingIcon}
          </div>
        )}
        <input
          ref={ref}
          id={inputId}
          aria-describedby={helperId}
          aria-invalid={hasError}
          className={`
            h-9 w-full rounded-md px-3 bg-surface-raised text-text-primary text-body
            border border-border-subtle hover:border-border-strong
            focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2
            disabled:opacity-40 disabled:cursor-not-allowed
            placeholder:text-text-tertiary
            ${hasError ? 'border-action-danger' : ''}
            ${leadingIcon ? 'pl-10' : ''}
            ${trailingAffix ? 'pr-10' : ''}
            ${className}
          `}
          {...rest}
        />
        {trailingAffix && (
          <div className="absolute inset-y-0 right-0 flex items-center pr-3 text-text-tertiary text-body-sm">
            {trailingAffix}
          </div>
        )}
      </div>
      {(errorMessage || helperText) && (
        <p
          id={helperId}
          className={`text-small ${hasError ? 'text-action-danger' : 'text-text-tertiary'}`}
        >
          {errorMessage ?? helperText}
        </p>
      )}
    </div>
  );
});

