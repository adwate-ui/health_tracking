import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { encrypt } from '@/lib/encryption';

export interface Integration {
  id: string;
  user_id: string;
  provider: 'hevy' | 'healthkit' | 'health_connect';
  encrypted_credentials?: string;
  last_sync_at?: string;
  status: 'pending' | 'connected' | 'error' | 'disabled';
  error_message?: string;
}

export function useIntegrations(userId?: string) {
  return useQuery({
    queryKey: ['integrations', userId],
    queryFn: async () => {
      if (!userId) return [];
      const { data, error } = await supabase
        .from('integrations' as any)
        .select('*')
        .eq('user_id', userId);
      
      if (error) throw error;
      return data as unknown as Integration[];
    },
    enabled: !!userId,
  });
}

export function useUpsertIntegration() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ userId, provider, apiKey, status = 'connected' }: { userId: string, provider: string, apiKey: string, status?: string }) => {
      const encryptedKey = await encrypt(apiKey);
      
      const { data, error } = await supabase
        .from('integrations' as any)
        .upsert({
          user_id: userId,
          provider,
          encrypted_credentials: encryptedKey,
          status,
        }, { onConflict: 'user_id,provider' })
        .select()
        .single();
        
      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['integrations', variables.userId] });
    },
  });
}
