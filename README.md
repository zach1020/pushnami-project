# PUSHNAMI // Landing Page Tracking System

A multi-service landing page system with A/B testing, real-time metrics tracking, and an admin dashboard. Built with a **vaporwave neo-classical** aesthetic featuring animated 3D models, Greek character rain, neon lightning effects, and a retro floating music player.

## Architecture

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│  Landing Page   │────▶│  A/B Test        │     │  Admin App      │
│  (Node/Express) │     │  Service         │◀────│  (React SPA)    │
│  :3000          │     │  (FastAPI)       │     │  :3001          │
│                 │     │  :8002           │     │                 │
│  - SSR variants │     │  - Experiments   │     │  - Dashboard    │
│  - 3D model     │     │  - Assignments   │     │  - Experiments  │
│  - Music player │     │  - Toggles       │     │  - Toggles      │
│  - MP3 upload   │     │                  │     │  - Event log    │
│    API          │     │                  │     │  - Music mgmt   │
└──────┬──────────┘     └──────────────────┘     └────────┬────────┘
       │                                                  │
       │             ┌──────────────────┐                 │
       └────────────▶│  Metrics         │◀────────────────┘
                     │  Service         │
                     │  (FastAPI)       │
                     │  :8001           │
                     └────────┬─────────┘
                              │
                     ┌────────▼─────────┐
                     │  PostgreSQL 16   │
                     │  :5432           │
                     └──────────────────┘
