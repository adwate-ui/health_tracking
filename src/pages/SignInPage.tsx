import { useState } from 'react';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { useAuth } from '@/lib/auth';
import { brandMeta } from '@/tokens/brand';

export function SignInPage() {
  const { signInWithMagicLink } = useAuth();
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email || submitting) return;

    setSubmitting(true);
    setError(null);
    const { error: signInError } = await signInWithMagicLink(email);
    setSubmitting(false);

    if (signInError) {
      setError(signInError.message);
    } else {
      setSent(true);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-surface-canvas">
      <div className="w-full max-w-sm flex flex-col gap-6">
        <div className="text-center">
          <h1 className="text-h1 text-text-primary">{brandMeta.name}</h1>
          <p className="text-body text-text-secondary mt-2">{brandMeta.tagline}</p>
        </div>

        {sent ? (
          <div className="bg-surface-raised border border-border-subtle rounded-lg p-5 text-center">
            <h2 className="text-h2 text-text-primary mb-2">Check your email</h2>
            <p className="text-body text-text-secondary">
              We sent a sign-in link to <span className="text-text-primary font-medium">{email}</span>.
            </p>
            <p className="text-body-sm text-text-tertiary mt-3">
              The link expires in one hour.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <Input
              type="email"
              label="Email"
              placeholder="you@example.com"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              errorMessage={error ?? undefined}
            />
            <Button type="submit" variant="primary" loading={submitting} fullWidth>
              Send sign-in link
            </Button>
            <p className="text-small text-text-tertiary text-center">
              No password. We email you a one-time link to sign in.
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
