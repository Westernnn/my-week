# My week

A small personal weekly schedule app: a live "Now" screen with a route map, and a Week view you can edit.
It runs in the browser and can be added to a phone's home screen.

## It starts empty, and your data stays on your device
The app contains no schedule. On first open it shows a start screen where you paste your week as text
(JSON in the app's format). The start screen has a **Copy AI prompt** button: paste that prompt into an AI
assistant, describe your week, and paste its answer back. The format itself is in `src/format.ts`.

Your schedule is saved in the browser's local storage on that device only. Later you can change it with
**Week → Edit as text**, edit single blocks, **Export** a backup file, or **Reset** to start empty again.

On iPhone: add the site to the Home Screen first and paste your schedule inside the home-screen app,
because Safari and home-screen apps keep separate storage.

## Develop
```
npm install
npm run dev        # http://localhost:5173
npm run build:pages
```
Pushing to `main` deploys to GitHub Pages through `.github/workflows/deploy.yml`.

Map tiles are from OpenStreetMap; road routes come from the public OSRM demo server.
