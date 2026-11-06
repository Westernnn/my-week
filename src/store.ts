// Your own schedule and places are saved in the browser (localStorage) and never leave the device.
// The sample data in schedule.ts stays untouched, so it is always available through Reset.
import { days, places, categories, type Block, type DayKey, type Place, type PlaceKey } from './schedule';

type Days = Record<DayKey, Block[]>;
type Places = Record<PlaceKey, Place>;

export const DK = Object.keys(days) as DayKey[];
const PK = Object.keys(places) as PlaceKey[];
const KEY = 'schedule.v2';
const OLD_KEY = 'schedule.days.v1'; // earlier versions saved only the days
const defaults = { days: structuredClone(days) as Days, places: structuredClone(places) as Places };
const m = (t: string) => { const [a, b] = t.split(':'); return +a * 60 + +b; };
const TIME = /^\d{2}:\d{2}$/;

/** Returns an error message, or null when the day is valid (contiguous, known categories and places). */
function checkDay(bl: Block[]): string | null {
  if (!bl.length) return 'A day needs at least one block.';
  for (let i = 0; i < bl.length; i++) {
    const [s, e, c, label, loc] = bl[i];
    if (![s, e].every(t => typeof t === 'string' && TIME.test(t))) return 'Times must look like 09:30.';
    if (m(e) <= m(s)) return 'End must be after start.';
    if (!(c in categories)) return `Unknown type "${c}".`;
    if (typeof label !== 'string' || !label.trim()) return 'Every block needs a name.';
    if (c === 't') {
      const [a, b] = String(loc).split('-');
      if (!(PK as string[]).includes(a) || !(PK as string[]).includes(b) || a === b) return 'A drive needs two different places.';
    } else if (!(PK as string[]).includes(loc)) return `Unknown place "${loc}".`;
    if (i > 0 && bl[i - 1][1] !== s) {
      return `That would leave a gap in the day (${bl[0][0]}–${bl[bl.length - 1][1]}). Pick a time that overlaps or touches it.`;
    }
  }
  return null;
}

function validateDays(x: unknown): Days | string {
  if (!x || typeof x !== 'object') return 'Not a schedule file.';
  const out = {} as Days;
  for (const d of DK) {
    const arr = (x as Record<string, unknown>)[d];
    if (!Array.isArray(arr)) return `Missing day ${d}.`;
    for (const b of arr) if (!Array.isArray(b) || b.length !== 5) return `Bad block on ${d}.`;
    const err = checkDay(arr as Block[]);
    if (err) return `${d}: ${err}`;
    out[d] = (arr as Block[]).map(b => [...b] as Block);
  }
  return out;
}

function validatePlaces(x: unknown): Places | string {
  if (!x || typeof x !== 'object') return 'Missing places.';
  const out = {} as Places;
  for (const k of PK) {
    const p = (x as Record<string, Partial<Place> | undefined>)[k];
    if (!p || typeof p.name !== 'string' || !p.name.trim() || p.name.length > 60) return `Place ${k} needs a name.`;
    if (typeof p.address !== 'string' || p.address.length > 120) return `Place ${k} has a bad address.`;
    if (!Number.isFinite(p.lat) || Math.abs(p.lat as number) > 90 || !Number.isFinite(p.lng) || Math.abs(p.lng as number) > 180) {
      return `Place ${k} has bad coordinates.`;
    }
    out[k] = { name: p.name.trim(), address: p.address, lat: p.lat as number, lng: p.lng as number };
  }
  return out;
}

function apply(d: Days, p: Places) {
  for (const k of DK) days[k].splice(0, days[k].length, ...d[k].map(b => [...b] as Block));
  for (const k of PK) Object.assign(places[k], p[k]);
}

const save = () => localStorage.setItem(KEY, JSON.stringify({ version: 2, places, days }));

/** Apply saved data, if any. Returns true when your own data was loaded. */
export function load(): boolean {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const j = JSON.parse(raw) as { days?: unknown; places?: unknown };
      const d = validateDays(j.days), p = validatePlaces(j.places);
      if (typeof d === 'string' || typeof p === 'string') return false;
      apply(d, p);
      return true;
    }
    const old = localStorage.getItem(OLD_KEY);
    if (old) {
      const d = validateDays(JSON.parse(old));
      if (typeof d === 'string') return false;
      apply(d, defaults.places);
      return true;
    }
    return false;
  } catch { return false; }
}

export const isCustom = () => localStorage.getItem(KEY) !== null || localStorage.getItem(OLD_KEY) !== null;

/** Back to the built-in sample schedule. */
export function reset() {
  localStorage.removeItem(KEY);
  localStorage.removeItem(OLD_KEY);
  apply(defaults.days, defaults.places);
}

export const exportJson = () => JSON.stringify({ version: 2, places, days }, null, 1);

/**
 * Import a file made by Export. Returns null on success, or an error message.
 * Nothing changes if the file is invalid. A file with only days (older exports) keeps your current places.
 */
export function importJson(text: string): string | null {
  try {
    const j = JSON.parse(text) as { days?: unknown; places?: unknown };
    const d = validateDays(j.days ?? j);
    if (typeof d === 'string') return d;
    const p = j.places === undefined ? validatePlaces(places) : validatePlaces(j.places);
    if (typeof p === 'string') return p;
    apply(d, p);
    save();
    return null;
  } catch { return 'That is not a valid schedule file.'; }
}

/**
 * Put `nb` on a day, replacing whatever it overlaps. When `old` is given, that block is removed first;
 * any time it no longer covers becomes "Free". Returns an error message, or null on success.
 */
export function paint(day: DayKey, old: Block | null, nb: Block): string | null {
  const s = m(nb[0]), e = m(nb[1]);
  if (!(e > s)) return 'End must be after start.';
  const base: Block[] = days[day].map(b => (b === old ? ([b[0], b[1], 'f', 'Free', 'H'] as Block) : b));
  const out: Block[] = [];
  for (const b of base) {
    const bs = m(b[0]), be = m(b[1]);
    if (be <= s || bs >= e) { out.push(b); continue; }
    if (bs < s) out.push([b[0], nb[0], b[2], b[3], b[4]]);
    if (be > e) out.push([nb[1], b[1], b[2], b[3], b[4]]);
  }
  out.push(nb);
  out.sort((a, b) => m(a[0]) - m(b[0]));
  const merged: Block[] = [];
  for (const b of out) {
    const p = merged[merged.length - 1];
    if (p && p[1] === b[0] && p[2] === b[2] && p[3] === b[3] && p[4] === b[4]) p[1] = b[1];
    else merged.push([...b] as Block);
  }
  const err = checkDay(merged);
  if (err) return err;
  days[day].splice(0, days[day].length, ...merged);
  save();
  return null;
}
