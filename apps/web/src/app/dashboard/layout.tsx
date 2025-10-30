// C:\Dev\FROK\apps\web\src\app\dashboard\layout.tsx
import { AppShell } from '@frok/ui';
import DashboardNav from './DashboardNav';
import Breadcrumbs from './Breadcrumbs';

const nav = [
  { label: '← Agent', href: '/agent' },
  { label: '─────────', href: '#', disabled: true },
  { label: 'Dashboard', href: '/dashboard' },
  { label: 'Profile', href: '/dashboard/profile' },
  { label: 'System', href: '/dashboard/system' },
  { label: 'Users', href: '/dashboard/users' },
  { label: 'Smart Home', href: '/dashboard/smart-home' },
  { label: 'Health', href: '/dashboard/health' },
  { label: 'Development', href: '/dashboard/development' },
  { label: 'Automation', href: '/dashboard/automation' },
  { label: 'Finances', href: '/dashboard/finances' },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppShell
      sideNav={<DashboardNav items={nav} header={<div className="px-4 pb-4 text-primary font-bold">FROK</div>} footer={<div className="mt-auto px-4 pt-4 text-xs opacity-60">© {new Date().getFullYear()} FROK</div>} />}
      header={<Breadcrumbs />}
      footer={<div>© {new Date().getFullYear()} FROK · All systems nominal</div>}
    >
      {children}
    </AppShell>
  );
}
