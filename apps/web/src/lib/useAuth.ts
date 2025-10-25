'use client';
import { useEffect, useState } from 'react';
import { supabaseClient } from './supabaseClient';

export function useAuth() {
  const supa = supabaseClient();
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    supa.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setEmail(data.session?.user?.email ?? null);
    });
    const { data: sub } = supa.auth.onAuthStateChange((_event, session) => {
      setEmail(session?.user?.email ?? null);
    });
    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, [supa]);

  return {
    email,
    signOut: async () => {
      await supa.auth.signOut();
    },
  };
}
