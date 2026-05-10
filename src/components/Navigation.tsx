import { NavLink } from 'react-router-dom';
import { IconCalendar, IconUser, IconChartBar, IconSettings } from '@tabler/icons-react';

export function Navigation() {
  return (
    <nav className="fixed bottom-0 inset-x-0 bg-surface-raised border-t border-border-subtle pb-safe pt-2 px-4 z-40 sm:bottom-auto sm:top-0 sm:border-t-0 sm:border-b">
      <div className="max-w-2xl mx-auto flex justify-between sm:justify-start sm:gap-8">
        <NavLink
          to="/"
          className={({ isActive }) => `flex flex-col items-center gap-1 p-2 sm:flex-row transition-colors ${isActive ? 'text-action-accent' : 'text-text-tertiary hover:text-text-primary'}`}
        >
          <IconCalendar size={24} />
          <span className="text-small font-medium sm:text-body">Today</span>
        </NavLink>
        <NavLink
          to="/body"
          className={({ isActive }) => `flex flex-col items-center gap-1 p-2 sm:flex-row transition-colors ${isActive ? 'text-action-accent' : 'text-text-tertiary hover:text-text-primary'}`}
        >
          <IconUser size={24} />
          <span className="text-small font-medium sm:text-body">Body</span>
        </NavLink>
        <NavLink
          to="/trends"
          className={({ isActive }) => `flex flex-col items-center gap-1 p-2 sm:flex-row transition-colors ${isActive ? 'text-action-accent' : 'text-text-tertiary hover:text-text-primary'}`}
        >
          <IconChartBar size={24} />
          <span className="text-small font-medium sm:text-body">Trends</span>
        </NavLink>
        <NavLink
          to="/settings"
          className={({ isActive }) => `flex flex-col items-center gap-1 p-2 sm:flex-row transition-colors ${isActive ? 'text-action-accent' : 'text-text-tertiary hover:text-text-primary'}`}
        >
          <IconSettings size={24} />
          <span className="text-small font-medium sm:text-body">Settings</span>
        </NavLink>
      </div>
    </nav>
  );
}
