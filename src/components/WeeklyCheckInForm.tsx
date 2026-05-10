import { useState, useRef } from 'react';
import { format, startOfWeek } from 'date-fns';
import { IconDeviceFloppy, IconCamera } from '@tabler/icons-react';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { useUpsertWeeklyCheckin, type WeeklyCheckinRow } from '@/hooks/useWeeklyCheckins';
import { Input } from '@/components/Input';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';

interface WeeklyCheckInFormProps {
  existingData?: WeeklyCheckinRow;
  targetDate?: Date;
  onSuccess?: () => void;
}

export function WeeklyCheckInForm({ existingData, targetDate = new Date(), onSuccess }: WeeklyCheckInFormProps) {
  const { user } = useAuth();
  const upsert = useUpsertWeeklyCheckin();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Week start is always Monday
  const weekStart = startOfWeek(targetDate, { weekStartsOn: 1 });
  const weekStartStr = format(weekStart, 'yyyy-MM-dd');

  const [weight, setWeight] = useState(existingData?.weight_kg?.toString() ?? '');
  const [neck, setNeck] = useState(existingData?.neck_cm?.toString() ?? '');
  const [chest, setChest] = useState(existingData?.chest_cm?.toString() ?? '');
  const [waist, setWaist] = useState(existingData?.waist_cm?.toString() ?? '');
  const [hips, setHips] = useState(existingData?.hips_cm?.toString() ?? '');
  const [bodyFat, setBodyFat] = useState(existingData?.body_fat_pct?.toString() ?? '');
  const [notes, setNotes] = useState(existingData?.notes ?? '');
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  function handlePhotoSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // Validate file type and size (max 5 MB)
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      alert('Image must be under 5\u00a0MB.');
      return;
    }

    setPhotoFile(file);
    const reader = new FileReader();
    reader.onloadend = () => {
      setPhotoPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  }

  async function uploadPhoto(): Promise<string | null> {
    if (!photoFile || !user) return null;

    const ext = photoFile.name.split('.').pop() ?? 'jpg';
    const filePath = `${user.id}/${weekStartStr}.${ext}`;

    const { error } = await supabase.storage
      .from('progress_photos')
      .upload(filePath, photoFile, { upsert: true });

    if (error) {
      console.error('Photo upload failed', error);
      throw new Error('Failed to upload photo.');
    }
    return filePath;
  }

  async function handleSave() {
    if (!user) return;
    setUploading(true);

    try {
      let photoPath: string | null = existingData?.photo_path ?? null;

      if (photoFile) {
        photoPath = await uploadPhoto();
      }

      await upsert.mutateAsync({
        user_id: user.id,
        week_start: weekStartStr,
        weight_kg: weight ? Number(weight) : null,
        neck_cm: neck ? Number(neck) : null,
        chest_cm: chest ? Number(chest) : null,
        waist_cm: waist ? Number(waist) : null,
        hips_cm: hips ? Number(hips) : null,
        body_fat_pct: bodyFat ? Number(bodyFat) : null,
        photo_path: photoPath,
        notes: notes || null,
      });
      if (onSuccess) onSuccess();
    } catch (e) {
      console.error('Failed to save check-in', e);
      alert('Failed to save check-in.');
    } finally {
      setUploading(false);
    }
  }

  const isSaving = upsert.isPending || uploading;

  return (
    <Card className="flex flex-col gap-4">
      <header>
        <h3 className="text-h3 text-text-primary">Check-in</h3>
        <p className="text-small text-text-tertiary">Week of {format(weekStart, 'MMMM d, yyyy')}</p>
      </header>

      <div className="grid grid-cols-2 gap-3">
        <Input label="Weight (kg)" type="number" inputMode="decimal" step="0.1" value={weight} onChange={e => setWeight(e.target.value)} />
        <Input label="Body Fat (%)" type="number" inputMode="decimal" step="0.1" value={bodyFat} onChange={e => setBodyFat(e.target.value)} />
        
        <Input label="Neck (cm)" type="number" inputMode="decimal" step="0.5" value={neck} onChange={e => setNeck(e.target.value)} />
        <Input label="Chest (cm)" type="number" inputMode="decimal" step="0.5" value={chest} onChange={e => setChest(e.target.value)} />
        
        <Input label="Waist (cm)" type="number" inputMode="decimal" step="0.5" value={waist} onChange={e => setWaist(e.target.value)} />
        <Input label="Hips (cm)" type="number" inputMode="decimal" step="0.5" value={hips} onChange={e => setHips(e.target.value)} />
      </div>

      {/* Progress photo */}
      <div className="flex flex-col gap-2">
        <label className="text-small text-text-secondary font-medium">Progress photo</label>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={handlePhotoSelect}
        />
        {photoPreview ? (
          <div className="relative">
            <img
              src={photoPreview}
              alt="Progress photo preview"
              className="w-full max-h-48 object-cover rounded-lg border border-border-subtle"
            />
            <button
              type="button"
              className="absolute top-2 right-2 bg-surface-raised/80 backdrop-blur-sm rounded-full p-1.5 text-text-secondary hover:text-text-primary transition-colors"
              onClick={() => {
                setPhotoFile(null);
                setPhotoPreview(null);
              }}
            >
              ✕
            </button>
          </div>
        ) : (
          <button
            type="button"
            className="flex items-center justify-center gap-2 h-24 w-full rounded-lg border-2 border-dashed border-border-subtle hover:border-border-strong text-text-tertiary hover:text-text-secondary transition-colors"
            onClick={() => fileInputRef.current?.click()}
          >
            <IconCamera size={20} />
            <span className="text-small">Add photo</span>
          </button>
        )}
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-small text-text-secondary font-medium">Notes</label>
        <textarea
          className="h-20 w-full rounded-md px-3 py-2 bg-surface-raised text-text-primary text-body border border-border-subtle hover:border-border-strong focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-40 disabled:cursor-not-allowed placeholder:text-text-tertiary resize-none"
          placeholder="How did this week feel?"
          value={notes}
          onChange={e => setNotes(e.target.value)}
        />
      </div>

      <Button variant="primary" onClick={handleSave} leadingIcon={<IconDeviceFloppy size={18} />} loading={isSaving} fullWidth>
        Save Check-in
      </Button>
    </Card>
  );
}
