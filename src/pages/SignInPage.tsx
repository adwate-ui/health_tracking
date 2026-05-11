import { useState } from 'react';
import { IconBrandGoogle } from '@tabler/icons-react';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { useAuth } from '@/lib/auth';
import { brandMeta } from '@/tokens/brand';

export function SignInPage() {
  const { signInWithMagicLink, signInWithPassword, signInWithGoogle } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [usePassword, setUsePassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email || submitting) return;

    setSubmitting(true);
    setError(null);
    
    if (usePassword) {
      if (!password) {
        setError('Please enter your password.');
        setSubmitting(false);
        return;
      }
      const { error: signInError } = await signInWithPassword(email, password);
      setSubmitting(false);
      if (signInError) {
        setError(signInError.message);
      }
      // successful login redirects or updates auth state automatically
    } else {
      const { error: signInError } = await signInWithMagicLink(email);
      setSubmitting(false);

      if (signInError) {
        setError(signInError.message);
      } else {
        setSent(true);
      }
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-surface-canvas">
      <div className="w-full max-w-sm flex flex-col gap-6">
        <div className="text-center">
          <h1 className="text-h1 text-text-primary">{brandMeta.name}</h1>
          <p className="text-body text-text-secondary mt-2">{brandMeta.tagline}</p>
        </div>

        {sent && !usePassword ? (
          <div className="bg-surface-raised border border-border-subtle rounded-lg p-5 text-center">
            <h2 className="text-h2 text-text-primary mb-2">Check your email</h2>
            <p className="text-body text-text-secondary">
              We sent a sign-in link to <span className="text-text-primary font-medium">{email}</span>.
            </p>
            <p className="text-body-sm text-text-tertiary mt-3">
              The link expires in one hour.
            </p>
            <Button variant="secondary" className="mt-4" onClick={() => setSent(false)} fullWidth>
              Try a different email
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <Button 
              type="button" 
              variant="secondary" 
              fullWidth 
              onClick={async () => {
                setSubmitting(true);
                setError(null);
                const { error: googleError } = await signInWithGoogle();
                if (googleError) setError(googleError.message);
                setSubmitting(false);
              }}
              disabled={submitting}
              className="flex items-center gap-2"
            >
              <IconBrandGoogle size={20} />
              Continue with Google
            </Button>

            <div className="flex items-center gap-3 my-2">
              <div className="flex-1 h-px bg-border-subtle"></div>
              <span className="text-small text-text-tertiary">OR</span>
              <div className="flex-1 h-px bg-border-subtle"></div>
            </div>

            <Input
              type="email"
              label="Email"
              placeholder="you@example.com"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            
            {usePassword && (
              <Input
                type="password"
                label="Password"
                placeholder="••••••••"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            )}

            {error && <p className="text-small text-action-danger">{error}</p>}

            <Button type="submit" variant="primary" loading={submitting} fullWidth>
              {usePassword ? 'Sign In' : 'Send sign-in link'}
            </Button>
            
            <div className="flex justify-center mt-2">
              <button 
                type="button" 
                onClick={() => setUsePassword(!usePassword)}
                className="text-small text-text-tertiary hover:text-text-primary transition-colors underline"
              >
                {usePassword ? 'Use magic link instead' : 'Sign in with password'}
              </button>
            </div>
            
            {!usePassword && (
              <p className="text-small text-text-tertiary text-center mt-2">
                No password needed. We'll email you a secure link to sign in instantly.
              </p>
            )}
          </form>
        )}
      </div>
    </div>
  );
}
