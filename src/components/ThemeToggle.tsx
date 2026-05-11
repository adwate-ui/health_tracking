import { IconSun, IconDeviceDesktop, IconMoon } from '@tabler/icons-react';
import { useTheme } from '@/lib/theme';
import type { Theme } from '@/lib/theme';

interface ThemeToggleProps {
  compact?: boolean;
}

const options: { value: Theme; label: string; Icon: typeof IconSun }[] = [
  { value: 'light',  label: 'Light',  Icon: IconSun },
  { value: 'system', label: 'System', Icon: IconDeviceDesktop },
  { value: 'dark',   label: 'Dark',   Icon: IconMoon },
];

export function ThemeToggle({ compact = false }: ThemeToggleProps) {
  const { theme, setTheme } = useTheme();
  const iconSize = compact ? 15 : 16;

  return (
    <div
      role="radiogroup"
      aria-label="Color theme"
      className="inline-flex rounded-md border border-border-subtle bg-surface-sunken p-0.5 gap-0.5"
    >
      {options.map(({ value, label, Icon }) => {
        const isActive = theme === value;
        return (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={isActive}
            aria-label={`${label} mode`}
            onClick={() => setTheme(value)}
            className={`
              rounded-sm transition-colors duration-fast
              ${compact
                ? 'h-7 w-7 flex items-center justify-center'
                : 'h-8 px-3 flex items-center gap-1.5 text-body-sm font-medium'
              }
              ${isActive
                ? 'bg-surface-raised shadow-sm text-text-primary'
                : 'text-text-tertiary hover:text-text-secondary'
              }
            `}
          >
            <Icon size={iconSize} />
            {!compact && <span>{label}</span>}
          </button>
        );
      })}
    </div>
  );
}
