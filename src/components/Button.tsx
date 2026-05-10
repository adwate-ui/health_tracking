import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { forwardRef } from 'react';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Size = 'sm' | 'md' | 'lg';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  fullWidth?: boolean;
  leadingIcon?: ReactNode;
  trailingIcon?: ReactNode;
}

const variantClasses: Record<Variant, string> = {
  primary:
    'bg-action-primary text-text-on-brand hover:bg-action-primary-hover active:scale-[0.98]',
  secondary:
    'bg-transparent text-text-primary border border-border-subtle hover:border-border-strong hover:bg-surface-sunken active:scale-[0.98]',
  ghost:
    'bg-transparent text-text-secondary hover:text-text-primary hover:bg-surface-sunken',
  danger:
    'bg-action-danger text-text-on-brand hover:bg-action-danger-hover active:scale-[0.98]',
};

const sizeClasses: Record<Size, string> = {
  sm: 'h-8 px-3 text-body-sm',
  md: 'h-9 px-4 text-body',
  lg: 'h-11 px-5 text-body',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'secondary', size = 'md', loading, fullWidth, leadingIcon, trailingIcon, disabled, className = '', children, ...rest },
  ref,
) {
  const base =
    'inline-flex items-center justify-center gap-2 rounded-md font-medium transition-colors duration-fast ease-standard ' +
    'disabled:opacity-40 disabled:cursor-not-allowed disabled:active:scale-100';

  const widthClass = fullWidth ? 'w-full' : '';

  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={`${base} ${variantClasses[variant]} ${sizeClasses[size]} ${widthClass} ${className}`}
      {...rest}
    >
      {loading ? (
        <span className="inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-pill animate-spin" />
      ) : (
        leadingIcon
      )}
      {children}
      {!loading && trailingIcon}
    </button>
  );
});
