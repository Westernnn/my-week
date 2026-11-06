import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { places, categories, days as D, settings, type Block, type CatKey, type DayKey, type PlaceKey } from './schedule';
import { getRoute, pointAt, clearRoutes, type Route } from './route';
import { paint, reset, exportJson, importJson } from './store';

type Cat = CatKey | 'z';
type AnyBlock = [start: string, end: string, cat: Cat, label: string, loc: string];

const DK = Object.keys(D) as DayKey[];
const dark = matchMedia('(prefers-color-scheme: dark)').matches;
const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;

const cat = (k: Cat) =>
  k === 'z'
    ? { name: 'Sleep', bg: 'var(--soft)', fg: 'var(--muted)' }
    : { name: categories[k].name, bg: dark ? categories[k].bgDark : categories[k].bg, fg: dark ? categories[k].fgDark : categories[k].fg };
const m = (t: string) => { const [a, b] = t.split(':'); return +a * 60 + +b; };
const p2 = (n: number) => String(n).padStart(2, '0');
const fm = (n: number) => p2(Math.floor(n / 60) % 24) + ':' + p2(n % 60);
const split = (loc: string) => loc.split('-') as PlaceKey[];

// ---------- State ----------
let day: DayKey = 'Mon';
let T = 600;               // minutes since midnight shown on the Now screen
let live = true;           // true = following the real clock
let timer: number | null = null;
const tashkentNow = () => new Date(new Date().toLocaleString('en-US', { timeZone: settings.timezone }));
const dayOf = (n: Date) => DK[(n.getDay() + 6) % 7];
// On a phone the week grid is too narrow for 7 columns, so start on today's single-day view
let weekSel: DayKey | 'all' = matchMedia('(max-width: 620px)').matches ? dayOf(tashkentNow()) : 'all';

// ---------- Tabs ----------
function setTab(name: 'now' | 'week') {
  document.querySelectorAll<HTMLElement>('.tab').forEach(b => b.classList.toggle('on', b.dataset.tab === name));
  $('view-now').hidden = name !== 'now';
  $('view-week').hidden = name !== 'week';
  if (name === 'now') setTimeout(() => map.invalidateSize(), 0);
}
document.querySelectorAll<HTMLElement>('.tab').forEach(b => { b.onclick = () => setTab(b.dataset.tab as 'now' | 'week'); });

// ---------- Metrics (Week tab) ----------
function updateMetrics() {
  const tot: Partial<Record<CatKey, number>> = {};
  let awake = 0, gym = 0;
  for (const d of DK) for (const b of D[d]) {
    const n = m(b[1]) - m(b[0]);
    tot[b[2]] = (tot[b[2]] ?? 0) + n; awake += n;
    if (b[2] === 'g') gym++;
  }
  $('mFree').textContent = Math.round(((tot.f ?? 0) / awake) * 100) + '%';
  $('mStudy').textContent = Math.round((tot.s ?? 0) / 60) + ' h';
  $('mClass').textContent = Math.round((tot.c ?? 0) / 6) / 10 + ' h';
  $('mGym').textContent = String(gym);
  $('legend').innerHTML = (Object.keys(categories) as CatKey[])
    .map(k => `<span><i style="background:${cat(k).bg}"></i>${cat(k).name}</span>`).join('');
}
updateMetrics();

// ---------- Week tab: day buttons + grid ----------
function showDetail(d: DayKey, b: Block, a: number) {
  const p = $('detail');
  p.textContent = `${d} ${b[0]}–${b[1]} · ${cat(b[2]).name} · ${b[3]}`;
  const btn = document.createElement('button');
  btn.textContent = 'See on Now screen';
  btn.onclick = () => { day = d; T = a; live = false; setTab('now'); render(); };
  const ed = document.createElement('button');
  ed.textContent = 'Edit';
  ed.onclick = () => openEditor(d, b);
  p.append(btn, ed);
}

function buildWeekBar() {
  const bar = $('weekdays');
  bar.innerHTML = '';
  const mk = (label: string, sel: DayKey | 'all') => {
    const b = document.createElement('button');
    b.textContent = label;
    b.classList.toggle('on', weekSel === sel);
    b.onclick = () => { weekSel = sel; buildWeekBar(); buildGrid(); };
    bar.appendChild(b);
  };
  for (const d of DK) mk(d, d);
  mk('Whole week', 'all');
}

