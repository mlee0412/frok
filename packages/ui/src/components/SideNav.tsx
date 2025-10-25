"use client";
import * as React from 'react';

type Item = { label: string; href: string };

export type SideNavProps = {
  items: Item[];
  header?: React.ReactNode;
  footer?: React.ReactNode;
  activeHref?: string;
  className?: string;
  collapsible?: boolean;
  defaultCollapsed?: boolean;
  onCollapsedChange?: (collapsed: boolean) => void;
};

export function SideNav({ items, header, footer, activeHref, className, collapsible, defaultCollapsed, onCollapsedChange }: SideNavProps) {
  const [collapsed, setCollapsed] = React.useState(!!defaultCollapsed);
  const isActive = (href: string) => (
    activeHref && (
      href === '/dashboard' ? activeHref === '/dashboard' : (activeHref === href || activeHref.startsWith(href + '/'))
    )
  );

  return (
    <aside className={[
      collapsed ? 'w-16' : 'w-60',
      'h-screen sticky top-0 border-r border-border backdrop-blur-sm bg-surface flex flex-col py-6 overflow-hidden',
      className,
    ].filter(Boolean).join(' ')} aria-expanded={!collapsed} data-collapsed={collapsed ? 'true' : 'false'}>
      {header}
      {collapsible ? (
        <div className="px-4 mb-4">
          <button
            type="button"
            aria-label={collapsed ? 'Expand navigation' : 'Collapse navigation'}
            aria-expanded={!collapsed}
            className="w-full text-xs rounded-md border border-border text-foreground/80 hover:bg-surface px-2 py-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)] focus-visible:ring-offset-1"
            onClick={() => { const next = !collapsed; setCollapsed(next); onCollapsedChange?.(next); }}
          >
            {collapsed ? '»' : '«'} Menu
          </button>
        </div>
      ) : null}
      <nav className={[
        'flex flex-col space-y-1 w-full',
        collapsed ? 'px-2' : 'px-4',
      ].join(' ')}>
        {items.map((link) => (
          <a
            key={link.href}
            href={link.href}
            title={link.label}
            aria-current={isActive(link.href) ? 'page' : undefined}
            className={[
              'rounded-md py-2 text-sm transition border-l-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)] focus-visible:ring-offset-1',
              collapsed ? 'px-0 text-center' : 'pl-4 pr-3 text-left',
              isActive(link.href)
                ? 'bg-surface text-primary border-l-primary'
                : 'hover:bg-surface hover:text-primary border-l-transparent text-foreground/80',
            ].join(' ')}
          >
            <span className={collapsed ? 'sr-only' : ''}>{link.label}</span>
            {collapsed ? <span aria-hidden>•</span> : null}
          </a>
        ))}
      </nav>
      {footer}
    </aside>
  );
}
