import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/auth';

/**
 * Magic link callback target. Supabase has already processed the URL hash
 * by the time this component renders (detectSessionInUrl: true on the client).
 * We just wait for the session to settle, then navigate based on profile state.
 */
export function AuthCallbackPage() {
  const { session, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (loading) return;
    if (session) {
      navigate('/', { replace: true });
    } else {
      navigate('/signin', { replace: true });
    }
  }, [session, loading, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface-canvas">
      <p className="text-body-sm text-text-secondary">Signing you in…</p>
    </div>
  );
}
