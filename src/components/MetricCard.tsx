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
  'on-track':   'bg-action-primary',
  'approaching': 'bg-action-accent',
  'below':      'bg-action-danger',
  'logged':     'bg-border-strong',
  'neutral':    'bg-border-strong',
};

const leftBorderByState: Record<NonNullable<MetricCardProps['state']>, string> = {
  'on-track':   'border-l-action-primary',
  'approaching': 'border-l-action-accent',
  'below':      'border-l-action-danger',
  'logged':     'border-l-border-subtle',
  'neutral':    'border-l-border-subtle',
};

export function MetricCard({ label, value, unit, context, progress, state = 'neutral' }: MetricCardProps) {
  const fillClass = progressFillByState[state];
  const borderClass = leftBorderByState[state];
  const pct = progress
    ? Math.max(0, Math.min(100, (progress.current / progress.target) * 100))
    : undefined;

  return (
    <div
      className={`
        bg-surface-raised border border-border-subtle border-l-4 ${borderClass}
        rounded-lg p-4 flex flex-col gap-1.5
        transition-shadow duration-fast
        hover:shadow-[0_2px_8px_rgb(0_0_0/0.08)] dark:hover:shadow-[0_2px_8px_rgb(0_0_0/0.28)]
      `}
    >
      <p className="text-eyebrow text-text-tertiary uppercase tracking-wide">{label}</p>
      <p className="tabular text-display leading-none text-text-primary font-medium">
        {value}
      </p>
      {unit && (
        <p className="text-small text-text-secondary">{unit}</p>
      )}
      {context && <p className="text-small text-text-tertiary">{context}</p>}
      {pct !== undefined && (
        <div className="mt-1 h-1.5 bg-surface-canvas rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-base ${fillClass}`}
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
