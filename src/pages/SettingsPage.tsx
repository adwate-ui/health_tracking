import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { useIntegrations, useUpsertIntegration } from '@/hooks/useIntegrations';
import { Input } from '@/components/Input';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { IconSettings, IconDownload, IconLogout, IconKey, IconCheck } from '@tabler/icons-react';

export function SettingsPage() {
  const { user, signOut } = useAuth();
  const [isExporting, setIsExporting] = useState(false);
  const [isSettingPassword, setIsSettingPassword] = useState(false);
  const [password, setPassword] = useState('');
  const [passwordMessage, setPasswordMessage] = useState<{text: string, type: 'error' | 'success'} | null>(null);
  
  const { data: integrations } = useIntegrations(user?.id);
  const upsertIntegration = useUpsertIntegration();
  const [hevyKey, setHevyKey] = useState('');
  const [isEditingHevy, setIsEditingHevy] = useState(false);
  const hevyIntegration = integrations?.find(i => i.provider === 'hevy');

  useEffect(() => {
    if (hevyIntegration && !isEditingHevy) {
      setHevyKey('••••••••••••••••');
    }
  }, [hevyIntegration, isEditingHevy]);

  async function handleSaveHevy(e: React.FormEvent) {
    e.preventDefault();
    if (!user || !hevyKey) return;
    
    try {
      await upsertIntegration.mutateAsync({
        userId: user.id,
        provider: 'hevy',
        apiKey: hevyKey
      });
      setIsEditingHevy(false);
    } catch (err) {
      console.error(err);
      alert('Failed to save Hevy API key.');
    }
  }

  async function handleSetPassword(e: React.FormEvent) {
    e.preventDefault();
    if (!password || password.length < 6) {
      setPasswordMessage({ text: 'Password must be at least 6 characters.', type: 'error' });
      return;
    }
    
    setPasswordMessage(null);
    const { error } = await supabase.auth.updateUser({ password });
    
    if (error) {
      setPasswordMessage({ text: error.message, type: 'error' });
    } else {
      setPasswordMessage({ text: 'Password set successfully!', type: 'success' });
      setIsSettingPassword(false);
      setPassword('');
    }
  }

  async function handleExport() {
    if (!user) return;
    setIsExporting(true);
    
    try {
      const [profileData, targetsData, logsData, checkinsData] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', user.id).single(),
        supabase.from('targets').select('*').eq('user_id', user.id).single(),
        supabase.from('daily_logs').select('*').eq('user_id', user.id),
        supabase.from('weekly_checkins').select('*').eq('user_id', user.id)
      ]);

      const exportData = {
        exported_at: new Date().toISOString(),
        profile: profileData.data,
        targets: targetsData.data,
        daily_logs: logsData.data,
        weekly_checkins: checkinsData.data
      };

      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `totalmacro-export-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error('Export failed', e);
      alert('Failed to export data. Please try again.');
    } finally {
      setIsExporting(false);
    }
  }

  return (
    <div className="flex flex-col min-h-[calc(100vh-64px)] sm:min-h-screen max-w-2xl mx-auto p-4 sm:p-6 pb-24 sm:pb-6 gap-6">
      <header className="mb-2">
        <h1 className="text-h1 text-text-primary mb-2 flex items-center gap-2">
          <IconSettings className="text-forest-500" size={28} /> Settings
        </h1>
        <p className="text-body text-text-secondary">
          Manage your account, integrations, and data.
        </p>
      </header>

      <section>
        <h2 className="text-h3 text-text-primary mb-3">Integrations</h2>
        <Card className="p-4 flex flex-col gap-4">
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-small font-medium text-text-primary">Hevy API Key</label>
              {hevyIntegration?.status === 'connected' && !isEditingHevy && (
                <span className="flex items-center gap-1 text-xsmall font-medium text-forest-500 uppercase tracking-wide">
                  <IconCheck size={14} /> Connected
                </span>
              )}
            </div>
            <p className="text-small text-text-tertiary mb-3">
              Connect your Hevy Pro account to automatically sync your workouts.
            </p>
            
            {isEditingHevy || !hevyIntegration ? (
              <form onSubmit={handleSaveHevy} className="flex gap-2">
                <Input
                  className="flex-1"
                  type="password"
                  placeholder="Paste your Hevy API key here"
                  value={hevyKey}
                  onChange={(e) => setHevyKey(e.target.value)}
                  required
                />
                <Button type="submit" variant="primary" loading={upsertIntegration.isPending}>Save</Button>
                {hevyIntegration && (
                  <Button type="button" variant="secondary" onClick={() => setIsEditingHevy(false)}>Cancel</Button>
                )}
              </form>
            ) : (
              <div className="flex gap-2 items-center">
                <Input
                  className="flex-1"
                  type="password"
                  value={hevyKey}
                  readOnly
                  disabled
                />
                <Button variant="secondary" onClick={() => {
                  setHevyKey('');
                  setIsEditingHevy(true);
                }}>Edit</Button>
              </div>
            )}
          </div>
        </Card>
      </section>

      <section>
        <h2 className="text-h3 text-text-primary mb-3">Data & Privacy</h2>
        <Card className="p-4 flex flex-col gap-4">
          <div>
            <h3 className="text-body font-medium text-text-primary mb-1">Export Data</h3>
            <p className="text-small text-text-tertiary mb-3">
              Download a complete JSON export of all your logs and check-ins. Your data belongs to you.
            </p>
            <Button 
              variant="secondary" 
              onClick={handleExport} 
              disabled={isExporting}
              leadingIcon={!isExporting && <IconDownload size={18} />}
            >
              {isExporting ? 'Preparing JSON...' : 'Download JSON'}
            </Button>
          </div>
        </Card>
      </section>

      <section>
        <h2 className="text-h3 text-text-primary mb-3">Account</h2>
        <Card className="p-4 flex flex-col gap-4">
          <div>
            <p className="text-small text-text-secondary mb-3">
              Signed in as <span className="font-medium text-text-primary">{user?.email}</span>
            </p>
            
            <div className="flex flex-col gap-2">
              {isSettingPassword ? (
                <form onSubmit={handleSetPassword} className="flex flex-col gap-3 bg-surface-sunken p-3 rounded-lg border border-border-subtle mt-2">
                  <div className="flex flex-col gap-1">
                    <label className="text-small font-medium text-text-primary">New Password</label>
                    <input 
                      type="password" 
                      className="w-full bg-surface-base border border-border-strong rounded-md px-3 py-2 text-body focus:outline-none focus:border-action-accent transition-colors"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      required
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button type="button" variant="secondary" onClick={() => setIsSettingPassword(false)}>Cancel</Button>
                    <Button type="submit" variant="primary">Save Password</Button>
                  </div>
                </form>
              ) : (
                <Button variant="secondary" onClick={() => setIsSettingPassword(true)} leadingIcon={<IconKey size={18} />}>
                  Set Password Fallback
                </Button>
              )}
              
              {passwordMessage && (
                <p className={`text-small ${passwordMessage.type === 'error' ? 'text-action-danger' : 'text-forest-500'}`}>
                  {passwordMessage.text}
                </p>
              )}

              <Button variant="secondary" onClick={() => signOut()} leadingIcon={<IconLogout size={18} />}>
                Sign Out
              </Button>
            </div>
          </div>
        </Card>
      </section>
    </div>
  );
}
