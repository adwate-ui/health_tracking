import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { NumericInput } from '@/components/NumericInput';
import { useAuth } from '@/lib/auth';
import { useUpdateProfile, useUpsertTargets } from '@/hooks/useProfile';

type Sex = 'male' | 'female' | 'other' | 'prefer_not_to_say';

interface OnboardingData {
  display_name: string;
  sex: Sex | '';
  height_cm: string;
  current_weight_kg: string;
  dob: string;
  goal_weight_kg: string;
  goal_date: string;
  daily_protein_g: string;
  daily_fibre_g: string;
  daily_water_ml: string;
  daily_steps: string;
}

const initialData: OnboardingData = {
  display_name: '',
  sex: '',
  height_cm: '',
  current_weight_kg: '',
  dob: '',
  goal_weight_kg: '',
  goal_date: '',
  daily_protein_g: '120',
  daily_fibre_g: '30',
  daily_water_ml: '2500',
  daily_steps: '10000',
};

/**
 * Mifflin-St Jeor BMR + 1.4 sedentary multiplier — minus a deficit derived
 * from the user's goal. Honest defaults; the user can edit on the targets
 * screen post-onboarding.
 */
function calculateDailyCalories(d: OnboardingData): number {
  const heightCm = Number(d.height_cm);
  const weightKg = Number(d.current_weight_kg);
  const dob = new Date(d.dob);
  const ageYears = Math.floor((Date.now() - dob.getTime()) / (1000 * 60 * 60 * 24 * 365.25));

  if (!heightCm || !weightKg || !ageYears) return 2000;

  // Mifflin-St Jeor
  let bmr: number;
  if (d.sex === 'male') {
    bmr = 10 * weightKg + 6.25 * heightCm - 5 * ageYears + 5;
  } else if (d.sex === 'female') {
    bmr = 10 * weightKg + 6.25 * heightCm - 5 * ageYears - 161;
  } else {
    // Average of male and female
    bmr = 10 * weightKg + 6.25 * heightCm - 5 * ageYears - 78;
  }

  const tdee = bmr * 1.4; // sedentary baseline; Steps target adds activity later
  const goalKg = Number(d.goal_weight_kg);

  // If losing weight, default to a 500 kcal deficit (≈0.5 kg/week).
  // If maintaining or gaining, no deficit. The user can adjust.
  const deficit = goalKg && goalKg < weightKg ? 500 : 0;
  return Math.round((tdee - deficit) / 50) * 50; // round to nearest 50
}

export function OnboardingPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const updateProfile = useUpdateProfile();
  const upsertTargets = useUpsertTargets();

  const [step, setStep] = useState(0);
  const [data, setData] = useState<OnboardingData>(initialData);
  const [submitting, setSubmitting] = useState(false);

  if (!user) return null;

  const totalSteps = 5;

  function update<K extends keyof OnboardingData>(key: K, value: OnboardingData[K]) {
    setData((prev) => ({ ...prev, [key]: value }));
  }

  const stepValid: Record<number, boolean> = {
    0: data.display_name.trim().length > 0,
    1: Boolean(data.sex && data.height_cm && data.current_weight_kg && data.dob),
    2: Boolean(data.goal_weight_kg && data.goal_date),
    3: Boolean(data.daily_protein_g && data.daily_fibre_g && data.daily_water_ml && data.daily_steps),
    4: true,
  };

  async function handleComplete() {
    if (!user || submitting) return;
    setSubmitting(true);
    try {
      const calories = calculateDailyCalories(data);
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;

      await updateProfile.mutateAsync({
        userId: user.id,
        updates: {
          display_name: data.display_name.trim(),
          sex: (data.sex || null) as Sex | null,
          height_cm: Number(data.height_cm),
          dob: data.dob,
          timezone: tz,
        },
      });

      await upsertTargets.mutateAsync({
        user_id: user.id,
        daily_calories: calories,
        daily_protein_g: Number(data.daily_protein_g),
        daily_fibre_g: Number(data.daily_fibre_g),
        daily_water_ml: Number(data.daily_water_ml),
        daily_steps: Number(data.daily_steps),
        weekly_gym_sessions: null,
        goal_weight_kg: Number(data.goal_weight_kg),
        goal_date: data.goal_date,
      });

      // Save current weight as the first weekly check-in (Monday of this week)
      const monday = new Date();
      const day = monday.getDay();
      const diff = monday.getDate() - day + (day === 0 ? -6 : 1);
      monday.setDate(diff);
      const isoMonday = monday.toISOString().slice(0, 10);

      // Insert directly via supabase (mutation hook for check-ins comes in a later iteration)
      const { supabase } = await import('@/lib/supabase');
      await supabase.from('weekly_checkins').upsert(
        {
          user_id: user.id,
          week_start: isoMonday,
          weight_kg: Number(data.current_weight_kg),
        },
        { onConflict: 'user_id,week_start' },
      );

      navigate('/', { replace: true });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-surface-canvas px-4 py-8">
      <ProgressDots step={step} total={totalSteps} />

      <div className="flex-1 flex flex-col items-center justify-center max-w-md mx-auto w-full">
        {step === 0 && <Step0 data={data} update={update} />}
        {step === 1 && <Step1 data={data} update={update} />}
        {step === 2 && <Step2 data={data} update={update} />}
        {step === 3 && <Step3 data={data} update={update} />}
        {step === 4 && <Step4 data={data} estimatedCalories={calculateDailyCalories(data)} />}
      </div>

      <div className="max-w-md mx-auto w-full flex gap-2">
        {step > 0 && (
          <Button variant="ghost" onClick={() => setStep((s) => s - 1)}>
            Back
          </Button>
        )}
        <div className="flex-1" />
        {step < totalSteps - 1 ? (
          <Button
            variant="primary"
            disabled={!stepValid[step]}
            onClick={() => setStep((s) => s + 1)}
          >
            Continue
          </Button>
        ) : (
          <Button variant="primary" loading={submitting} onClick={handleComplete}>
            Start tracking
          </Button>
        )}
      </div>
    </div>
  );
}

