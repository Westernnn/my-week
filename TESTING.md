# Testing accounts and sync before a release

Run this before pushing changes to accounts or sync. Nothing here touches the live site:
the app runs from the PC, and the phone opens it over Wi-Fi.

```
              ┌──────────── same Supabase project (accounts + schedules) ────────────┐
              │                                                                      │
   Live site: westernnn.github.io/my-week      Test copy: your PC, port 5180
   (real accounts, untouched)                   opened at localhost:5180 (PC)
                                                and 192.168.1.2:5180 (iPhone)
```

A different address means separate browser storage, so the test copy never mixes with the live app on the
same phone. Both talk to the same Supabase project, so **use test accounts**, not your real one.

**Test emails:** Gmail ignores anything after a `+`, so `yourname+test1@gmail.com` and
`yourname+test2@gmail.com` are two different accounts for Supabase but land in your own inbox.
No emails are sent anyway.

Write down what you see at each ✅. If something is different, stop and report it.

**Testing on the PC only:** use two browser windows as the two "devices":
- **Window A** (the "PC"): a normal window at `http://localhost:5180`.
- **Window B** (the "iPhone"): a private window (Chrome: Ctrl+Shift+N, Edge: Ctrl+Shift+N) at the same address.
  A private window has its own storage, so it behaves like a separate device.
- Skip setup steps 2 and 4. For Airplane mode, turn the PC's Wi-Fi off and on instead.
- Wherever a step says "switch to another app and back", switch to another tab and back.

## 0. Setup (each step needs the one before)
1. On the PC, build the test copy and start it: `npm run build`, then `npx vite preview --host --port 5180`.
2. Allow port 5180 through the Windows firewall (admin PowerShell, only once):
   `New-NetFirewallRule -DisplayName "My week 5180" -Direction Inbound -Protocol TCP -LocalPort 5180 -Action Allow -Profile Private`
3. On the PC, open `http://localhost:5180`. ✅ The sign-in screen.
4. On the iPhone (same Wi-Fi), open `http://192.168.1.2:5180` in Safari. ✅ The sign-in screen.

## 1. First sign-in moves a device-only schedule into the account (PC)
1. On the PC, tap **Use without an account** → OK.
2. On the welcome screen tap **Use the template**, then **Add my schedule**.
3. In **Week**, edit any block so the schedule is recognisably yours (for example rename Monday's first block to "TEST A").
4. In the account box tap **Sign in to sync** → **Create an account** → `yourname+test1@gmail.com` and a password.
5. ✅ You are signed in right away (no "check your email"), the "TEST A" block is still there, and the account box
   says "Signed in as …" and "✓ Synced with your account".
6. In Supabase: **Table Editor → schedules**. ✅ One row. (You can't read whose it is at a glance; that's fine.)

## 2. A second device gets the same schedule (iPhone)
1. On the iPhone, sign in with `yourname+test1@gmail.com`.
2. ✅ The "TEST A" schedule appears, and the account box says "✓ Synced".

## 3. Changes travel between devices
1. On the iPhone, rename a block to "FROM PHONE".
2. On the PC, switch to another browser tab and back (that is when the app checks for news).
3. ✅ "FROM PHONE" appears on the PC within a few seconds.
4. Do it the other way round: change something on the PC, then switch the iPhone to another app and back. ✅ It appears.

## 4. Offline changes are sent later (iPhone)
1. With the app open on the iPhone, turn on **Airplane mode**.
2. Rename a block to "OFFLINE".
3. ✅ The account box says "Offline: changes are saved on this device…".
4. Turn Airplane mode off and wait a few seconds.
5. ✅ It says "✓ Synced", and the PC shows "OFFLINE" after switching tabs.

(Opening the app while offline is not tested here: that needs HTTPS, which the test copy over Wi-Fi doesn't have.)

## 5. Change password (iPhone)
1. **Week → Change password**. Type two different passwords. ✅ "The two passwords are different".
2. Type the same new password twice → **Save**. ✅ "Password changed…" under the account.
3. **Sign out**, then sign in with the **old** password. ✅ "Wrong email or password."
4. Sign in with the **new** password. ✅ Signed in, schedule still there.

## 6. Owner resets a forgotten password (Supabase + iPhone)
1. In Supabase: **SQL Editor → New query**, paste this, put in a temporary password, and click **Run**:
   ```sql
   update auth.users
   set encrypted_password = extensions.crypt('TEMPORARY-PASSWORD', extensions.gen_salt('bf'))
   where email = 'yourname+test1@gmail.com';
   ```
   ✅ "Success". (Always keep the `where` line: without it, every account's password changes.)
   "Success" only means the command ran: if no account has exactly that email, nothing changes.
   Copy the email from **Authentication → Users**.
2. On the iPhone, sign out and sign in with the temporary password. ✅ Signed in, schedule still there.

## 7. Sign out removes the copy from the device (PC)
1. On the PC, **Sign out** → OK. ✅ Back to the sign-in screen.
2. Sign in again. ✅ The schedule comes back from the account.

## 8. Accounts are kept apart (iPhone)
1. On the iPhone, sign out and **Create an account** with `yourname+test2@gmail.com`.
2. ✅ The empty welcome screen: account 2 cannot see account 1's schedule.

## 9. Clean up
1. In Supabase: **Authentication → Users**, delete both test users. Their rows in `schedules` are deleted with them.
2. Stop the test copy on the PC (Ctrl+C in its terminal). Optionally remove the firewall rule:
   `Remove-NetFirewallRule -DisplayName "My week 5180"` (admin PowerShell).
