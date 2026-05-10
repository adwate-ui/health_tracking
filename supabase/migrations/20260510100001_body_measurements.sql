-- Add photo_path column to weekly_checkins
-- (neck_cm, hips_cm, body_fat_pct already exist in the initial schema)
alter table public.weekly_checkins
add column if not exists photo_path text;

-- Create Storage bucket for progress photos
insert into storage.buckets (id, name, public) 
values ('progress_photos', 'progress_photos', false)
on conflict (id) do nothing;

-- Set up RLS for the bucket
-- 1. Users can upload their own photos
create policy "Users can upload their own progress photos"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'progress_photos' and 
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- 2. Users can view their own photos
create policy "Users can view their own progress photos"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'progress_photos' and 
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- 3. Users can delete their own progress photos
create policy "Users can delete their own progress photos"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'progress_photos' and 
    auth.uid()::text = (storage.foldername(name))[1]
  );
