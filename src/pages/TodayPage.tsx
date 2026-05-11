import { useState, useEffect } from 'react';
import { format, subDays, addDays } from 'date-fns';
import { IconPlus, IconBookmark, IconChevronLeft, IconChevronRight, IconApple } from '@tabler/icons-react';
import { Button } from '@/components/Button';
import { NumericInput } from '@/components/NumericInput';
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

function classifyState(current: number | null | undefined, target: number | null | undefined, kind: 'over' | 'under') {
  if (current == null || !target) return 'logged' as const;
  const ratio = current / target;
  if (kind === 'under') {
    if (ratio < 0.85) return 'on-track' as const;
    if (ratio <= 1.0) return 'approaching' as const;
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

  // Auto-populate steps from HealthKit / Health Connect on native platforms (today only)
  useEffect(() => {
    if (!isNativePlatform() || !user || log?.steps != null || !isToday) return;
    getNativeStepCount(todayDate).then(steps => {
      if (steps != null && steps > 0) {
        upsertLog.mutate({
          user_id: user.id,
          log_date: viewDateISO,
          steps,
        });
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, viewDateISO]);

  if (!user) return null;

  function goToPrevDay() {
    setViewDate(d => subDays(d, 1));
  }

  function goToNextDay() {
    if (!isToday) setViewDate(d => addDays(d, 1));
  }

  async function handleAddFood(food: FoodSearchResult, grams: number) {
    const defaultLog = {
      id: '', user_id: user!.id, log_date: viewDateISO,
      calories: null, protein_g: null, fibre_g: null, water_ml: null, steps: null, gym_session: false, notes: null, created_at: '', updated_at: ''
    };
    const currentLog = log || defaultLog;
    const updatedLog = await upsertLog.mutateAsync({
      ...currentLog,
      calories: (currentLog.calories || 0) + (food.calories_100g ? Math.round((food.calories_100g * grams) / 100) : 0),
      protein_g: (currentLog.protein_g || 0) + (food.protein_100g ? (food.protein_100g * grams) / 100 : 0),
      fibre_g: (currentLog.fibre_g || 0) + (food.fibre_100g ? (food.fibre_100g * grams) / 100 : 0),
    });

    const { error } = await supabase.from('food_entries').insert({
      user_id: user!.id,
      log_id: updatedLog.id,
      source: food.source,
      source_id: food.id,
      name: food.name,
      grams,
      calories: food.calories_100g ? (food.calories_100g * grams) / 100 : null,
      protein_g: food.protein_100g ? (food.protein_100g * grams) / 100 : null,
      fibre_g: food.fibre_100g ? (food.fibre_100g * grams) / 100 : null,
      fat_g: food.fat_100g ? (food.fat_100g * grams) / 100 : null,
      carbs_g: food.carbs_100g ? (food.carbs_100g * grams) / 100 : null,
    });

    if (error) {
      console.error('Failed to insert food entry', error);
      alert('Failed to log food.');
    } else {
      qc.invalidateQueries({ queryKey: ['daily-log', user!.id, viewDateISO] });
    }
  }

  return (
    <div className="px-4 py-6 max-w-2xl mx-auto pb-28 sm:pt-20">

        {/* ─── Header ─────────────────────────────────────────── */}
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

        {/* ─── Metric cards ────────────────────────────────────── */}
        <div className="grid grid-cols-2 gap-3 mb-5">
          <MetricCard
            label="Calories"
            value={(log?.calories ?? 0).toLocaleString()}
            unit={`of ${(targets?.daily_calories ?? 0).toLocaleString()} kcal`}
            progress={{ current: log?.calories ?? 0, target: targets?.daily_calories ?? 1 }}
            state={classifyState(log?.calories, targets?.daily_calories, 'under')}
          />
          <MetricCard
            label="Protein"
            value={Math.round(log?.protein_g ?? 0)}
            unit={`of ${targets?.daily_protein_g ?? 0} g`}
            progress={{ current: log?.protein_g ?? 0, target: targets?.daily_protein_g ?? 1 }}
            state={classifyState(log?.protein_g, targets?.daily_protein_g, 'over')}
          />
          <MetricCard
            label="Fibre"
            value={Math.round(log?.fibre_g ?? 0)}
            unit={`of ${targets?.daily_fibre_g ?? 0} g`}
            progress={{ current: log?.fibre_g ?? 0, target: targets?.daily_fibre_g ?? 1 }}
            state={classifyState(log?.fibre_g, targets?.daily_fibre_g, 'over')}
          />
          <MetricCard
            label="Steps"
            value={(log?.steps ?? 0).toLocaleString()}
            unit={`of ${(targets?.daily_steps ?? 0).toLocaleString()}`}
            progress={{ current: log?.steps ?? 0, target: targets?.daily_steps ?? 1 }}
            state={classifyState(log?.steps, targets?.daily_steps, 'over')}
          />
        </div>

        {/* ─── Food log list ───────────────────────────────────── */}
        {viewEntries.length > 0 && (
          <FoodLogList entries={viewEntries} />
        )}

        {/* ─── Daily totals form ───────────────────────────────── */}
        <DailyEntryForm
          log={log}
          userId={user.id}
          logDate={viewDateISO}
          onSave={(updates) => upsertLog.mutate(updates)}
        />

        {/* ─── Action buttons (today only) ─────────────────────── */}
        {isToday && (
          <>
            <Button
              variant="primary"
              size="lg"
              fullWidth
              leadingIcon={<IconPlus size={16} />}
              className="mt-4"
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
      <div className="flex flex-col gap-1.5">
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

// ─── Daily entry form ─────────────────────────────────────────────────────────

interface DailyEntryFormProps {
  log: { calories: number | null; protein_g: number | null; fibre_g: number | null; water_ml: number | null; steps: number | null; gym_session: boolean } | null | undefined;
  userId: string;
  logDate: string;
  onSave: (updates: { user_id: string; log_date: string; calories?: number | null; protein_g?: number | null; fibre_g?: number | null; water_ml?: number | null; steps?: number | null; gym_session?: boolean }) => void;
}

function DailyEntryForm({ log, userId, logDate, onSave }: DailyEntryFormProps) {
  const [calories, setCalories] = useState<number | null>(log?.calories ?? null);
  const [protein, setProtein] = useState<number | null>(log?.protein_g ?? null);
  const [fibre, setFibre] = useState<number | null>(log?.fibre_g ?? null);
  const [water, setWater] = useState<number | null>(log?.water_ml ?? null);
  const [steps, setSteps] = useState<number | null>(log?.steps ?? null);

  useEffect(() => {
    setCalories(log?.calories ?? null);
    setProtein(log?.protein_g ?? null);
    setFibre(log?.fibre_g ?? null);
    setWater(log?.water_ml ?? null);
    setSteps(log?.steps ?? null);
  }, [log]);

  function handleSave() {
    onSave({
      user_id: userId,
      log_date: logDate,
      calories,
      protein_g: protein,
      fibre_g: fibre,
      water_ml: water,
      steps,
    });
  }

  return (
    <section className="bg-surface-raised border border-border-subtle rounded-lg p-4 mb-4">
      <h2 className="text-h3 text-text-primary mb-0.5">Daily totals</h2>
      <p className="text-small text-text-tertiary mb-4">
        Enter totals directly without tracking individual foods.
      </p>
      <div className="grid grid-cols-2 gap-3">
        <NumericInput label="Calories" value={calories} onChange={setCalories} />
        <NumericInput label="Protein (g)" value={protein} onChange={setProtein} decimalPlaces={1} />
        <NumericInput label="Fibre (g)" value={fibre} onChange={setFibre} decimalPlaces={1} />
        <NumericInput label="Water (ml)" value={water} onChange={setWater} />
        <NumericInput label="Steps" value={steps} onChange={setSteps} />
      </div>
      <Button variant="secondary" onClick={handleSave} className="mt-4" fullWidth>
        Save totals
      </Button>
    </section>
  );
}
