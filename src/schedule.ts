// The app starts EMPTY. A schedule is added by the user (Welcome screen -> paste or import) and saved on their device.
// See format.ts for the exact format.
//
// Block: [start "HH:MM", end "HH:MM", category, label, location]
// Categories: c class/work, s study/tasks, g gym/sport, fa family, f free, r meals/routine, t travel
// Locations: H home, W work/school, B regular place (gym...), F family/other; travel = "FROM-TO"

export type CatKey = 'c' | 's' | 'g' | 'fa' | 'f' | 'r' | 't';
export type PlaceKey = 'H' | 'W' | 'B' | 'F';
export type DayKey = 'Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri' | 'Sat' | 'Sun';
export type Block = [start: string, end: string, cat: CatKey, label: string, loc: string];
export interface Place { name: string; address: string; lat: number; lng: number }
export interface Category { name: string; bg: string; fg: string; bgDark: string; fgDark: string }

/** Time zone used for "now". Defaults to the device's; a schedule file can set its own ("timezone": "Asia/Tashkent"). */
export const settings = { timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC' };

// Placeholders, replaced when a schedule is added.
export const places: Record<PlaceKey, Place> = {
  H: { name: 'Home', address: '', lat: 41.3111, lng: 69.2797 },
  W: { name: 'Work / school', address: '', lat: 41.3111, lng: 69.2797 },
  B: { name: 'Regular place', address: '', lat: 41.3111, lng: 69.2797 },
  F: { name: 'Family / other', address: '', lat: 41.3111, lng: 69.2797 },
};

export const categories: Record<CatKey, Category> = {
  c: { name: 'Class / work', bg: '#E6F1FB', fg: '#0C447C', bgDark: '#0C447C', fgDark: '#B5D4F4' },
  s: { name: 'Study / tasks', bg: '#EEEDFE', fg: '#3C3489', bgDark: '#3C3489', fgDark: '#CECBF6' },
  g: { name: 'Gym / sport', bg: '#E1F5EE', fg: '#085041', bgDark: '#085041', fgDark: '#9FE1CB' },
  fa: { name: 'Family', bg: '#FBEAF0', fg: '#72243E', bgDark: '#72243E', fgDark: '#F4C0D1' },
  f: { name: 'Free', bg: '#EAF3DE', fg: '#27500A', bgDark: '#27500A', fgDark: '#C0DD97' },
  r: { name: 'Meals / routine', bg: '#F1EFE8', fg: '#5F5E5A', bgDark: '#2C2C2A', fgDark: '#B4B2A9' },
  t: { name: 'Travel', bg: '#FFFFFF', fg: '#888780', bgDark: '#1f1f1e', fgDark: '#888780' },
};

export const days: Record<DayKey, Block[]> = {
  Mon: [], Tue: [], Wed: [], Thu: [], Fri: [], Sat: [], Sun: [],
};
