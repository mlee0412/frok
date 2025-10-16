"use client";
import { useEffect, useState } from "react";

type State = "ok" | "fail" | "loading";

type Check = { name: string; url: string };
const CHECKS: Check[] = [
  { name: "Web Health", url: "/api/ping" },
  { name: "Supabase", url: "/api/ping/supabase" },
  { name: "Supabase Service", url: "/api/ping/supabase-db" },
  { name: "GitHub", url: "/api/ping/mcp/github" }
];

export default function SystemStatus() {
  const [results, setResults] = useState<Record<string, State>>({});

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const next: Record<string, State> = {};
      for (const c of CHECKS) {
        next[c.name] = "loading";
        try {
          const r = await fetch(c.url, { cache: "no-store" });
          if (r.ok) {
            const j = await r.json().catch(() => null);
            const ok = typeof j?.ok === "boolean" ? j.ok : r.ok;
            next[c.name] = ok ? "ok" : "fail";
          } else {
            next[c.name] = "fail";
          }
        } catch {
          next[c.name] = "fail";
        }
      }
      if (!cancelled) setResults(next);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="grid gap-3">
      {CHECKS.map((c) => {
        const state = results[c.name] ?? "loading";
        const color = state === "ok" ? "text-green-600" : state === "fail" ? "text-red-600" : "text-gray-500";
        return (
          <div key={c.name} className="rounded-2xl p-4 border shadow-sm">
            <div className="flex justify-between">
              <span className="font-medium">{c.name}</span>
              <span className={color}>{state}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
