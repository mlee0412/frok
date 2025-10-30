"use client";
import * as React from 'react';

type Item = { label: string; href: string; disabled?: boolean };

type SideNavLinkProps = React.ComponentPropsWithoutRef<'a'>;

const DefaultLinkComponent = React.forwardRef<HTMLAnchorElement, SideNavLinkProps>(function DefaultLinkComponent(
  props,
  ref,
) {
  return <a ref={ref} {...props} />;
});

export type SideNavProps = {
  items: Item[];
  header?: React.ReactNode;
  footer?: React.ReactNode;
  activeHref?: string;
  className?: string;
  collapsible?: boolean;
  defaultCollapsed?: boolean;
  onCollapsedChange?: (collapsed: boolean) => void;
  linkComponent?: React.ElementType<SideNavLinkProps>;
  mobileBreakpoint?: 'md' | 'lg';
  userEmail?: string | null;
  onSignIn?: () => void;
  onSignOut?: () => void;
};

export function SideNav({
  items,
  header,
  footer,
  activeHref,
  className,
  collapsible,
  defaultCollapsed,
  onCollapsedChange,
  linkComponent,
  mobileBreakpoint = 'md',
  userEmail,
  onSignIn,
  onSignOut,
}: SideNavProps) {
  const [collapsed, setCollapsed] = React.useState(!!defaultCollapsed);
  const [mobileOpen, setMobileOpen] = React.useState(false);

  const isActive = (href: string) => (
    activeHref && (
      href === '/dashboard' ? activeHref === '/dashboard' : (activeHref === href || activeHref.startsWith(href + '/'))
    )
  );

  const LinkComponent = linkComponent ?? DefaultLinkComponent;

  const handleLinkClick = () => {
    setMobileOpen(false);
  };

  const breakpointClass = mobileBreakpoint === 'lg' ? 'lg:flex' : 'md:flex';
  const hideOnMobileClass = mobileBreakpoint === 'lg' ? 'hidden lg:flex' : 'hidden md:flex';

  return (
    <>
      {/* Mobile Menu Button */}
      <button
        type="button"
        onClick={() => setMobileOpen(true)}
        className={`${breakpointClass.replace(':flex', ':hidden')} fixed top-4 left-4 z-40 p-2 rounded-md bg-surface border border-border text-foreground hover:bg-surface/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)]`}
        aria-label="Open navigation menu"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      {/* Mobile Overlay */}
      {mobileOpen && (
        <div
          className={`${breakpointClass.replace(':flex', ':hidden')} fixed inset-0 bg-black/50 z-40`}
          onClick={() => setMobileOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside className={[
        collapsed ? 'w-16' : 'w-60',
        'h-screen border-r border-border backdrop-blur-sm bg-surface py-6 overflow-hidden',
        // Mobile drawer mode - fixed and visible
        mobileOpen ? 'flex flex-col fixed top-0 left-0 z-50 shadow-2xl' : '',
        // Desktop mode - sticky and visible, Mobile - hidden
        !mobileOpen ? hideOnMobileClass : '',
        !mobileOpen ? 'sticky top-0' : '',
        mobileBreakpoint === 'lg' ? 'lg:flex-col' : 'md:flex-col',
        className,
      ].filter(Boolean).join(' ')} aria-expanded={!collapsed} data-collapsed={collapsed ? 'true' : 'false'}>
      {/* Mobile Close Button */}
      {mobileOpen && (
        <button
          type="button"
          onClick={() => setMobileOpen(false)}
          className={`${breakpointClass.replace(':flex', ':hidden')} absolute top-4 right-4 p-1 rounded-md text-foreground/60 hover:text-foreground hover:bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)]`}
          aria-label="Close navigation menu"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}
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
        {items.map((link) => {
          // Disabled items (like separators) render as static divs
          if (link.disabled) {
            return (
              <div
                key={link.href}
                className={[
                  'py-1 text-xs text-center text-foreground/20 pointer-events-none',
                  collapsed ? 'px-0' : 'px-4',
                ].join(' ')}
                aria-hidden="true"
              >
                {collapsed ? '' : link.label}
              </div>
            );
          }

          const ariaCurrent = isActive(link.href) ? 'page' : undefined;
          const linkClasses = [
            'rounded-md py-2 text-sm transition border-l-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)] focus-visible:ring-offset-1',
            collapsed ? 'px-0 text-center' : 'pl-4 pr-3 text-left',
            ariaCurrent
              ? 'bg-surface text-primary border-l-primary'
              : 'hover:bg-surface hover:text-primary border-l-transparent text-foreground/80',
          ].join(' ');

          return (
            <LinkComponent
              key={link.href}
              href={link.href}
              title={link.label}
              aria-current={ariaCurrent}
              className={linkClasses}
              onClick={handleLinkClick}
            >
              <span className={collapsed ? 'sr-only' : ''}>{link.label}</span>
              {collapsed ? <span aria-hidden>•</span> : null}
            </LinkComponent>
          );
        })}
      </nav>

      {/* Auth Section */}
      {(userEmail || onSignIn) && (
        <div className="mt-auto px-4 pt-4 border-t border-border">
          {userEmail ? (
            <div className="space-y-2">
              {!collapsed && (
                <div className="text-xs text-foreground/60 truncate" title={userEmail}>
                  {userEmail}
                </div>
              )}
              <button
                onClick={onSignOut}
                className="w-full px-3 py-2 text-sm bg-surface hover:bg-surface/80 border border-border rounded-md transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)]"
              >
                {collapsed ? '↪' : 'Sign Out'}
              </button>
            </div>
          ) : (
            <button
              onClick={onSignIn}
              className="w-full px-3 py-2 text-sm bg-primary hover:bg-primary/90 text-white rounded-md transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)]"
            >
              {collapsed ? '→' : 'Sign In'}
            </button>
          )}
        </div>
      )}

      {footer}
    </aside>
    </>
  );
}
