import React from 'react';

type Props = { children: React.ReactNode };

export default function AppShell({ children }: Props) {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="p-4 border-b">FROK</header>
      <main className="flex-1">{children}</main>
    </div>
  );
}
