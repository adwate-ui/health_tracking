import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { Database } from '@/types/database';

type ProfileRow = Database['public']['Tables']['profiles']['Row'];
type ProfileUpdate = Database['public']['Tables']['profiles']['Update'];
type TargetsRow = Database['public']['Tables']['targets']['Row'];
type TargetsInsert = Database['public']['Tables']['targets']['Insert'];

export function useProfile(userId: string | undefined) {
  return useQuery<ProfileRow | null>({
    queryKey: ['profile', userId],
    queryFn: async () => {
      if (!userId) return null;
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: Boolean(userId),
  });
}

export function useUpdateProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ userId, updates }: { userId: string; updates: ProfileUpdate }) => {
      const { data, error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', userId)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ['profile', vars.userId] });
    },
  });
}

export function useTargets(userId: string | undefined) {
  return useQuery<TargetsRow | null>({
    queryKey: ['targets', userId],
    queryFn: async () => {
      if (!userId) return null;
      const { data, error } = await supabase
        .from('targets')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: Boolean(userId),
  });
}

export function useUpsertTargets() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (targets: TargetsInsert) => {
      const { data, error } = await supabase
        .from('targets')
        .upsert(targets, { onConflict: 'user_id' })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ['targets', vars.user_id] });
    },
  });
}
