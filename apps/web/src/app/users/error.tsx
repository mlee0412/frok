'use client';
export default function Error({ error }: { error: Error }) {
  return (
    <div className="rounded-xl border border-border bg-surface p-4">
      <div className="text-danger font-semibold mb-1">Can’t load users</div>
      <div className="text-sm text-foreground/70">{error.message}</div>
    </div>
  );
}
