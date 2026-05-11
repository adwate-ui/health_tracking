import { NavLink } from 'react-router-dom';
import { IconCalendar, IconUser, IconChartBar, IconSettings } from '@tabler/icons-react';
import { ThemeToggle } from '@/components/ThemeToggle';

const links = [
  { to: '/',         Icon: IconCalendar,  label: 'Today'    },
  { to: '/body',     Icon: IconUser,      label: 'Body'     },
  { to: '/trends',   Icon: IconChartBar,  label: 'Trends'   },
  { to: '/settings', Icon: IconSettings,  label: 'Settings' },
];

export function Navigation() {
  return (
    <nav className="fixed bottom-0 inset-x-0 bg-surface-raised/80 glass border-t border-border-subtle pb-safe pt-2 px-4 z-40 sm:bottom-auto sm:top-0 sm:border-t-0 sm:border-b">
      <div className="max-w-2xl mx-auto flex items-center justify-between">

        {/* Nav links — column+icon on mobile, row+label on desktop */}
        <div className="flex flex-1 justify-between sm:justify-start sm:gap-1 sm:flex-initial">
          {links.map(({ to, Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className="p-1"
            >
              {({ isActive }) => (
                <span
                  className={`
                    flex flex-col sm:flex-row items-center gap-0.5 sm:gap-2
                    px-3 py-1.5 rounded-pill transition-colors duration-fast
                    text-small sm:text-body font-medium
                    ${isActive
                      ? 'text-action-primary bg-status-on-track-bg'
                      : 'text-text-tertiary hover:text-text-primary hover:bg-surface-sunken'
                    }
                  `}
                >
                  <Icon size={20} />
                  <span>{label}</span>
                </span>
              )}
            </NavLink>
          ))}
        </div>

        {/* Desktop-only theme toggle */}
        <div className="hidden sm:flex items-center">
          <ThemeToggle compact />
        </div>

      </div>
    </nav>
  );
}
