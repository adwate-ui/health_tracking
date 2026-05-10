import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import type { ReactNode } from 'react';
import { useAuth } from '@/lib/auth';
import { useProfile } from '@/hooks/useProfile';

/**
 * Routes that require an authenticated session.
 * Sends unauthenticated users to /signin.
 */
export function RequireAuth({ children }: { children: ReactNode }) {
  const { session, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !session) {
      navigate('/signin', { replace: true });
    }
  }, [session, loading, navigate]);

  if (loading || !session) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface-canvas">
        <p className="text-body-sm text-text-secondary">Loading…</p>
      </div>
    );
  }

  return <>{children}</>;
}

/**
 * Routes that require completed onboarding.
 * Detects "completed" via the presence of display_name on the profile.
 * Sends incomplete users to /onboarding.
 */
export function RequireOnboarded({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { data: profile, isLoading } = useProfile(user?.id);
  const navigate = useNavigate();

  useEffect(() => {
    if (isLoading) return;
    if (!profile?.display_name) {
      navigate('/onboarding', { replace: true });
    }
  }, [profile, isLoading, navigate]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface-canvas">
        <p className="text-body-sm text-text-secondary">Loading your profile…</p>
      </div>
    );
  }

  if (!profile?.display_name) return null;

  return <>{children}</>;
}
