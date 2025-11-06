'use client';

import { usePathname, useRouter } from 'next/navigation';
import { Home, MessageSquare, Lightbulb, Settings } from 'lucide-react';
import { type ComponentPropsWithoutRef, forwardRef } from 'react';

export interface BottomTabBarProps extends ComponentPropsWithoutRef<'nav'> {
  /**
   * Badge counts for each tab (optional)
   * @example { chat: 3, devices: 1 }
   */
  badges?: {
    home?: number;
    chat?: number;
    devices?: number;
    settings?: number;
  };
}

interface Tab {
  id: 'home' | 'chat' | 'devices' | 'settings';
  label: string;
  icon: typeof Home;
  path: string;
  matchPaths?: string[]; // Additional paths that should highlight this tab
}

const TABS: Tab[] = [
  {
    id: 'home',
    label: 'Home',
    icon: Home,
    path: '/dashboard',
    matchPaths: ['/dashboard'],
  },
  {
    id: 'chat',
    label: 'Chat',
    icon: MessageSquare,
    path: '/dashboard/chat',
    matchPaths: ['/dashboard/chat', '/agent'],
  },
  {
    id: 'devices',
    label: 'Devices',
    icon: Lightbulb,
    path: '/dashboard/smart-home',
    matchPaths: ['/dashboard/smart-home', '/dashboard/devices'],
  },
  {
    id: 'settings',
    label: 'Settings',
    icon: Settings,
    path: '/dashboard/settings',
    matchPaths: ['/dashboard/settings', '/dashboard/profile'],
  },
];

/**
 * BottomTabBar - Mobile-only bottom navigation with 4 tabs
 *
 * Features:
 * - Fixed positioning with safe area insets for notched devices
 * - Active state with accent color indicator
 * - Badge support for notifications/counts
 * - Smooth transitions with framer-motion
 * - Touch-optimized (48px+ targets)
 *
 * @example
 * ```tsx
 * <BottomTabBar badges={{ chat: 3, devices: 1 }} />
 * ```
 */
export const BottomTabBar = forwardRef<HTMLElement, BottomTabBarProps>(
  ({ badges = {}, className, ...props }, ref) => {
    const pathname = usePathname();
    const router = useRouter();

    const isTabActive = (tab: Tab): boolean => {
      if (!pathname) return false;

      // Exact match for home
      if (tab.id === 'home') {
        return pathname === '/dashboard';
      }

      // Check if current path starts with any of the tab's match paths
      return tab.matchPaths?.some(path => pathname.startsWith(path)) || false;
    };

    const handleTabClick = (tab: Tab) => {
      router.push(tab.path);
    };

    return (
      <nav
        ref={ref}
        className={`
          fixed bottom-0 left-0 right-0 z-50
          bg-surface/95 backdrop-blur-md
          border-t border-border
          md:hidden
          pb-safe-bottom
          ${className || ''}
        `}
        role="navigation"
        aria-label="Bottom navigation"
        {...props}
      >
        <div className="flex items-center justify-around px-2 h-16">
          {TABS.map(tab => {
            const Icon = tab.icon;
            const isActive = isTabActive(tab);
            const badgeCount = badges[tab.id];

            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => handleTabClick(tab)}
                className={`
                  flex flex-col items-center justify-center
                  min-w-[64px] h-12 px-3
                  rounded-lg
                  transition-colors duration-200
                  ${isActive
                    ? 'text-primary bg-primary/10'
                    : 'text-foreground/60 hover:text-foreground/80 hover:bg-surface'
                  }
                `}
                aria-label={tab.label}
                aria-current={isActive ? 'page' : undefined}
              >
                <div className="relative">
                  <Icon
                    size={24}
                    strokeWidth={isActive ? 2.5 : 2}
                    className="mb-1"
                  />
                  {badgeCount !== undefined && badgeCount > 0 && (
                    <span
                      className="
                        absolute -top-1 -right-1
                        flex items-center justify-center
                        min-w-[18px] h-[18px] px-1
                        text-[10px] font-semibold
                        text-white bg-danger
                        rounded-full
                        ring-2 ring-surface
                      "
                      aria-label={`${badgeCount} ${tab.label} notifications`}
                    >
                      {badgeCount > 99 ? '99+' : badgeCount}
                    </span>
                  )}
                </div>
                <span
                  className={`
                    text-[10px] font-medium
                    ${isActive ? 'text-primary' : 'text-foreground/60'}
                  `}
                >
                  {tab.label}
                </span>
              </button>
            );
          })}
        </div>
      </nav>
    );
  }
);

BottomTabBar.displayName = 'BottomTabBar';
