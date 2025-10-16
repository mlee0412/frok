'use client';
export default function Error({ error }: { error: Error }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-4">
      <div className="text-red-400 font-semibold mb-1">Can’t load users</div>
      <div className="text-sm text-white/70">{error.message}</div>
    </div>
  );
}