function buildGrid() {
  const g = $('grid'), H0 = 7, H1 = 24;
  const list = weekSel === 'all' ? DK : [weekSel];
  const single = list.length === 1;
  const PX = single ? 64 : 30; // pixels per hour; the single-day view is tall enough for 15-minute blocks
  g.innerHTML = '';
  g.style.gridTemplateColumns = single ? '40px minmax(0,1fr)' : '34px repeat(7,minmax(0,1fr))';

  g.appendChild(document.createElement('div'));
  for (const d of list) {
    const h = document.createElement('div');
    h.textContent = d;
    h.style.cssText = 'font-size:12px;font-weight:500;text-align:center;padding-bottom:6px';
    g.appendChild(h);
  }
  const tc = document.createElement('div');
  tc.style.cssText = `position:relative;height:${(H1 - H0) * PX}px`;
  for (let h = H0; h < H1; h += single ? 1 : 2) {
    const l = document.createElement('div');
    l.textContent = p2(h);
    l.style.cssText = `position:absolute;top:${(h - H0) * PX - 6}px;font-size:11px;color:var(--muted)`;
    tc.appendChild(l);
  }
  g.appendChild(tc);

  for (const d of list) {
    const col = document.createElement('div');
    col.className = 'col';
    col.style.height = (H1 - H0) * PX + 'px';
    for (let h = H0; h < H1; h++) {
      const ln = document.createElement('div');
      ln.style.cssText = `position:absolute;left:0;right:0;top:${(h - H0) * PX}px;border-top:.5px solid var(--border)`;
      col.appendChild(ln);
    }
    for (const b of D[d]) {
      const a = m(b[0]), n = m(b[1]) - a, k = cat(b[2]), el = document.createElement('div');
      el.className = 'blk';
      const h = (n / 60) * PX - 2;
      el.style.top = ((a - H0 * 60) / 60) * PX + 1 + 'px';
      el.style.height = h + 'px';
      el.style.background = k.bg; el.style.color = k.fg;
      el.style.fontSize = single ? '13px' : '11px';
      if (b[2] === 't') el.style.border = '.5px dashed var(--strong)';
      // Short blocks: one line, vertically centred, cut with "…" instead of spilling into the next block
      if (h < 30) {
        el.classList.add('short');
        el.style.fontSize = single ? '12px' : '10px';
        el.style.lineHeight = Math.max(h - 1, 0) + 'px';
      }
      if (single) { if (h >= 12) el.textContent = `${b[0]}–${b[1]}  ${b[3]}`; }
      else if (n >= 40) el.textContent = b[3].split(' (')[0];
      el.title = `${b[0]}–${b[1]} ${b[3]}`;
      el.onclick = () => showDetail(d, b, a);
      col.appendChild(el);
    }
    g.appendChild(col);
  }
}
buildWeekBar();
buildGrid();

// ---------- Editor ----------
const dlg = $<HTMLDialogElement>('editor');
const sel = (id: string) => $<HTMLSelectElement>(id);
const inp = (id: string) => $<HTMLInputElement>(id);
let editing: { day: DayKey; block: Block | null } = { day: 'Mon', block: null };

const esc = (s: string) => s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c] as string));
function fillSelects() {
  const opts = (items: [string, string][]) => items.map(([v, t]) => `<option value="${v}">${esc(t)}</option>`).join('');
  const placeOpts = opts((Object.keys(places) as PlaceKey[]).map(k => [k, places[k].name]));
  sel('edDay').innerHTML = opts(DK.map(d => [d, d]));
  sel('edCat').innerHTML = opts((Object.keys(categories) as CatKey[]).map(k => [k, categories[k].name]));
  sel('edPlace').innerHTML = placeOpts;
  sel('edFrom').innerHTML = placeOpts;
  sel('edTo').innerHTML = placeOpts;
}
fillSelects();

function syncType() {
  const trip = sel('edCat').value === 't';
  $('edPlaceWrap').hidden = trip;
  $('edTripWrap').hidden = !trip;
}
sel('edCat').onchange = syncType;

