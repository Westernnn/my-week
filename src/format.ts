// The schedule file format, in two forms: a ready-to-use prompt for an AI assistant, and an empty template.

const BLOCK_EXAMPLE = '["07:30","09:00","r","Wake up + breakfast","H"]';

/** Paste this into an AI assistant together with a description of your week; it answers with the JSON the app needs. */
export const AI_PROMPT = `I use a schedule app that imports ONE JSON object. Turn my weekly schedule (at the bottom) into that JSON.
Reply with ONLY the JSON, no explanation, no code fences.

FORMAT
{
  "timezone": "Asia/Tashkent",
  "places": {
    "H": { "name": "Home",          "address": "street, city", "lat": 41.3111, "lng": 69.2797 },
    "W": { "name": "University",    "address": "...",          "lat": 0,       "lng": 0 },
    "B": { "name": "Gym",           "address": "...",          "lat": 0,       "lng": 0 },
    "F": { "name": "Family",        "address": "...",          "lat": 0,       "lng": 0 }
  },
  "days": {
    "Mon": [ ${BLOCK_EXAMPLE}, ["09:00","10:00","s","Study","H"] ],
    "Tue": [ ... ], "Wed": [ ... ], "Thu": [ ... ], "Fri": [ ... ], "Sat": [ ... ], "Sun": [ ... ]
  }
}

RULES
1. "timezone" is the IANA name of my time zone (optional).
2. "places" has exactly four keys: H, W, B, F. H = home, W = work or school, B = a place I go regularly (gym, cafe...), F = family or any other place. Each has name, address, lat and lng (numbers). Use the coordinates I give you; if I give none, use your best guess for the area.
3. "days" has all seven days: Mon, Tue, Wed, Thu, Fri, Sat, Sun. Each day is a list of blocks, in time order.
4. A block is [start, end, type, name, place]. All five are text.
5. Times are 24-hour "HH:MM" with two digits, and the end is later than the start. A block cannot cross midnight.
6. Blocks in a day join up exactly: each block starts at the minute the previous one ends. No gaps, no overlaps. The first block is waking up, the last is going to sleep.
7. type is one of: c = class or work, s = study or tasks, g = gym or sport, fa = family time, f = free time, r = meals and routine, t = travel (driving, commute).
8. place is H, W, B or F. For a travel block (type t) it is "FROM-TO" with two different places, for example "H-W". Put a travel block before and after every trip between places.
9. Keep about 40% of the waking time as free time (f) unless I say otherwise.

MY SCHEDULE:
(describe your week here: wake-up time, classes or work, meals, gym, trips, free time...)
`;

const PLACE = (name: string) => `{ "name": "${name}", "address": "", "lat": 41.3111, "lng": 69.2797 }`;
const day = () => `[ ["07:30","09:00","r","Wake up + breakfast","H"], ["09:00","23:30","f","Free","H"] ]`;

/** A tiny but valid schedule: replace the places and the blocks with your own. */
export const TEMPLATE = `{
 "timezone": "${Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'}",
 "places": {
  "H": ${PLACE('Home')},
  "W": ${PLACE('Work or school')},
  "B": ${PLACE('Regular place')},
  "F": ${PLACE('Family or other')}
 },
 "days": {
  "Mon": ${day()},
  "Tue": ${day()},
  "Wed": ${day()},
  "Thu": ${day()},
  "Fri": ${day()},
  "Sat": ${day()},
  "Sun": ${day()}
 }
}
`;
