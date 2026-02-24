# PUSHNAMI // Landing Page Tracking System

A multi-service landing page with A/B testing, real-time metrics, and an admin dashboard. Vaporwave neo-classical aesthetic — think digital marble, neon glows, and Greek philosophy meets cyberpunk.

## Quick Start

```bash
docker compose up --build
```

| URL | What |
|-----|------|
| [localhost:3000](http://localhost:3000) | Landing page |
| [localhost:3000/?variant=neon](http://localhost:3000/?variant=neon) | Force Neon variant |
| [localhost:3000/?variant=synthwave](http://localhost:3000/?variant=synthwave) | Force Synthwave variant |
| [localhost:3001](http://localhost:3001) | Admin dashboard |
| [localhost:8002/docs](http://localhost:8002/docs) | A/B Service API docs |
| [localhost:8001/docs](http://localhost:8001/docs) | Metrics Service API docs |

Teardown: `docker compose down` (add `-v` to wipe the database).

## Architecture

```
Landing Page (:3000)  ──▶  A/B Service (:8002)  ◀──  Admin App (:3001)
       │                                                    │
       └──────────────▶  Metrics Service (:8001)  ◀─────────┘
                                  │
                          PostgreSQL (:5432)
```

| Service | Stack | Purpose |
|---------|-------|---------|
| Landing Page | Node/Express | SSR page with A/B variants, 3D model, music player |
| A/B Service | Python/FastAPI | Experiments, variant assignment, feature toggles |
| Metrics Service | Python/FastAPI | Event ingestion and aggregated stats |
| Admin App | React/Vite/nginx | Dashboard, experiment management, music library |
| PostgreSQL | PostgreSQL 16 | Shared data store |

## How It Works

1. Visitor hits `:3000`, gets a cookie-based visitor ID
2. Server resolves A/B variant and feature toggles server-side (no flash)
3. Page renders with variant-specific theming, copy, and interactive features
4. All interactions are tracked as events sent to the Metrics Service
5. Admin dashboard at `:3001` shows real-time analytics and controls

## Interactive Features

### Core
- **3D Animated Sculpture** — GLB model with play/rewind on button click, scroll-based camera orbit, and a rotating wireframe cube
- **Lightning Effects** — Neon pink bolts strike from the viewport top to cursor and the wireframe cube on click
- **Music Player** — Floating retro TEMPLE.FM player with playlist, seek, volume, and tracks managed via admin
- **Matrix Rain** — Greek character rain background animation

### Scroll-Driven Video Animation
A 60-frame decomposed animation of a cyberpunk temple, placed between "Echoes from Agora" and "Commune With Us." Frames scrub forward/backward based on scroll position. The video is framed with neon corner brackets and edge accents. The "Commune With Us" section slides out from beneath the video as you scroll past it.

### Electric Blue Glow
A watercolor-style electric blue glow bleeds from the video into the contact section. The glow intensifies as the video approaches — driven by scroll progress with an ease-in curve.

### Scroll Particles
Glowing cyan orbs spawn while scrolling through the video section. They float upward on scroll-down and downward on scroll-up, with two layers (some in front of the video, some clipped behind it).

### Cursor Orb
A glowing orb that orbits the cursor with a delayed follow. On proximity intersection, it intensifies and spins with counter-rotating rings. Jitters on click.

### Neon Selection Box
Click-and-drag anywhere to draw a neon cyan selection box with corner brackets. On release, it disintegrates into pixel fragments that scatter and fade.

## A/B Variants

| | Neon | Synthwave |
|---|------|-----------|
| Palette | Pink / Lavender | Cyan / Mint |
| Hero | "ASCEND TO OLYMPUS" | "ENTER THE AGORA" |
| CTA | "Begin Ascension" | "Seek Knowledge" |

## Feature Toggles

| Key | Default | Controls |
|-----|---------|----------|
| `matrix_rain` | ON | Greek character rain |
| `hero_glitch` | ON | Chromatic aberration glitch |
| `show_testimonials` | ON | Testimonials section |
| `show_music_player` | ON | TEMPLE.FM music player |

## Project Structure

```
pushnami-project/
├── docker-compose.yml
├── db/init.sql                  # Schema, indexes, seed data
├── ab-service/                  # A/B Test Service (FastAPI)
├── metrics-service/             # Metrics Service (FastAPI)
├── landing-page/
│   ├── server.js                # SSR template, variant logic, APIs
│   └── public/
│       ├── script.js            # Animations, particles, orb, tracking
│       ├── styles.css           # Vaporwave styles
│       ├── models/sculpture.glb # 3D model
│       ├── music/               # MP3 tracks
│       └── images/cyber-building/ # 60-frame scroll animation
├── admin-app/                   # Admin Dashboard (React/Vite)
└── music-mp3/                   # Source MP3 files
```
