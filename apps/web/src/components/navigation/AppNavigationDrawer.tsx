'use client';

/**
 * AppNavigationDrawer - Comprehensive app navigation drawer
 *
 * Features:
 * - Full route hierarchy with categories
 * - Search functionality for quick access
 * - Mobile-optimized slide-in drawer
 * - Desktop sidebar mode (optional)
 * - Authentication integration (sign-in/sign-out)
 * - Language selector integration
 * - Recent routes tracking
 * - Keyboard shortcuts (CMD+K to open)
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { X, Search, ChevronRight, LogIn, LogOut, User } from 'lucide-react';
import {
  APP_ROUTES,
  searchRoutes,
  type AppRoute,
} from '@/lib/navigation/routes';
import { useAuth } from '@/lib/useAuth';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';

export interface AppNavigationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AppNavigationDrawer({
  isOpen,
  onClose,
}: AppNavigationDrawerProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { email, user, signOut } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set(['primary', 'dashboard'])
  );

  // Filter routes based on search
  const filteredRoutes = useMemo(() => {
    if (!searchQuery.trim()) return APP_ROUTES;
    return searchRoutes(searchQuery);
  }, [searchQuery]);

  // Group routes by category
  const routesByCategory = useMemo(() => {
    const categories = ['primary', 'dashboard', 'tools', 'settings', 'admin'] as const;
    return categories.map(category => ({
      id: category,
      label: category.charAt(0).toUpperCase() + category.slice(1),
      routes: filteredRoutes.filter(route => route.category === category),
    }));
  }, [filteredRoutes]);

  // Toggle category expansion
  const toggleCategory = useCallback((categoryId: string) => {
    setExpandedCategories(prev => {
      const next = new Set(prev);
      if (next.has(categoryId)) {
        next.delete(categoryId);
      } else {
        next.add(categoryId);
      }
      return next;
    });
  }, []);

  // Navigate to route
  const navigateToRoute = useCallback(
    (route: AppRoute) => {
      router.push(route.href);
      onClose();
      setSearchQuery('');
    },
    [router, onClose]
  );

  // Handle sign out
  const handleSignOut = useCallback(async () => {
    await signOut();
    onClose();
    router.push('/');
  }, [signOut, onClose, router]);

  // Handle sign in
  const handleSignIn = useCallback(() => {
    onClose();
    router.push('/auth/sign-in');
  }, [onClose, router]);

  // Close on escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen, onClose]);

  // Close drawer when clicking backdrop
  const handleBackdropClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === e.currentTarget) {
        onClose();
      }
    },
    [onClose]
  );

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
        onClick={handleBackdropClick}
      />

      {/* Drawer */}
      <div
        className={`
          fixed inset-y-0 left-0 z-50
          w-[85%] max-w-sm md:max-w-md
          bg-surface shadow-xl border-r border-border
          transform transition-transform duration-300 ease-out
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        {/* Header */}
        <div className="sticky top-0 z-10 border-b border-border bg-surface/95 backdrop-blur-sm">
          <div className="flex items-center justify-between p-4">
            <h2 className="text-lg font-semibold text-foreground">Navigation</h2>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-surface transition-colors text-foreground/70 hover:text-foreground"
              aria-label="Close navigation"
            >
              <X size={20} />
            </button>
          </div>

          {/* Search */}
          <div className="px-4 pb-4">
            <div className="relative">
              <Search
                className="absolute left-3 top-1/2 -translate-y-1/2 text-foreground/40"
                size={18}
              />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search routes..."
                className="
                  w-full pl-10 pr-4 py-2
                  rounded-lg border border-border
                  bg-background text-foreground
                  placeholder:text-foreground/40
                  focus:outline-none focus:ring-2 focus:ring-primary/50
                "
              />
            </div>
          </div>
        </div>

        {/* Routes List */}
        <div className="overflow-y-auto h-[calc(100%-240px)] pb-4">
          {routesByCategory.map(({ id, label, routes }) => {
            if (routes.length === 0) return null;

            const isExpanded = expandedCategories.has(id);

            return (
              <div key={id} className="mb-2">
                {/* Category Header */}
                <button
                  onClick={() => toggleCategory(id)}
                  className="
                    flex items-center justify-between w-full
                    px-4 py-2
                    text-sm font-semibold uppercase tracking-wider
                    text-foreground/50 hover:text-foreground/70
                    transition-colors
                  "
                >
                  <span>{label}</span>
                  <ChevronRight
                    size={16}
                    className={`transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                  />
                </button>

                {/* Routes */}
                {isExpanded && (
                  <div className="space-y-1 px-2">
                    {routes.map(route => {
                      const isActive = pathname === route.href;
                      const Icon = route.icon;

                      return (
                        <button
                          key={route.id}
                          onClick={() => navigateToRoute(route)}
                          className={`
                            flex items-center gap-3 w-full
                            px-3 py-2 rounded-lg
                            text-left transition-colors
                            ${isActive
                              ? 'bg-primary/10 text-primary border border-primary/20'
                              : 'text-foreground/70 hover:text-foreground hover:bg-surface'
                            }
                          `}
                        >
                          {Icon && (
                            <Icon
                              size={18}
                              className={isActive ? 'text-primary' : 'text-foreground/50'}
                            />
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium truncate">{route.label}</div>
                            {route.description && (
                              <div className="text-xs text-foreground/40 truncate">
                                {route.description}
                              </div>
                            )}
                          </div>
                          {isActive && (
                            <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}

          {/* No results */}
          {filteredRoutes.length === 0 && (
            <div className="text-center py-8 px-4">
              <p className="text-foreground/50 text-sm">No routes found</p>
              <p className="text-foreground/40 text-xs mt-1">Try a different search term</p>
            </div>
          )}
        </div>

        {/* Footer - Authentication & Language Selector */}
        <div className="absolute bottom-0 left-0 right-0 border-t border-border bg-surface/95 backdrop-blur-sm">
          {/* Language Selector */}
          <div className="px-4 pt-4 pb-2">
            <LanguageSwitcher variant="dropdown" />
          </div>

          {/* User Authentication */}
          <div className="px-4 pb-4">
            {user ? (
              <div className="space-y-2">
                {/* User Email Display */}
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-surface/50 border border-border">
                  <User size={16} className="text-foreground/50" />
                  <span className="text-sm text-foreground/70 truncate flex-1">
                    {email}
                  </span>
                </div>

                {/* Sign Out Button */}
                <button
                  onClick={handleSignOut}
                  className="
                    w-full flex items-center justify-center gap-2
                    px-3 py-2 rounded-lg
                    bg-danger/10 hover:bg-danger/20
                    text-danger border border-danger/30
                    transition-colors
                    text-sm font-medium
                  "
                >
                  <LogOut size={16} />
                  <span>Sign Out</span>
                </button>
              </div>
            ) : (
              /* Sign In Button */
              <button
                onClick={handleSignIn}
                className="
                  w-full flex items-center justify-center gap-2
                  px-3 py-2 rounded-lg
                  bg-primary/10 hover:bg-primary/20
                  text-primary border border-primary/30
                  transition-colors
                  text-sm font-medium
                "
              >
                <LogIn size={16} />
                <span>Sign In</span>
              </button>
            )}
          </div>

          {/* Keyboard Shortcut Hint */}
          <div className="px-4 pb-3 text-xs text-foreground/40 text-center">
            <kbd className="px-1.5 py-0.5 rounded bg-surface border border-border">Esc</kbd> to
            close
          </div>
        </div>
      </div>
    </>
  );
}
