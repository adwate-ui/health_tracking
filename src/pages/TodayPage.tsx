import { useState, useEffect } from 'react';
import { format, subDays, addDays } from 'date-fns';
import { IconPlus, IconBookmark, IconChevronLeft, IconChevronRight, IconApple } from '@tabler/icons-react';
import { Button } from '@/components/Button';
import { MetricCard } from '@/components/MetricCard';
import { useAuth } from '@/lib/auth';
import { useTargets, useProfile } from '@/hooks/useProfile';
import { useDailyLog, useUpsertDailyLog } from '@/hooks/useDailyLog';
import { FoodSearch } from '@/components/FoodSearch';
import { MealTemplateSheet } from '@/components/MealTemplateSheet';
import type { FoodSearchResult } from '@/hooks/useFoodSearch';
import type { FoodEntryRow } from '@/hooks/useDailyLog';
import { supabase } from '@/lib/supabase';
import { useQueryClient } from '@tanstack/react-query';
import { isNativePlatform, getNativeStepCount } from '@/lib/healthPlatform';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function classifyState(
  current: number | null | undefined,
  target: number | null | undefined,
  kind: 'over' | 'under',
) {
  if (current == null || !target) return 'logged' as const;
  const ratio = current / target;
  if (kind === 'under') {
    if (ratio < 0.85) return 'on-track' as const;
    if (ratio <= 1.0)  return 'approaching' as const;
    return 'below' as const;
  }
  if (ratio >= 1.0) return 'on-track' as const;
  if (ratio >= 0.8) return 'approaching' as const;
  return 'below' as const;
}

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export function TodayPage() {
  const { user } = useAuth();
  const todayDate = new Date();

  const [viewDate, setViewDate] = useState<Date>(todayDate);
  const isToday = format(viewDate, 'yyyy-MM-dd') === format(todayDate, 'yyyy-MM-dd');
  const viewDateISO = format(viewDate, 'yyyy-MM-dd');

  const { data: profile } = useProfile(user?.id);
  const { data: targets } = useTargets(user?.id);
  const { data: log } = useDailyLog(user?.id, viewDate);
  const upsertLog = useUpsertDailyLog();
  const qc = useQueryClient();

  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isTemplateOpen, setIsTemplateOpen] = useState(false);
  const [viewEntries, setViewEntries] = useState<FoodEntryRow[]>([]);

  // Fetch food entries for the viewed date
  useEffect(() => {
    if (!user || !log?.id) { setViewEntries([]); return; }
    supabase
      .from('food_entries')
      .select('*')
      .eq('log_id', log.id)
      .order('consumed_at', { ascending: true })
      .then(({ data }) => setViewEntries(data ?? []));
  }, [user, log?.id]);

  // Auto-populate steps from HealthKit / Health Connect (today only)
  useEffect(() => {
    if (!isNativePlatform() || !user || log?.steps != null || !isToday) return;
    getNativeStepCount(todayDate).then(steps => {
      if (steps != null && steps > 0) {
        upsertLog.mutate({ user_id: user.id, log_date: viewDateISO, steps });
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, viewDateISO]);

  if (!user) return null;

  // ─── Metric save handler ─────────────────────────────────────────────────

  type LogField = 'calories' | 'protein_g' | 'fibre_g' | 'water_ml' | 'steps';

  function saveMetric(field: LogField, value: number | null) {
    upsertLog.mutate({
      user_id: user!.id,
      log_date: viewDateISO,
      calories:   log?.calories   ?? null,
      protein_g:  log?.protein_g  ?? null,
      fibre_g:    log?.fibre_g    ?? null,
      water_ml:   log?.water_ml   ?? null,
      steps:      log?.steps      ?? null,
      gym_session: log?.gym_session ?? false,
      [field]: value,
    });
  }

  // ─── Date navigation ─────────────────────────────────────────────────────

  function goToPrevDay() { setViewDate(d => subDays(d, 1)); }
  function goToNextDay() { if (!isToday) setViewDate(d => addDays(d, 1)); }

  // ─── Food logging ─────────────────────────────────────────────────────────

  async function handleAddFood(food: FoodSearchResult, grams: number) {
    const base = {
      id: '', user_id: user!.id, log_date: viewDateISO,
      calories: null, protein_g: null, fibre_g: null, water_ml: null,
      steps: null, gym_session: false, notes: null, created_at: '', updated_at: '',
    };
    const curr = log || base;
    const updated = await upsertLog.mutateAsync({
      ...curr,
      calories:  (curr.calories  || 0) + (food.calories_100g ? Math.round((food.calories_100g  * grams) / 100) : 0),
      protein_g: (curr.protein_g || 0) + (food.protein_100g  ? (food.protein_100g  * grams) / 100 : 0),
      fibre_g:   (curr.fibre_g   || 0) + (food.fibre_100g    ? (food.fibre_100g    * grams) / 100 : 0),
    });

    const { error } = await supabase.from('food_entries').insert({
      user_id: user!.id,
      log_id: updated.id,
      source: food.source,
      source_id: food.id,
      name: food.name,
      grams,
      calories: food.calories_100g ? (food.calories_100g * grams) / 100 : null,
      protein_g: food.protein_100g ? (food.protein_100g * grams) / 100 : null,
      fibre_g:   food.fibre_100g   ? (food.fibre_100g   * grams) / 100 : null,
      fat_g:     food.fat_100g     ? (food.fat_100g     * grams) / 100 : null,
      carbs_g:   food.carbs_100g   ? (food.carbs_100g   * grams) / 100 : null,
    });

    if (error) {
      console.error('Failed to insert food entry', error);
      alert('Failed to log food.');
    } else {
      qc.invalidateQueries({ queryKey: ['daily-log', user!.id, viewDateISO] });
    }
  }

  // ─── Render ──────────────────────────────────────────────────────────────

  return (
    <div className="px-4 py-6 max-w-2xl mx-auto pb-28 sm:pt-20">

      {/* ─── Header ───────────────────────────────────────────────── */}
      <header className="mb-6 flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-eyebrow text-text-tertiary uppercase mb-1">
            {format(viewDate, 'EEEE, d MMMM')}
          </p>
          {isToday ? (
            <h1 className="text-h1 text-text-primary">
              {getGreeting()}{profile?.display_name ? `, ${profile.display_name}` : ''}
            </h1>
          ) : (
            <h1 className="text-h1 text-text-primary">
              {format(viewDate, 'd MMMM yyyy')}
            </h1>
          )}
        </div>

        {/* Date navigation */}
        <div className="flex items-center gap-0.5 shrink-0 mt-0.5">
          <button
            onClick={goToPrevDay}
            className="h-8 w-8 flex items-center justify-center rounded-md text-text-tertiary hover:text-text-primary hover:bg-surface-sunken transition-colors duration-fast"
            aria-label="Previous day"
          >
            <IconChevronLeft size={18} />
          </button>
          {!isToday && (
            <button
              onClick={() => setViewDate(todayDate)}
              className="h-7 px-2 rounded-md text-small font-medium text-action-primary hover:bg-surface-sunken transition-colors duration-fast"
            >
              Today
            </button>
          )}
          <button
            onClick={goToNextDay}
            disabled={isToday}
            className="h-8 w-8 flex items-center justify-center rounded-md text-text-tertiary hover:text-text-primary hover:bg-surface-sunken transition-colors duration-fast disabled:opacity-30 disabled:cursor-not-allowed"
            aria-label="Next day"
          >
            <IconChevronRight size={18} />
          </button>
        </div>
      </header>

      {/* ─── Metric cards — tap any number to edit it ─────────────── */}
      <div className="grid grid-cols-2 gap-3 mb-5">
        <MetricCard
          label="Calories"
          value={log?.calories ?? null}
          targetLabel={targets?.daily_calories ? `of ${targets.daily_calories.toLocaleString()} kcal` : undefined}
          progress={targets?.daily_calories ? { current: log?.calories ?? 0, target: targets.daily_calories } : undefined}
          state={classifyState(log?.calories, targets?.daily_calories, 'under')}
          onChange={(v) => saveMetric('calories', v)}
        />
        <MetricCard
          label="Protein"
          value={log?.protein_g != null ? Math.round(log.protein_g) : null}
          targetLabel={targets?.daily_protein_g ? `of ${targets.daily_protein_g} g` : undefined}
          progress={targets?.daily_protein_g ? { current: log?.protein_g ?? 0, target: targets.daily_protein_g } : undefined}
          state={classifyState(log?.protein_g, targets?.daily_protein_g, 'over')}
          onChange={(v) => saveMetric('protein_g', v)}
          decimalPlaces={1}
        />
        <MetricCard
          label="Fibre"
          value={log?.fibre_g != null ? Math.round(log.fibre_g) : null}
          targetLabel={targets?.daily_fibre_g ? `of ${targets.daily_fibre_g} g` : undefined}
          progress={targets?.daily_fibre_g ? { current: log?.fibre_g ?? 0, target: targets.daily_fibre_g } : undefined}
          state={classifyState(log?.fibre_g, targets?.daily_fibre_g, 'over')}
          onChange={(v) => saveMetric('fibre_g', v)}
          decimalPlaces={1}
        />
        <MetricCard
          label="Steps"
          value={log?.steps ?? null}
          targetLabel={targets?.daily_steps ? `of ${targets.daily_steps.toLocaleString()}` : undefined}
          progress={targets?.daily_steps ? { current: log?.steps ?? 0, target: targets.daily_steps } : undefined}
          state={classifyState(log?.steps, targets?.daily_steps, 'over')}
          onChange={(v) => saveMetric('steps', v)}
        />
        {/* Water spans full width — a secondary metric */}
        <MetricCard
          label="Water"
          value={log?.water_ml ?? null}
          targetLabel={targets?.daily_water_ml ? `of ${targets.daily_water_ml.toLocaleString()} ml` : undefined}
          progress={targets?.daily_water_ml ? { current: log?.water_ml ?? 0, target: targets.daily_water_ml } : undefined}
          state={classifyState(log?.water_ml, targets?.daily_water_ml, 'over')}
          onChange={(v) => saveMetric('water_ml', v)}
          className="col-span-2"
        />
      </div>

      {/* ─── Today's food log ─────────────────────────────────────── */}
      {viewEntries.length > 0 && (
        <FoodLogList entries={viewEntries} />
      )}

      {/* ─── Action buttons (today only) ─────────────────────────── */}
      {isToday && (
        <>
          <Button
            variant="primary"
            size="lg"
            fullWidth
            leadingIcon={<IconPlus size={16} />}
            onClick={() => setIsSearchOpen(true)}
          >
            Log a meal
          </Button>
          <Button
            variant="secondary"
            size="lg"
            fullWidth
            leadingIcon={<IconBookmark size={16} />}
            className="mt-2"
            onClick={() => setIsTemplateOpen(true)}
          >
            Templates
          </Button>

          <FoodSearch isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} onAdd={handleAddFood} />
          <MealTemplateSheet
            isOpen={isTemplateOpen}
            onClose={() => setIsTemplateOpen(false)}
            todayEntries={viewEntries}
            onLogFood={handleAddFood}
          />
        </>
      )}

    </div>
  );
}

// ─── Food log list ────────────────────────────────────────────────────────────

interface FoodLogListProps {
  entries: FoodEntryRow[];
}

function FoodLogList({ entries }: FoodLogListProps) {
  return (
    <section className="mb-5">
      <h2 className="text-eyebrow text-text-tertiary uppercase mb-2">
        Logged ({entries.length} {entries.length === 1 ? 'item' : 'items'})
      </h2>
      <div className="flex flex-col gap-1.5 mb-4">
        {entries.map(entry => (
          <div
            key={entry.id}
            className="bg-surface-raised border border-border-subtle rounded-md px-3 py-2.5 flex items-center gap-3"
          >
            <IconApple size={16} className="text-text-tertiary shrink-0" />
            <span className="text-body text-text-primary flex-1 truncate">{entry.name}</span>
            <div className="flex items-center gap-3 shrink-0">
              <span className="text-body-sm text-text-tertiary tabular-nums">{entry.grams}g</span>
              {entry.calories != null && (
                <span className="text-body-sm text-text-secondary tabular-nums font-medium">
                  {Math.round(entry.calories)}&thinsp;kcal
                </span>
              )}
              {entry.protein_g != null && (
                <span className="text-body-sm text-text-tertiary tabular-nums">
                  {entry.protein_g.toFixed(1)}g P
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