function ProgressDots({ step, total }: { step: number; total: number }) {
  return (
    <div className="flex justify-center gap-1.5 mb-8" role="progressbar" aria-valuenow={step + 1} aria-valuemin={1} aria-valuemax={total}>
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          className={`h-1 rounded-pill transition-all duration-base ${
            i === step ? 'w-8 bg-action-primary' : i < step ? 'w-2 bg-action-primary' : 'w-2 bg-border-subtle'
          }`}
        />
      ))}
    </div>
  );
}

interface StepProps {
  data: OnboardingData;
  update: <K extends keyof OnboardingData>(key: K, value: OnboardingData[K]) => void;
}

function Step0({ data, update }: StepProps) {
  return (
    <div className="w-full flex flex-col gap-5">
      <div>
        <p className="text-eyebrow text-text-tertiary uppercase mb-1">Step one of five</p>
        <h1 className="text-h1 text-text-primary">What should we call you?</h1>
        <p className="text-body text-text-secondary mt-2">
          Your name as it appears in the app. You can change it later.
        </p>
      </div>
      <Input
        label="Display name"
        placeholder="Adwate"
        autoFocus
        value={data.display_name}
        onChange={(e) => update('display_name', e.target.value)}
      />
    </div>
  );
}

function Step1({ data, update }: StepProps) {
  return (
    <div className="w-full flex flex-col gap-5">
      <div>
        <p className="text-eyebrow text-text-tertiary uppercase mb-1">Step two of five</p>
        <h1 className="text-h1 text-text-primary">A bit about you</h1>
        <p className="text-body text-text-secondary mt-2">
          We use these to calculate a sensible default calorie target. You can edit any time.
        </p>
      </div>

      <div className="flex flex-col gap-3">
        <label className="text-small text-text-secondary font-medium">Sex</label>
        <div className="grid grid-cols-2 gap-2">
          {(['male', 'female', 'other', 'prefer_not_to_say'] as const).map((opt) => (
            <button
              key={opt}
              type="button"
              onClick={() => update('sex', opt)}
              className={`h-9 rounded-md text-body-sm font-medium border transition-colors duration-fast ${
                data.sex === opt
                  ? 'border-border-brand bg-status-on-track-bg text-status-on-track-text'
                  : 'border-border-subtle text-text-secondary hover:border-border-strong'
              }`}
            >
              {opt === 'prefer_not_to_say' ? 'Prefer not to say' : opt[0]?.toUpperCase() + opt.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <NumericInput
        label="Height (cm)"
        placeholder="175"
        value={data.height_cm ? Number(data.height_cm) : null}
        onChange={(v) => update('height_cm', v?.toString() ?? '')}
        decimalPlaces={0}
      />
      <NumericInput
        label="Current weight (kg)"
        placeholder="80.0"
        value={data.current_weight_kg ? Number(data.current_weight_kg) : null}
        onChange={(v) => update('current_weight_kg', v?.toString() ?? '')}
        decimalPlaces={1}
      />
      <Input
        label="Date of birth"
        type="date"
        value={data.dob}
        onChange={(e) => update('dob', e.target.value)}
      />
    </div>
  );
}

function Step2({ data, update }: StepProps) {
  return (
    <div className="w-full flex flex-col gap-5">
      <div>
        <p className="text-eyebrow text-text-tertiary uppercase mb-1">Step three of five</p>
        <h1 className="text-h1 text-text-primary">Your goal</h1>
        <p className="text-body text-text-secondary mt-2">
          A target weight and a date. We&rsquo;ll work out the rest.
        </p>
      </div>
      <NumericInput
        label="Goal weight (kg)"
        placeholder="72.0"
        value={data.goal_weight_kg ? Number(data.goal_weight_kg) : null}
        onChange={(v) => update('goal_weight_kg', v?.toString() ?? '')}
        decimalPlaces={1}
      />
      <Input
        label="Target date"
        type="date"
        value={data.goal_date}
        onChange={(e) => update('goal_date', e.target.value)}
      />
    </div>
  );
}

function Step3({ data, update }: StepProps) {
  return (
    <div className="w-full flex flex-col gap-5">
      <div>
        <p className="text-eyebrow text-text-tertiary uppercase mb-1">Step four of five</p>
        <h1 className="text-h1 text-text-primary">Daily targets</h1>
        <p className="text-body text-text-secondary mt-2">
          Sensible defaults. Tune them later if you have specific guidance.
        </p>
      </div>
      <NumericInput
        label="Daily protein (g)"
        value={data.daily_protein_g ? Number(data.daily_protein_g) : null}
        onChange={(v) => update('daily_protein_g', v?.toString() ?? '')}
        decimalPlaces={0}
        helperText="Around 1.6 g per kg of bodyweight is a reasonable starting point."
      />
      <NumericInput
        label="Daily fibre (g)"
        value={data.daily_fibre_g ? Number(data.daily_fibre_g) : null}
        onChange={(v) => update('daily_fibre_g', v?.toString() ?? '')}
        decimalPlaces={0}
      />
      <NumericInput
        label="Daily water (ml)"
        value={data.daily_water_ml ? Number(data.daily_water_ml) : null}
        onChange={(v) => update('daily_water_ml', v?.toString() ?? '')}
        decimalPlaces={0}
      />
      <NumericInput
        label="Daily steps"
        value={data.daily_steps ? Number(data.daily_steps) : null}
        onChange={(v) => update('daily_steps', v?.toString() ?? '')}
        decimalPlaces={0}
      />
    </div>
  );
}

function Step4({ data, estimatedCalories }: { data: OnboardingData; estimatedCalories: number }) {
  return (
    <div className="w-full flex flex-col gap-5">
      <div>
        <p className="text-eyebrow text-text-tertiary uppercase mb-1">Step five of five</p>
        <h1 className="text-h1 text-text-primary">All set, {data.display_name}.</h1>
        <p className="text-body text-text-secondary mt-2">
          Here&rsquo;s your starting plan. Edit any of it from settings.
        </p>
      </div>

      <div className="bg-surface-raised border border-border-subtle rounded-lg p-5 flex flex-col gap-3">
        <Row label="Daily calories" value={`${estimatedCalories.toLocaleString()} kcal`} />
        <Row label="Daily protein" value={`${data.daily_protein_g} g`} />
        <Row label="Daily fibre" value={`${data.daily_fibre_g} g`} />
        <Row label="Daily water" value={`${Number(data.daily_water_ml).toLocaleString()} ml`} />
        <Row label="Daily steps" value={Number(data.daily_steps).toLocaleString()} />
        <div className="border-t border-border-subtle pt-3 mt-1">
          <Row
            label="Goal"
            value={`${data.goal_weight_kg} kg by ${new Date(data.goal_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}`}
          />
        </div>
      </div>

      <p className="text-body-sm text-text-tertiary">
        Calories are computed from your height, weight, age, and goal using the Mifflin-St Jeor equation
        with a sedentary baseline. Adjust as you learn what works for you.
      </p>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-baseline">
      <span className="text-body-sm text-text-secondary">{label}</span>
      <span className="text-body text-text-primary tabular font-medium">{value}</span>
    </div>
  );
}
