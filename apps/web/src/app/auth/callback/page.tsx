/**
 * Auth Callback Page
 *
 * This page is shown while the server-side route handler processes the auth callback.
 * The actual PKCE code exchange happens in route.ts (server-side) to properly handle cookies.
 */
export default function CallbackPage() {
  return (
    <div className="min-h-[100dvh] flex items-center justify-center p-6">
      <div className="w-full max-w-sm rounded-xl border border-border bg-surface p-4 text-sm">
        <div>Verifying sign-in…</div>
      </div>
    </div>
  );
}
