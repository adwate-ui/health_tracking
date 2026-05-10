import type { ReactNode } from 'react';
import { IconCheck, IconAlertTriangle, IconX, IconCircleCheck } from '@tabler/icons-react';

type State = 'on-track' | 'approaching' | 'below' | 'logged' | 'neutral';

interface PillProps {
  state: State;
  children: ReactNode;
}

const stateStyles: Record<State, { bg: string; text: string; icon: ReactNode | null }> = {
  'on-track':    { bg: 'bg-status-on-track-bg',    text: 'text-status-on-track-text',    icon: <IconCheck size={12} /> },
  'approaching': { bg: 'bg-status-approaching-bg', text: 'text-status-approaching-text', icon: <IconAlertTriangle size={12} /> },
  'below':       { bg: 'bg-status-below-bg',       text: 'text-status-below-text',       icon: <IconX size={12} /> },
  'logged':      { bg: 'bg-status-logged-bg',      text: 'text-status-logged-text',      icon: <IconCircleCheck size={12} /> },
  'neutral':     { bg: 'bg-surface-sunken',        text: 'text-text-secondary',          icon: null },
};

export function Pill({ state, children }: PillProps) {
  const { bg, text, icon } = stateStyles[state];
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-pill text-eyebrow ${bg} ${text}`}>
      {icon}
      {children}
    </span>
  );
}
