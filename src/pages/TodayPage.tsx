import { useState } from 'react';
import { format } from 'date-fns';
import { IconPlus } from '@tabler/icons-react';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { MetricCard } from '@/components/MetricCard';
import { useAuth } from '@/lib/auth';
import { useTargets } from '@/hooks/useProfile';
import { useDailyLog, useUpsertDailyLog } from '@/hooks/useDailyLog';

function classifyState(current: number | null | undefined, target: number | null | undefined, kind: 'over' | 'under') {
  if (current == null || !target) return 'logged' as const;
  const ratio = current / target;
  if (kind === 'under') {
    // calorie limit: under target = on track; near target = approaching; over = below
    if (ratio < 0.85) return 'on-track' as const;
    if (ratio <= 1.0) return 'approaching' as const;
    return 'below' as const;
  }
  // over: protein/fibre/water/steps; over target = on track; near = approaching; far below = below
  if (ratio >= 1.0) return 'on-track' as const;
  if (ratio >= 0.8) return 'approaching' as const;
  return 'below' as const;
}

export function TodayPage() {
  const { user } = useAuth();
  const today = new Date();
  const { data: targets } = useTargets(user?.id);
  const { data: log } = useDailyLog(user?.id, today);
  const upsertLog = useUpsertDailyLog();

  if (!user) return null;

  return (
    <div className="px-4 py-6 max-w-2xl mx-auto pb-24">
      <header className="mb-6">
        <p className="text-eyebrow text-text-tertiary uppercase mb-1">
          {format(today, 'EEEE, d MMMM')}
        </p>
        <h1 className="text-h1 text-text-primary">Today</h1>
      </header>

      <div className="grid grid-cols-2 gap-3 mb-4">
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

      <DailyEntryForm log={log} userId={user.id} todayISO={format(today, 'yyyy-MM-dd')} onSave={(updates) => upsertLog.mutate(updates)} />

      <Button variant="primary" size="lg" fullWidth leadingIcon={<IconPlus size={16} />} className="mt-4" disabled>
        Log a meal
      </Button>
      <p className="text-small text-text-tertiary text-center mt-2">
        Food search arrives in iteration 2.
      </p>
    </div>
  );
}

interface DailyEntryFormProps {
  log: { calories: number | null; protein_g: number | null; fibre_g: number | null; water_ml: number | null; steps: number | null; gym_session: boolean } | null | undefined;
  userId: string;
  todayISO: string;
  onSave: (updates: { user_id: string; log_date: string; calories?: number | null; protein_g?: number | null; fibre_g?: number | null; water_ml?: number | null; steps?: number | null; gym_session?: boolean }) => void;
}

function DailyEntryForm({ log, userId, todayISO, onSave }: DailyEntryFormProps) {
  const [calories, setCalories] = useState(log?.calories?.toString() ?? '');
  const [protein, setProtein] = useState(log?.protein_g?.toString() ?? '');
  const [fibre, setFibre] = useState(log?.fibre_g?.toString() ?? '');
  const [water, setWater] = useState(log?.water_ml?.toString() ?? '');
  const [steps, setSteps] = useState(log?.steps?.toString() ?? '');

  function handleSave() {
    onSave({
      user_id: userId,
      log_date: todayISO,
      calories: calories ? Number(calories) : null,
      protein_g: protein ? Number(protein) : null,
      fibre_g: fibre ? Number(fibre) : null,
      water_ml: water ? Number(water) : null,
      steps: steps ? Number(steps) : null,
    });
  }

  return (
    <section className="bg-surface-raised border border-border-subtle rounded-lg p-4">
      <h2 className="text-h3 text-text-primary mb-3">Quick log</h2>
      <div className="grid grid-cols-2 gap-3">
        <Input label="Calories" type="number" inputMode="numeric" value={calories} onChange={(e) => setCalories(e.target.value)} />
        <Input label="Protein (g)" type="number" inputMode="numeric" value={protein} onChange={(e) => setProtein(e.target.value)} />
        <Input label="Fibre (g)" type="number" inputMode="numeric" value={fibre} onChange={(e) => setFibre(e.target.value)} />
        <Input label="Water (ml)" type="number" inputMode="numeric" value={water} onChange={(e) => setWater(e.target.value)} />
        <Input label="Steps" type="number" inputMode="numeric" value={steps} onChange={(e) => setSteps(e.target.value)} />
      </div>
      <Button variant="secondary" onClick={handleSave} className="mt-3" fullWidth>
        Save today
      </Button>
    </section>
  );
}
