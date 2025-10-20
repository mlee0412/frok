import * as React from 'react';

type Item = { label: string; href: string };

export type SideNavProps = {
  items: Item[];
  header?: React.ReactNode;
  footer?: React.ReactNode;
  activeHref?: string;
  className?: string;
};

export function SideNav({ items, header, footer, activeHref, className }: SideNavProps) {
  return (
    <aside className={[
      'w-60 h-screen sticky top-0 border-r border-white/10 backdrop-blur-sm bg-white/5 flex flex-col py-6',
      className,
    ].filter(Boolean).join(' ')}>
      {header}
      <nav className="flex flex-col space-y-1 w-full px-4">
        {items.map((link) => (
          <a
            key={link.href}
            href={link.href}
            aria-current={
              activeHref && (
                link.href === '/dashboard'
                  ? activeHref === '/dashboard'
                  : (activeHref === link.href || activeHref.startsWith(link.href + '/'))
              )
                ? 'page'
                : undefined
            }
            className={[
              'rounded-md pl-4 pr-3 py-2 text-sm transition border-l-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring,#22d3ee)] focus-visible:ring-offset-1 focus-visible:ring-offset-black/20',
              (activeHref && (
                link.href === '/dashboard'
                  ? activeHref === '/dashboard'
                  : (activeHref === link.href || activeHref.startsWith(link.href + '/'))
              ))
                ? 'bg-cyan-400/10 text-cyan-300 border-l-cyan-400'
                : 'hover:bg-cyan-400/10 hover:text-cyan-300 border-l-transparent',
            ].join(' ')}
          >
            {link.label}
          </a>
        ))}
      </nav>
      {footer}
    </aside>
  );
}
