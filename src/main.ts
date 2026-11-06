import './style.css';
import { load } from './store';

// The app starts empty. If a schedule is saved on this device, start the app; otherwise show the welcome screen.
if (load()) {
  void import('./app');
} else {
  document.body.classList.add('empty');
  document.getElementById('sub')!.textContent = 'No schedule on this device yet';
  void import('./welcome').then(m => m.showWelcome());
}

// Offline caching. Only works over HTTPS (or localhost), and only in the built app.
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  navigator.serviceWorker.register('./sw.js').catch(() => { /* e.g. opened as a plain file */ });
}
