// C:\Dev\FROK\apps\web\src\app\(dashboard)\layout.tsx
import '../../styles/globals.css';
import AppShell from '@/components/layout/AppShell';
import { QueryProvider } from '@/providers/QueryProvider';
import { ThemeProvider } from '@/providers/ThemeProvider';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <QueryProvider>
        <AppShell>{children}</AppShell>
      </QueryProvider>
    </ThemeProvider>
  );
}
