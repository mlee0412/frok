'use client';
import * as React from 'react';

export default function FinancesCharts({
  items,
}: {
  items: Array<{ posted_at: string; amount: number; category?: string }>;
}) {
  const [R, setR] = React.useState<any>(undefined);

  React.useEffect(() => {
    let mounted = true;
    import('recharts')
      .then((mod) => {
        if (mounted) setR(mod);
      })
      .catch(() => {
        if (mounted) setR(null);
      });
    return () => {
      mounted = false;
    };
  }, []);

  // Aggregate by month (YYYY-MM)
  const monthData = React.useMemo(() => {
    const map = new Map<string, number>();
    for (const t of items || []) {
      const d = new Date(t.posted_at);
      if (isNaN(d.getTime())) continue;
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      map.set(key, (map.get(key) || 0) + (typeof t.amount === 'number' ? t.amount : 0));
    }
    return Array.from(map.entries())
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
      .map(([name, value]) => ({ name, value }));
  }, [items]);

  // Aggregate by category
  const categoryData = React.useMemo(() => {
    const map = new Map<string, number>();
    for (const t of items || []) {
      const cat = (t.category || 'Uncategorized').trim() || 'Uncategorized';
      map.set(cat, (map.get(cat) || 0) + (typeof t.amount === 'number' ? t.amount : 0));
    }
    return Array.from(map.entries())
      .sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]))
      .slice(0, 8)
      .map(([name, value]) => ({ name, value }));
  }, [items]);

  if (R === undefined) {
    return <div className="text-xs text-foreground/60">Loading charts…</div>;
  }
  if (R === null) {
    return <div className="text-xs text-foreground/60">Recharts not installed. Install it to enable charts.</div>;
  }

  const { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, PieChart, Pie, Cell, Legend } = R;
  const COLORS = ['#22d3ee', '#38bdf8', '#60a5fa', '#818cf8', '#a78bfa', '#f472b6', '#fb7185', '#f59e0b'];

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <div className="h-56">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={monthData}>
            <XAxis dataKey="name" stroke="#94a3b8" tickLine={false} axisLine={false} />
            <YAxis stroke="#94a3b8" tickLine={false} axisLine={false} />
            <Tooltip />
            <Line type="monotone" dataKey="value" stroke="#22d3ee" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <div className="h-56">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={categoryData} dataKey="value" nameKey="name" outerRadius={80}>
              {categoryData.map((_entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Legend />
            <Tooltip />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
