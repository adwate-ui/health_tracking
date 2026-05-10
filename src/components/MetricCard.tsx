import type { ReactNode } from 'react';

interface MetricCardProps {
  label: string;
  value: ReactNode;
  unit?: string;
  context?: ReactNode;
  progress?: { current: number; target: number };
  state?: 'on-track' | 'approaching' | 'below' | 'logged' | 'neutral';
}

const progressFillByState: Record<NonNullable<MetricCardProps['state']>, string> = {
  'on-track': 'bg-action-primary',
  'approaching': 'bg-action-accent',
  'below': 'bg-action-danger',
  'logged': 'bg-text-on-info',
  'neutral': 'bg-border-strong',
};

export function MetricCard({ label, value, unit, context, progress, state }: MetricCardProps) {
  const fillClass = state ? progressFillByState[state] : 'bg-action-primary';
  const pct = progress
    ? Math.max(0, Math.min(100, (progress.current / progress.target) * 100))
    : undefined;

  return (
    <div className="bg-surface-sunken rounded-md p-3 flex flex-col gap-1">
      <p className="text-small text-text-secondary font-medium">{label}</p>
      <p className="tabular text-h1 text-text-primary leading-none">
        {value}
        {unit && <span className="text-body-sm text-text-secondary font-normal ml-1">{unit}</span>}
      </p>
      {context && <p className="text-small text-text-tertiary">{context}</p>}
      {pct !== undefined && (
        <div className="mt-2 h-1 bg-surface-canvas rounded-xs overflow-hidden">
          <div
            className={`h-full rounded-xs transition-all duration-base ${fillClass}`}
            style={{ width: `${pct}%` }}
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(pct)}
          />
        </div>
      )}
    </div>
  );
}
