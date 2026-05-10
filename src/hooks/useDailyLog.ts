import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { supabase } from '@/lib/supabase';
import type { Database } from '@/types/database';

type DailyLogRow = Database['public']['Tables']['daily_logs']['Row'];
type DailyLogInsert = Database['public']['Tables']['daily_logs']['Insert'];

function toISODate(date: Date): string {
  return format(date, 'yyyy-MM-dd');
}

export function useDailyLog(userId: string | undefined, date: Date) {
  const isoDate = toISODate(date);
  return useQuery<DailyLogRow | null>({
    queryKey: ['daily-log', userId, isoDate],
    queryFn: async () => {
      if (!userId) return null;
      const { data, error } = await supabase
        .from('daily_logs')
        .select('*')
        .eq('user_id', userId)
        .eq('log_date', isoDate)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: Boolean(userId),
  });
}

export function useUpsertDailyLog() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (log: DailyLogInsert) => {
      const { data, error } = await supabase
        .from('daily_logs')
        .upsert(log, { onConflict: 'user_id,log_date' })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['daily-log', data.user_id, data.log_date] });
    },
  });
}

export function useRecentDailyLogs(userId: string | undefined, days = 30) {
  return useQuery<DailyLogRow[]>({
    queryKey: ['daily-logs-recent', userId, days],
    queryFn: async () => {
      if (!userId) return [];
      const { data, error } = await supabase
        .from('daily_logs')
        .select('*')
        .eq('user_id', userId)
        .order('log_date', { ascending: false })
        .limit(days);
      if (error) throw error;
      return data ?? [];
    },
    enabled: Boolean(userId),
  });
}
