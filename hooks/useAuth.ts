// hooks/useAuth.ts — Schema V4 compliant
import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../services/supabaseClient';
import { syncUserProfile } from '../services/database';
import type { Usuario, UserRole } from '../types';

export function useAuth() {
  const [user, setUser] = useState<Usuario | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    // Sessão atual
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        syncUserProfile(session.user)
          .then((profile) => {
            setUser(profile);
            setIsAuthenticated(true);
          })
          .catch(console.error)
          .finally(() => setLoading(false));
      } else {
        setLoading(false);
      }
    });

    // Listener de mudanças
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        syncUserProfile(session.user).then((profile) => {
          setUser(profile);
          setIsAuthenticated(true);
        });
      } else {
        setUser(null);
        setIsAuthenticated(false);
      }
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setUser(null);
    setIsAuthenticated(false);
  }, []);

  const refreshUser = useCallback(async () => {
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (authUser) {
      const profile = await syncUserProfile(authUser);
      setUser(profile);
      return profile;
    }
    return null;
  }, []);

  return { user, loading, isAuthenticated, signOut, refreshUser };
}
