import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import type { User } from '@supabase/supabase-js';

/**
 * Authenticated user context
 */
export type AuthenticatedUser = {
  user: User;
  userId: string;
  supabase: ReturnType<typeof createServerClient>; // Include authenticated Supabase client
};

/**
 * Result of authentication check
 */
export type AuthResult =
  | { ok: true; user: AuthenticatedUser }
  | { ok: false; response: NextResponse };

/**
 * Extract and verify authenticated user from request
 *
 * Usage in API routes:
 * ```typescript
 * export async function POST(req: NextRequest) {
 *   const auth = await withAuth(req);
 *   if (!auth.ok) return auth.response;
 *
 *   const { userId } = auth.user;
 *   // ... rest of your route logic
 * }
 * ```
 */
export async function withAuth(req: NextRequest): Promise<AuthResult> {
  try {
    // DEVELOPMENT ONLY: Bypass auth if environment variable is set
    if (process.env["DEV_BYPASS_AUTH"] === 'true' && process.env["NODE_ENV"] === 'development') {
      console.warn('[withAuth] ⚠️  DEV_BYPASS_AUTH is enabled - skipping authentication!');
      const mockUser = {
        id: 'dev-user-id',
        email: 'dev@example.com',
        created_at: new Date().toISOString(),
      } as User;

      // Create a mock Supabase client for dev
      const supabase = createServerClient(
        process.env["NEXT_PUBLIC_SUPABASE_URL"]!,
        process.env["NEXT_PUBLIC_SUPABASE_ANON_KEY"]!,
        {
          cookies: {
            get(name: string) { return req.cookies.get(name)?.value; },
            set() {},
            remove() {},
          },
        }
      );

      return {
        ok: true,
        user: {
          user: mockUser,
          userId: 'dev-user-id',
          supabase,
        },
      };
    }

    // Create Supabase client with cookies from request
    const supabase = createServerClient(
      process.env["NEXT_PUBLIC_SUPABASE_URL"]!,
      process.env["NEXT_PUBLIC_SUPABASE_ANON_KEY"]!,
      {
        cookies: {
          get(name: string) {
            return req.cookies.get(name)?.value;
          },
          set() {
            // Not needed for auth check
          },
          remove() {
            // Not needed for auth check
          },
        },
      }
    );

    // Get authenticated user
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error || !user) {
      return {
        ok: false,
        response: NextResponse.json(
          { ok: false, error: 'Unauthorized', message: 'Authentication required' },
          { status: 401 }
        ),
      };
    }
    return {
      ok: true,
      user: {
        user,
        userId: user.id,
        supabase, // Return authenticated Supabase client
      },
    };
  } catch (error: unknown) {
    console.error('[withAuth] Exception:', error);
    return {
      ok: false,
      response: NextResponse.json(
        {
          ok: false,
          error: 'Authentication error',
          message: error instanceof Error ? error.message : 'Failed to authenticate',
        },
        { status: 500 }
      ),
    };
  }
}

/**
 * Optional authentication - returns user if authenticated, null if not
 * Does not return error response
 */
export async function optionalAuth(req: NextRequest): Promise<AuthenticatedUser | null> {
  const auth = await withAuth(req);
  return auth.ok ? auth.user : null;
}

/**
 * Check if user has specific role or permission
 * (Extend this based on your auth schema)
 */
export function hasPermission(_user: AuthenticatedUser, _permission: string): boolean {
  // TODO: Implement based on your user roles/permissions schema
  // For now, all authenticated users have all permissions
  return true;
}

/**
 * Require specific permission
 */
export async function requirePermission(
  req: NextRequest,
  permission: string
): Promise<AuthResult> {
  const auth = await withAuth(req);
  if (!auth.ok) return auth;

  if (!hasPermission(auth.user, permission)) {
    return {
      ok: false,
      response: NextResponse.json(
        { ok: false, error: 'Forbidden', message: 'Insufficient permissions' },
        { status: 403 }
      ),
    };
  }

  return auth;
}
