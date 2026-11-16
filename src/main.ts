import './style.css';
import { load } from './store';
import { startCloud, recoveringPassword, firstLoadFailed, account, signOut } from './cloud';

const $ = (id: string) => document.getElementById(id) as HTMLElement;

async function boot() {
  const mode = await startCloud();

  // Not signed in (and not using the app without an account), or back from a "reset password" link
  if (mode === 'signedOut' || (mode === 'cloud' && recoveringPassword)) {
    document.body.classList.add('signin');
    $('sub').textContent = 'Sign in to continue';
    const m = await import('./auth');
    m.showAuth(mode === 'cloud' ? 'newpass' : 'signin');
    return;
  }

  // Signed in on a new device, but the account couldn't be reached
  if (firstLoadFailed) {
    document.body.classList.add('empty');
    $('sub').textContent = 'Could not reach your account';
    $('welcome').innerHTML = `<div class="card"><h2>No connection</h2>
      <p class="k">Your schedule is saved in your account, but this device couldn't reach it. Check your internet and try again.</p>
      <div class="row"><button class="primary" onclick="location.reload()">Try again</button></div></div>`;
    return;
  }

  // If a schedule is saved (on this device or in the account), start the app; otherwise show the welcome screen
  if (load()) {
    void import('./app');
  } else {
    document.body.classList.add('empty');
    $('sub').textContent = 'No schedule yet';
    const acct = account();
    if (acct.mode === 'cloud') {
      $('wAccount').textContent = `Signed in as ${acct.email} `;
      const b = document.createElement('button');
      b.className = 'link';
      b.textContent = 'Sign out';
      b.onclick = async () => { await signOut(); location.reload(); };
      $('wAccount').appendChild(b);
    }
    void import('./welcome').then(m => m.showWelcome());
    // A schedule added on another device shows up here when it arrives
    window.addEventListener('schedule-changed', () => location.reload());
  }
}
void boot();

// Offline caching. Only works over HTTPS (or localhost), and only in the built app.
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  navigator.serviceWorker.register('./sw.js').catch(() => { /* e.g. opened as a plain file */ });
}