function openEditor(d: DayKey, block: Block | null) {
  editing = { day: d, block };
  $('edTitle').textContent = block ? 'Edit block' : 'Add block';
  sel('edDay').value = d;
  sel('edDay').disabled = !!block;
  inp('edStart').value = block ? block[0] : '12:00';
  inp('edEnd').value = block ? block[1] : '13:00';
  sel('edCat').value = block ? block[2] : 's';
  inp('edLabel').value = block ? block[3] : '';
  if (block && block[2] === 't') {
    const [f, t] = split(block[4]);
    sel('edFrom').value = f; sel('edTo').value = t;
    sel('edPlace').value = 'H';
  } else {
    sel('edPlace').value = block ? block[4] : 'H';
    sel('edFrom').value = 'H'; sel('edTo').value = 'W';
  }
  $('edDelete').hidden = !block;
  $('edErr').textContent = '';
  syncType();
  dlg.showModal();
}

function refreshAll() {
  clearRoutes();   // places may have changed, so saved road routes may be wrong now
  mapKey = '';     // redraw the map pins and route
  fillSelects();
  updateMetrics();
  buildGrid();
  $('detail').textContent = 'Saved. Tap a block to see details or edit it.';
  updateStoreNote();
  render();
}

function updateStoreNote() {
  $('storeNote').textContent = 'Your schedule is saved on this device only. Export makes a backup file.';
}

$('edForm').onsubmit = ev => {
  ev.preventDefault();
  const c = sel('edCat').value as CatKey;
  const loc = c === 't' ? `${sel('edFrom').value}-${sel('edTo').value}` : sel('edPlace').value;
  const nb: Block = [inp('edStart').value, inp('edEnd').value, c, inp('edLabel').value.trim(), loc];
  const err = paint(sel('edDay').value as DayKey, editing.block, nb);
  if (err) { $('edErr').textContent = err; return; }
  dlg.close();
  refreshAll();
};
$('edCancel').onclick = () => dlg.close();
$('edDelete').onclick = () => {
  const b = editing.block;
  if (!b) return;
  const err = paint(editing.day, b, [b[0], b[1], 'f', 'Free', 'H']);
  if (err) { $('edErr').textContent = err; return; }
  dlg.close();
  refreshAll();
};

$('addBlock').onclick = () => openEditor(weekSel === 'all' ? 'Mon' : weekSel, null);
$('exportBtn').onclick = () => {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([exportJson()], { type: 'application/json' }));
  a.download = 'my-schedule.json';
  a.click();
  URL.revokeObjectURL(a.href);
};
$('importBtn').onclick = () => $('importFile').click();

// Edit as text: the whole schedule as JSON. Change it here, or replace it all by pasting new text.
const pasteDlg = $<HTMLDialogElement>('pasteDlg');
$('pasteBtn').onclick = () => { $<HTMLTextAreaElement>('pasteText').value = exportJson(); $('pasteErr').textContent = ''; pasteDlg.showModal(); };
$('pasteCancel').onclick = () => pasteDlg.close();
$('pasteForm').onsubmit = ev => {
  ev.preventDefault();
  const err = importJson($<HTMLTextAreaElement>('pasteText').value);
  if (err) { $('pasteErr').textContent = err; return; }
  $<HTMLTextAreaElement>('pasteText').value = '';
  pasteDlg.close();
  refreshAll();
};
$<HTMLInputElement>('importFile').onchange = async e => {
  const input = e.target as HTMLInputElement;
  const f = input.files?.[0];
  input.value = '';
  if (!f) return;
  const err = importJson(await f.text());
  if (err) { $('storeNote').textContent = 'Import failed: ' + err; return; }
  refreshAll();
};
$('resetBtn').onclick = () => {
  if (!confirm('Remove your schedule and places from this device? Export first if you want a copy.')) return;
  reset();
  location.reload(); // back to the empty start screen
};
updateStoreNote();

// ---------- "Check another time" controls ----------
function scrub() { live = false; }
for (const d of DK) {
  const b = document.createElement('button');
  b.className = 'db'; b.textContent = d; b.dataset.d = d;
  b.onclick = () => { scrub(); day = d; render(); };
  $('days').appendChild(b);
}
{
  const nb = document.createElement('button');
  nb.textContent = 'Now in Tashkent'; nb.className = 'now'; nb.onclick = goNow;
  $('days').appendChild(nb);
}

