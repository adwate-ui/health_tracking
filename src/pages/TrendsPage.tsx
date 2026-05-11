import { useMemo } from 'react';
import { format, subDays, differenceInDays, addWeeks } from 'date-fns';
import {
  AreaChart, Area, Bar, ComposedChart, Line,
  LineChart, ResponsiveContainer, XAxis, YAxis, Tooltip,
  CartesianGrid, ReferenceLine,
} from 'recharts';
import { useAuth } from '@/lib/auth';
import { useRecentDailyLogs } from '@/hooks/useDailyLog';
import { useWeeklyCheckins } from '@/hooks/useWeeklyCheckins';
import { useTargets } from '@/hooks/useProfile';
import {
  TrendChart, ChartTooltip, StatItem,
  sharedXAxis, sharedYAxis, sharedGrid,
} from '@/components/TrendChart';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function movingAverage(values: number[], window = 7): (number | null)[] {
  return values.map((_, i) => {
    const start = Math.max(0, i - window + 1);
    const slice = values.slice(start, i + 1).filter(v => v > 0);
    if (slice.length < Math.min(3, window)) return null;
    return slice.reduce((a, b) => a + b, 0) / slice.length;
  });
}

function avgOf(values: number[]): number {
  const valid = values.filter(v => v > 0);
  return valid.length ? valid.reduce((a, b) => a + b, 0) / valid.length : 0;
}

function hitRate(values: number[], target: number): number {
  const valid = values.filter(v => v > 0);
  if (!valid.length) return 0;
  return (valid.filter(v => v >= target).length / valid.length) * 100;
}

