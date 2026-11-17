// Accounts and sync, using Supabase (https://supabase.com).
//
// Each account has ONE row in the "schedules" table: its whole schedule as JSON. Row Level Security in the
// database lets a signed-in person read and write only their own row. The publishable key below is meant to
// be public; it cannot get around those rules.
//
// A copy of the schedule is also kept on the device (per account), so the app opens instantly and works offline.
// Changes are saved locally first and sent to the cloud right after; if that fails (offline), they are sent later.
// When two devices disagree, the most recently changed copy wins.
import { createClient, type Session } from '@supabase/supabase-js';
import { useStorage, applyFrom, savedAt, LOCAL_KEY, snapshot, type Snapshot } from './store';

const SUPABASE_URL = 'https://dqrlmbmmzulbxmktkzpj.supabase.co';
const SUPABASE_KEY = 'sb_publishable__spGDhP-GhcjiReA_jDJLg_A_XaOxuF';

export const sb = createClient(SUPABASE_URL, SUPABASE_KEY, {
  // The app uses no email links: sign-up signs in right away, and a forgotten password is reset by the app owner
  // in Supabase. So there is nothing to read from the address bar.
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false },
});

const MODE_KEY = 'auth.mode'; // 'local' = the user chose to use the app without an account
export type Mode = 'cloud' | 'local' | 'signedOut';
let mode: Mode = 'signedOut';
let session: Session | null = null;
let userId = '';

const cacheKey = (uid: string) => `${LOCAL_KEY}:${uid}`;
const dirtyKey = () => `schedule.dirty:${userId}`;

// ---------- Sync status (shown in the Week tab) ----------
export type SyncState = 'synced' | 'saving' | 'offline' | 'error' | 'local';
let state: SyncState = 'synced';
function setState(s: SyncState) {
  state = s;
  window.dispatchEvent(new CustomEvent('sync-status', { detail: s }));
}
export const syncState = () => (mode === 'local' ? 'local' : state);
export const account = () => ({ mode, email: session?.user.email ?? '' });

// ---------- Cloud reads and writes ----------
async function pull(): Promise<{ data: unknown; updatedAt: number } | null | 'error'> {
  const { data, error } = await sb.from('schedules').select('data, updated_at').eq('user_id', userId).maybeSingle();
  if (error) return 'error';
  if (!data) return null;
  return { data: data.data, updatedAt: Date.parse(data.updated_at) || 0 };
}

let pushTimer = 0;
let pending: Snapshot | null = null;
function queuePush(s: Snapshot) {
  pending = s;
  localStorage.setItem(dirtyKey(), '1');
  setState('saving');
  clearTimeout(pushTimer);
  pushTimer = window.setTimeout(() => void flush(), 600);
}

async function flush(): Promise<void> {
  if (mode !== 'cloud') return;
  const s = pending ?? snapshot(savedAt() || Date.now());
  pending = null;
  if (!navigator.onLine) { setState('offline'); return; }
  const { error } = await sb.from('schedules').upsert({
    user_id: userId,
    data: s,
    updated_at: new Date(s.updatedAt).toISOString(),
  });
  if (mode !== 'cloud') return; // signed out while waiting
  if (error) { setState(navigator.onLine ? 'error' : 'offline'); return; }
  if (!pending) { localStorage.removeItem(dirtyKey()); setState('synced'); }
}

async function deleteRemote() {
  clearTimeout(pushTimer);
  pending = null;
  localStorage.removeItem(dirtyKey());
  await sb.from('schedules').delete().eq('user_id', userId);
}

/**
 * Bring this device and the cloud in line: unsent local changes are sent; a newer cloud copy is applied.
 * Returns true when the schedule on screen changed.
 */
export async function syncNow(): Promise<boolean> {
  if (mode !== 'cloud') return false;
  if (localStorage.getItem(dirtyKey())) { await flush(); return false; }
  const r = await pull();
  if (mode !== 'cloud') return false; // signed out while waiting: don't write this account's copy back
  if (r === 'error') { setState(navigator.onLine ? 'error' : 'offline'); return false; }
  setState('synced');
  if (!r) {
    // Nothing in the cloud yet: if this device has a schedule, upload it
    if (savedAt() > 0) queuePush(snapshot(savedAt()));
    return false;
  }
  if (r.updatedAt > savedAt()) return applyFrom(r.data, r.updatedAt) === null;
  if (r.updatedAt < savedAt()) queuePush(snapshot(savedAt()));
  return false;
}

// ---------- Start-up ----------
/**
 * Decide how the app runs: with an account (cloud), device-only (local), or showing the sign-in screen.
 * When signed in, makes sure this device has the account's schedule (from its own copy, the cloud,
 * or, the first time, by moving over a schedule that was made before accounts existed).
 */
