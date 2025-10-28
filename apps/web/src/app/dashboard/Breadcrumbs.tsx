'use client';
import * as React from 'react';
import { usePathname } from 'next/navigation';

function labelize(segment: string) {
  const map: Record<string, string> = {
    'smart-home': 'Smart Home',
    ui: 'UI',
  };
  if (map[segment]) return map[segment];
  return segment
    .split('-')
    .map((p) => (p ? p[0].toUpperCase() + p.slice(1) : p))
    .join(' ');
}

export default function Breadcrumbs() {
  const pathname = usePathname() || '/dashboard';
  const parts = pathname.split('/').filter(Boolean);
  const dashIdx = parts.indexOf('dashboard');
  const trail = parts.slice(dashIdx + 1);

  const items = [{ label: 'Dashboard', href: '/dashboard' }];
  let href = '/dashboard';
  for (const seg of trail) {
    href += `/${seg}`;
    items.push({ label: labelize(seg), href });
  }

  return (
    <div className="border-b border-[var(--color-border)] bg-[var(--color-surface)]/30 supports-[backdrop-filter]:backdrop-blur-sm">
      <div className="container-app px-4 py-3 text-sm text-[color:var(--color-foreground)]/80">
        {items.map((it, i) => (
          <span key={it.href}>
            {i > 0 ? <span className="mx-2 text-[color:var(--color-foreground)]/40">/</span> : null}
            <a
              href={it.href}
              className={i === items.length - 1 ? 'text-[color:var(--color-foreground)]/80' : 'text-[var(--color-primary)] hover:underline'}
              aria-current={i === items.length - 1 ? 'page' : undefined}
            >
              {it.label}
            </a>
          </span>
        ))}
      </div>
    </div>
  );
}
