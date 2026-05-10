-- Enable the pg_net extension if not already enabled (required for making HTTP requests from pg_cron)
create extension if not exists pg_net;

-- Enable the pg_cron extension
create extension if not exists pg_cron;

-- Schedule the sync-hevy edge function to run every night at 2:00 AM UTC
-- Note: Replace with actual Supabase project URL and Cron Secret in production
select cron.schedule(
  'nightly-hevy-sync',
  '0 2 * * *',
  $$
  select net.http_post(
      url:='https://cjrujymnlphrzkkwqidf.supabase.co/functions/v1/sync-hevy',
      headers:=jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.settings.cron_secret', true)
      ),
      body:='{}'::jsonb
  );
  $$
);