// ---------- Map ----------
const map = L.map('map', { zoomControl: true, attributionControl: true }).setView([places.H.lat, places.H.lng], 13);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  maxZoom: 19,
  attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
}).addTo(map);
const layer = L.layerGroup().addTo(map);
const meMarker = L.marker([places.H.lat, places.H.lng], {
  icon: L.divIcon({ className: '', html: '<div class="me"></div>', iconSize: [16, 16], iconAnchor: [8, 8] }),
  zIndexOffset: 1000, interactive: false,
}).addTo(map);

let mapKey = '';
let activeRoute: Route | null = null; // route of the trip currently on screen (null when stationary)

function pin(k: PlaceKey, on: boolean) {
  const p = places[k];
  return L.marker([p.lat, p.lng], {
    icon: L.divIcon({ className: '', html: `<div class="pin${on ? ' on' : ''}"></div>`, iconSize: [22, 22], iconAnchor: [11, 11] }),
  }).bindTooltip(p.name, { permanent: true, direction: 'top', offset: [0, -12], className: 'pin-label' });
}

/** Show only what matters now: the current place, plus the trip it is part of or leads to. */
async function drawMap(key: string, at: PlaceKey, trip: [PlaceKey, PlaceKey] | null, driving: boolean) {
  if (key === mapKey) return;
  mapKey = key;
  layer.clearLayers();
  activeRoute = null;
  const pts: L.LatLngExpression[] = [];
  if (!trip) {
    pin(at, true).addTo(layer);
    pts.push([places[at].lat, places[at].lng]);
  } else {
    const [from, to] = trip;
    pin(from, !driving).addTo(layer);
    pin(to, false).addTo(layer);
    const rt = await getRoute(from, to);
    if (mapKey !== key) return; // user moved on while the route loaded
    L.polyline(rt.pts, driving
      ? { color: '#185FA5', weight: 5, opacity: 0.9 }
      : { color: '#185FA5', weight: 3, opacity: 0.6, dashArray: '6 8' }).addTo(layer);
    if (driving) activeRoute = rt;
    pts.push(...rt.pts);
    render(); // refresh dot / ETA now that the route is known
  }
  map.fitBounds(L.latLngBounds(pts), { padding: [34, 34], maxZoom: 16 });
}

// ---------- Time lookup ----------
interface Found { b: AnyBlock; a: number; e: number; nx: Block; nd: DayKey | null }
function find(d: DayKey, t: number): Found {
  const bl = D[d], nd = DK[(DK.indexOf(d) + 1) % 7];
  for (let i = 0; i < bl.length; i++) {
    const a = m(bl[i][0]), e = m(bl[i][1]);
    if (t >= a && t < e) return { b: bl[i], a, e, nx: bl[i + 1] ?? D[nd][0], nd: bl[i + 1] ? null : nd };
  }
  const first = bl[0], last = bl[bl.length - 1];
  if (t < m(first[0])) return { b: ['00:00', first[0], 'z', 'Sleep', 'H'], a: m(last[1]) - 1440, e: m(first[0]), nx: first, nd: null };
  return { b: [last[1], D[nd][0][0], 'z', 'Sleep', 'H'], a: m(last[1]), e: 1440 + m(D[nd][0][0]), nx: D[nd][0], nd };
}

