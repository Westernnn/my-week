// Start screen shown while no schedule is saved on this device: explains the format and takes the text.
import { importJson } from './store';
import { AI_PROMPT, TEMPLATE } from './format';

const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;

export function showWelcome() {
  const text = $<HTMLTextAreaElement>('wText');
  const err = $('wErr');
  const msg = $('copyMsg');
  $('fmtText').textContent = AI_PROMPT;

  $('copyPrompt').onclick = async () => {
    try {
      await navigator.clipboard.writeText(AI_PROMPT);
      msg.textContent = 'Copied. Paste it into an AI assistant, add your week at the bottom, then paste its answer below.';
    } catch {
      // Clipboard can be blocked (e.g. not on HTTPS): show the prompt so it can be selected by hand.
      (document.querySelector('details.fmt') as HTMLDetailsElement).open = true;
      msg.textContent = 'Could not copy automatically. The prompt is shown under "Format details": select it and copy.';
    }
  };

  $('useTemplate').onclick = () => {
    if (text.value.trim() && !confirm('Replace the text in the box with the template?')) return;
    text.value = TEMPLATE;
    msg.textContent = 'Template added below. Change the places and the blocks, then tap Add my schedule.';
    text.focus();
  };

  const add = (value: string) => {
    if (!value.trim()) { err.textContent = 'Paste your schedule text first.'; return; }
    const e = importJson(value);
    if (e) { err.textContent = e; return; }
    location.reload(); // the schedule is saved; start the app
  };
  $('wAdd').onclick = () => add(text.value);

  $('wFile').onclick = () => $('wFileInput').click();
  $<HTMLInputElement>('wFileInput').onchange = async ev => {
    const input = ev.target as HTMLInputElement;
    const f = input.files?.[0];
    input.value = '';
    if (!f) return;
    const value = await f.text();
    text.value = value;
    add(value);
  };
}
