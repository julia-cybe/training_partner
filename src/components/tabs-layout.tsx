import { Activity, CalendarDays, CircleUserRound, MessagesSquare, type LucideIcon } from 'lucide-react';
import { NavLink, Outlet } from 'react-router-dom';

const TABS: { to: string; label: string; icon: LucideIcon; end?: boolean }[] = [
  { to: '/', label: 'Calendar', icon: CalendarDays, end: true },
  { to: '/coach', label: 'Coach', icon: MessagesSquare },
  { to: '/activities', label: 'Activities', icon: Activity },
  { to: '/profile', label: 'Profile', icon: CircleUserRound },
];

export function TabsLayout() {
  return (
    <div className="has-tabs">
      <main className="page"><Outlet /></main>
      <nav className="tabbar" aria-label="Main">
        <div className="tabbar-inner">
          {TABS.map(({ to, label, icon: Icon, end }) => (
            <NavLink key={to} to={to} end={end} className={({ isActive }) => `tab ${isActive ? 'active' : ''}`}>
              <Icon size={22} />
              {label}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
}
