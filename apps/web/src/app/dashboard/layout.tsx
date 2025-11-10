// C:\Dev\FROK\apps\web\src\app\dashboard\layout.tsx
'use client';
import { useState } from 'react';
import { AppShell } from '@frok/ui';
import { Menu } from 'lucide-react';
import DashboardNav from './DashboardNav';
import Breadcrumbs from './Breadcrumbs';
import { MobileHeader } from '@/components/mobile/MobileHeader';
import { EnhancedBottomTabBar } from '@/components/navigation/EnhancedBottomTabBar';
import { AppNavigationDrawer } from '@/components/navigation/AppNavigationDrawer';
import { QuickActionsMenu } from '@/components/navigation/QuickActionsMenu';
import { useTranslations } from '@/lib/i18n/I18nProvider';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const t = useTranslations('nav');
  const tCommon = useTranslations('common');
  const [isNavDrawerOpen, setIsNavDrawerOpen] = useState(false);

  const nav = [
    { label: `← ${t('agent')}`, href: '/agent' },
    { label: '─────────', href: '#', disabled: true },
    { label: t('dashboard'), href: '/dashboard' },
    { label: t('profile'), href: '/dashboard/profile' },
    { label: t('system'), href: '/dashboard/system' },
    { label: t('users'), href: '/dashboard/users' },
    { label: t('smartHome'), href: '/dashboard/smart-home' },
    { label: t('automation'), href: '/dashboard/automation' },
    { label: t('finances'), href: '/dashboard/finances' },
  ];

  return (
    <>
      <AppShell
        sideNav={
          <DashboardNav
            items={nav}
            header={<div className="px-4 pb-4 text-primary font-bold">FROK</div>}
            footer={
              <div className="mt-auto space-y-3">
                <div className="px-4">
                  <LanguageSwitcher variant="dropdown" />
                </div>
                <div className="px-4 pt-4 text-xs opacity-60">© {new Date().getFullYear()} FROK</div>
              </div>
            }
          />
        }
        header={
          <>
            {/* Mobile-only header with clock, weather, and shortcuts */}
            <div className="md:hidden">
              <MobileHeader
                timeFormat="12h"
                locale="en-US"
                weatherLocation="Seoul"
                temperatureUnits="imperial"
              />
              {/* Mobile navigation menu button */}
              <div className="border-b border-border bg-surface/80 backdrop-blur-sm px-4 py-2 flex items-center justify-between">
                <button
                  onClick={() => setIsNavDrawerOpen(true)}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-surface transition-colors text-foreground"
                  aria-label="Open navigation menu"
                >
                  <Menu size={20} />
                  <span className="text-sm font-medium">Menu</span>
                </button>
                <span className="text-xs text-foreground/50">All Features</span>
              </div>
            </div>
            {/* Desktop breadcrumbs (hidden on mobile) */}
            <div className="hidden md:block">
              <Breadcrumbs />
            </div>
          </>
        }
        footer={<div>© {new Date().getFullYear()} FROK · {tCommon('allSystemsNominal')}</div>}
      >
        {/* Main content with bottom padding on mobile for tab bar clearance */}
        <div className="pb-20 md:pb-0">
          {children}
        </div>

        {/* Enhanced mobile bottom navigation */}
        <EnhancedBottomTabBar />

        {/* Quick Actions FAB (Mobile & Desktop) */}
        <QuickActionsMenu position="bottom-right" />
      </AppShell>

      {/* App Navigation Drawer */}
      <AppNavigationDrawer
        isOpen={isNavDrawerOpen}
        onClose={() => setIsNavDrawerOpen(false)}
        mode="mobile"
      />
    </>
  );
}
