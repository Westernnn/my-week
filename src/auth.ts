// Sign-in screen: sign in, create an account, or use the app without an account.
// There is no "forgot password" email: the app owner resets passwords in Supabase (see CLAUDE.md).
import { signIn, signUp, useWithoutAccount } from './cloud';

const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;
type View = 'signin' | 'signup';

export function showAuth(start: View = 'signin') {
  const email = $<HTMLInputElement>('aEmail'), pass = $<HTMLInputElement>('aPass');
  const msg = $('aMsg'), submit = $<HTMLButtonElement>('aSubmit');
  let view: View = start;

  const say = (text: string, ok = false) => { msg.textContent = text; msg.classList.toggle('ok', ok); };

  function show(v: View) {
    view = v;
    say('');
    const copy: Record<View, [string, string, string, string]> = {
      signin: ['Sign in', 'Sign in to keep your schedule in sync on all your devices.', 'Sign in', 'Create an account'],
      signup: ['Create an account', "Type your email and a password (at least 6 characters). You'll be signed in right away. Check your email for typos: you'll need it to sign in on other devices.", 'Create account', 'I already have an account'],
    };
    const [title, intro, btn, sw] = copy[v];
    $('aTitle').textContent = title;
    $('aIntro').textContent = intro;
    submit.textContent = btn;
    $('aSwitch').textContent = sw;
    $('aForgot').hidden = v !== 'signin';
    pass.autocomplete = v === 'signin' ? 'current-password' : 'new-password';
    email.focus();
  }

  $('aSwitch').onclick = () => show(view === 'signin' ? 'signup' : 'signin');
  $('aLocal').onclick = () => {
    if (!confirm('Use the app without an account? Your schedule will only be saved on this device. You can sign in later from the Week tab.')) return;
    useWithoutAccount();
    location.reload();
  };

  $('aForm').onsubmit = async ev => {
    ev.preventDefault();
    const e = email.value.trim(), p = pass.value;
    if (!/^\S+@\S+\.\S+$/.test(e)) return say('Enter a valid email address.');
    if (p.length < 6) return say('The password must be at least 6 characters.');

    submit.disabled = true;
    say('One moment…', true);
    try {
      if (view === 'signin') {
        const err = await signIn(e, p);
        if (err) return say(err);
        location.reload();
      } else {
        const err = await signUp(e, p);
        if (err) return say(err);
        location.reload(); // signed in straight away
      }
    } finally {
      submit.disabled = false;
    }
  };

  show(start);
}