function currentStreak(values: number[], target: number): number {
  let streak = 0;
  for (let i = values.length - 1; i >= 0; i--) {
    const v = values[i] ?? 0;
    if (v > 0 && v >= target) streak++;
    else if (v > 0) break;
  }
  return streak;
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export function TrendsPage() {
  const { user } = useAuth();
  const days = 60;

  const { data: logs, isLoading: loadingLogs } = useRecentDailyLogs(user?.id, days);
  const { data: checkins, isLoading: loadingCheckins } = useWeeklyCheckins(user?.id, 20);
  const { data: targets } = useTargets(user?.id);

  const isLoading = loadingLogs || loadingCheckins;

  // ─── Daily chart data ────────────────────────────────────────────────────

  const chartData = useMemo(() => {
    const raw = Array.from({ length: days }, (_, i) => {
      const date = subDays(new Date(), days - 1 - i);
      const iso = format(date, 'yyyy-MM-dd');
      const log = logs?.find(l => l.log_date === iso);
      return {
        date: format(date, 'MMM d'),
        calories: log?.calories ?? 0,
        protein: log?.protein_g ?? 0,
        fibre: log?.fibre_g ?? 0,
        water: log?.water_ml ?? 0,
        steps: log?.steps ?? 0,
        gym: log?.gym_session ? 1 : 0,
      };
    });

    const calMA = movingAverage(raw.map(d => d.calories));
    const protMA = movingAverage(raw.map(d => d.protein));
    const stepsMA = movingAverage(raw.map(d => d.steps));

    return raw.map((d, i) => ({
      ...d,
      calMA: calMA[i],
      protMA: protMA[i],
      stepsMA: stepsMA[i],
    }));
  }, [logs, days]);

  // Last 30 days slice for bar charts (less visual clutter)
  const recentData = chartData.slice(-30);

  // ─── Body data ───────────────────────────────────────────────────────────

  const bodyData = useMemo(() => {
    if (!checkins) return [];
    return checkins
      .slice()
      .reverse()
      .map(c => ({
        week: format(new Date(c.week_start), 'MMM d'),
        weight: c.weight_kg,
        bodyFat: c.body_fat_pct,
        waist: c.waist_cm,
        hips: c.hips_cm,
        chest: c.chest_cm,
        neck: c.neck_cm,
      }));
  }, [checkins]);

  // ─── Availability flags ──────────────────────────────────────────────────

  const hasWeight  = bodyData.filter(d => d.weight  != null).length >= 2;
  const hasBodyFat = bodyData.filter(d => d.bodyFat != null).length >= 2;
  const hasMeasurements = bodyData.some(d => d.waist != null || d.hips != null);
  const hasCalories = chartData.some(d => d.calories > 0);
  const hasProtein  = chartData.some(d => d.protein  > 0);
  const hasFibre    = chartData.some(d => d.fibre    > 0);
  const hasWater    = chartData.some(d => d.water    > 0);
  const hasSteps    = chartData.some(d => d.steps    > 0);
  const gymSessions = chartData.reduce((n, d) => n + d.gym, 0);

  // ─── Per-metric stats ────────────────────────────────────────────────────

  const calStats: StatItem[] = useMemo(() => {
    if (!hasCalories) return [];
    const vals = chartData.map(d => d.calories);
    const avg = avgOf(vals);
    const tgt = targets?.daily_calories;
    const days30 = recentData.filter(d => d.calories > 0).length;
    const hit = tgt ? recentData.filter(d => d.calories > 0 && d.calories <= tgt).length : null;
    const streak = tgt ? currentStreak(chartData.slice(-14).map(d => d.calories), 0) : null;
    return [
      { label: 'Avg / day', value: `${Math.round(avg).toLocaleString()} kcal` },
      ...(tgt ? [{ label: 'On target', value: hit != null ? `${hit} / ${days30} days` : '—' }] : []),
      ...(streak != null && streak > 1 ? [{ label: 'Streak', value: `${streak} days`, positive: true }] : []),
    ];
  }, [chartData, recentData, targets, hasCalories]);

  const protStats: StatItem[] = useMemo(() => {
    if (!hasProtein) return [];
    const vals = chartData.map(d => d.protein);
    const avg = avgOf(vals);
    const tgt = targets?.daily_protein_g;
    const rate = tgt ? hitRate(recentData.map(d => d.protein), tgt) : null;
    const streak = tgt ? currentStreak(vals.slice(-14), tgt) : null;
    return [
      { label: 'Avg / day', value: `${Math.round(avg)} g` },
      ...(rate != null ? [{ label: 'Hit rate', value: `${Math.round(rate)}%`, positive: rate >= 80 }] : []),
      ...(streak != null && streak > 1 ? [{ label: 'Streak', value: `${streak} days`, positive: true }] : []),
    ];
  }, [chartData, recentData, targets, hasProtein]);

  const fibreStats: StatItem[] = useMemo(() => {
    if (!hasFibre) return [];
    const vals = chartData.map(d => d.fibre);
    const avg = avgOf(vals);
    const tgt = targets?.daily_fibre_g;
    const rate = tgt ? hitRate(recentData.map(d => d.fibre), tgt) : null;
    return [
      { label: 'Avg / day', value: `${Math.round(avg)} g` },
      ...(rate != null ? [{ label: 'Hit rate', value: `${Math.round(rate)}%`, positive: rate >= 80 }] : []),
    ];
  }, [chartData, recentData, targets, hasFibre]);

  const stepsStats: StatItem[] = useMemo(() => {
    if (!hasSteps) return [];
    const vals = chartData.map(d => d.steps);
    const avg = avgOf(vals);
    const tgt = targets?.daily_steps;
    const rate = tgt ? hitRate(recentData.map(d => d.steps), tgt) : null;
    const best = Math.max(...vals.filter(v => v > 0));
    return [
      { label: 'Avg / day', value: `${Math.round(avg).toLocaleString()}` },
      ...(rate != null ? [{ label: 'Hit rate', value: `${Math.round(rate)}%`, positive: rate >= 80 }] : []),
      { label: 'Best day', value: best.toLocaleString() },
    ];
  }, [chartData, recentData, targets, hasSteps]);

  const waterStats: StatItem[] = useMemo(() => {
    if (!hasWater) return [];
    const vals = chartData.map(d => d.water);
    const avg = avgOf(vals);
    const tgt = targets?.daily_water_ml;
    const rate = tgt ? hitRate(recentData.map(d => d.water), tgt) : null;
    return [
      { label: 'Avg / day', value: `${Math.round(avg / 100) / 10} L` },
      ...(rate != null ? [{ label: 'Hit rate', value: `${Math.round(rate)}%`, positive: rate >= 80 }] : []),
    ];
  }, [chartData, recentData, targets, hasWater]);

  // ─── Weight / body stats & goal projection ───────────────────────────────

  const weightStats: StatItem[] = useMemo(() => {
    const withWeight = bodyData.filter(d => d.weight != null);
    if (withWeight.length < 2) return [];
    const latest = withWeight[withWeight.length - 1]!;
    const oldest = withWeight[0]!;
    const change = (latest.weight! - oldest.weight!);
    const weeksSpan = Math.max(1, withWeight.length - 1);
    const rate = change / weeksSpan;
    return [
      { label: 'Current', value: `${latest.weight!.toFixed(1)} kg` },
      { label: 'Change', value: `${change >= 0 ? '+' : ''}${change.toFixed(1)} kg`, positive: change <= 0 },
      { label: 'Rate', value: `${rate >= 0 ? '+' : ''}${rate.toFixed(2)} kg/wk` },
    ];
  }, [bodyData]);

  const goalProgress = useMemo(() => {
    if (!targets?.goal_weight_kg || !targets?.daily_calories) return null;
    const withWeight = bodyData.filter(d => d.weight != null);
    if (withWeight.length < 2) return null;
    const currentWeight = withWeight[withWeight.length - 1]!.weight!;
    const startWeight = withWeight[0]!.weight!;
    const goalWeight = targets.goal_weight_kg;
    const totalDelta = Math.abs(startWeight - goalWeight);
    if (totalDelta < 0.1) return null;
    const currentDelta = Math.abs(currentWeight - goalWeight);
    const progressPct = Math.max(0, Math.min(100, ((totalDelta - currentDelta) / totalDelta) * 100));

    // Weekly rate for ETA
    const weeksSpan = Math.max(1, withWeight.length - 1);
    const weeklyRate = (withWeight[withWeight.length - 1]!.weight! - withWeight[0]!.weight!) / weeksSpan;
    const movingTowardGoal = (currentWeight > goalWeight && weeklyRate < 0) || (currentWeight < goalWeight && weeklyRate > 0);

    let eta: Date | null = null;
    let weeksLeft: number | null = null;
    if (movingTowardGoal && Math.abs(weeklyRate) > 0.01) {
      weeksLeft = Math.abs(currentWeight - goalWeight) / Math.abs(weeklyRate);
      eta = addWeeks(new Date(), weeksLeft);
    }

    return { currentWeight, startWeight, goalWeight, progressPct, eta, weeksLeft, movingTowardGoal };
  }, [bodyData, targets]);

  const bodyFatStats: StatItem[] = useMemo(() => {
    const withBF = bodyData.filter(d => d.bodyFat != null);
    if (withBF.length < 2) return [];
    const latest = withBF[withBF.length - 1]!;
    const oldest = withBF[0]!;
    const change = (latest.bodyFat! - oldest.bodyFat!);
    return [
      { label: 'Current', value: `${latest.bodyFat!.toFixed(1)}%` },
      { label: 'Change', value: `${change >= 0 ? '+' : ''}${change.toFixed(1)}%`, positive: change <= 0 },
    ];
  }, [bodyData]);

  // ─── Plateau narrative ───────────────────────────────────────────────────

  const weightInsight = useMemo(() => {
    const withWeight = bodyData.filter(d => d.weight != null);
    if (withWeight.length < 3) return null;
    const recent = withWeight.slice(-4);
    const oldest = recent[0]!;
    const newest = recent[recent.length - 1]!;
    const daySpan = Math.abs(differenceInDays(new Date(oldest.week), new Date(newest.week)));
    if (daySpan < 14) return null;
    const delta = newest.weight! - oldest.weight!;
    if (Math.abs(delta) < 0.3) {
      return `Weight has been stable over ${daySpan} days (±${Math.abs(delta).toFixed(1)} kg) — could indicate maintenance, water retention, or recomposition.`;
    }
    const direction = delta < 0 ? 'down' : 'up';
    const rate = (Math.abs(delta) / (daySpan / 7)).toFixed(2);
    return `Trending ${direction} at ~${rate} kg/week over ${daySpan} days.`;
  }, [bodyData]);

  if (!user) return null;

  const noData = !hasCalories && !hasProtein && !hasWeight;

  return (
    <div className="px-4 py-6 max-w-2xl mx-auto pb-28 sm:pt-20">
      <header className="mb-6">
        <p className="text-eyebrow text-text-tertiary uppercase mb-1">Analytics</p>
        <h1 className="text-h1 text-text-primary">Trends</h1>
      </header>

      {isLoading ? (
        <div className="flex flex-col gap-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-56 bg-surface-raised border border-border-subtle rounded-xl animate-pulse" />
          ))}
        </div>
      ) : noData ? (
        <div className="bg-surface-raised border border-border-subtle rounded-xl p-8 text-center">
          <p className="text-body text-text-secondary">Start logging to see your trends here.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-5">

          {/* ═══ WEIGHT & BODY ══════════════════════════════════════════ */}
          {hasWeight && (
            <section>
              <p className="text-eyebrow text-text-tertiary uppercase mb-3">Weight & Body</p>

              <TrendChart
                title="Weight"
                insight={weightInsight}
                stats={weightStats}
                height={220}
              >
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={bodyData.filter(d => d.weight != null)} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="gradWeight" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="var(--color-action-primary)" stopOpacity={0.22} />
                        <stop offset="95%" stopColor="var(--color-action-primary)" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid {...sharedGrid} />
                    <XAxis dataKey="week" {...sharedXAxis} />
                    <YAxis
                      {...sharedYAxis}
                      domain={['auto', 'auto']}
                      tickFormatter={v => `${v}`}
                    />
                    <Tooltip
                      content={<ChartTooltip unit="kg" formatter={(v) => `${v.toFixed(1)} kg`} />}
                    />
                    {targets?.goal_weight_kg && (
                      <ReferenceLine
                        y={targets.goal_weight_kg}
                        stroke="var(--color-action-accent)"
                        strokeDasharray="4 4"
                        label={{ value: 'Goal', position: 'insideTopRight', fill: 'var(--color-action-accent)', fontSize: 10, fontWeight: 500 }}
                      />
                    )}
                    <Area
                      type="monotone"
                      dataKey="weight"
                      name="Weight"
                      stroke="var(--color-action-primary)"
                      strokeWidth={2.5}
                      fill="url(#gradWeight)"
                      dot={false}
                      activeDot={{ r: 4, strokeWidth: 0, fill: 'var(--color-action-primary)' }}
                      isAnimationActive={false}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </TrendChart>

              {/* Goal progress bar */}
              {goalProgress && (
                <div className="mt-3 bg-surface-raised border border-border-subtle rounded-xl p-5">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-h3 text-text-primary">Goal progress</h3>
                    {goalProgress.eta && goalProgress.weeksLeft != null && (
                      <span className="text-small text-text-secondary">
                        ~{Math.round(goalProgress.weeksLeft)} weeks to go
                      </span>
                    )}
                  </div>

                  {/* Track */}
                  <div className="relative h-2 bg-surface-canvas rounded-full">
                    <div
                      className="absolute h-full rounded-full bg-action-primary transition-all duration-slow"
                      style={{ width: `${goalProgress.progressPct}%` }}
                    />
                    <div
                      className="absolute top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-surface-raised border-2 border-action-primary -translate-x-1/2"
                      style={{ left: `${goalProgress.progressPct}%` }}
                    />
                  </div>

                  {/* Labels */}
                  <div className="flex justify-between mt-4">
                    <div>
                      <p className="text-eyebrow text-text-tertiary uppercase">Start</p>
                      <p className="text-h3 tabular-nums text-text-secondary">{goalProgress.startWeight.toFixed(1)} kg</p>
                    </div>
                    <div className="text-center">
                      <p className="text-eyebrow text-text-tertiary uppercase">Now</p>
                      <p className="text-h2 tabular-nums text-text-primary font-medium">{goalProgress.currentWeight.toFixed(1)} kg</p>
                    </div>
                    <div className="text-right">
                      <p className="text-eyebrow text-text-tertiary uppercase">Goal</p>
                      <p className="text-h3 tabular-nums text-text-secondary">{goalProgress.goalWeight.toFixed(1)} kg</p>
                    </div>
                  </div>

                  {goalProgress.eta && (
                    <p className="text-small text-text-tertiary mt-3 border-t border-border-subtle pt-3">
                      At current rate, goal reached approximately <span className="text-text-secondary font-medium">{format(goalProgress.eta, 'd MMMM yyyy')}</span>.
                    </p>
                  )}
                  {!goalProgress.movingTowardGoal && (
                    <p className="text-small text-action-danger mt-3 border-t border-border-subtle pt-3">
                      Current trend is moving away from goal.
                    </p>
                  )}
                </div>
              )}
            </section>
          )}

          {/* Body fat */}
          {hasBodyFat && (
            <TrendChart title="Body fat" stats={bodyFatStats} height={200}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={bodyData.filter(d => d.bodyFat != null)}
                  margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="gradBodyFat" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--color-action-danger)" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="var(--color-action-danger)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid {...sharedGrid} />
                  <XAxis dataKey="week" {...sharedXAxis} />
                  <YAxis {...sharedYAxis} domain={['auto', 'auto']} tickFormatter={v => `${v}%`} />
                  <Tooltip content={<ChartTooltip formatter={(v) => `${v.toFixed(1)}%`} />} />
                  <Area
                    type="monotone"
                    dataKey="bodyFat"
                    name="Body fat"
                    stroke="var(--color-action-danger)"
                    strokeWidth={2.5}
                    fill="url(#gradBodyFat)"
                    dot={false}
                    activeDot={{ r: 4, strokeWidth: 0, fill: 'var(--color-action-danger)' }}
                    isAnimationActive={false}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </TrendChart>
          )}

          {/* Body measurements */}
          {hasMeasurements && (
            <TrendChart
              title="Measurements"
              stats={(() => {
                const latest = bodyData.filter(d => d.waist != null || d.hips != null).slice(-1)[0];
                if (!latest) return [];
                return [
                  ...(latest.waist != null ? [{ label: 'Waist', value: `${latest.waist} cm` }] : []),
                  ...(latest.hips != null  ? [{ label: 'Hips',  value: `${latest.hips} cm`  }] : []),
                  ...(latest.chest != null ? [{ label: 'Chest', value: `${latest.chest} cm` }] : []),
                  ...(latest.neck != null  ? [{ label: 'Neck',  value: `${latest.neck} cm`  }] : []),
                ];
              })()}
              height={220}
            >
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={bodyData}
                  margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
                >
                  <CartesianGrid {...sharedGrid} />
                  <XAxis dataKey="week" {...sharedXAxis} />
                  <YAxis {...sharedYAxis} domain={['auto', 'auto']} tickFormatter={v => `${v}`} />
                  <Tooltip content={<ChartTooltip formatter={(v) => `${v.toFixed(1)} cm`} />} />
                  {bodyData.some(d => d.waist != null) && (
                    <Line type="monotone" dataKey="waist" name="Waist" stroke="var(--color-action-accent)" strokeWidth={2} dot={false} activeDot={{ r: 3 }} connectNulls isAnimationActive={false} />
                  )}
                  {bodyData.some(d => d.hips != null) && (
                    <Line type="monotone" dataKey="hips" name="Hips" stroke="var(--color-action-danger)" strokeWidth={2} dot={false} activeDot={{ r: 3 }} connectNulls isAnimationActive={false} />
                  )}
                  {bodyData.some(d => d.chest != null) && (
                    <Line type="monotone" dataKey="chest" name="Chest" stroke="var(--color-action-primary)" strokeWidth={2} dot={false} activeDot={{ r: 3 }} connectNulls isAnimationActive={false} />
                  )}
                  {bodyData.some(d => d.neck != null) && (
                    <Line type="monotone" dataKey="neck" name="Neck" stroke="var(--color-border-strong)" strokeWidth={2} dot={false} activeDot={{ r: 3 }} connectNulls isAnimationActive={false} />
                  )}
                </LineChart>
              </ResponsiveContainer>
            </TrendChart>
          )}

          {/* ═══ NUTRITION ══════════════════════════════════════════════ */}
          {(hasCalories || hasProtein || hasFibre) && (
            <section>
              <p className="text-eyebrow text-text-tertiary uppercase mb-3">Nutrition — last 30 days</p>

              {/* Calories */}
              {hasCalories && (
                <TrendChart
                  title="Calories"
                  insight={(() => {
                    const avg = avgOf(recentData.map(d => d.calories));
                    const tgt = targets?.daily_calories;
                    if (!tgt) return null;
                    const diff = Math.round(avg - tgt);
                    return `${Math.round(avg).toLocaleString()} kcal average — ${Math.abs(diff).toLocaleString()} kcal ${diff > 0 ? 'above' : 'below'} your ${tgt.toLocaleString()} target.`;
                  })()}
                  stats={calStats}
                  height={220}
                  className="mb-4"
                >
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={recentData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                      <CartesianGrid {...sharedGrid} />
                      <XAxis dataKey="date" {...sharedXAxis} interval={6} />
                      <YAxis {...sharedYAxis} tickFormatter={v => v >= 1000 ? `${(v / 1000).toFixed(1)}k` : `${v}`} />
                      <Tooltip content={<ChartTooltip unit="kcal" formatter={(v) => `${Math.round(v).toLocaleString()} kcal`} />} />
                      {targets?.daily_calories && (
                        <ReferenceLine
                          y={targets.daily_calories}
                          stroke="var(--color-action-accent)"
                          strokeDasharray="4 4"
                          label={{ value: 'Target', position: 'insideTopRight', fill: 'var(--color-action-accent)', fontSize: 10, fontWeight: 500 }}
                        />
                      )}
                      <Bar dataKey="calories" name="Calories" fill="var(--color-action-primary)" fillOpacity={0.55} radius={[2, 2, 0, 0]} maxBarSize={18} isAnimationActive={false} />
                      <Line type="monotone" dataKey="calMA" name="7-day avg" stroke="var(--color-action-primary)" strokeWidth={2} dot={false} activeDot={{ r: 3 }} connectNulls isAnimationActive={false} />
                    </ComposedChart>
                  </ResponsiveContainer>
                </TrendChart>
              )}

              {/* Protein */}
              {hasProtein && (
                <TrendChart
                  title="Protein"
                  insight={(() => {
                    const avg = avgOf(recentData.map(d => d.protein));
                    const tgt = targets?.daily_protein_g;
                    if (!tgt) return `${Math.round(avg)} g average per day.`;
                    const rate = hitRate(recentData.map(d => d.protein), tgt);
                    return `${Math.round(avg)} g average — hit ${Math.round(rate)}% of tracked days.`;
                  })()}
                  stats={protStats}
                  height={200}
                  className="mb-4"
                >
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={recentData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                      <defs>
                        <linearGradient id="gradProt" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="var(--color-action-accent)" stopOpacity={0.22} />
                          <stop offset="95%" stopColor="var(--color-action-accent)" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid {...sharedGrid} />
                      <XAxis dataKey="date" {...sharedXAxis} interval={6} />
                      <YAxis {...sharedYAxis} tickFormatter={v => `${v}g`} />
                      <Tooltip content={<ChartTooltip formatter={(v) => `${Math.round(v)} g`} />} />
                      {targets?.daily_protein_g && (
                        <ReferenceLine
                          y={targets.daily_protein_g}
                          stroke="var(--color-action-accent)"
                          strokeDasharray="4 4"
                          label={{ value: 'Target', position: 'insideTopRight', fill: 'var(--color-action-accent)', fontSize: 10, fontWeight: 500 }}
                        />
                      )}
                      <Bar dataKey="protein" name="Protein" fill="var(--color-action-accent)" fillOpacity={0.5} radius={[2, 2, 0, 0]} maxBarSize={18} isAnimationActive={false} />
                      <Line type="monotone" dataKey="protMA" name="7-day avg" stroke="var(--color-action-accent)" strokeWidth={2} dot={false} activeDot={{ r: 3 }} connectNulls isAnimationActive={false} />
                    </ComposedChart>
                  </ResponsiveContainer>
                </TrendChart>
              )}

              {/* Fibre */}
              {hasFibre && (
                <TrendChart
                  title="Fibre"
                  stats={fibreStats}
                  height={200}
                >
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={recentData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                      <defs>
                        <linearGradient id="gradFibre" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="var(--color-action-primary)" stopOpacity={0.18} />
                          <stop offset="95%" stopColor="var(--color-action-primary)" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid {...sharedGrid} />
                      <XAxis dataKey="date" {...sharedXAxis} interval={6} />
                      <YAxis {...sharedYAxis} tickFormatter={v => `${v}g`} />
                      <Tooltip content={<ChartTooltip formatter={(v) => `${Math.round(v)} g`} />} />
                      {targets?.daily_fibre_g && (
                        <ReferenceLine
                          y={targets.daily_fibre_g}
                          stroke="var(--color-action-accent)"
                          strokeDasharray="4 4"
                          label={{ value: 'Target', position: 'insideTopRight', fill: 'var(--color-action-accent)', fontSize: 10, fontWeight: 500 }}
                        />
                      )}
                      <Area type="monotone" dataKey="fibre" name="Fibre" stroke="var(--color-action-primary)" strokeWidth={2} fill="url(#gradFibre)" dot={false} activeDot={{ r: 3, strokeWidth: 0 }} isAnimationActive={false} />
                    </AreaChart>
                  </ResponsiveContainer>
                </TrendChart>
              )}
            </section>
          )}

          {/* ═══ ACTIVITY & HYDRATION ═══════════════════════════════════ */}
          {(hasSteps || hasWater) && (
            <section>
              <p className="text-eyebrow text-text-tertiary uppercase mb-3">
                Activity & Hydration — last 30 days
                {gymSessions > 0 && <span className="ml-3 normal-case font-normal text-text-secondary">{gymSessions} gym sessions recorded</span>}
              </p>

              {/* Steps */}
              {hasSteps && (
                <TrendChart
                  title="Steps"
                  insight={(() => {
                    const avg = avgOf(recentData.map(d => d.steps));
                    const tgt = targets?.daily_steps;
                    if (!tgt) return `${Math.round(avg).toLocaleString()} steps average per day.`;
                    const rate = hitRate(recentData.map(d => d.steps), tgt);
                    return `${Math.round(avg).toLocaleString()} steps average — hit target ${Math.round(rate)}% of tracked days.`;
                  })()}
                  stats={stepsStats}
                  height={220}
                  className="mb-4"
                >
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={recentData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                      <CartesianGrid {...sharedGrid} />
                      <XAxis dataKey="date" {...sharedXAxis} interval={6} />
                      <YAxis {...sharedYAxis} tickFormatter={v => v >= 1000 ? `${Math.round(v / 1000)}k` : `${v}`} />
                      <Tooltip content={<ChartTooltip formatter={(v) => v.toLocaleString()} />} />
                      {targets?.daily_steps && (
                        <ReferenceLine
                          y={targets.daily_steps}
                          stroke="var(--color-action-accent)"
                          strokeDasharray="4 4"
                          label={{ value: 'Target', position: 'insideTopRight', fill: 'var(--color-action-accent)', fontSize: 10, fontWeight: 500 }}
                        />
                      )}
                      <Bar dataKey="steps" name="Steps" fill="var(--color-status-on-track-text)" fillOpacity={0.4} radius={[2, 2, 0, 0]} maxBarSize={18} isAnimationActive={false} />
                      <Line type="monotone" dataKey="stepsMA" name="7-day avg" stroke="var(--color-action-primary)" strokeWidth={2} dot={false} activeDot={{ r: 3 }} connectNulls isAnimationActive={false} />
                    </ComposedChart>
                  </ResponsiveContainer>
                </TrendChart>
              )}

              {/* Water */}
              {hasWater && (
                <TrendChart title="Water" stats={waterStats} height={200}>
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={recentData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                      <defs>
                        <linearGradient id="gradWater" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="var(--color-status-logged-text)" stopOpacity={0.2} />
                          <stop offset="95%" stopColor="var(--color-status-logged-text)" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid {...sharedGrid} />
                      <XAxis dataKey="date" {...sharedXAxis} interval={6} />
                      <YAxis {...sharedYAxis} tickFormatter={v => `${Math.round(v / 100) / 10}L`} />
                      <Tooltip content={<ChartTooltip formatter={(v) => `${Math.round(v / 100) / 10} L`} />} />
                      {targets?.daily_water_ml && (
                        <ReferenceLine
                          y={targets.daily_water_ml}
                          stroke="var(--color-action-accent)"
                          strokeDasharray="4 4"
                          label={{ value: 'Target', position: 'insideTopRight', fill: 'var(--color-action-accent)', fontSize: 10, fontWeight: 500 }}
                        />
                      )}
                      <Area type="monotone" dataKey="water" name="Water" stroke="var(--color-status-logged-text)" strokeWidth={2} fill="url(#gradWater)" dot={false} activeDot={{ r: 3, strokeWidth: 0 }} isAnimationActive={false} />
                    </AreaChart>
                  </ResponsiveContainer>
                </TrendChart>
              )}
            </section>
          )}

        </div>
      )}
    </div>
  );
}
