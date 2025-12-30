import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { User } from '@supabase/supabase-js';

interface PlayerAuthState {
  playerId: string | null;
  user: User | null;
  loading: boolean;
  error: string | null;
}

/**
 * Secure player authentication hook using Supabase anonymous auth.
 * This replaces the insecure localStorage-based player ID system.
 * 
 * Benefits:
 * - Server-managed session with cryptographically secure UUIDs
 * - Cannot be spoofed via browser console
 * - Proper session lifecycle management
 * - Works with RLS policies using auth.uid()
 */
export const usePlayerAuth = () => {
  const [state, setState] = useState<PlayerAuthState>({
    playerId: null,
    user: null,
    loading: true,
    error: null,
  });
  
  const initializingRef = useRef(false);

  useEffect(() => {
    let isMounted = true;

    const initializeAuth = async () => {
      // Prevent concurrent initialization
      if (initializingRef.current) return;
      initializingRef.current = true;

      try {
        // Check for existing session first
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          console.error('Session check error:', sessionError);
        }

        if (session?.user) {
          console.log('Existing session found:', session.user.id);
          if (isMounted) {
            setState({
              playerId: session.user.id,
              user: session.user,
              loading: false,
              error: null,
            });
          }
          initializingRef.current = false;
          return;
        }

        // No existing session, create anonymous session
        console.log('No session found, creating anonymous session...');
        const { data, error: signInError } = await supabase.auth.signInAnonymously();

        if (signInError) {
          console.error('Anonymous sign-in error:', signInError);
          if (isMounted) {
            setState({
              playerId: null,
              user: null,
              loading: false,
              error: signInError.message,
            });
          }
          initializingRef.current = false;
          return;
        }

        if (data.user) {
          console.log('Anonymous session created:', data.user.id);
          if (isMounted) {
            setState({
              playerId: data.user.id,
              user: data.user,
              loading: false,
              error: null,
            });
          }
        }
      } catch (err) {
        console.error('Auth initialization error:', err);
        if (isMounted) {
          setState({
            playerId: null,
            user: null,
            loading: false,
            error: err instanceof Error ? err.message : 'Authentication failed',
          });
        }
      } finally {
        initializingRef.current = false;
      }
    };

    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('Auth state changed:', event, session?.user?.id);
      if (isMounted) {
        setState(prev => ({
          ...prev,
          playerId: session?.user?.id || null,
          user: session?.user || null,
          loading: false,
        }));
      }
    });

    // Initialize auth
    initializeAuth();

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  return state;
};
