/**
 * Centralized Route Registry
 *
 * Single source of truth for all application routes.
 * Used by navigation components, breadcrumbs, and route discovery.
 */

import type { LucideIcon } from 'lucide-react';
import {
  Home,
  MessageSquare,
  Lightbulb,
  Settings,
  BarChart3,
  Mic,
  User,
  Users,
  Activity,
  DollarSign,
  Zap,
  Calendar,
  FileText,
  Shield,
  Bell,
  Database,
  BookOpen,
} from 'lucide-react';

export interface AppRoute {
  id: string;
  label: string;
  href: string;
  icon?: LucideIcon;
  description?: string;
  category: 'primary' | 'dashboard' | 'tools' | 'settings' | 'admin';
  requiresAuth?: boolean;
  requiresAdmin?: boolean;
  mobileVisible?: boolean; // Show in mobile navigation
  desktopVisible?: boolean; // Show in desktop navigation
  searchKeywords?: string[]; // Additional search terms
  parent?: string; // Parent route ID for hierarchical navigation
}

/**
 * All application routes organized by category
 */
export const APP_ROUTES: AppRoute[] = [
  // Primary Routes (Main Navigation)
  {
    id: 'home',
    label: 'Home',
    href: '/dashboard',
    icon: Home,
    description: 'Overview dashboard',
    category: 'primary',
    requiresAuth: true,
    mobileVisible: true,
    desktopVisible: true,
  },
  {
    id: 'agent',
    label: 'Agent Chat',
    href: '/agent',
    icon: MessageSquare,
    description: 'AI Assistant conversation',
    category: 'primary',
    requiresAuth: true,
    mobileVisible: true,
    desktopVisible: true,
    searchKeywords: ['ai', 'chat', 'assistant', 'conversation'],
  },
  {
    id: 'smart-home',
    label: 'Smart Home',
    href: '/dashboard/smart-home',
    icon: Lightbulb,
    description: 'Device controls and automation',
    category: 'primary',
    requiresAuth: true,
    mobileVisible: true,
    desktopVisible: true,
    searchKeywords: ['devices', 'lights', 'automation', 'home assistant'],
  },

  // Dashboard Routes
  {
    id: 'analytics',
    label: 'Analytics',
    href: '/dashboard/analytics',
    icon: BarChart3,
    description: 'System metrics and insights',
    category: 'dashboard',
    requiresAuth: true,
    mobileVisible: true,
    desktopVisible: true,
    searchKeywords: ['metrics', 'stats', 'data', 'insights'],
  },
  {
    id: 'smart-home-analytics',
    label: 'Smart Home Analytics',
    href: '/dashboard/smart-home/analytics',
    icon: Activity,
    description: 'Device usage analytics',
    category: 'dashboard',
    requiresAuth: true,
    parent: 'smart-home',
    mobileVisible: true,
    desktopVisible: true,
    searchKeywords: ['device analytics', 'energy', 'usage'],
  },
  {
    id: 'finances',
    label: 'Finances',
    href: '/dashboard/finances',
    icon: DollarSign,
    description: 'Financial tracking and budgets',
    category: 'dashboard',
    requiresAuth: true,
    mobileVisible: true,
    desktopVisible: true,
    searchKeywords: ['money', 'budget', 'expenses', 'income'],
  },
  {
    id: 'automation',
    label: 'Automation',
    href: '/dashboard/automation',
    icon: Zap,
    description: 'Automated workflows and rules',
    category: 'dashboard',
    requiresAuth: true,
    mobileVisible: true,
    desktopVisible: true,
    searchKeywords: ['workflows', 'rules', 'triggers'],
  },
  {
    id: 'system',
    label: 'System',
    href: '/dashboard/system',
    icon: Database,
    description: 'System health and diagnostics',
    category: 'dashboard',
    requiresAuth: true,
    mobileVisible: true,
    desktopVisible: true,
    searchKeywords: ['health', 'diagnostics', 'performance'],
  },

  // Tools
  {
    id: 'voice',
    label: 'Voice',
    href: '/voice',
    icon: Mic,
    description: 'Voice commands and control',
    category: 'tools',
    requiresAuth: true,
    mobileVisible: true,
    desktopVisible: true,
    searchKeywords: ['speech', 'audio', 'microphone'],
  },
  {
    id: 'calendar',
    label: 'Calendar',
    href: '/dashboard/calendar',
    icon: Calendar,
    description: 'Events and scheduling',
    category: 'tools',
    requiresAuth: true,
    mobileVisible: false,
    desktopVisible: true,
    searchKeywords: ['schedule', 'events', 'appointments'],
  },
  {
    id: 'documents',
    label: 'Documents',
    href: '/dashboard/documents',
    icon: FileText,
    description: 'File management',
    category: 'tools',
    requiresAuth: true,
    mobileVisible: false,
    desktopVisible: true,
    searchKeywords: ['files', 'storage', 'upload'],
  },
  {
    id: 'notifications',
    label: 'Notifications',
    href: '/dashboard/notifications',
    icon: Bell,
    description: 'Alerts and messages',
    category: 'tools',
    requiresAuth: true,
    mobileVisible: false,
    desktopVisible: true,
    searchKeywords: ['alerts', 'messages', 'inbox'],
  },

  // Settings
  {
    id: 'profile',
    label: 'Profile',
    href: '/dashboard/profile',
    icon: User,
    description: 'User account settings',
    category: 'settings',
    requiresAuth: true,
    mobileVisible: true,
    desktopVisible: true,
    searchKeywords: ['account', 'user', 'preferences'],
  },
  {
    id: 'settings',
    label: 'Settings',
    href: '/dashboard/settings',
    icon: Settings,
    description: 'Application configuration',
    category: 'settings',
    requiresAuth: true,
    mobileVisible: true,
    desktopVisible: true,
    searchKeywords: ['config', 'preferences', 'options'],
  },

  // Admin
  {
    id: 'users',
    label: 'Users',
    href: '/dashboard/users',
    icon: Users,
    description: 'User management',
    category: 'admin',
    requiresAuth: true,
    requiresAdmin: true,
    mobileVisible: false,
    desktopVisible: true,
    searchKeywords: ['admin', 'permissions', 'roles'],
  },
  {
    id: 'security',
    label: 'Security',
    href: '/dashboard/security',
    icon: Shield,
    description: 'Security settings and logs',
    category: 'admin',
    requiresAuth: true,
    requiresAdmin: true,
    mobileVisible: false,
    desktopVisible: true,
    searchKeywords: ['admin', 'logs', 'audit'],
  },
  {
    id: 'api-docs',
    label: 'API Docs',
    href: '/api-docs',
    icon: BookOpen,
    description: 'API documentation',
    category: 'admin',
    requiresAuth: false,
    mobileVisible: false,
    desktopVisible: true,
    searchKeywords: ['documentation', 'api', 'reference'],
  },
];

