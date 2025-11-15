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
    // CRITICAL SAFETY CHECK: Prevent auth bypass in production
    if (process.env["DEV_BYPASS_AUTH"] === 'true' && process.env["NODE_ENV"] === 'production') {
      console.error('[withAuth] ❌ CRITICAL: DEV_BYPASS_AUTH is set in production! This is a security vulnerability.');
      throw new Error('DEV_BYPASS_AUTH cannot be enabled in production');
    }

    // DEVELOPMENT ONLY: Bypass auth if environment variable is set
    if (process.env["DEV_BYPASS_AUTH"] === 'true' && process.env["NODE_ENV"] === 'development') {
      console.warn('[withAuth] ⚠️  DEV_BYPASS_AUTH is enabled - skipping authentication!');
      const mockUser = {
        id: 'dev-user-id',
        email: 'dev@example.com',
        created_at: new Date().toISOString(),
      } as User;

      // CRITICAL FIX: Use service role client to bypass RLS in dev mode
      // This prevents "Thread not found or access denied" errors when RLS checks auth.uid()
      const serviceRoleKey = process.env["SUPABASE_SERVICE_ROLE_KEY"];

      if (!serviceRoleKey) {
        console.error('[withAuth] ❌ DEV_BYPASS_AUTH enabled but SUPABASE_SERVICE_ROLE_KEY is missing!');
        console.error('[withAuth] Add SUPABASE_SERVICE_ROLE_KEY to .env.local to fix RLS bypass issues');

        // Fallback to anon key with warning
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

      const { createClient } = await import('@supabase/supabase-js');
      const supabase = createClient(
        process.env["NEXT_PUBLIC_SUPABASE_URL"]!,
        serviceRoleKey,  // ✅ Use service role to bypass RLS
        {
          auth: {
            autoRefreshToken: false,
            persistSession: false,
          },
        }
      );

      console.warn('[withAuth] ⚠️  Using SERVICE ROLE client - RLS is BYPASSED!');

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
 * User role type
 */
export type UserRole = 'admin' | 'user' | 'guest';

/**
 * Check if user has specific permission
 * Uses Supabase RPC function for efficient permission checking
 */
export async function hasPermission(
  user: AuthenticatedUser,
  permission: string
): Promise<boolean> {
  try {
    const { data, error } = await user.supabase.rpc('user_has_permission', {
      p_user_id: user.userId,
      p_permission_name: permission,
    });

    if (error) {
      console.error('[hasPermission] RPC error:', error);
      return false;
    }

    return data === true;
  } catch (error) {
    console.error('[hasPermission] Exception:', error);
    return false;
  }
}

/**
 * Check if user has specific role
 */
export async function hasRole(
  user: AuthenticatedUser,
  role: UserRole
): Promise<boolean> {
  try {
    const { data, error } = await user.supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.userId)
      .eq('role', role)
      .eq('is_active', true)
      .single();

    if (error || !data) {
      return false;
    }

    return true;
  } catch (error) {
    console.error('[hasRole] Exception:', error);
    return false;
  }
}

/**
 * Get all active roles for a user
 */
export async function getUserRoles(
  user: AuthenticatedUser
): Promise<UserRole[]> {
  try {
    const { data, error} = await user.supabase.rpc('get_user_roles', {
      p_user_id: user.userId,
    });

    if (error || !data) {
      console.error('[getUserRoles] Error:', error);
      return [];
    }

    return data.map((r: { role: string }) => r.role as UserRole);
  } catch (error) {
    console.error('[getUserRoles] Exception:', error);
    return [];
  }
}

/**
 * Get all permissions for a user
 */
export async function getUserPermissions(
  user: AuthenticatedUser
): Promise<Array<{ permission_name: string; category: string; source: string }>> {
  try {
    const { data, error } = await user.supabase.rpc('get_user_permissions', {
      p_user_id: user.userId,
    });

    if (error || !data) {
      console.error('[getUserPermissions] Error:', error);
      return [];
    }

    return data as Array<{ permission_name: string; category: string; source: string }>;
  } catch (error) {
    console.error('[getUserPermissions] Exception:', error);
    return [];
  }
}

/**
 * Require specific permission
 * Combines authentication and permission check in one middleware
 *
 * Usage:
 * ```typescript
 * export async function DELETE(req: NextRequest) {
 *   const auth = await requirePermission(req, 'chat.delete');
 *   if (!auth.ok) return auth.response;
 *   // User is authenticated and has permission
 * }
 * ```
 */
export async function requirePermission(
  req: NextRequest,
  permission: string
): Promise<AuthResult> {
  const auth = await withAuth(req);
  if (!auth.ok) return auth;

  const userHasPermission = await hasPermission(auth.user, permission);
  if (!userHasPermission) {
    return {
      ok: false,
      response: NextResponse.json(
        {
          ok: false,
          error: 'Forbidden',
          message: `Insufficient permissions. Required: ${permission}`,
        },
        { status: 403 }
      ),
    };
  }

  return auth;
}

/**
 * Require specific role
 * Combines authentication and role check in one middleware
 */
export async function requireRole(
  req: NextRequest,
  role: UserRole
): Promise<AuthResult> {
  const auth = await withAuth(req);
  if (!auth.ok) return auth;

  const userHasRole = await hasRole(auth.user, role);
  if (!userHasRole) {
    return {
      ok: false,
      response: NextResponse.json(
        {
          ok: false,
          error: 'Forbidden',
          message: `Insufficient role. Required: ${role}`,
        },
        { status: 403 }
      ),
    };
  }

  return auth;
}
