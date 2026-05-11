import { useState } from 'react';
import { format, isMonday } from 'date-fns';
import { LineChart, Line, ResponsiveContainer, YAxis } from 'recharts';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { useWeeklyCheckins } from '@/hooks/useWeeklyCheckins';
import { WeeklyCheckInForm } from '@/components/WeeklyCheckInForm';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { IconPlus, IconPhoto } from '@tabler/icons-react';



function getSignedPhotoUrl(path: string): Promise<string | null> {
  return supabase.storage
    .from('progress_photos')
    .createSignedUrl(path, 3600)
    .then(({ data }) => data?.signedUrl ?? null);
}

function MeasurementPill({ label, value, unit }: { label: string; value: number | null; unit: string }) {
  if (value == null) return null;
  return (
    <span className="inline-flex items-baseline gap-1 bg-surface-sunken rounded-md px-2 py-0.5 text-small">
      <span className="text-text-tertiary">{label}</span>
      <span className="text-text-primary tabular-nums font-medium">{value}{unit}</span>
    </span>
  );
}

function PhotoThumbnail({ path, weekLabel }: { path: string; weekLabel: string }) {
  const [url, setUrl] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);

  // Load signed URL on mount
  useState(() => {
    getSignedPhotoUrl(path).then(setUrl);
  });

  if (!url) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => setExpanded(true)}
        className="relative aspect-square rounded-lg overflow-hidden border border-border-subtle hover:border-border-strong transition-colors focus:outline-none focus-visible:ring-2"
      >
        <img src={url} alt={`Progress photo — ${weekLabel}`} className="w-full h-full object-cover" />
      </button>

      {expanded && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
          onClick={() => setExpanded(false)}
        >
          <img
            src={url}
            alt={`Progress photo — ${weekLabel}`}
            className="max-w-full max-h-full rounded-lg"
          />
        </div>
      )}
    </>
  );
}

export function BodyPage() {
  const { user } = useAuth();
  const today = new Date();
  const isTodayMonday = isMonday(today);
  const { data: checkins, isLoading } = useWeeklyCheckins(user?.id, 12);
  const [showForm, setShowForm] = useState(isTodayMonday);

  if (!user) return null;

  // Prepare sparkline data (reverse to chronological order for Recharts)
  const sparklineData = (checkins || [])
    .slice()
    .reverse()
    .filter(c => c.weight_kg != null)
    .map(c => ({
      week: c.week_start,
      weight: c.weight_kg,
    }));

  // Collect checkins that have photos
  const photosCheckins = (checkins || []).filter(c => c.photo_path != null);

  return (
    <div className="px-4 py-6 max-w-2xl mx-auto pb-28 sm:pt-20">
      <header className="mb-6 flex justify-between items-end">
        <div>
          <p className="text-eyebrow text-text-tertiary uppercase mb-1">Body & Measurements</p>
          <h1 className="text-h1 text-text-primary">Weekly Check-in</h1>
        </div>
        {!showForm && (
          <Button variant="secondary" leadingIcon={<IconPlus size={16} />} onClick={() => setShowForm(true)}>
            Log check-in
          </Button>
        )}
      </header>

      {showForm && (
        <div className="mb-8">
          <WeeklyCheckInForm targetDate={today} onSuccess={() => setShowForm(false)} />
        </div>
      )}

      <h2 className="text-h3 text-text-primary mb-4">Past 12 weeks</h2>

      {sparklineData.length > 1 && (
        <Card className="mb-6 h-32 p-0 overflow-hidden relative">
          <div className="absolute top-2 left-3 z-10">
            <span className="text-eyebrow text-text-tertiary uppercase">Weight trend</span>
          </div>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={sparklineData} margin={{ top: 30, right: 10, left: 10, bottom: 10 }}>
              <YAxis domain={['auto', 'auto']} hide />
              <Line 
                type="monotone" 
                dataKey="weight" 
                stroke="var(--color-forest-500)" 
                strokeWidth={2} 
                dot={false}
                isAnimationActive={false} 
              />
            </LineChart>
          </ResponsiveContainer>
        </Card>
      )}

      {/* Progress photo gallery */}
      {photosCheckins.length > 0 && (
        <section className="mb-6">
          <h3 className="text-h3 text-text-primary mb-3 flex items-center gap-2">
            <IconPhoto size={20} className="text-text-tertiary" />
            Progress photos
          </h3>
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
            {photosCheckins.map(c => (
              <PhotoThumbnail
                key={c.id}
                path={c.photo_path!}
                weekLabel={format(new Date(c.week_start), 'MMM d')}
              />
            ))}
          </div>
        </section>
      )}

      <div className="flex flex-col gap-3">
        {isLoading ? (
          <p className="text-text-tertiary">Loading...</p>
        ) : checkins?.length === 0 ? (
          <p className="text-text-tertiary">No check-ins yet.</p>
        ) : (
          checkins?.map(c => (
            <Card key={c.id} className="flex flex-col gap-2">
              <div className="flex justify-between items-baseline">
                <span className="text-body font-medium text-text-primary">
                  Week of {format(new Date(c.week_start), 'MMMM d')}
                </span>
                <span className="text-body font-medium tabular-nums text-text-primary">
                  {c.weight_kg ? `${c.weight_kg}\u00a0kg` : '--'}
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                <MeasurementPill label="BF" value={c.body_fat_pct} unit="%" />
                <MeasurementPill label="Neck" value={c.neck_cm} unit="cm" />
                <MeasurementPill label="Chest" value={c.chest_cm} unit="cm" />
                <MeasurementPill label="Waist" value={c.waist_cm} unit="cm" />
                <MeasurementPill label="Hips" value={c.hips_cm} unit="cm" />
              </div>
              {c.notes && <p className="text-small text-text-tertiary mt-1 italic">"{c.notes}"</p>}
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
