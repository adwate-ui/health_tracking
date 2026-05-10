-- Schedule evening close-out push notification at 9:00 PM UTC daily
-- Users who haven't logged anything that day will receive a reminder.
select cron.schedule(
  'evening-closeout-push',
  '0 21 * * *',
  $$
  select net.http_post(
      url:='https://cjrujymnlphrzkkwqidf.supabase.co/functions/v1/send-push',
      headers:=jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
      ),
      body:='{"type":"evening_closeout"}'::jsonb
  );
  $$
);

-- Schedule missed weigh-in nudge on Wednesday at 6:00 AM UTC
-- Users who haven't logged a weekly check-in by Wednesday get a nudge.
select cron.schedule(
  'missed-weighin-push',
  '0 6 * * 3',
  $$
  select net.http_post(
      url:='https://cjrujymnlphrzkkwqidf.supabase.co/functions/v1/send-push',
      headers:=jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
      ),
      body:='{"type":"missed_weighin"}'::jsonb
  );
  $$
);
