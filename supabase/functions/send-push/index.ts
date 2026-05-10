import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.47.10'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY') ?? ''
const vapidPublicKey = Deno.env.get('VAPID_PUBLIC_KEY') ?? ''
const vapidSubject = Deno.env.get('VAPID_SUBJECT') ?? 'mailto:admin@totalmacro.app'

// ─── JWT helpers for Web Push (VAPID) ─────────────────────────────
// Minimal VAPID implementation using Web Crypto API
// Based on RFC 8292 — Voluntary Application Server Identification

function base64UrlEncode(data: Uint8Array): string {
  return btoa(String.fromCharCode(...data))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
}

function base64UrlDecode(str: string): Uint8Array {
  const padded = str + '='.repeat((4 - str.length % 4) % 4)
  const binary = atob(padded.replace(/-/g, '+').replace(/_/g, '/'))
  return new Uint8Array(binary.length).map((_, i) => binary.charCodeAt(i))
}

async function importVapidKey(base64Key: string): Promise<CryptoKey> {
  const rawKey = base64UrlDecode(base64Key)
  return crypto.subtle.importKey(
    'pkcs8',
    rawKey,
    { name: 'ECDSA', namedCurve: 'P-256' },
    false,
    ['sign']
  )
}

async function createVapidJwt(audience: string): Promise<string> {
  const header = base64UrlEncode(new TextEncoder().encode(JSON.stringify({ typ: 'JWT', alg: 'ES256' })))
  const now = Math.floor(Date.now() / 1000)
  const payload = base64UrlEncode(new TextEncoder().encode(JSON.stringify({
    aud: audience,
    exp: now + 3600,
    sub: vapidSubject,
  })))

  const signingInput = `${header}.${payload}`
  const key = await importVapidKey(vapidPrivateKey)
  const signature = await crypto.subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' },
    key,
    new TextEncoder().encode(signingInput),
  )

  // Convert DER signature to raw r||s (64 bytes)
  const derSig = new Uint8Array(signature)
  let r: Uint8Array, s: Uint8Array
  // DER format: 0x30 [total-len] 0x02 [r-len] [r] 0x02 [s-len] [s]
  const rLen = derSig[3]!
  const rStart = 4
  r = derSig.slice(rStart, rStart + rLen)
  const sLen = derSig[rStart + rLen + 1]!
  s = derSig.slice(rStart + rLen + 2, rStart + rLen + 2 + sLen)
  // Pad/trim to 32 bytes each
  if (r.length > 32) r = r.slice(r.length - 32)
  if (s.length > 32) s = s.slice(s.length - 32)
  const raw = new Uint8Array(64)
  raw.set(r, 32 - r.length)
  raw.set(s, 64 - s.length)

  return `${signingInput}.${base64UrlEncode(raw)}`
}

// ─── Send a single push notification ──────────────────────────────
async function sendPush(subscription: { endpoint: string; p256dh: string; auth: string }, payload: string) {
  const url = new URL(subscription.endpoint)
  const audience = `${url.protocol}//${url.host}`
  const jwt = await createVapidJwt(audience)

  const response = await fetch(subscription.endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/octet-stream',
      'TTL': '86400',
      'Authorization': `vapid t=${jwt}, k=${vapidPublicKey}`,
    },
    body: new TextEncoder().encode(payload),
  })

  return response
}

// ─── Main handler ─────────────────────────────────────────────────
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  try {
    const { type } = await req.json() as { type: 'evening_closeout' | 'missed_weighin' | 'direct'; userId?: string; title?: string; body?: string }

    let usersToNotify: string[] = []
    let title = ''
    let body = ''

    if (type === 'evening_closeout') {
      // Find users who haven't logged today
      const today = new Date().toISOString().split('T')[0]!
      const { data: allProfiles } = await supabase.from('profiles').select('id')
      const { data: todayLogs } = await supabase.from('daily_logs').select('user_id').eq('log_date', today)

      const loggedUserIds = new Set((todayLogs ?? []).map(l => l.user_id))
      usersToNotify = (allProfiles ?? [])
        .map(p => p.id)
        .filter(id => !loggedUserIds.has(id))

      title = 'Log your day'
      body = 'You haven\u2019t logged anything today. Take a moment to record your intake.'

    } else if (type === 'missed_weighin') {
      // Find users who haven't checked in for the current week (Monday)
      const now = new Date()
      const dayOfWeek = now.getDay()
      // Only meaningful on Mondays (day 1) or later in the week
      if (dayOfWeek >= 1) {
        const monday = new Date(now)
        monday.setDate(now.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1))
        const weekStart = monday.toISOString().split('T')[0]!

        const { data: allProfiles } = await supabase.from('profiles').select('id')
        const { data: thisWeekCheckins } = await supabase.from('weekly_checkins').select('user_id').eq('week_start', weekStart)

        const checkedInIds = new Set((thisWeekCheckins ?? []).map(c => c.user_id))
        usersToNotify = (allProfiles ?? [])
          .map(p => p.id)
          .filter(id => !checkedInIds.has(id))

        title = 'Weekly check-in'
        body = 'You haven\u2019t logged your weight this week. A quick check-in keeps your trend line accurate.'
      }

    } else {
      return new Response(
        JSON.stringify({ error: 'Unknown notification type' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    // Fetch subscriptions for the target users and send
    let sent = 0
    let failed = 0

    for (const userId of usersToNotify) {
      const { data: subscriptions } = await supabase
        .from('push_subscriptions')
        .select('*')
        .eq('user_id', userId)

      for (const sub of subscriptions ?? []) {
        try {
          const payload = JSON.stringify({ title, body, url: '/' })
          const res = await sendPush({ endpoint: sub.endpoint, p256dh: sub.p256dh, auth: sub.auth }, payload)

          if (res.status === 410 || res.status === 404) {
            // Subscription expired — clean up
            await supabase.from('push_subscriptions').delete().eq('id', sub.id)
            failed++
          } else if (res.ok) {
            // Update last_used_at
            await supabase.from('push_subscriptions').update({ last_used_at: new Date().toISOString() }).eq('id', sub.id)
            sent++
          } else {
            console.error(`Push failed for ${sub.id}: ${res.status} ${await res.text()}`)
            failed++
          }
        } catch (err) {
          console.error(`Push error for ${sub.id}:`, err)
          failed++
        }
      }
    }

    return new Response(
      JSON.stringify({ success: true, sent, failed, targeted: usersToNotify.length }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    )
  }
})
