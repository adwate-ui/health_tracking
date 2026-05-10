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

export type FoodEntryRow = Database['public']['Tables']['food_entries']['Row'];

export function useRecentFoods(userId: string | undefined, limit = 20) {
  return useQuery<FoodEntryRow[]>({
    queryKey: ['recent-foods', userId, limit],
    queryFn: async () => {
      if (!userId) return [];
      const { data, error } = await supabase
        .from('food_entries')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(100); // Fetch more to allow deduping
      if (error) throw error;
      
      const uniqueFoods: FoodEntryRow[] = [];
      const seenIds = new Set<string>();
      for (const entry of (data ?? [])) {
        if (!seenIds.has(entry.name)) { // Deduping by name as source_id might be null for manual entries
          seenIds.add(entry.name);
          uniqueFoods.push(entry);
        }
        if (uniqueFoods.length >= limit) break;
      }
      return uniqueFoods;
    },
    enabled: Boolean(userId),
  });
}

