'use client';
import { useEffect, useState } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabaseClient } from './supabaseClient';

export function useAuth() {
  const supa = supabaseClient();
  const [email, setEmail] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    let mounted = true;
    supa.auth.getSession().then(({ data }: { data: { session: Session | null } }) => {
      if (!mounted) return;
      setEmail(data.session?.user?.email ?? null);
      setUser(data.session?.user ?? null);
    });
    const { data: sub } = supa.auth.onAuthStateChange((_event: string, session: Session | null) => {
      setEmail(session?.user?.email ?? null);
      setUser(session?.user ?? null);
    });
    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, [supa]);

  return {
    email,
    user,
    signOut: async () => {
      await supa.auth.signOut();
    },
  };
}
