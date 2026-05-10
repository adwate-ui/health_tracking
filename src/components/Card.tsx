import type { HTMLAttributes, ReactNode } from 'react';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'raised' | 'sunken';
  children: ReactNode;
}

export function Card({ variant = 'raised', className = '', children, ...rest }: CardProps) {
  const base = variant === 'raised'
    ? 'bg-surface-raised border border-border-subtle rounded-lg p-4'
    : 'bg-surface-sunken rounded-md p-3';

  return (
    <div className={`${base} ${className}`} {...rest}>
      {children}
    </div>
  );
}
