import type { Session } from '@supabase/supabase-js';
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';

import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import type { Profile } from '@/lib/types';

type AuthState = {
  /** 'loading' bis Session und Profil geladen sind. */
  status: 'loading' | 'ready' | 'error' | 'unconfigured';
  session: Session | null;
  /** null = eingeloggt, aber Onboarding noch nicht abgeschlossen. */
  profile: Profile | null;
  error: string | null;
  saveProfile: (input: { display_name: string; avatar_emoji: string }) => Promise<void>;
  retry: () => void;
};

const AuthContext = createContext<AuthState | null>(null);

async function loadProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle();
  if (error) throw error;
  return data;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthState['status']>(
    isSupabaseConfigured ? 'loading' : 'unconfigured'
  );
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    let cancelled = false;

    (async () => {
      try {
        setStatus('loading');
        setError(null);
        let { data } = await supabase.auth.getSession();
        // Kein Konto vorhanden: anonym anmelden, Name kommt im Onboarding.
        if (!data.session) {
          const result = await supabase.auth.signInAnonymously();
          if (result.error) throw result.error;
          data = { session: result.data.session };
        }
        const loaded = data.session ? await loadProfile(data.session.user.id) : null;
        if (cancelled) return;
        setSession(data.session);
        setProfile(loaded);
        setStatus('ready');
      } catch (e) {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : String(e));
        setStatus('error');
      }
    })();

    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
      if (!cancelled) setSession(next);
    });

    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, [attempt]);

  const saveProfile = useCallback<AuthState['saveProfile']>(
    async (input) => {
      if (!session) throw new Error('Nicht angemeldet');
      const { data, error: upsertError } = await supabase
        .from('profiles')
        .upsert({ id: session.user.id, ...input })
        .select()
        .single();
      if (upsertError) throw upsertError;
      setProfile(data);
    },
    [session]
  );

  const retry = useCallback(() => setAttempt((n) => n + 1), []);

  return (
    <AuthContext.Provider value={{ status, session, profile, error, saveProfile, retry }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth muss innerhalb von <AuthProvider> verwendet werden');
  return ctx;
}