/**
 * Get routes by category
 */
export function getRoutesByCategory(category: AppRoute['category']): AppRoute[] {
  return APP_ROUTES.filter(route => route.category === category);
}

/**
 * Get route by ID
 */
export function getRouteById(id: string): AppRoute | undefined {
  return APP_ROUTES.find(route => route.id === id);
}

/**
 * Get route by href
 */
export function getRouteByHref(href: string): AppRoute | undefined {
  return APP_ROUTES.find(route => route.href === href);
}

/**
 * Get child routes for a parent route
 */
export function getChildRoutes(parentId: string): AppRoute[] {
  return APP_ROUTES.filter(route => route.parent === parentId);
}

/**
 * Search routes by query (searches label, description, keywords)
 */
export function searchRoutes(query: string): AppRoute[] {
  const lowerQuery = query.toLowerCase();

  return APP_ROUTES.filter(route => {
    const matchesLabel = route.label.toLowerCase().includes(lowerQuery);
    const matchesDescription = route.description?.toLowerCase().includes(lowerQuery);
    const matchesKeywords = route.searchKeywords?.some(keyword =>
      keyword.toLowerCase().includes(lowerQuery)
    );

    return matchesLabel || matchesDescription || matchesKeywords;
  });
}

/**
 * Get mobile-visible routes
 */
export function getMobileRoutes(): AppRoute[] {
  return APP_ROUTES.filter(route => route.mobileVisible);
}

/**
 * Get desktop-visible routes
 */
export function getDesktopRoutes(): AppRoute[] {
  return APP_ROUTES.filter(route => route.desktopVisible);
}

/**
 * Get breadcrumb trail for a route
 */
export function getBreadcrumbs(href: string): AppRoute[] {
  const route = getRouteByHref(href);
  if (!route) return [];

  const breadcrumbs: AppRoute[] = [route];
  let currentRoute = route;

  // Walk up the parent chain
  while (currentRoute.parent) {
    const parentRoute = getRouteById(currentRoute.parent);
    if (!parentRoute) break;
    breadcrumbs.unshift(parentRoute);
    currentRoute = parentRoute;
  }

  return breadcrumbs;
}
