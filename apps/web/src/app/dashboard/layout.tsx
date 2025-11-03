// C:\Dev\FROK\apps\web\src\app\dashboard\layout.tsx
'use client';
import { AppShell } from '@frok/ui';
import DashboardNav from './DashboardNav';
import Breadcrumbs from './Breadcrumbs';
import { useTranslations } from '@/lib/i18n/I18nProvider';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const t = useTranslations('nav');
  const tCommon = useTranslations('common');

  const nav = [
    { label: `← ${t('agent')}`, href: '/agent' },
    { label: '─────────', href: '#', disabled: true },
    { label: t('dashboard'), href: '/dashboard' },
    { label: t('profile'), href: '/dashboard/profile' },
    { label: t('system'), href: '/dashboard/system' },
    { label: t('users'), href: '/dashboard/users' },
    { label: t('smartHome'), href: '/dashboard/smart-home' },
    { label: t('health'), href: '/dashboard/health' },
    { label: t('development'), href: '/dashboard/development' },
    { label: t('automation'), href: '/dashboard/automation' },
    { label: t('finances'), href: '/dashboard/finances' },
  ];

  return (
    <AppShell
      sideNav={<DashboardNav items={nav} header={<div className="px-4 pb-4 text-primary font-bold">FROK</div>} footer={<div className="mt-auto px-4 pt-4 text-xs opacity-60">© {new Date().getFullYear()} FROK</div>} />}
      header={<Breadcrumbs />}
      footer={<div>© {new Date().getFullYear()} FROK · {tCommon('allSystemsNominal')}</div>}
    >
      {children}
    </AppShell>
  );
}
