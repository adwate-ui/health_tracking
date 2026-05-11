import type { ReactNode } from 'react';
import type { TooltipProps } from 'recharts';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface StatItem {
  label: string;
  value: string;
  sub?: string;
  positive?: boolean;
}

interface TrendChartProps {
  title: string;
  insight?: string | null;
  stats: StatItem[];
  height?: number;
  children: ReactNode;
  className?: string;
}

// ─── TrendChart shell ─────────────────────────────────────────────────────────

export function TrendChart({
  title,
  insight,
  stats,
  height = 200,
  children,
  className = '',
}: TrendChartProps) {
  return (
    <div className={`bg-surface-raised border border-border-subtle rounded-xl overflow-hidden ${className}`}>
      {/* Header */}
      <div className="px-5 pt-5">
        <h2 className="text-h3 text-text-primary font-medium">{title}</h2>
        {insight && (
          <p className="text-small text-text-tertiary mt-0.5 leading-relaxed">{insight}</p>
        )}

        {/* Stats row */}
        {stats.length > 0 && (
          <div className="flex gap-5 mt-4 pb-1">
            {stats.map(stat => (
              <div key={stat.label} className="flex flex-col">
                <span className="text-eyebrow text-text-tertiary uppercase tracking-wide">{stat.label}</span>
                <span className="text-h2 text-text-primary tabular-nums font-medium leading-tight mt-0.5">
                  {stat.value}
                </span>
                {stat.sub != null && (
                  <span
                    className={`text-small mt-0.5 ${
                      stat.positive === true
                        ? 'text-action-primary'
                        : stat.positive === false
                        ? 'text-action-danger'
                        : 'text-text-tertiary'
                    }`}
                  >
                    {stat.sub}
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Chart area */}
      <div style={{ height }} className="mt-3 pr-3 pb-3">
        {children}
      </div>
    </div>
  );
}

// ─── Custom tooltip ───────────────────────────────────────────────────────────

interface ChartTooltipProps extends TooltipProps<number, string> {
  formatter?: (value: number, name: string) => string;
  unit?: string;
}

export function ChartTooltip({ active, payload, label, formatter, unit }: ChartTooltipProps) {
  if (!active || !payload?.length) return null;

  const visible = payload.filter(
    p => p.value != null && p.value !== 0 && p.dataKey !== '__dummy__',
  );
  if (!visible.length) return null;

  return (
    <div className="bg-surface-raised border border-border-subtle rounded-lg px-3 py-2 shadow-lg min-w-[110px]">
      <p className="text-eyebrow text-text-tertiary uppercase mb-1.5">{label}</p>
      {visible.map((p) => {
        const val = typeof p.value === 'number' ? p.value : 0;
        const display = formatter
          ? formatter(val, p.name ?? '')
          : `${val.toLocaleString()}${unit ? '\u00a0' + unit : ''}`;
        return (
          <div key={p.dataKey} className="flex items-baseline gap-2">
            <span
              className="inline-block w-2 h-2 rounded-full shrink-0"
              style={{ background: p.color }}
            />
            <span className="text-body-sm text-text-secondary truncate">{p.name}</span>
            <span className="text-body-sm text-text-primary tabular-nums font-medium ml-auto pl-2">
              {display}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ─── Shared axis / grid props ─────────────────────────────────────────────────

export const sharedXAxis = {
  axisLine: false,
  tickLine: false,
  tick: { fontSize: 11, fill: 'var(--color-text-tertiary)' },
  interval: 'preserveStartEnd' as const,
} as const;

export const sharedYAxis = {
  axisLine: false,
  tickLine: false,
  tick: { fontSize: 11, fill: 'var(--color-text-tertiary)' },
  width: 42,
} as const;

export const sharedGrid = {
  vertical: false,
  stroke: 'var(--color-border-subtle)',
  strokeDasharray: '0',
} as const;
