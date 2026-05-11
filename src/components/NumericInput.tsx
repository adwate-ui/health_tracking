import { useState, useEffect, useId } from 'react';
import type { ReactNode } from 'react';
import { Input } from '@/components/Input';

interface NumericInputProps {
  label?: string;
  helperText?: string;
  errorMessage?: string;
  value: number | null | undefined;
  onChange: (value: number | null) => void;
  decimalPlaces?: number;
  trailingAffix?: ReactNode;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  required?: boolean;
  autoFocus?: boolean;
}

function formatValue(value: number | null | undefined, decimalPlaces: number): string {
  if (value == null || isNaN(value)) return '';
  return value.toLocaleString(undefined, {
    minimumFractionDigits: decimalPlaces,
    maximumFractionDigits: decimalPlaces,
  });
}

export function NumericInput({
  label,
  helperText,
  errorMessage,
  value,
  onChange,
  decimalPlaces = 0,
  trailingAffix,
  placeholder,
  disabled,
  className,
  required,
  autoFocus,
}: NumericInputProps) {
  const [displayValue, setDisplayValue] = useState(() => formatValue(value, decimalPlaces));
  const [isFocused, setIsFocused] = useState(false);
  const id = useId();

  useEffect(() => {
    if (!isFocused) {
      setDisplayValue(formatValue(value, decimalPlaces));
    }
  }, [value, isFocused, decimalPlaces]);

  function handleFocus() {
    setIsFocused(true);
    const raw = displayValue.replace(/,/g, '');
    setDisplayValue(raw);
  }

  function handleBlur() {
    setIsFocused(false);
    const stripped = displayValue.replace(/,/g, '');
    if (stripped === '' || stripped === '-') {
      onChange(null);
      setDisplayValue('');
    } else {
      const parsed = parseFloat(stripped);
      if (isNaN(parsed)) {
        onChange(null);
        setDisplayValue('');
      } else {
        onChange(parsed);
        setDisplayValue(formatValue(parsed, decimalPlaces));
      }
    }
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = e.target.value;
    if (/^-?\d*\.?\d*$/.test(raw) || raw === '') {
      setDisplayValue(raw);
    }
  }

  return (
    <Input
      id={id}
      type="text"
      inputMode={decimalPlaces > 0 ? 'decimal' : 'numeric'}
      value={displayValue}
      onChange={handleChange}
      onFocus={handleFocus}
      onBlur={handleBlur}
      {...(label !== undefined ? { label } : {})}
      {...(helperText !== undefined ? { helperText } : {})}
      {...(errorMessage !== undefined ? { errorMessage } : {})}
      {...(trailingAffix !== undefined ? { trailingAffix } : {})}
      {...(placeholder !== undefined ? { placeholder } : {})}
      {...(disabled !== undefined ? { disabled } : {})}
      {...(className !== undefined ? { className } : {})}
      {...(required !== undefined ? { required } : {})}
      {...(autoFocus !== undefined ? { autoFocus } : {})}
    />
  );
}
