# Campus friend finder (React + Leaflet + OpenStreetMap)

A live map of nearby students, ranked as friend suggestions.

## Run it

```bash
npm install
npm run dev
```

Open the URL Vite prints (usually http://localhost:5173).

## What you see

- OpenStreetMap tiles via Leaflet (react-leaflet).
- Blue pin = you. Drag it, or click anywhere on the map.
- Dots = students walking around campus (simulated, time-lapsed).
- Teal dots with a label = your top 3 suggestions, with walking time.
- Dashed rings = 1/3, 2/3 and the full search radius.
- Sidebar cards show the score split into Nearby / Mutual friends / Interests / Department and year.
- "Add friend" sends a request; it is accepted after about a second, and your
  mutual-friend scores update straight away.

## How a score is calculated (src/lib/recommender.js)

| Factor | Formula |
| --- | --- |
| Nearby | `exp(-distance / 250 m)` |
| Mutual friends | `min(1, mutualCount / 3)` |
| Shared interests | Jaccard similarity of interest sets |
| Department and year | 0.7 for same department + 0.3 for same year |

Each factor is multiplied by its slider weight (normalised to 100%) and summed.

## Make it point at your campus

Edit `src/config.js` and set `CAMPUS.center`. Right-click a spot on openstreetmap.org
and choose "Show address" to read its coordinates. "Use my location" also works:
it moves you and re-creates the simulated students around where you are.

## Going from simulation to real users

`src/hooks/useLiveStudents.js` is the only place that produces student positions.
Replace the `setInterval` random walk with a subscription (Socket.IO, Firebase,
Supabase Realtime) that pushes `{ id, lat, lng }` updates, and send your own
position from `onMoveMe` in `App.jsx`. The recommender does not need to change.

## Notes

- OpenStreetMap's public tile server is fine for demos. For production traffic,
  use a tile provider or host your own tiles (see the OSM tile usage policy).
- Real student locations are personal data: add consent and an on/off visibility toggle first.
