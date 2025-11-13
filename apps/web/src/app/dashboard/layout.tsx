// C:\Dev\FROK\apps\web\src\app\dashboard\layout.tsx
'use client';
import { useState } from 'react';
import { AppShell } from '@frok/ui';
import { Menu } from 'lucide-react';
import Breadcrumbs from './Breadcrumbs';
import { MobileHeader } from '@/components/mobile/MobileHeader';
import { PageTransition } from '@/components/mobile';
import { EnhancedBottomTabBar } from '@/components/navigation/EnhancedBottomTabBar';
import { AppNavigationDrawer } from '@/components/navigation/AppNavigationDrawer';
import { useTranslations } from '@/lib/i18n/I18nProvider';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const tCommon = useTranslations('common');
  const [isNavDrawerOpen, setIsNavDrawerOpen] = useState(false);

  return (
    <>
      <AppShell
        header={
          <>
            {/* Mobile-only header with clock, weather, and shortcuts */}
            <div className="md:hidden">
              <MobileHeader
                timeFormat="12h"
                locale="en-US"
                weatherLocation="Seoul"
                temperatureUnits="imperial"
                onOpenNav={() => setIsNavDrawerOpen(true)}
              />
            </div>
            {/* Desktop header with hamburger menu and breadcrumbs */}
            <div className="hidden md:flex md:items-center md:gap-3 md:px-4 md:py-3 md:border-b md:border-border">
              <button
                onClick={() => setIsNavDrawerOpen(true)}
                className="p-2 rounded-lg hover:bg-surface transition-colors text-foreground"
                aria-label="Open navigation menu"
              >
                <Menu size={20} />
              </button>
              <Breadcrumbs />
            </div>
          </>
        }
        footer={<div>© {new Date().getFullYear()} FROK · {tCommon('allSystemsNominal')}</div>}
      >
        {/* Main content with bottom padding on mobile for tab bar clearance */}
        <div className="pb-20 md:pb-0">
          <PageTransition>
            {children}
          </PageTransition>
        </div>

        {/* Enhanced mobile bottom navigation */}
        <EnhancedBottomTabBar />
      </AppShell>

      {/* App Navigation Drawer (Mobile & Desktop) */}
      <AppNavigationDrawer
        isOpen={isNavDrawerOpen}
        onClose={() => setIsNavDrawerOpen(false)}
      />
    </>
  );
}
