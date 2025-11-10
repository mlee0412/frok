'use client';

/**
 * EnhancedBottomTabBar - Mobile navigation with overflow menu
 *
 * Features:
 * - 5 tabs: Home, Chat, Devices, More, Settings
 * - "More" tab opens expandable menu with all routes
 * - Active state indicators
 * - Badge support for notifications
 * - Smooth animations
 */

import { useState, useCallback } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import {
  Home,
  MessageSquare,
  Lightbulb,
  Settings,
  Menu,
  X,
  BarChart3,
  Mic,
  DollarSign,
  Zap,
  Activity,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

interface Tab {
  id: string;
  label: string;
  icon: LucideIcon;
  path: string;
  matchPaths?: string[];
}

interface MoreMenuItem {
  id: string;
  label: string;
  icon: LucideIcon;
  path: string;
  description?: string;
}

const PRIMARY_TABS: Tab[] = [
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
    path: '/agent',
    matchPaths: ['/agent', '/dashboard/chat'],
  },
  {
    id: 'devices',
    label: 'Devices',
    icon: Lightbulb,
    path: '/dashboard/smart-home',
    matchPaths: ['/dashboard/smart-home', '/dashboard/devices'],
  },
  {
    id: 'more',
    label: 'More',
    icon: Menu,
    path: '#',
    matchPaths: [],
  },
  {
    id: 'settings',
    label: 'Settings',
    icon: Settings,
    path: '/dashboard/settings',
    matchPaths: ['/dashboard/settings', '/dashboard/profile'],
  },
];

const MORE_MENU_ITEMS: MoreMenuItem[] = [
  {
    id: 'analytics',
    label: 'Analytics',
    icon: BarChart3,
    path: '/dashboard/analytics',
    description: 'System metrics and insights',
  },
  {
    id: 'smart-home-analytics',
    label: 'Smart Home Analytics',
    icon: Activity,
    path: '/dashboard/smart-home/analytics',
    description: 'Device usage analytics',
  },
  {
    id: 'voice',
    label: 'Voice',
    icon: Mic,
    path: '/voice',
    description: 'Voice commands and control',
  },
  {
    id: 'finances',
    label: 'Finances',
    icon: DollarSign,
    path: '/dashboard/finances',
    description: 'Financial tracking',
  },
  {
    id: 'automation',
    label: 'Automation',
    icon: Zap,
    path: '/dashboard/automation',
    description: 'Automated workflows',
  },
];

export interface EnhancedBottomTabBarProps {
  badges?: {
    home?: number;
    chat?: number;
    devices?: number;
    settings?: number;
  };
}

export function EnhancedBottomTabBar({ badges = {} }: EnhancedBottomTabBarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [showMoreMenu, setShowMoreMenu] = useState(false);

  const isTabActive = useCallback(
    (tab: Tab): boolean => {
      if (!pathname) return false;

      // Special handling for "more" tab
      if (tab.id === 'more') {
        return MORE_MENU_ITEMS.some(item => pathname === item.path);
      }

      // Exact match for home
      if (tab.id === 'home') {
        return pathname === '/dashboard';
      }

      // Check if current path starts with any of the tab's match paths
      return tab.matchPaths?.some(path => pathname.startsWith(path)) || false;
    },
    [pathname]
  );

  const handleTabClick = useCallback(
    (tab: Tab) => {
      if (tab.id === 'more') {
        setShowMoreMenu(!showMoreMenu);
      } else {
        router.push(tab.path);
        setShowMoreMenu(false);
      }
    },
    [router, showMoreMenu]
  );

  const handleMoreMenuItemClick = useCallback(
    (item: MoreMenuItem) => {
      router.push(item.path);
      setShowMoreMenu(false);
    },
    [router]
  );

  return (
    <>
      {/* More Menu Overlay */}
      {showMoreMenu && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm md:hidden"
            onClick={() => setShowMoreMenu(false)}
          />

          {/* Menu */}
          <div
            className="
              fixed bottom-16 left-0 right-0 z-50
              mx-2 mb-2 rounded-2xl
              bg-surface/98 backdrop-blur-xl
              border border-border
              shadow-2xl
              max-h-[60vh] overflow-y-auto
              md:hidden
            "
          >
            {/* Header */}
            <div className="sticky top-0 z-10 border-b border-border bg-surface/95 backdrop-blur-sm">
              <div className="flex items-center justify-between p-4">
                <h3 className="text-lg font-semibold text-foreground">More Options</h3>
                <button
                  onClick={() => setShowMoreMenu(false)}
                  className="p-2 rounded-lg hover:bg-surface transition-colors text-foreground/70"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Menu Items */}
            <div className="p-2 space-y-1">
              {MORE_MENU_ITEMS.map(item => {
                const Icon = item.icon;
                const isActive = pathname === item.path;

                return (
                  <button
                    key={item.id}
                    onClick={() => handleMoreMenuItemClick(item)}
                    className={`
                      flex items-center gap-3 w-full
                      px-4 py-3 rounded-lg
                      text-left transition-colors
                      ${isActive
                        ? 'bg-primary/10 text-primary border border-primary/20'
                        : 'text-foreground/70 hover:text-foreground hover:bg-surface'
                      }
                    `}
                  >
                    <Icon
                      size={20}
                      className={isActive ? 'text-primary' : 'text-foreground/50'}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium">{item.label}</div>
                      {item.description && (
                        <div className="text-xs text-foreground/40 mt-0.5">{item.description}</div>
                      )}
                    </div>
                    {isActive && <div className="w-2 h-2 rounded-full bg-primary" />}
                  </button>
                );
              })}
            </div>
          </div>
        </>
      )}

      {/* Bottom Tab Bar */}
      <nav
        className="
          fixed bottom-0 left-0 right-0 z-50
          bg-surface/95 backdrop-blur-md
          border-t border-border
          md:hidden
          pb-safe-bottom
        "
        role="navigation"
        aria-label="Bottom navigation"
      >
        <div className="flex items-center justify-around px-2 h-16">
          {PRIMARY_TABS.map(tab => {
            const Icon = tab.icon;
            const isActive = isTabActive(tab);
            const badgeCount = badges[tab.id as keyof typeof badges];
            const isMoreTab = tab.id === 'more';
            const showMoreIndicator = isMoreTab && showMoreMenu;

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
                  ${isActive || showMoreIndicator
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
                    strokeWidth={isActive || showMoreIndicator ? 2.5 : 2}
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
                    ${isActive || showMoreIndicator ? 'text-primary' : 'text-foreground/60'}
                  `}
                >
                  {tab.label}
                </span>
              </button>
            );
          })}
        </div>
      </nav>
    </>
  );
}
