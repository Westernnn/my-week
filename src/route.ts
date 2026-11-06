import { places, type PlaceKey } from './schedule';

export type LatLng = [lat: number, lng: number];

export interface Route {
  pts: LatLng[];
  cum: number[]; // cumulative metres at each point
  meters: number;
  seconds: number;
  real: boolean; // false = straight-line fallback (routing server unreachable)
}

const R = 6371000;
const rad = (d: number) => (d * Math.PI) / 180;
function dist(a: LatLng, b: LatLng): number {
  const dLat = rad(b[0] - a[0]), dLng = rad(b[1] - a[1]);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a[0])) * Math.cos(rad(b[0])) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

function build(pts: LatLng[], seconds: number | null, real: boolean): Route {
  const cum = [0];
  for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + dist(pts[i - 1], pts[i]));
  const meters = cum[cum.length - 1];
  return { pts, cum, meters, seconds: seconds ?? meters / 8.3, real }; // fallback ~30 km/h
}

const cache = new Map<string, Promise<Route>>();

/** Forget saved routes, e.g. after the places have changed. */
export const clearRoutes = () => cache.clear();

/** Road route between two places. Cached per direction. Falls back to a straight line. */
export function getRoute(from: PlaceKey, to: PlaceKey): Promise<Route> {
  const key = `${from}-${to}`;
  let p = cache.get(key);
  if (!p) {
    const a = places[from], b = places[to];
    const url = `https://router.project-osrm.org/route/v1/driving/${a.lng},${a.lat};${b.lng},${b.lat}?overview=full&geometries=geojson`;
    p = fetch(url)
      .then(r => r.json())
      .then(j => {
        const rt = j.routes?.[0];
        if (!rt) throw new Error('no route');
        const pts = (rt.geometry.coordinates as [number, number][]).map(([lng, lat]): LatLng => [lat, lng]);
        return build(pts, rt.duration as number, true);
      })
      .catch(() => build([[a.lat, a.lng], [b.lat, b.lng]], null, false));
    cache.set(key, p);
  }
  return p;
}

/** Point a fraction f (0..1) of the way along the route, by distance. */
export function pointAt(rt: Route, f: number): LatLng {
  const target = Math.max(0, Math.min(1, f)) * rt.meters;
  let i = 1;
  while (i < rt.cum.length - 1 && rt.cum[i] < target) i++;
  const span = rt.cum[i] - rt.cum[i - 1] || 1;
  const t = (target - rt.cum[i - 1]) / span;
  const a = rt.pts[i - 1], b = rt.pts[i];
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
}
