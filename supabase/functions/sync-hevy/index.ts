import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

serve(async (req) => {
  // Check authorization
  const authHeader = req.headers.get("Authorization");
  if (authHeader !== `Bearer ${Deno.env.get("CRON_SECRET")}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    // Fetch all connected Hevy integrations
    const { data: integrations, error: fetchError } = await supabase
      .from("integrations")
      .select("*")
      .eq("provider", "hevy")
      .eq("status", "connected");

    if (fetchError) throw fetchError;

    let processed = 0;

    for (const integration of integrations || []) {
      try {
        // In a real app, you would decrypt the credential here using a securely stored master key
        // const apiKey = await decrypt(integration.encrypted_credentials);
        const apiKey = "mock-decrypted-key"; 

        // Call Hevy API (mocked)
        // const hevyResponse = await fetch("https://api.hevyapp.com/v1/workouts", {
        //   headers: { "api-key": apiKey }
        // });
        // const workouts = await hevyResponse.json();

        // 1. Store the raw payload in `workout_imports`
        // 2. Mark `gym_session = true` in `daily_logs` for the relevant dates

        // Update the last sync time
        await supabase
          .from("integrations")
          .update({ last_sync_at: new Date().toISOString() })
          .eq("id", integration.id);

        processed++;
      } catch (err) {
        console.error(`Error processing integration ${integration.id}:`, err);
        // Optionally update the integration status to 'error'
      }
    }

    return new Response(JSON.stringify({ success: true, processed }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Sync error:", error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
});
