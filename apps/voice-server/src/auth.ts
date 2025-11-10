/**
 * Authentication Middleware for Voice Server
 *
 * Verifies JWT tokens from Supabase for secure WebSocket connections.
 * Supports cross-origin requests from Vercel-hosted frontend.
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env['NEXT_PUBLIC_SUPABASE_URL'];
const supabaseAnonKey = process.env['NEXT_PUBLIC_SUPABASE_ANON_KEY'];

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase configuration. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY');
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

export interface AuthenticatedUser {
  id: string;
  email?: string;
  userId: string;
}

/**
 * Verify JWT token and return user information
 */
export async function verifyAuthToken(token: string): Promise<AuthenticatedUser | null> {
  try {
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser(token);

    if (error || !user) {
      console.error('[Auth] Token verification failed:', error?.message);
      return null;
    }

    return {
      id: user.id,
      userId: user.id,
      email: user.email,
    };
  } catch (error) {
    console.error('[Auth] Token verification error:', error);
    return null;
  }
}
