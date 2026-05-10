/**
 * Supabase client
 *
 * The only place in the app where createClient is called. Every other module
 * imports `supabase` from here. This makes it trivial to swap providers,
 * mock in tests, or add middleware (e.g. logging, retry).
 *
 * The anon key is public by design — it's bundled into the client and
 * embedded in the browser. RLS policies enforce that the anon key alone
 * cannot read another user's data; the user's session JWT is what unlocks
 * their own rows.
 *
 * The service_role key is NEVER imported by application code. It is set
 * only as a Supabase Edge Function secret for elevated jobs (the nightly
 * Hevy pull, the rollup aggregator).
 */

import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  throw new Error(
    'Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY. ' +
    'Copy .env.example to .env and fill in values from your Supabase project settings.',
  );
}

export const supabase = createClient<Database>(url, anonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true, // for magic-link callbacks
  },
});
