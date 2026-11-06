// SAMPLE DATA. This is what a fresh install shows, and it is safe to publish.
// Your real schedule lives only on your device: open the app, go to Week -> Import, and load your own file.
//
// Block: [start "HH:MM", end "HH:MM", category, label, location]
// Categories: c class, s study/tasks, g gym/sauna, fa family, f free, r meals/routine, t driving
// Locations: H home, W university, B gym, F family; driving = "FROM-TO"

export type CatKey = 'c' | 's' | 'g' | 'fa' | 'f' | 'r' | 't';
export type PlaceKey = 'H' | 'W' | 'B' | 'F';
export type DayKey = 'Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri' | 'Sat' | 'Sun';
export type Block = [start: string, end: string, cat: CatKey, label: string, loc: string];
export interface Place { name: string; address: string; lat: number; lng: number }
export interface Category { name: string; bg: string; fg: string; bgDark: string; fgDark: string }

export const timezone = "Asia/Tashkent";

// Made-up spots around Tashkent, only so the sample map has something to draw.
export const places: Record<PlaceKey, Place> = {
  H: { name: "Home", address: "Sample address", lat: 41.2780, lng: 69.3000 },
  W: { name: "University", address: "Sample campus", lat: 41.3560, lng: 69.2900 },
  B: { name: "Gym", address: "Sample gym", lat: 41.2750, lng: 69.2000 },
  F: { name: "Family", address: "Sample address", lat: 41.3620, lng: 69.2350 },
};

export const categories: Record<CatKey, Category> = {
  c: { name: "Class", bg: "#E6F1FB", fg: "#0C447C", bgDark: "#0C447C", fgDark: "#B5D4F4" },
  s: { name: "Study / tasks", bg: "#EEEDFE", fg: "#3C3489", bgDark: "#3C3489", fgDark: "#CECBF6" },
  g: { name: "Gym / sauna", bg: "#E1F5EE", fg: "#085041", bgDark: "#085041", fgDark: "#9FE1CB" },
  fa: { name: "Family", bg: "#FBEAF0", fg: "#72243E", bgDark: "#72243E", fgDark: "#F4C0D1" },
  f: { name: "Free", bg: "#EAF3DE", fg: "#27500A", bgDark: "#27500A", fgDark: "#C0DD97" },
  r: { name: "Meals / routine", bg: "#F1EFE8", fg: "#5F5E5A", bgDark: "#2C2C2A", fgDark: "#B4B2A9" },
  t: { name: "Driving", bg: "#FFFFFF", fg: "#888780", bgDark: "#1f1f1e", fgDark: "#888780" },
};

export const days: Record<DayKey, Block[]> = {
  Mon: [
    ["07:30","09:00","r","Wake up + breakfast","H"],
    ["09:00","09:40","f","Free","H"],
    ["09:40","10:00","t","Drive to the gym","H-B"],
    ["10:00","11:00","g","Gym","B"],
    ["11:00","11:20","t","Drive home","B-H"],
    ["11:20","12:00","r","Shower","H"],
    ["12:00","13:00","f","Free","H"],
    ["13:00","14:00","r","Lunch","H"],
    ["14:00","17:00","s","Study block","H"],
    ["17:00","18:00","s","Tasks","H"],
    ["18:00","19:00","r","Dinner","H"],
    ["19:00","23:30","f","Free evening","H"],
  ],
  Tue: [
    ["07:30","09:00","r","Wake up + breakfast","H"],
    ["09:00","11:30","s","Homework","H"],
    ["11:30","12:45","f","Free","H"],
    ["12:45","13:30","r","Lunch","H"],
    ["13:30","14:00","f","Free (get ready for class)","H"],
    ["14:00","16:20","c","Class A (online)","H"],
    ["16:20","17:00","f","Break","H"],
    ["17:00","18:00","s","Class prep","H"],
    ["18:00","18:30","r","Dinner","H"],
    ["18:30","19:00","t","Drive to university","H-W"],
    ["19:00","21:20","c","Class B","W"],
    ["21:20","21:45","t","Drive home","W-H"],
    ["21:45","23:30","f","Free","H"],
  ],
  Wed: [
    ["07:30","08:30","r","Wake up + breakfast","H"],
    ["08:30","09:00","t","Drive to university","H-W"],
    ["09:00","11:20","c","Class C","W"],
    ["11:20","13:00","f","Free gap between classes","W"],
    ["13:00","14:00","r","Lunch near campus","W"],
    ["14:00","16:20","c","Class D","W"],
    ["16:20","16:45","t","Drive home","W-H"],
    ["16:45","17:30","f","Free","H"],
    ["17:30","19:00","s","Homework","H"],
    ["19:00","20:00","r","Dinner","H"],
    ["20:00","23:30","f","Free evening","H"],
  ],
  Thu: [
    ["07:30","09:00","r","Wake up + breakfast","H"],
    ["09:00","09:40","f","Free","H"],
    ["09:40","10:00","t","Drive to the gym","H-B"],
    ["10:00","11:00","g","Gym","B"],
    ["11:00","11:20","t","Drive home","B-H"],
    ["11:20","12:00","r","Shower","H"],
    ["12:00","13:00","f","Free","H"],
    ["13:00","14:00","r","Lunch","H"],
    ["14:00","17:00","s","Study block","H"],
    ["17:00","18:15","f","Free","H"],
    ["18:15","18:45","t","Drive to family","H-F"],
    ["18:45","21:00","fa","Visit family + dinner","F"],
    ["21:00","21:20","t","Drive home","F-H"],
    ["21:20","23:30","f","Free","H"],
  ],
  Fri: [
    ["07:30","09:00","r","Wake up + breakfast, pack gym bag","H"],
    ["09:00","10:30","s","Homework","H"],
    ["10:30","11:00","t","Drive to the gym","H-B"],
    ["11:00","12:00","g","Group class","B"],
    ["12:00","12:20","r","Shower at the gym","B"],
    ["12:20","13:20","r","Lunch near the gym","B"],
    ["13:20","13:40","t","Drive home","B-H"],
    ["13:40","14:00","f","Free (get ready for class)","H"],
    ["14:00","16:20","c","Class E (online)","H"],
    ["16:20","23:30","f","Free evening","H"],
  ],
  Sat: [
    ["08:30","10:00","r","Wake up + breakfast","H"],
    ["10:00","10:40","f","Free","H"],
    ["10:40","11:00","t","Drive to the gym","H-B"],
    ["11:00","13:00","g","Sauna","B"],
    ["13:00","13:20","t","Drive home","B-H"],
    ["13:20","14:30","r","Lunch","H"],
    ["14:30","23:30","f","Free afternoon and evening","H"],
  ],
  Sun: [
    ["08:30","10:00","r","Wake up + breakfast","H"],
    ["10:00","12:30","f","Free","H"],
    ["12:30","13:00","t","Drive to family","H-F"],
    ["13:00","16:00","fa","Visit family + lunch","F"],
    ["16:00","16:30","t","Drive home","F-H"],
    ["16:30","19:00","f","Free","H"],
    ["19:00","20:30","s","Light study","H"],
    ["20:30","21:00","s","Plan next week","H"],
    ["21:00","23:30","f","Free","H"],
  ],
};