```

### Services

| Service | Tech Stack | Port | Purpose |
|---------|-----------|------|---------|
| **Landing Page** | Node.js, Express, multer | 3000 | SSR page with A/B variants, 3D model, music player, and MP3 upload API |
| **Metrics Service** | Python 3.12, FastAPI, SQLAlchemy | 8001 | Event ingestion, filtered listing, and aggregated stats with conversion rates |
| **A/B Test Service** | Python 3.12, FastAPI, SQLAlchemy | 8002 | Experiment CRUD, deterministic variant assignment, feature toggles |
| **Admin App** | React 18, Vite, Recharts, nginx | 3001 | Real-time dashboard, experiment management, toggles, music library management |
| **PostgreSQL** | PostgreSQL 16 Alpine | 5432 | Shared persistent data store with JSONB support |

## How to Start

### Prerequisites

- Docker and Docker Compose installed

### Launch

```bash
docker compose up --build
```

All five containers will start with proper health-check ordering (Postgres first, then backend services, then frontend services). First startup takes ~60 seconds for image builds.

### Access

| URL | What |
|-----|------|
| [http://localhost:3000](http://localhost:3000) | Landing page (auto-assigned variant) |
| [http://localhost:3000/?variant=neon](http://localhost:3000/?variant=neon) | Landing page forced to **Neon/Olympus** variant |
| [http://localhost:3000/?variant=synthwave](http://localhost:3000/?variant=synthwave) | Landing page forced to **Synthwave/Agora** variant |
| [http://localhost:3001](http://localhost:3001) | Admin dashboard |
| [http://localhost:8002/docs](http://localhost:8002/docs) | A/B Service Swagger UI |
| [http://localhost:8001/docs](http://localhost:8001/docs) | Metrics Service Swagger UI |

The system seeds a default experiment ("Landing Page Theme" with neon/synthwave variants), four feature toggles, and three music tracks on first startup.

### Teardown

```bash
docker compose down           # stop containers
docker compose down -v        # stop + delete database volume
```

## How It Works

1. A visitor hits the landing page at `:3000`
2. The server assigns a persistent visitor ID via cookie, then requests a variant from the A/B Service (server-side, no client flash)
3. The page renders with variant-specific theming, copy, and a 3D animated sculpture inside a rotating wireframe cube
4. User interactions (page views, button clicks, form submissions, scroll depth, music player actions) are tracked as events sent to the Metrics Service
5. The Admin App at `:3001` displays real-time dashboards, lets you manage experiments, toggle features, and upload music

### A/B Test Variants

| Feature | Neon Variant | Synthwave Variant |
|---------|-------------|-------------------|
| Color palette | Pink / Lavender | Cyan / Mint |
| Hero headline | "ASCEND TO OLYMPUS" | "ENTER THE AGORA" |
| Primary CTA | "Begin Ascension" | "Seek Knowledge" |
| Secondary CTA | "View the Prophecy" | "Read the Scrolls" |

### Feature Toggles

| Toggle | Key | Default | Description |
|--------|-----|---------|-------------|
| Matrix Rain Background | `matrix_rain` | ON | Greek character rain animation |
| Hero Glitch Effect | `hero_glitch` | ON | Chromatic aberration glitch on headline |
| Testimonials Section | `show_testimonials` | ON | Show/hide the testimonials section |
| Music Player | `show_music_player` | ON | Floating TEMPLE.FM retro music player |

### Interactive Features

- **3D Animated Sculpture** — A model-viewer GLB model between the hero and features sections. First button click plays the animation forward (lying down to standing). Subsequent clicks alternate between rewinding and replaying. The model also slowly orbits as the user scrolls.
- **Wireframe Cube** — A CSS 3D wireframe cube surrounds the sculpture, rotating counter-clockwise with neon purple edges.
- **Lightning Effects** — Button clicks spawn neon pink lightning bolts from the top of the viewport to the cursor, plus a second bolt that strikes the wireframe cube with a flash effect.
- **Music Player** — A floating retro pixel player in the bottom-right corner. Plays MP3 tracks with prev/next/play/pause controls, a seek bar, and a volume slider. Track list is loaded dynamically from the server API.
- **Music Upload** — Admins can upload new MP3 files and delete existing ones via the admin dashboard. Changes are reflected immediately in the landing page player.

### Event Tracking

Every meaningful interaction generates a tracked event:

| Event Type | Event Names | Metadata |
|-----------|-------------|----------|
| `page_view` | `landing_page` | referrer, screen width |
| `click` | `cta_primary`, `cta_secondary`, feature cards | element, text |
| `click` | `music_play`, `music_pause`, `music_next`, `music_prev`, `music_track_select` | track name |
| `form_submit` | `contact_form` | has_email, has_company |
| `scroll` | `scroll_25`, `scroll_50`, `scroll_75`, `scroll_100` | percent |
| `engagement` | `time_on_page` | seconds |

## Design Decisions

### Technology Choices

- **FastAPI (Python)** for backend services — Async-native, automatic OpenAPI/Swagger documentation, built-in request validation via Pydantic, and excellent performance for I/O-bound database workloads.
- **Node.js/Express** for the landing page — Server-side rendering ensures the variant is resolved before the page reaches the browser, avoiding layout flash. The server fetches variant assignment and feature toggles via internal service-to-service calls, then injects them into the HTML template.
- **React + Vite + Recharts** for the admin app — Fast development builds, optimized production output, and a proven component model for dashboards. Recharts provides clean data visualization. Served by nginx in production for efficient static file delivery.
- **PostgreSQL** as the single data store — ACID-compliant, handles both relational data (experiments, assignments, toggles) and semi-structured data (event metadata via JSONB). Simpler operationally than running multiple databases.
- **model-viewer 3.5** for 3D rendering — Google's web component provides cross-browser GLB rendering with built-in animation control, camera orbit, and no WebGL boilerplate.
- **Docker Compose** for orchestration — All services communicate over an internal bridge network (`pushnami-net`). Only user-facing ports are exposed to the host.

### Architectural Decisions

- **Deterministic variant assignment** — Uses SHA-256 hashing of `visitor_id + experiment_id`, mapped to configurable traffic split percentages. This is deterministic (same visitor always gets the same variant), evenly distributed, and cacheable (existing assignments are stored in the database to avoid recomputation).
- **Server-side variant resolution** — The landing page server resolves the variant before rendering. This prevents flash-of-unstyled-content and ensures consistent content for search engine crawlers.
- **Feature toggles as a separate concern** — Stored in the A/B service database but with their own API surface (`GET/PUT /api/toggles`). The landing page consumes them server-side to conditionally render sections (testimonials, music player, effects).
- **Event schema with JSONB metadata** — Events have typed, indexed fields (`event_type`, `variant`, `visitor_id`) for efficient querying, plus a flexible `metadata` JSONB column for arbitrary context per event type. This balances query performance with schema flexibility.
- **Dynamic music library** — The music player loads its track list from `/api/tracks` rather than a hardcoded list. Combined with the upload/delete API, this allows the admin to manage the music library without code changes or redeployments.
- **Variant override via query parameter** — Appending `?variant=neon` or `?variant=synthwave` lets QA testers and stakeholders preview specific variants without being locked to their cookie-assigned variant.

## Production Readiness

### Input Validation & Security

- All API inputs are validated via **Pydantic models** with type constraints, length limits, and business rule validation (e.g., traffic splits must total 100%).
- **CORS** is configured with explicit allowed origins on all services. Cookies use `SameSite=lax`.
- **SQL injection** is prevented by SQLAlchemy's parameterized queries — no raw SQL string interpolation anywhere.
- **File upload validation** — The MP3 upload endpoint validates MIME type, enforces a 20MB size limit, and restricts to `.mp3` files only via multer configuration.
- **nginx security headers** — The admin app's nginx config adds `X-Frame-Options`, `X-Content-Type-Options`, and `Referrer-Policy` headers.

### Reliability & Resilience

- **Health checks on every service** — Each container exposes a `/health` endpoint. Docker Compose uses these for startup ordering (`depends_on: condition: service_healthy`) and continuous health monitoring.
- **Graceful degradation** — If the A/B service or metrics service is unreachable, the landing page still renders with a default variant and silently skips event tracking, rather than showing an error page.
- **Database connection pooling** — SQLAlchemy async engine is configured with `pool_size=10`, `max_overflow=20`, and `pool_pre_ping=True` for stale connection detection and recovery.
- **Startup ordering** — Docker Compose health checks ensure PostgreSQL is fully ready before backend services start, and backend services are healthy before frontend services start. No race conditions on boot.

### Performance & Efficiency

- **Database indexing** — The events table has indexes on `visitor_id`, `event_type`, `variant`, `experiment_id`, and `created_at` for efficient filtering, aggregation, and time-range queries.
- **Efficient Docker builds** — Python services use `python:3.12-slim` base images with `--no-cache-dir` pip installs. The admin app uses a **multi-stage build** (Node for building, nginx-alpine for serving), keeping the production image minimal.
- **Static asset serving** — The landing page serves CSS, JS, music, and 3D model files via Express static middleware. The admin app serves its Vite build output via nginx.
- **Async throughout** — Both Python services use async SQLAlchemy with `asyncpg`, and FastAPI's async request handling, ensuring no thread blocking on database I/O.

### Observability

- **Structured logging** — Backend services use Python's logging module with consistent formatting (timestamps, log levels, service names).
- **Comprehensive event tracking** — Every user interaction is captured with structured metadata, enabling funnel analysis, A/B test evaluation, and engagement measurement.
- **Real-time admin dashboard** — Auto-refreshing charts show event distribution, variant performance, conversion rates, and music player engagement metrics.
- **Swagger/OpenAPI documentation** — Both backend services auto-generate interactive API documentation at `/docs`, making the APIs self-documenting and explorable.

## Project Structure

```
pushnami-project/
├── docker-compose.yml          # Orchestrates all 5 services
├── .env                        # Environment variables
├── db/
│   └── init.sql                # Schema, indexes, seed data
├── ab-service/                 # A/B Test Assignment Service (Python/FastAPI)
│   ├── Dockerfile
│   ├── requirements.txt
│   └── app/
│       ├── main.py             # Endpoints: experiments, assignments, toggles
│       ├── models.py           # SQLAlchemy models
│       ├── schemas.py          # Pydantic request/response schemas
│       └── database.py         # Async DB engine & session
├── metrics-service/            # Metrics & Event Tracking Service (Python/FastAPI)
│   ├── Dockerfile
│   ├── requirements.txt
│   └── app/
│       ├── main.py             # Endpoints: events, batch events, stats
│       ├── models.py           # SQLAlchemy Event model
│       ├── schemas.py          # Pydantic schemas with JSONB alias handling
│       └── database.py         # Async DB engine & session
├── landing-page/               # Landing Page (Node.js/Express)
│   ├── Dockerfile
│   ├── package.json
│   ├── server.js               # SSR template, variant logic, music API
│   └── public/
│       ├── script.js           # Client-side: tracking, animation, lightning, music player
│       ├── styles.css           # Vaporwave CSS: grid, cube, player, responsive
│       ├── models/
│       │   └── sculpture.glb   # Animated 3D model
│       └── music/              # MP3 tracks (uploadable via admin)
├── admin-app/                  # Admin Dashboard (React/Vite)
│   ├── Dockerfile              # Multi-stage: Node build → nginx serve
│   ├── nginx.conf
│   ├── package.json
│   └── src/
│       ├── App.jsx             # Tab-based layout with sidebar
│       ├── App.css             # Matching vaporwave admin theme
│       ├── api.js              # API client for all services
│       └── components/
│           ├── Dashboard.jsx   # KPIs, charts, conversion table, music metrics
│           ├── Experiments.jsx # CRUD for A/B experiments
│           ├── FeatureToggles.jsx # Toggle switches + music library management
│           └── EventLog.jsx    # Filterable real-time event stream
└── music-mp3/                  # Source MP3 files
