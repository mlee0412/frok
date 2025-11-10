'use client';
import * as React from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { ChevronRight, Home } from 'lucide-react';
import { getBreadcrumbs } from '@/lib/navigation/routes';

function labelize(segment: string) {
  const map: Record<string, string> = {
    'smart-home': 'Smart Home',
    ui: 'UI',
    analytics: 'Analytics',
    finances: 'Finances',
    automation: 'Automation',
    profile: 'Profile',
    system: 'System',
    users: 'Users',
  };
  if (map[segment]) return map[segment];
  return segment
    .split('-')
    .map((p) => (p && p[0] ? p[0].toUpperCase() + p.slice(1) : p))
    .join(' ');
}

export default function Breadcrumbs() {
  const pathname = usePathname() || '/dashboard';

  // Try to get breadcrumbs from route registry first
  const routeBreadcrumbs = getBreadcrumbs(pathname);

  // Fallback to path-based breadcrumbs if route not in registry
  const pathBreadcrumbs = React.useMemo(() => {
    const parts = pathname.split('/').filter(Boolean);
    const dashIdx = parts.indexOf('dashboard');
    const trail = parts.slice(dashIdx + 1);

    const items: Array<{ label: string; href: string; icon?: typeof Home }> = [
      { label: 'Dashboard', href: '/dashboard', icon: Home },
    ];
    let href = '/dashboard';
    for (const seg of trail) {
      href += `/${seg}`;
      items.push({ label: labelize(seg), href });
    }
    return items;
  }, [pathname]);

  // Use route registry breadcrumbs if available, otherwise use path-based
  const items =
    routeBreadcrumbs.length > 0
      ? routeBreadcrumbs.map(route => ({
          label: route.label,
          href: route.href,
          icon: route.icon,
        }))
      : pathBreadcrumbs;

  return (
    <div className="border-b border-border bg-surface/30 backdrop-blur-sm">
      <div className="container-app px-4 py-3">
        <nav aria-label="Breadcrumb" className="flex items-center gap-2">
          {items.map((item, i) => {
            const isLast = i === items.length - 1;
            const Icon = item.icon;

            return (
              <React.Fragment key={item.href}>
                {i > 0 && (
                  <ChevronRight
                    size={16}
                    className="text-foreground/30"
                    aria-hidden="true"
                  />
                )}
                {isLast ? (
                  <span
                    className="flex items-center gap-1.5 text-sm font-medium text-foreground"
                    aria-current="page"
                  >
                    {Icon && <Icon size={16} />}
                    {item.label}
                  </span>
                ) : (
                  <Link
                    href={item.href}
                    className="flex items-center gap-1.5 text-sm text-primary hover:text-primary/80 transition-colors"
                  >
                    {Icon && <Icon size={16} />}
                    {item.label}
                  </Link>
                )}
              </React.Fragment>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
