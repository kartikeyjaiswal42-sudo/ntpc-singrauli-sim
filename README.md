# NTPC Singrauli Plant Simulation
**An interactive 500 MW coal-unit simulator built from 391 real photos of India's largest power plant.**

## What This Is

This is an educational simulation of NTPC Singrauli Stage-2's 500 MW coal-fired unit, built during my engineering internship from an actual site photo walk-through. It lets students, plant operators, and curious engineers explore how a thermal power station works — from coal yard to grid export — through four different views: a photo console with AI-identified components, a 3D WebGL plant model, a 2D illustrated process-flow diagram with DCS control room, and live satellite imagery of the real site. If you've ever wondered what happens inside a boiler drum or why the FGD stack matters, this is for you.

## Key Features

- **391-photo plant console (`2d/`)** — real JPEGs and MP4s from the Singrauli site, each AI-identified with zone, component name, engineering explanation, and clickable hotspots; includes a searchable component index across 13 plant zones
- **Live plant simulation engine** — `runPlant()` models coal flow, boiler efficiency, turbine MW output, SO₂/PM emissions, cooling water, vacuum, and auxiliary load; sliders for load fraction, coal GCV, and sulphur content update every 200 ms
- **Protection & cascade-trip system** — realistic interlocks (FD fan off → MFT + furnace explosion, FGD bypass → CEMS environmental trip, ESP off → PM trip) with countdown timers, SVG/3D explosion effects, and escalating alarm chains
- **Three illustrated 2D modes** — Process Flow Diagram with animated colour-coded pipes, a dark DCS operator screen with live faceplates and MW trend, and a detailed SVG cutaway poster of boiler internals
- **3D WebGL plant model (`3d/`)** — hand-built Three.js scene with steel-frame structures, animated pipe flow, stack plumes, cooling-tower steam, reflective water, physical sky, and orbit-camera inspection of every major component
- **Real satellite site view (`earth/`)** — embedded Google satellite imagery of the actual NTPC Singrauli plant with a spotting guide linking back to the simulation views

## Tech Stack

| Layer | Technologies |
|---|---|
| **Build** | Vite 6 (multi-page app) |
| **3D** | Three.js 0.170 (WebGL, OrbitControls, Sky shader, RoomEnvironment PMREM) |
| **2D / Illustrated** | Vanilla JavaScript, inline SVG, HTML Canvas |
| **Simulation** | Custom physics engine (`2d/engine.js`, `shared/protection.js`, `shared/impacts.js`) |
| **Catalog** | Python 3 (`build_catalog.py`) — generates `manifest.json` from photo groups |
| **Media** | 391 files in `public/photos/` (387 JPEGs + 4 MP4s) |
| **Dev tools** | Playwright (screenshot verification) |
| **Deployment** | GitHub Pages via `.github/workflows/deploy.yml` |

## How to Run

```bash
# Clone the repository
git clone https://github.com/kartikeyjaiswal42-sudo/ntpc-singrauli-sim.git
cd ntpc-singrauli-sim

# Install dependencies and start dev server (port 3005)
./start.sh
```

Or manually:

```bash
npm install
npm run dev
```

Open in Chrome:
- **http://localhost:3005/** — landing page (pick a view)
- **http://localhost:3005/2d/** — photo console
- **http://localhost:3005/3d/** — 3D plant model
- **http://localhost:3005/illustrated/** — 2D PFD / DCS / cutaway
- **http://localhost:3005/earth/** — satellite site view

**Build for production:**

```bash
npm run build    # outputs to dist/
npm run preview  # preview built site on port 3000
```

**Deploy:** push to `main` — GitHub Actions auto-deploys to GitHub Pages.

**After adding photos:** drop new files into `public/photos/`, then run `python3 build_catalog.py` to regenerate the catalog.

## Project Structure

```
ntpc-singrauli-sim/
├── index.html              # Landing page — links to all four views
├── 2d/                     # Photo console — camera strip, hotspots, component explorer
│   ├── app.js              # UI logic, hotspot rendering, component index modal
│   ├── engine.js           # Plant simulation (runPlant)
│   └── manifest.json       # Per-photo metadata (zone, component, live variables)
├── 3d/                     # WebGL plant — Three.js scene, orbit camera, trip effects
│   ├── plant.js            # Hand-built 3D geometry (boiler, turbine, ESP, FGD, etc.)
│   └── fx.js               # Smoke plumes, pipe flow animation, water ripples
├── illustrated/            # 2D modes — PFD, DCS control room, SVG cutaway
│   ├── pfd.js              # Process Flow Diagram builder
│   └── dcs.js              # Operator screen with live tags and alarms
├── earth/                  # Google satellite embed of the real plant site
├── shared/                 # protection.js (interlock/trip engine), impacts.js
├── public/photos/          # 391 real plant media files (must stay as real files, not symlinks)
├── build_catalog.py        # Regenerates photo catalog from GROUPS definitions
├── vite.config.js          # Multi-page Vite inputs (index, 2d, 3d, illustrated, earth)
├── start.sh                # Dev launcher (port 3005)
└── .github/workflows/      # Auto-deploy to GitHub Pages on push
```

## Why I Built This

I'm a mechanical engineering intern at NTPC Singrauli — a 2,000 MW super thermal power station in Madhya Pradesh. During my site walk-through, I took hundreds of photos of boilers, turbines, ESPs, FGD units, and cooling towers, but realised that most people (including engineering students) never get to see how these systems connect in real time.

I built this simulation with AI-assisted development to turn those photos into something you can actually interact with: shut off the ID fan and watch the furnace trip. Bypass the FGD and see the CEMS alarm cascade. Click a photo of the HP heater and read what it does while watching its live temperature on the DCS screen. It's my way of making 500 MW of thermal engineering feel real — not from a textbook diagram, but from the plant I walk through every day.

## Live Demo

🔗 Live Demo: [Add link here]

*(Deployed at https://kartikeyjaiswal42-sudo.github.io/ntpc-singrauli-sim/)*

## Screenshots

📸 Screenshots: [Add screenshots here]