// ---------- Render (Now screen) ----------
function render() {
  const slider = $<HTMLInputElement>('t');
  slider.value = String(T); $('clock').textContent = fm(T);
  $('backNow').hidden = live;
  $('when').textContent = `${day} ${fm(T)}${live ? ' · live' : ''}`;
  document.querySelectorAll<HTMLElement>('.db').forEach(b => b.classList.toggle('on', b.dataset.d === day));

  const st = $('strip'), A = 420, E = 1440;
  st.innerHTML = '';
  for (const b of D[day]) {
    const a = m(b[0]), e = m(b[1]), el = document.createElement('div');
    el.className = 'seg';
    el.style.left = ((a - A) / (E - A)) * 100 + '%';
    el.style.width = ((e - a) / (E - A)) * 100 + '%';
    el.style.background = cat(b[2]).bg;
    el.title = `${b[0]}–${b[1]} ${b[3]}`;
    el.onclick = () => { scrub(); T = a; render(); };
    st.appendChild(el);
  }
  if (T >= A) {
    const mk = document.createElement('div');
    mk.style.cssText = `position:absolute;top:0;bottom:0;width:2px;background:var(--text);left:${((T - A) / (E - A)) * 100}%`;
    st.appendChild(mk);
  }

  const r = find(day, T), b = r.b, k = cat(b[2]), driving = b[2] === 't';
  const badge = $('badge');
  Object.assign(badge.style, { background: k.bg, color: k.fg });
  badge.textContent = k.name;
  $('act').textContent = b[3];

  let from: PlaceKey = 'H', to: PlaceKey = 'H', loc = b[4] as PlaceKey;
  if (driving) {
    [from, to] = split(b[4]);
    $('where').textContent = `🚗 ${places[from].name} → ${places[to].name}, ${places[to].address}`;
  } else {
    $('where').textContent = '📍 ' + (b[2] === 'f' && loc === 'H' ? 'Home, or anywhere you like' : `${places[loc].name}, ${places[loc].address}`);
  }

  const dur = r.e - r.a, el = T - r.a, lf = r.e - T;
  $('rng').textContent = `${fm((r.a + 1440) % 1440)}–${fm(r.e)}`;
  $('left').textContent = (lf >= 60 ? `${Math.floor(lf / 60)} h ${p2(lf % 60)} min` : `${lf} min`) + ' left';
  $('prog').style.width = Math.round((el / dur) * 100) + '%';
  $('next').textContent = (r.nd ? r.nd + ' ' : '') + r.nx[0] + ' · ' + r.nx[3];

  // Map: current trip if driving; else current place (+ preview of the next trip if one follows)
  let trip: [PlaceKey, PlaceKey] | null = null;
  if (driving) trip = [from, to];
  else if (r.nx[2] === 't') { const [f, t2] = split(r.nx[4]); trip = [f, t2]; }
  const at: PlaceKey = driving ? from : loc;
  void drawMap(`${driving ? 'drive' : 'at'}:${at}:${trip ? trip.join('-') : ''}`, at, trip, driving);

  // "Me" dot
  const p = Math.min(1, el / dur);
  let pos: [number, number] = [places[at].lat, places[at].lng];
  if (driving && activeRoute) pos = pointAt(activeRoute, p);
  else if (driving) pos = [places[from].lat + (places[to].lat - places[from].lat) * p, places[from].lng + (places[to].lng - places[from].lng) * p];
  meMarker.setLatLng(pos);

  if (driving) {
    const info = activeRoute ? ` · ${(activeRoute.meters / 1000).toFixed(1)} km, ~${Math.round(activeRoute.seconds / 60)} min without traffic · ${dur} min planned` : '';
    $('eta').textContent = `On the road · arrive around ${fm(r.e)}${info}`;
  } else {
    $('eta').textContent = b[2] === 'z' ? 'Sleeping at home' : 'You should be here now';
  }
}

function goNow() {
  const n = tashkentNow();
  live = true;
  if (timer) { clearInterval(timer); timer = null; $('play').textContent = '▶'; }
  day = dayOf(n);
  T = n.getHours() * 60 + n.getMinutes();
  render();
}

$<HTMLInputElement>('t').oninput = e => { scrub(); T = +(e.target as HTMLInputElement).value; render(); };
$('play').onclick = () => {
  if (timer) { clearInterval(timer); timer = null; $('play').textContent = '▶'; return; }
  scrub();
  $('play').textContent = '❚❚';
  timer = window.setInterval(() => {
    T += 5;
    if (T > 1435) { T = 0; day = DK[(DK.indexOf(day) + 1) % 7]; }
    render();
  }, 120);
};
$('backNow').onclick = goNow;

// Keep the Now screen on the real clock until the user starts exploring
setInterval(() => { if (live) goNow(); }, 30_000);

goNow();
setTimeout(() => map.invalidateSize(), 0);