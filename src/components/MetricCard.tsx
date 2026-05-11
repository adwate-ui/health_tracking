import { useState, useRef, useCallback } from 'react';

type MetricState = 'on-track' | 'approaching' | 'below' | 'logged' | 'neutral';

interface MetricCardProps {
  label: string;
  value: number | null | undefined;
  targetLabel?: string | undefined;
  progress?: { current: number; target: number } | undefined;
  state?: MetricState | undefined;
  onChange?: ((value: number | null) => void) | undefined;
  decimalPlaces?: number | undefined;
  className?: string | undefined;
}

const progressFill: Record<MetricState, string> = {
  'on-track':   'bg-action-primary',
  'approaching': 'bg-action-accent',
  'below':      'bg-action-danger',
  'logged':     'bg-border-strong',
  'neutral':    'bg-border-strong',
};

const leftBorder: Record<MetricState, string> = {
  'on-track':   'border-l-action-primary',
  'approaching': 'border-l-action-accent',
  'below':      'border-l-action-danger',
  'logged':     'border-l-border-subtle',
  'neutral':    'border-l-border-subtle',
};

function formatNum(v: number, dp: number): string {
  return v.toLocaleString(undefined, {
    minimumFractionDigits: dp,
    maximumFractionDigits: dp,
  });
}

export function MetricCard({
  label,
  value,
  targetLabel,
  progress,
  state: stateProp = 'neutral',
  onChange,
  decimalPlaces = 0,
  className = '',
}: MetricCardProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');

  // While editing, parse the draft for live progress/state updates
  const liveValue = editing
    ? (parseFloat(draft.replace(/,/g, '')) || 0)
    : (value ?? 0);

  // Recalculate progress pct from live value during editing
  const pct = progress
    ? Math.max(0, Math.min(100, (liveValue / progress.target) * 100))
    : undefined;

  const state = stateProp;
  const fill   = progressFill[state];
  const border = leftBorder[state];

  const handleFocus = useCallback(() => {
    setEditing(true);
    setDraft(value != null ? String(value) : '');
    // Select all on next frame so the value has rendered
    requestAnimationFrame(() => inputRef.current?.select());
  }, [value]);

  const handleBlur = useCallback(() => {
    setEditing(false);
    if (!onChange) return;
    const raw = draft.replace(/,/g, '').trim();
    if (raw === '') { onChange(null); return; }
    const parsed = parseFloat(raw);
    onChange(isNaN(parsed) ? null : parsed);
  }, [draft, onChange]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Allow digits, one decimal point; nothing else while typing
    const v = e.target.value;
    if (/^[\d,]*\.?\d*$/.test(v) || v === '') setDraft(v);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') e.currentTarget.blur();
  };

  const displayText = editing
    ? draft
    : value != null
      ? formatNum(value, decimalPlaces)
      : '';

  const isEditable = Boolean(onChange);

  return (
    <div
      className={`
        bg-surface-raised border border-border-subtle border-l-4 ${border}
        rounded-xl p-4 flex flex-col gap-1
        transition-shadow duration-fast
        hover:shadow-[0_2px_8px_rgb(0_0_0/0.07)] dark:hover:shadow-[0_2px_8px_rgb(0_0_0/0.28)]
        ${isEditable ? 'cursor-text' : ''}
        ${className}
      `}
      onClick={() => isEditable && inputRef.current?.focus()}
    >
      {/* Label */}
      <p className="text-eyebrow text-text-tertiary uppercase tracking-wide select-none">
        {label}
      </p>

      {/* Editable number — same visual as the display text */}
      <div className="leading-none">
        <input
          ref={inputRef}
          type="text"
          inputMode={decimalPlaces > 0 ? 'decimal' : 'numeric'}
          aria-label={label}
          readOnly={!isEditable}
          value={displayText}
          placeholder="—"
          onChange={handleChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          className={`
            w-full bg-transparent border-none outline-none p-0 m-0
            text-display font-medium leading-none tabular-nums
            caret-action-primary
            placeholder:text-text-tertiary
            ${value != null || editing ? 'text-text-primary' : 'text-text-tertiary'}
            ${isEditable ? 'cursor-text' : 'cursor-default select-none'}
          `}
          style={{ fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.02em' }}
        />
      </div>

      {/* Target context */}
      {targetLabel && (
        <p className="text-small text-text-secondary select-none">{targetLabel}</p>
      )}

      {/* Progress bar */}
      {pct !== undefined && (
        <div className="mt-2 h-1.5 bg-surface-canvas rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-base ${fill}`}
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
