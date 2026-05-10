import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { Database } from '@/types/database';

export type WeeklyCheckinRow = Database['public']['Tables']['weekly_checkins']['Row'];
export type WeeklyCheckinInsert = Database['public']['Tables']['weekly_checkins']['Insert'];

export function useWeeklyCheckins(userId: string | undefined, limit = 12) {
  return useQuery<WeeklyCheckinRow[]>({
    queryKey: ['weekly-checkins', userId, limit],
    queryFn: async () => {
      if (!userId) return [];
      const { data, error } = await supabase
        .from('weekly_checkins')
        .select('*')
        .eq('user_id', userId)
        .order('week_start', { ascending: false })
        .limit(limit);
      if (error) throw error;
      return data ?? [];
    },
    enabled: Boolean(userId),
  });
}

export function useUpsertWeeklyCheckin() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (checkin: WeeklyCheckinInsert) => {
      const { data, error } = await supabase
        .from('weekly_checkins')
        .upsert(checkin, { onConflict: 'user_id,week_start' })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['weekly-checkins', data.user_id] });
    },
  });
}
