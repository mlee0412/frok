import * as React from 'react';

export type AppShellProps = {
  sideNav?: React.ReactNode;
  header?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
};

export function AppShell({ sideNav, header, children, footer, className }: AppShellProps) {
  return (
    <div className={[
      'min-h-[100dvh] flex items-stretch overflow-hidden bg-background text-foreground',
      className,
    ].filter(Boolean).join(' ')}>
      {/* Side navigation (sized by component itself) */}
      <div className="flex-none">{sideNav}</div>

      {/* Main content area */}
      <main className="flex-1 flex flex-col h-[100dvh] overflow-y-auto">
        {header}
        <div className="flex-1 container-app">{children}</div>
        {footer && (
          <div className="mt-auto border-t border-border">
            <div className="container-app px-4 py-3 text-xs text-foreground/60">
              {footer}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
