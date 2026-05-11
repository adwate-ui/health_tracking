import { useMemo } from 'react';
import { format, subDays, differenceInDays, addWeeks } from 'date-fns';
import { BarChart, Bar, LineChart, Line, ResponsiveContainer, XAxis, YAxis, Tooltip, ReferenceLine } from 'recharts';
import { useAuth } from '@/lib/auth';
import { useRecentDailyLogs } from '@/hooks/useDailyLog';
import { useWeeklyCheckins } from '@/hooks/useWeeklyCheckins';
import { useTargets } from '@/hooks/useProfile';
import { Card } from '@/components/Card';

export function TrendsPage() {
  const { user } = useAuth();
  
  // We'll look at the last 30 days for the nutrition view
  const days = 30;
  const { data: logs, isLoading: loadingLogs } = useRecentDailyLogs(user?.id, days);
  const { data: checkins, isLoading: loadingCheckins } = useWeeklyCheckins(user?.id, 12);
  const { data: targets } = useTargets(user?.id);

  const isLoading = loadingLogs || loadingCheckins;

  const chartData = useMemo(() => {
    if (!logs || !targets) return [];
    
    // Generate an array of the last 30 days
    const data = [];
    for (let i = days - 1; i >= 0; i--) {
      const date = subDays(new Date(), i);
      const isoDate = format(date, 'yyyy-MM-dd');
      const log = logs.find(l => l.log_date === isoDate);
      data.push({
        date: format(date, 'MMM d'),
        calories: log?.calories ?? 0,
        protein: log?.protein_g ?? 0,
      });
    }
    return data;
  }, [logs, targets]);

  const weightData = useMemo(() => {
    if (!checkins) return [];
    return checkins
      .slice()
      .reverse()
      .filter(c => c.weight_kg != null)
      .map(c => ({
        week: format(new Date(c.week_start), 'MMM d'),
        weight: c.weight_kg!,
      }));
  }, [checkins]);

  // ─── Caloric deficit calculation ─────────────────────────────────
  const deficitSummary = useMemo(() => {
    if (!logs || !targets?.daily_calories) return null;

    const daysWithData = logs.filter(l => l.calories != null && l.calories > 0);
    if (daysWithData.length < 3) return null;

    const avgCalories = daysWithData.reduce((sum, l) => sum + (l.calories ?? 0), 0) / daysWithData.length;
    const dailyDeficit = targets.daily_calories - avgCalories;
    const weeklyDeficit = dailyDeficit * 7;
    // ~7 700 kcal per kg of body fat
    const projectedWeeklyLossKg = weeklyDeficit / 7700;

    return {
      avgCalories: Math.round(avgCalories),
      target: targets.daily_calories,
      dailyDeficit: Math.round(dailyDeficit),
      weeklyDeficit: Math.round(weeklyDeficit),
      projectedWeeklyLossKg: Math.abs(projectedWeeklyLossKg) < 0.01 ? 0 : projectedWeeklyLossKg,
      daysTracked: daysWithData.length,
      isSurplus: dailyDeficit < 0,
    };
  }, [logs, targets]);

  // ─── Goal arrival projection ─────────────────────────────────────
  const goalArrival = useMemo(() => {
    if (!targets?.goal_weight_kg || !deficitSummary) return null;

    const currentWeight = checkins?.find(c => c.weight_kg != null)?.weight_kg;
    if (currentWeight == null) return null;

    const goalWeight = targets.goal_weight_kg;
    const weeklyRate = deficitSummary.projectedWeeklyLossKg; // kg/week, signed (negative = loss)
    const weightDelta = currentWeight - goalWeight; // positive = need to lose, negative = need to gain

    // Already at goal
    if (Math.abs(weightDelta) < 0.1) {
      return { status: 'at-goal' as const, currentWeight, goalWeight, weeklyRate };
    }

    // Rate is zero or wrong direction
    const movingTowardGoal = (weightDelta > 0 && weeklyRate > 0) || (weightDelta < 0 && weeklyRate < 0);
    if (!movingTowardGoal || Math.abs(weeklyRate) < 0.01) {
      return { status: 'wrong-direction' as const, currentWeight, goalWeight, weeklyRate };
    }

    const weeksToGoal = Math.abs(weightDelta) / Math.abs(weeklyRate);
    const arrivalDate = addWeeks(new Date(), weeksToGoal);

    return {
      status: 'on-track' as const,
      currentWeight,
      goalWeight,
      weeklyRate,
      arrivalDate,
      weeksToGoal: Math.round(weeksToGoal),
    };
  }, [targets, deficitSummary, checkins]);

  // ─── Plateau detection ───────────────────────────────────────────
  const plateauNarrative = useMemo(() => {
    if (!checkins || checkins.length < 3) return null;

    // Take the most recent checkins that have weight data
    const withWeight = checkins
      .filter(c => c.weight_kg != null)
      .slice(0, 4); // most recent 4 weeks (already desc-sorted)

    if (withWeight.length < 3) return null;

    const newest = withWeight[0]!;
    const oldest = withWeight[withWeight.length - 1]!;

    const daySpan = Math.abs(differenceInDays(
      new Date(newest.week_start),
      new Date(oldest.week_start),
    ));

    if (daySpan < 14) return null;

    const weightChange = newest.weight_kg! - oldest.weight_kg!;
    const absChange = Math.abs(weightChange);

    // Plateau threshold: less than 0.3 kg change over 14+ days
    if (absChange < 0.3) {
      return `Weight is stable over ${daySpan} days (±${absChange.toFixed(1)}\u00a0kg). This could indicate maintenance, water retention, or body recomposition.`;
    }

    // Not a plateau — provide factual context
    const direction = weightChange < 0 ? 'down' : 'up';
    const rate = (absChange / (daySpan / 7)).toFixed(1);
    return `Weight is trending ${direction} at approximately ${rate}\u00a0kg per week over the last ${daySpan} days.`;
  }, [checkins]);

  if (!user) return null;

  return (
    <div className="px-4 py-6 max-w-2xl mx-auto pb-28 sm:pt-20">
      <header className="mb-6">
        <p className="text-eyebrow text-text-tertiary uppercase mb-1">Analytics</p>
        <h1 className="text-h1 text-text-primary">Trends</h1>
      </header>

      {isLoading ? (
        <p className="text-text-tertiary">Loading trends...</p>
      ) : (
        <div className="flex flex-col gap-6">
          
          {/* ─── Weight Trend ──────────────────────────────────── */}
          <section>
            <h2 className="text-h3 text-text-primary mb-1">Weight trend</h2>
            {plateauNarrative && (
              <p className="text-small text-text-secondary mb-3">{plateauNarrative}</p>
            )}
            {!plateauNarrative && (
              <p className="text-small text-text-tertiary mb-3">
                {weightData.length > 1 
                  ? `Your weight has changed by ${((weightData[weightData.length - 1]?.weight || 0) - (weightData[0]?.weight || 0)).toFixed(1)}\u00a0kg over the recorded period.`
                  : "Keep logging check-ins to see your weight trend."}
              </p>
            )}
            {weightData.length > 0 && (
              <Card className="h-48 p-2">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={weightData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <XAxis dataKey="week" stroke="var(--color-border-strong)" fontSize={12} tickMargin={8} />
                    <YAxis domain={['auto', 'auto']} stroke="var(--color-border-strong)" fontSize={12} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: 'var(--color-surface-raised)', borderColor: 'var(--color-border-subtle)', borderRadius: '8px' }}
                      itemStyle={{ color: 'var(--color-text-primary)' }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="weight" 
                      name="Weight (kg)"
                      stroke="var(--color-forest-500)" 
                      strokeWidth={3} 
                      dot={{ fill: 'var(--color-surface-base)', strokeWidth: 2, r: 4 }}
                      activeDot={{ r: 6 }}
                      isAnimationActive={false} 
                    />
                  </LineChart>
                </ResponsiveContainer>
              </Card>
            )}
          </section>

          {/* ─── Caloric Deficit ────────────────────────────────── */}
          {deficitSummary && (
            <section>
              <h2 className="text-h3 text-text-primary mb-1">Energy balance</h2>
              <Card className="p-4">
                <div className="grid grid-cols-2 gap-4 mb-3">
                  <div className="flex flex-col">
                    <span className="text-eyebrow text-text-tertiary uppercase">Average intake</span>
                    <span className="text-h2 text-text-primary tabular-nums">
                      {deficitSummary.avgCalories.toLocaleString()}<span className="text-body text-text-tertiary ml-1">kcal</span>
                    </span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-eyebrow text-text-tertiary uppercase">Target</span>
                    <span className="text-h2 text-text-primary tabular-nums">
                      {deficitSummary.target.toLocaleString()}<span className="text-body text-text-tertiary ml-1">kcal</span>
                    </span>
                  </div>
                </div>
                <div className={`flex items-baseline gap-2 rounded-lg p-3 ${deficitSummary.isSurplus ? 'bg-coral-50 dark:bg-coral-900/20' : 'bg-forest-50 dark:bg-forest-900/20'}`}>
                  <span className={`text-h3 tabular-nums ${deficitSummary.isSurplus ? 'text-coral-600 dark:text-coral-400' : 'text-forest-600 dark:text-forest-400'}`}>
                    {deficitSummary.isSurplus ? '+' : ''}{deficitSummary.dailyDeficit.toLocaleString()}<span className="text-body ml-1">kcal/day</span>
                  </span>
                </div>
                <p className="text-small text-text-tertiary mt-3">
                  Over {deficitSummary.daysTracked} tracked days, your weekly {deficitSummary.isSurplus ? 'surplus' : 'deficit'} averages {Math.abs(deficitSummary.weeklyDeficit).toLocaleString()}{'\u00a0'}kcal
                  {deficitSummary.projectedWeeklyLossKg !== 0 && (
                    <> — projecting roughly {Math.abs(deficitSummary.projectedWeeklyLossKg).toFixed(2)}{'\u00a0'}kg {deficitSummary.isSurplus ? 'gain' : 'loss'} per week</>
                  )}.
                </p>
              </Card>
            </section>
          )}

          {/* ─── Goal Arrival ───────────────────────────────────── */}
          {goalArrival && (
            <section>
              <h2 className="text-h3 text-text-primary mb-1">Goal arrival</h2>
              <Card className="p-4">
                <div className="flex flex-col divide-y divide-border-subtle">
                  <div className="flex justify-between items-baseline py-2">
                    <span className="text-small text-text-tertiary">Goal weight</span>
                    <span className="text-body font-medium tabular-nums text-text-primary">
                      {goalArrival.goalWeight.toFixed(1)}&nbsp;kg
                    </span>
                  </div>
                  <div className="flex justify-between items-baseline py-2">
                    <span className="text-small text-text-tertiary">Current weight</span>
                    <span className="text-body font-medium tabular-nums text-text-primary">
                      {goalArrival.currentWeight.toFixed(1)}&nbsp;kg
                    </span>
                  </div>
                  <div className="flex justify-between items-baseline py-2">
                    <span className="text-small text-text-tertiary">Rate</span>
                    <span className="text-body font-medium tabular-nums text-text-primary">
                      {goalArrival.weeklyRate > 0 ? '+' : ''}{goalArrival.weeklyRate.toFixed(2)}&nbsp;kg/week
                    </span>
                  </div>
                  <div className="flex justify-between items-baseline py-2">
                    <span className="text-small text-text-tertiary">Projected arrival</span>
                    <span className="text-body font-medium text-text-primary">
                      {goalArrival.status === 'at-goal' && 'At goal weight'}
                      {goalArrival.status === 'wrong-direction' && (
                        <span className="text-text-tertiary text-small">
                          {Math.abs(goalArrival.weeklyRate) < 0.01
                            ? 'No measurable rate — log more days'
                            : 'Current trend is away from goal'}
                        </span>
                      )}
                      {goalArrival.status === 'on-track' && (
                        <>
                          {format(goalArrival.arrivalDate, 'd MMMM yyyy')}
                          <span className="text-text-tertiary text-small ml-2">
                            ({goalArrival.weeksToGoal}&nbsp;weeks)
                          </span>
                        </>
                      )}
                    </span>
                  </div>
                </div>
              </Card>
            </section>
          )}

          {/* ─── Calories vs Target ────────────────────────────── */}
          <section>
            <h2 className="text-h3 text-text-primary mb-1">Calories vs target</h2>
            <p className="text-small text-text-tertiary mb-3">
              You hit your calorie target {chartData.filter(d => d.calories > 0 && d.calories <= (targets?.daily_calories || Infinity)).length} times in the last 30 days.
            </p>
            {chartData.length > 0 && (
              <Card className="h-48 p-2">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                    <XAxis dataKey="date" stroke="var(--color-border-strong)" fontSize={12} tickMargin={8} minTickGap={20} />
                    <YAxis stroke="var(--color-border-strong)" fontSize={12} />
                    <Tooltip 
                      cursor={{ fill: 'var(--color-surface-sunken)' }}
                      contentStyle={{ backgroundColor: 'var(--color-surface-raised)', borderColor: 'var(--color-border-subtle)', borderRadius: '8px' }}
                    />
                    {targets?.daily_calories && (
                      <ReferenceLine y={targets.daily_calories} stroke="var(--color-coral-500)" strokeDasharray="3 3" />
                    )}
                    <Bar dataKey="calories" name="Calories" fill="var(--color-forest-500)" radius={[2, 2, 0, 0]} isAnimationActive={false} />
                  </BarChart>
                </ResponsiveContainer>
              </Card>
            )}
          </section>

          {/* ─── Protein vs Target ─────────────────────────────── */}
          <section>
            <h2 className="text-h3 text-text-primary mb-1">Protein vs target</h2>
            <p className="text-small text-text-tertiary mb-3">
              You hit your protein target {chartData.filter(d => d.protein >= (targets?.daily_protein_g || 0)).length} times in the last 30 days.
            </p>
            {chartData.length > 0 && (
              <Card className="h-48 p-2">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <XAxis dataKey="date" stroke="var(--color-border-strong)" fontSize={12} tickMargin={8} minTickGap={20} />
                    <YAxis stroke="var(--color-border-strong)" fontSize={12} />
                    <Tooltip 
                      cursor={{ fill: 'var(--color-surface-sunken)' }}
                      contentStyle={{ backgroundColor: 'var(--color-surface-raised)', borderColor: 'var(--color-border-subtle)', borderRadius: '8px' }}
                    />
                    {targets?.daily_protein_g && (
                      <ReferenceLine y={targets.daily_protein_g} stroke="var(--color-coral-500)" strokeDasharray="3 3" />
                    )}
                    <Bar dataKey="protein" name="Protein (g)" fill="var(--color-forest-400)" radius={[2, 2, 0, 0]} isAnimationActive={false} />
                  </BarChart>
                </ResponsiveContainer>
              </Card>
            )}
          </section>

        </div>
      )}
    </div>
  );
}
