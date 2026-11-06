# My week

A small personal weekly schedule app: a live "Now" screen with a route map, and a Week view you can edit.
It runs in the browser and can be added to a phone's home screen.

## Your data stays on your device
The code in this repository only contains a **sample** schedule (`src/schedule.ts`).
Your own schedule and places are loaded in the app with **Week → Import file / Paste text** and are saved in the
browser's local storage on that device. Use **Export** to make a backup file.

## Develop
```
npm install
npm run dev        # http://localhost:5173
npm run build:pages
```
Pushing to `main` deploys to GitHub Pages through `.github/workflows/deploy.yml`.

Map tiles are from OpenStreetMap; road routes come from the public OSRM demo server.
