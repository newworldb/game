# Tiny Transport 🚌🚆

A mobile-first web transport tycoon game inspired by Transport Fever / Transport Tycoon.
Pure HTML5 Canvas + vanilla JavaScript — no dependencies, no build step, works offline-ish
and saves automatically to your browser.

## Play

Serve the folder with any static server and open it on your phone or desktop:

```bash
npx serve .
# or
python3 -m http.server 8000
```

Then open `http://localhost:8000` (or your machine's LAN IP from a phone).

## Features

- **Procedural world** — 96×96 map with water, forests, hills, 6 towns and 16 industries,
  pre-connected by country roads. New random world from the menu.
- **Building** — drag to build roads and rails (bridges over water, costly hill cuttings),
  bus stops, truck stops, rail stations, road/rail depots, demolish tool.
- **Lines & vehicles** — create lines as loops of stations, buy buses, trucks and
  passenger/freight trains at depots. 12 vehicle models that unlock over the years
  (1950 → 2005): steam, diesel, electric.
- **Cargo economy** — full supply chains:
  - 🌾 Farm → 🥫 Food Plant → towns
  - 🌲 Lumber Camp → 🪚 Sawmill → 📦 Goods → towns
  - ⛏️ Coal + 🪨 Iron → 🏭 Steel Mill → 🔩 Steel → 🔧 Tool Works → towns
  - 🧍 Passengers between towns
  Payment scales with distance × cargo value.
- **Town growth** — towns that receive passengers, food, goods and tools grow:
  more houses, more passengers, more demand.
- **Economy** — monthly running costs, finance panel with income per cargo,
  construction costs and net result.
- **Mobile controls** — pan, pinch-zoom, tap to inspect, drag-to-build with
  two-finger pan, large touch-friendly UI.
- **Persistence** — autosaves to `localStorage` every 30 s and on tab hide.
- **Time** — pause / 1× / 2× / 4× game speed, in-game calendar starting 1950.

## Development

Game logic is DOM-free (`js/util.js`, `data.js`, `path.js`, `game.js`, `map.js`,
`build.js`, `vehicles.js`) and covered by a headless end-to-end smoke test:

```bash
node test/smoke.js
```

Rendering/UI lives in `js/render.js`, `input.js`, `ui.js`, `save.js`, `main.js`.
