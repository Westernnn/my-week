// Sign-in screen: sign in, create an account, reset a forgotten password, or use the app without an account.
import { signIn, signUp, sendPasswordReset, setNewPassword, useWithoutAccount } from './cloud';

const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;
type View = 'signin' | 'signup' | 'forgot' | 'newpass';

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
      signup: ['Create an account', 'Use your email and a password (at least 6 characters).', 'Create account', 'I already have an account'],
      forgot: ['Reset your password', 'Enter your email and we\'ll send you a link to set a new password.', 'Send link', 'Back to sign in'],
      newpass: ['Set a new password', 'Choose a new password (at least 6 characters).', 'Save password', ''],
    };
    const [title, intro, btn, sw] = copy[v];
    $('aTitle').textContent = title;
    $('aIntro').textContent = intro;
    submit.textContent = btn;
    $('aSwitch').textContent = sw;
    $('aSwitch').hidden = !sw;
    $('aEmailRow').hidden = v === 'newpass';
    $('aPassRow').hidden = v === 'forgot';
    $('aForgot').hidden = v !== 'signin';
    $('aLocal').hidden = v === 'newpass';
    pass.autocomplete = v === 'signin' ? 'current-password' : 'new-password';
    (v === 'newpass' ? pass : email).focus();
  }

  $('aSwitch').onclick = () => show(view === 'signin' ? 'signup' : 'signin');
  $('aForgot').onclick = () => show('forgot');
  $('aLocal').onclick = () => {
    if (!confirm('Use the app without an account? Your schedule will only be saved on this device. You can sign in later from the Week tab.')) return;
    useWithoutAccount();
    location.reload();
  };

  $('aForm').onsubmit = async ev => {
    ev.preventDefault();
    const e = email.value.trim(), p = pass.value;
    if (view !== 'newpass' && !/^\S+@\S+\.\S+$/.test(e)) return say('Enter a valid email address.');
    if (view !== 'forgot' && p.length < 6) return say('The password must be at least 6 characters.');

    submit.disabled = true;
    say('One moment…', true);
    try {
      if (view === 'signin') {
        const err = await signIn(e, p);
        if (err) return say(err);
        location.reload();
      } else if (view === 'signup') {
        const r = await signUp(e, p);
        if (r === null) return location.reload(); // signed in straight away
        if (r === 'confirm') {
          show('signin');
          email.value = e;
          return say(`Almost done: we sent a confirmation link to ${e}. Open it, then sign in here. (Check the spam folder too.)`, true);
        }
        say(r);
      } else if (view === 'forgot') {
        const err = await sendPasswordReset(e);
        if (err) return say(err);
        show('signin');
        email.value = e;
        say(`If ${e} has an account, a link to reset the password is on its way.`, true);
      } else {
        const err = await setNewPassword(p);
        if (err) return say(err);
        history.replaceState(null, '', location.pathname);
        location.reload();
      }
    } finally {
      submit.disabled = false;
    }
  };

  show(start);
}
