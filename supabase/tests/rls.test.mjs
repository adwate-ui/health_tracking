/**
 * RLS test suite
 *
 * Critical safety net for the multi-tenancy contract. Runs in CI on every
 * commit. The malicious-user simulation MUST fail at the database — if any
 * query returns another user's row, the build breaks.
 *
 * Setup expected via env vars:
 *   SUPABASE_URL=https://<project>.supabase.co
 *   SUPABASE_ANON_KEY=eyJ...
 *   SUPABASE_SERVICE_KEY=eyJ...   (used only for test setup/cleanup; never imported in app code)
 *
 * Two test users are created via the service role, then each authenticates
 * with their own session and we verify the isolation guarantees.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createClient } from '@supabase/supabase-js';

const url = process.env.SUPABASE_URL;
const anonKey = process.env.SUPABASE_ANON_KEY;
const serviceKey = process.env.SUPABASE_SERVICE_KEY;

if (!url || !anonKey || !serviceKey) {
  console.error('Skipping RLS tests: SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_KEY required.');
  process.exit(0);
}

const admin = createClient(url, serviceKey, { auth: { persistSession: false } });

async function makeUser(email) {
  const { data, error } = await admin.auth.admin.createUser({
    email,
    email_confirm: true,
    password: 'test-password-' + Math.random().toString(36).slice(2),
  });
  if (error) throw error;
  return data.user;
}

async function clientFor(email, password) {
  const c = createClient(url, anonKey, { auth: { persistSession: false } });
  const { data, error } = await c.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return { client: c, session: data.session };
}

test('RLS isolation between users', async (t) => {
  const aliceEmail = `alice-${Date.now()}@test.totalmacro.local`;
  const bobEmail = `bob-${Date.now()}@test.totalmacro.local`;
  const password = 'rls-test-password-x';

  // Setup: create users via admin, set known passwords
  const alice = await makeUser(aliceEmail);
  const bob = await makeUser(bobEmail);

  await admin.auth.admin.updateUserById(alice.id, { password });
  await admin.auth.admin.updateUserById(bob.id, { password });

  const { client: aliceClient } = await clientFor(aliceEmail, password);
  const { client: bobClient } = await clientFor(bobEmail, password);

  t.after(async () => {
    await admin.auth.admin.deleteUser(alice.id);
    await admin.auth.admin.deleteUser(bob.id);
  });

  await t.test('alice can write her own daily_log', async () => {
    const { error } = await aliceClient.from('daily_logs').insert({
      user_id: alice.id,
      log_date: '2026-05-10',
      calories: 1800,
      protein_g: 120,
    });
    assert.equal(error, null, 'alice should be able to insert her own row');
  });

  await t.test('bob can write his own daily_log', async () => {
    const { error } = await bobClient.from('daily_logs').insert({
      user_id: bob.id,
      log_date: '2026-05-10',
      calories: 2200,
      protein_g: 100,
    });
    assert.equal(error, null);
  });

  await t.test('alice CANNOT read bob\'s daily_log', async () => {
    const { data } = await aliceClient
      .from('daily_logs')
      .select('*')
      .eq('user_id', bob.id);
    assert.equal(data?.length ?? 0, 0, 'alice must see zero rows when querying bob\'s user_id');
  });

  await t.test('alice sees only her own logs when querying without filter', async () => {
    const { data, error } = await aliceClient.from('daily_logs').select('*');
    assert.equal(error, null);
    assert.ok(data && data.length > 0, 'alice should see at least one row');
    for (const row of data) {
      assert.equal(row.user_id, alice.id, `RLS leak: alice saw row owned by ${row.user_id}`);
    }
  });

  await t.test('alice CANNOT insert a row spoofing bob\'s user_id', async () => {
    const { error } = await aliceClient.from('daily_logs').insert({
      user_id: bob.id, // attempting to write as bob
      log_date: '2026-05-11',
      calories: 9999,
    });
    assert.notEqual(error, null, 'RLS must reject writes that spoof another user_id');
  });

  await t.test('alice CANNOT update bob\'s row', async () => {
    const { data, error } = await aliceClient
      .from('daily_logs')
      .update({ calories: 1 })
      .eq('user_id', bob.id)
      .select();
    // Either error or zero rows affected — both are acceptable
    assert.ok(error !== null || (data?.length ?? 0) === 0, 'alice must not be able to update bob\'s row');

    // Verify bob's row is untouched
    const { data: bobData } = await bobClient
      .from('daily_logs')
      .select('calories')
      .eq('user_id', bob.id)
      .single();
    assert.equal(bobData?.calories, 2200, 'bob\'s data must be untouched');
  });

  await t.test('alice CANNOT delete bob\'s row', async () => {
    await aliceClient.from('daily_logs').delete().eq('user_id', bob.id);
    const { data: bobData } = await bobClient
      .from('daily_logs')
      .select('id')
      .eq('user_id', bob.id);
    assert.ok(bobData && bobData.length > 0, 'bob\'s row must still exist');
  });

  await t.test('profile RLS holds: alice cannot read bob\'s profile', async () => {
    const { data } = await aliceClient
      .from('profiles')
      .select('*')
      .eq('id', bob.id);
    assert.equal(data?.length ?? 0, 0);
  });
});