export async function startCloud(): Promise<Mode> {
  const { data } = await sb.auth.getSession();
  session = data.session;

  if (!session) {
    mode = localStorage.getItem(MODE_KEY) === 'local' ? 'local' : 'signedOut';
    if (mode === 'local') useStorage(LOCAL_KEY);
    return mode;
  }

  mode = 'cloud';
  userId = session.user.id;
  localStorage.removeItem(MODE_KEY);
  useStorage(cacheKey(userId), { saved: queuePush, reset: deleteRemote });

  if (savedAt() === 0 && !localStorage.getItem(dirtyKey())) {
    // No copy on this device yet: fetch the account's schedule now (with a time limit, in case of a bad connection)
    const r = await Promise.race([pull(), new Promise<'error'>(res => setTimeout(() => res('error'), 8000))]);
    if (r === 'error') {
      firstLoadFailed = true; // don't show an empty app (and risk overwriting the account) while offline
    } else if (r) {
      applyFrom(r.data, r.updatedAt);
    } else if (localStorage.getItem(LOCAL_KEY)) {
      // First sign-in on a device that already had a schedule (made before accounts existed): move it into the account
      try {
        if (applyFrom(JSON.parse(localStorage.getItem(LOCAL_KEY)!), Date.now()) === null) {
          localStorage.removeItem(LOCAL_KEY);
          queuePush(snapshot(savedAt()));
        }
      } catch { /* unreadable old data: ignore */ }
    }
  } else {
    void syncAndAnnounce();
  }

  // Keep going: send unsent changes when back online, and pick up changes from other devices when the app is reopened
  window.addEventListener('online', () => void syncAndAnnounce());
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') void syncAndAnnounce(); });
  return mode;
}

/** Send unsent changes now (e.g. before the page reloads). */
export async function flushNow() {
  if (mode !== 'cloud') return;
  clearTimeout(pushTimer);
  if (localStorage.getItem(dirtyKey())) await flush();
}

/** True when signed in but this device has no copy yet and the account couldn't be reached. */
export let firstLoadFailed = false;

async function syncAndAnnounce() {
  if (await syncNow()) window.dispatchEvent(new Event('schedule-changed'));
}

// ---------- Sign in / out ----------

export async function signIn(email: string, password: string): Promise<string | null> {
  const { error } = await sb.auth.signInWithPassword({ email, password });
  return error ? friendly(error.message) : null;
}

/**
 * Create an account and sign in straight away. Returns null on success, or an error message.
 * Needs "Confirm email" turned OFF in Supabase (Authentication → Sign In / Providers → Email);
 * otherwise Supabase creates the account without signing in and wants an email link, which this app doesn't use.
 */
export async function signUp(email: string, password: string): Promise<string | null> {
  const { data, error } = await sb.auth.signUp({ email, password });
  if (error) return friendly(error.message);
  if (!data.session) return `The account was created, but the app's settings still ask for an email confirmation, so you can't sign in yet. Ask the app owner to turn off "Confirm email" in Supabase.`;
  return null;
}

/** Change the password of the signed-in account. Returns null on success, or an error message. */
export async function changePassword(password: string): Promise<string | null> {
  const { error } = await sb.auth.updateUser({ password });
  return error ? friendly(error.message) : null;
}

/**
 * True when the app owner has switched off new sign-ups in Supabase. Read from Supabase's public settings,
 * so the sign-up form comes back by itself if sign-ups are switched on again.
 */
export async function signupsClosed(): Promise<boolean> {
  try {
    const r = await fetch(`${SUPABASE_URL}/auth/v1/settings`, { headers: { apikey: SUPABASE_KEY } });
    return r.ok && (await r.json() as { disable_signup?: boolean }).disable_signup === true;
  } catch { return false; } // offline: show the form; Supabase still refuses if sign-ups are closed
}

export function useWithoutAccount() { localStorage.setItem(MODE_KEY, 'local'); }

/** Sign out and remove this account's copy from the device (it stays in the cloud). */
export async function signOut() {
  const wasCloud = mode === 'cloud';
  if (wasCloud) {
    clearTimeout(pushTimer);
    if (localStorage.getItem(dirtyKey())) await flush(); // don't lose unsent changes
  }
  // From here on, a sync that is still running stops before it can save this account's copy again
  mode = 'signedOut';
  const forget = () => {
    if (!wasCloud) return;
    localStorage.removeItem(cacheKey(userId));
    localStorage.removeItem(dirtyKey());
  };
  forget();
  localStorage.removeItem(MODE_KEY);
  await sb.auth.signOut();
  forget(); // once more, in case something wrote it back during the sign-out request
}

function friendly(msg: string): string {
  if (/invalid login credentials/i.test(msg)) return 'Wrong email or password.';
  if (/email not confirmed/i.test(msg)) return 'This account was never confirmed. Ask the app owner to turn off "Confirm email" in Supabase.';
  if (/signups? (are )?not allowed|signup.*disabled/i.test(msg)) return 'New accounts are closed. Ask the app owner if you need one.';
  if (/already registered|already exists/i.test(msg)) return 'An account with this email already exists. Sign in instead.';
  if (/password should be at least/i.test(msg)) return 'The password must be at least 6 characters.';
  if (/should be different from the old/i.test(msg)) return 'The new password is the same as the old one.';
  if (/rate limit|too many/i.test(msg)) return 'Too many attempts. Please wait a few minutes and try again.';
  if (/failed to fetch|network/i.test(msg)) return 'No connection. Check your internet and try again.';
  return msg;
}
