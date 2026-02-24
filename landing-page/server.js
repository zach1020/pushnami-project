const express = require("express");
const cookieParser = require("cookie-parser");
const multer = require("multer");
const fs = require("fs");
const { v4: uuidv4 } = require("uuid");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

// Multer config for MP3 uploads
const musicDir = path.join(__dirname, "public", "music");
if (!fs.existsSync(musicDir)) fs.mkdirSync(musicDir, { recursive: true });
const upload = multer({
  dest: musicDir,
  fileFilter: (req, file, cb) => {
    if (file.mimetype === "audio/mpeg" || file.originalname.endsWith(".mp3")) {
      cb(null, true);
    } else {
      cb(new Error("Only MP3 files are allowed"));
    }
  },
  limits: { fileSize: 20 * 1024 * 1024 }, // 20MB max
});
const AB_SERVICE_URL = process.env.AB_SERVICE_URL || "http://localhost:8002";
const METRICS_SERVICE_URL =
  process.env.METRICS_SERVICE_URL || "http://localhost:8001";
const AB_SERVICE_PUBLIC_URL =
  process.env.AB_SERVICE_PUBLIC_URL || "http://localhost:8002";
const METRICS_SERVICE_PUBLIC_URL =
  process.env.METRICS_SERVICE_PUBLIC_URL || "http://localhost:8001";

app.use(cookieParser());
app.use(express.static(path.join(__dirname, "public")));

// CORS for admin app
app.use("/api", (req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.sendStatus(204);
  next();
});

// API: list available music tracks
app.get("/api/tracks", (req, res) => {
  const files = fs.readdirSync(musicDir).filter((f) => f.endsWith(".mp3"));
  const tracks = files.map((f) => ({
    name: f.replace(/\.mp3$/i, ""),
    src: `/music/${encodeURIComponent(f)}`,
    filename: f,
  }));
  res.json(tracks);
});

// API: upload MP3
app.post("/api/tracks/upload", upload.single("file"), (req, res) => {
  if (!req.file) return res.status(400).json({ detail: "No file uploaded" });
  // Rename from multer temp name to original filename
  const dest = path.join(musicDir, req.file.originalname);
  fs.renameSync(req.file.path, dest);
  res.status(201).json({
    name: req.file.originalname.replace(/\.mp3$/i, ""),
    src: `/music/${encodeURIComponent(req.file.originalname)}`,
    filename: req.file.originalname,
  });
});

// API: delete a track
app.delete("/api/tracks/:filename", (req, res) => {
  const filepath = path.join(musicDir, req.params.filename);
  if (!fs.existsSync(filepath)) return res.status(404).json({ detail: "Not found" });
  fs.unlinkSync(filepath);
  res.sendStatus(204);
});

app.get("/", async (req, res) => {
  // Get or create visitor ID
  let visitorId = req.cookies.visitor_id;
  if (!visitorId) {
    visitorId = uuidv4();
  }

  // Fetch experiments and feature toggles from A/B service (server-side)
  let variant = "neon";
  let experimentId = null;
  let toggles = {};

  // Allow ?variant=neon or ?variant=synthwave to force a variant for testing
  const variantOverride = req.query.variant;

  try {
    // Get active experiments
    const expRes = await fetch(`${AB_SERVICE_URL}/api/experiments`);
    const experiments = await expRes.json();
    const activeExp = experiments.find((e) => e.is_active);

    if (activeExp) {
      experimentId = activeExp.id;

      if (variantOverride && activeExp.variants.includes(variantOverride)) {
        variant = variantOverride;
      } else {
        const assignRes = await fetch(
          `${AB_SERVICE_URL}/api/assign?visitor_id=${encodeURIComponent(visitorId)}&experiment_id=${experimentId}`
        );
        const assignment = await assignRes.json();
        variant = assignment.variant;
      }
    }

    // Get feature toggles
    const toggleRes = await fetch(`${AB_SERVICE_URL}/api/toggles`);
    const toggleList = await toggleRes.json();
    toggles = Object.fromEntries(toggleList.map((t) => [t.key, t.enabled]));
  } catch (err) {
    console.error("Error fetching A/B config:", err.message);
  }

  const html = renderPage(visitorId, variant, experimentId, toggles);

  res.cookie("visitor_id", visitorId, {
    maxAge: 365 * 24 * 60 * 60 * 1000,
    httpOnly: false,
    sameSite: "lax",
  });
  res.type("html").send(html);
});

app.get("/health", (req, res) => {
  res.json({ status: "ok", service: "landing-page" });
});

function renderPage(visitorId, variant, experimentId, toggles) {
  const isNeon = variant === "neon";

  // Vaporwave neo-classical palettes
  const primaryColor = isNeon ? "#ff71ce" : "#01cdfe";
  const secondaryColor = isNeon ? "#b967ff" : "#05ffa1";
  const accentColor = isNeon ? "#fffb96" : "#b967ff";
  const heroTitle = isNeon ? "ASCEND TO OLYMPUS" : "ENTER THE AGORA";
  const heroSubtitle = isNeon
    ? "Divine notification intelligence for the digital pantheon"
    : "Where philosophy meets push notification mastery";
  const ctaText = isNeon ? "Begin Ascension" : "Seek Knowledge";
  const ctaText2 = isNeon ? "View the Prophecy" : "Read the Scrolls";

  const showMatrixRain = toggles.matrix_rain !== false;
  const showGlitch = toggles.hero_glitch !== false;
  const showTestimonials = toggles.show_testimonials !== false;
  const showMusicPlayer = toggles.show_music_player !== false;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>PUSHNAMI // ${variant.toUpperCase()}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Cinzel:wght@400;700;900&family=Cormorant+Garamond:ital,wght@0,300;0,400;0,600;1,400&family=Share+Tech+Mono&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="/styles.css">
  <script type="module" src="https://ajax.googleapis.com/ajax/libs/model-viewer/3.5.0/model-viewer.min.js"><\/script>
  <style>
    :root {
      --primary: ${primaryColor};
      --secondary: ${secondaryColor};
      --accent: ${accentColor};
      --primary-rgb: ${isNeon ? "255, 113, 206" : "1, 205, 254"};
      --secondary-rgb: ${isNeon ? "185, 103, 255" : "5, 255, 161"};
      --accent-rgb: ${isNeon ? "255, 251, 150" : "185, 103, 255"};
    }
  </style>
</head>
<body class="variant-${variant}">
  ${showMatrixRain ? '<canvas id="matrix-rain"></canvas>' : ""}
  <div class="scanlines"></div>
  <div class="vaporwave-gradient"></div>

  <!-- Navigation -->
  <nav class="cyber-nav">
    <div class="nav-brand">
      <span class="brand-icon">\u2BE4</span>
      <span class="brand-text">PUSHNAMI</span>
      <span class="nav-version">MMXXVI</span>
    </div>
    <div class="nav-links">
      <a href="#features" class="nav-link" data-track="nav_features">VIRTUES</a>
      <a href="#metrics" class="nav-link" data-track="nav_metrics">ORACLES</a>
      ${showTestimonials ? '<a href="#testimonials" class="nav-link" data-track="nav_testimonials">ECHOES</a>' : ""}
      <a href="#contact" class="nav-link" data-track="nav_contact">COMMUNE</a>
    </div>
    <div class="nav-status">
      <span class="status-dot"></span>
      <span class="status-text">${variant.toUpperCase()} \u00B7 \u0394\u03B9\u03B3\u03B9\u03C4\u03B1\u03BB</span>
    </div>
  </nav>

  <!-- Hero Section -->
  <section class="hero">
    <div class="hero-grid"></div>
    <div class="hero-columns-left"></div>
    <div class="hero-columns-right"></div>
    <div class="hero-content">
      <div class="hero-tag">\u0391\u03C3\u03BA\u03B7\u03C3\u03B9\u03C2 \u00B7 ${isNeon ? "\u039F\u03BB\u03C5\u03BC\u03C0\u03BF\u03C2" : "\u0391\u03B3\u03BF\u03C1\u03AC"} \u00B7 \u0394\u03CD\u03BD\u03B1\u03BC\u03B9\u03C2</div>
      <h1 class="${showGlitch ? "glitch" : ""}" ${showGlitch ? `data-text="${heroTitle}"` : ""}>
        ${heroTitle}
      </h1>
      <p class="hero-subtitle">${heroSubtitle}</p>
      <p class="hero-quote">${isNeon ? '"The measure of a god is what they do with notifications." \u2014 Digital Prometheus' : '"The unexamined click-through rate is not worth optimizing." \u2014 Socrates.exe'}</p>
      <div class="hero-cta-group">
        <button class="cyber-btn primary" data-track="cta_primary" onclick="handleCTA('primary')">
          <span class="btn-content">${ctaText}</span>
          <span class="btn-glitch"></span>
        </button>
        <button class="cyber-btn secondary" data-track="cta_secondary" onclick="handleCTA('secondary')">
          <span class="btn-content">${ctaText2}</span>
        </button>
      </div>
      <div class="hero-stats">
        <div class="stat-item">
          <span class="stat-value" data-count="2847">0</span>
          <span class="stat-label">DEVOTEES ONLINE</span>
        </div>
        <div class="stat-item">
          <span class="stat-value" data-count="99.7">0</span>
          <span class="stat-label">DIVINE UPTIME %</span>
        </div>
        <div class="stat-item">
          <span class="stat-value" data-count="14">0</span>
          <span class="stat-label">MS TO OLYMPUS</span>
        </div>
      </div>
    </div>
  </section>

  <!-- 3D Sculpture Section -->
  <section class="sculpture-section">
    <div class="sculpture-container">
      <div class="wireframe-cube-wrapper">
        <div class="wireframe-cube">
          <div class="cube-face front"></div>
          <div class="cube-face back"></div>
          <div class="cube-face left"></div>
          <div class="cube-face right"></div>
          <div class="cube-face top"></div>
          <div class="cube-face bottom"></div>
        </div>
      </div>
      <model-viewer
        id="sculpture"
        src="/models/sculpture.glb"
        camera-orbit="0deg 80deg 4m"
        camera-target="0m 0.7m 0m"
        field-of-view="30deg"
        shadow-intensity="0"
        exposure="0.8"
        environment-image="neutral"
        interaction-prompt="none"
        disable-zoom
        disable-pan
        interpolation-decay="100"
      ></model-viewer>
      <div class="sculpture-glow"></div>
    </div>
    <p class="sculpture-caption">\u0391\u03BD\u03AC\u03C3\u03C4\u03B1\u03C3\u03B9\u03C2 \u00B7 Awakening</p>
  </section>

  <!-- Features Section -->
  <section id="features" class="features-section">
    <div class="section-ornament">\u2740 \u2740 \u2740</div>
    <h2 class="section-title">The Six Pillars</h2>
    <p class="section-subtitle">Each virtue, a column in the temple of engagement</p>
    <div class="features-grid">
      <div class="feature-card" data-track="feature_ai">
        <div class="feature-icon">\u2BEF</div>
        <h3>Oracle Engine</h3>
        <p>AI-driven notification delivery that reads the patterns of user behavior like an ancient prophecy, adapting in real-time.</p>
        <div class="feature-tag">\u0391\u0399 \u00B7 PROPHECY</div>
      </div>
      <div class="feature-card" data-track="feature_targeting">
        <div class="feature-icon">\u2641</div>
        <h3>Hermes Targeting</h3>
        <p>Messages delivered with the speed of the gods. Microsecond audience segmentation that finds the right soul at the right moment.</p>
        <div class="feature-tag">\u0398\u0395\u039F\u0399 \u00B7 TARGETING</div>
      </div>
      <div class="feature-card" data-track="feature_analytics">
        <div class="feature-icon">\u2609</div>
        <h3>Apollo Analytics</h3>
        <p>Full-spectrum metrics illuminated like the sun god himself. Variant testing, conversion tracking, and revenue attribution.</p>
        <div class="feature-tag">\u03A6\u03A9\u03A3 \u00B7 ANALYTICS</div>
      </div>
      <div class="feature-card" data-track="feature_integration">
        <div class="feature-icon">\u2627</div>
        <h3>Harmonia Integration</h3>
        <p>Zero-config integration that brings harmony to your existing stack. A single line of code opens the temple gates.</p>
        <div class="feature-tag">\u039B\u039F\u0393\u039F\u03A3 \u00B7 API</div>
      </div>
      <div class="feature-card" data-track="feature_ab_testing">
        <div class="feature-icon">\u2696</div>
        <h3>Athena A/B Trials</h3>
        <p>The goddess of wisdom presides over your experiments. Statistically rigorous variant testing that separates signal from noise with divine clarity.</p>
        <div class="feature-tag">\u03A3\u039F\u03A6\u0399\u0391 \u00B7 TESTING</div>
      </div>
      <div class="feature-card" data-track="feature_realtime">
        <div class="feature-icon">\u269B</div>
        <h3>Chronos Real-Time</h3>
        <p>The titan of time bends to your will. Live dashboards, instant event streams, and sub-second data pipelines keep you ahead of the present.</p>
        <div class="feature-tag">\u03A7\u03A1\u039F\u039D\u039F\u03A3 \u00B7 LIVE</div>
      </div>
    </div>
  </section>

  <!-- Metrics Section -->
  <section id="metrics" class="metrics-section">
    <div class="section-ornament">\u2740 \u2740 \u2740</div>
    <h2 class="section-title">Prophecies Fulfilled</h2>
    <p class="section-subtitle">The oracles speak in numbers</p>
    <div class="metrics-grid">
      <div class="metric-card">
        <div class="metric-ring">
          <svg viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="45" class="ring-bg"/>
            <circle cx="50" cy="50" r="45" class="ring-fill" style="--progress: 340"/>
          </svg>
          <span class="metric-value">94%</span>
        </div>
        <span class="metric-label">Delivery Rate</span>
      </div>
      <div class="metric-card">
        <div class="metric-ring">
          <svg viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="45" class="ring-bg"/>
            <circle cx="50" cy="50" r="45" class="ring-fill" style="--progress: 270"/>
          </svg>
          <span class="metric-value">3.2x</span>
        </div>
        <span class="metric-label">ROI Multiplier</span>
      </div>
      <div class="metric-card">
        <div class="metric-ring">
          <svg viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="45" class="ring-bg"/>
            <circle cx="50" cy="50" r="45" class="ring-fill" style="--progress: 300"/>
          </svg>
          <span class="metric-value">18ms</span>
        </div>
        <span class="metric-label">Avg Response</span>
      </div>
    </div>
  </section>

  ${
    showTestimonials
      ? `
  <!-- Testimonials Section -->
  <section id="testimonials" class="testimonials-section">
    <div class="section-ornament">\u2740 \u2740 \u2740</div>
    <h2 class="section-title">Echoes from the Agora</h2>
    <p class="section-subtitle">Transmissions from those who have ascended</p>
    <div class="testimonials-grid">
      <div class="testimonial-card" data-track="testimonial_1">
        <div class="scroll-header">
          <span class="scroll-numeral">I</span>
          <span class="scroll-title">tablet_alpha.scroll</span>
        </div>
        <div class="scroll-body">
          <p class="scroll-text">"Pushnami increased our engagement by 340%. The oracle targeting is unlike anything we have deployed before. Truly, a gift from the digital gods."</p>
          <p class="scroll-author">\u2014 Archon of Technology, NeonPolis Industries</p>
        </div>
      </div>
      <div class="testimonial-card" data-track="testimonial_2">
        <div class="scroll-header">
          <span class="scroll-numeral">II</span>
          <span class="scroll-title">tablet_beta.scroll</span>
        </div>
        <div class="scroll-body">
          <p class="scroll-text">"We consolidated three separate tools into Pushnami alone. Revenue attribution finally makes sense. Order from chaos \u2014 as the philosophers intended."</p>
          <p class="scroll-author">\u2014 Strategos of Growth, DataStream Polis</p>
        </div>
      </div>
      <div class="testimonial-card" data-track="testimonial_3">
        <div class="scroll-header">
          <span class="scroll-numeral">III</span>
          <span class="scroll-title">tablet_gamma.scroll</span>
        </div>
        <div class="scroll-body">
          <p class="scroll-text">"Integration took ten minutes. Our notification opt-in rate ascended from 4% to 12% overnight. The temple practically built itself."</p>
          <p class="scroll-author">\u2014 Lead Architect, CyberForge Acropolis</p>
        </div>
      </div>
    </div>
  </section>
  `
      : ""
  }

  <!-- Cyber Building Scroll Animation -->
  <section class="cyber-building-section" id="cyber-building">
    <div class="cyber-building-sticky">
      <div class="cyber-building-frame-outer">
        <div class="cyber-building-frame-border">
          <span class="frame-corner frame-corner-tl"></span>
          <span class="frame-corner frame-corner-tr"></span>
          <span class="frame-corner frame-corner-bl"></span>
          <span class="frame-corner frame-corner-br"></span>
          <span class="frame-edge frame-edge-top"></span>
          <span class="frame-edge frame-edge-bottom"></span>
          <span class="frame-edge frame-edge-left"></span>
          <span class="frame-edge frame-edge-right"></span>
          <div class="cyber-building-frame-wrap">
            <img
              id="cyber-building-img"
              src="/images/cyber-building/grok-video-a90209b8-1c90-444c-83bc-59af24a0f77b_000.jpg"
              alt="Digital Temple Ascending"
              class="cyber-building-img"
            />
            <div class="cyber-building-vignette"></div>
          </div>
        </div>
        <div class="frame-glow"></div>
      </div>
      <p class="cyber-building-caption">
        <span class="cyber-building-tag">\u0399\u0395\u03A1\u039F\u039D \u00B7 TEMPLE</span>
        <span class="cyber-building-progress" id="cyber-building-progress">000 / 059</span>
      </p>
    </div>
  </section>

  <!-- Contact / CTA Section -->
  <section id="contact" class="contact-section">
    <div class="contact-content">
      <div class="section-ornament">\u2740 \u2740 \u2740</div>
      <h2 class="section-title">Commune With Us</h2>
      <p class="contact-subtitle">Leave your offering. The oracle will respond.</p>
      <form class="cyber-form" onsubmit="handleFormSubmit(event)">
        <div class="form-group">
          <input type="email" id="email" name="email" placeholder="seeker@olympus.net" required autocomplete="email">
          <label for="email">ELECTRONIC MISSIVE</label>
          <div class="input-line"></div>
        </div>
        <div class="form-group">
          <input type="text" id="company" name="company" placeholder="Your Polis" autocomplete="organization">
          <label for="company">ORGANIZATION</label>
          <div class="input-line"></div>
        </div>
        <button type="submit" class="cyber-btn primary full-width" data-track="form_submit">
          <span class="btn-content">SEND OFFERING</span>
        </button>
      </form>
    </div>
  </section>

  ${showMusicPlayer ? `<!-- Retro Music Player -->
  <div class="retro-player" id="retro-player">
    <div class="retro-player-header">
      <span class="retro-player-title">♫ TEMPLE.FM</span>
      <button class="retro-player-minimize" id="player-toggle">–</button>
    </div>
    <div class="retro-player-body" id="player-body">
      <div class="retro-player-display" id="player-display">
        <span class="retro-marquee" id="player-track">PRESS PLAY</span>
      </div>
      <div class="retro-player-time">
        <span id="player-current">0:00</span>
        <span class="retro-player-bar-wrap">
          <span class="retro-player-bar" id="player-bar"></span>
        </span>
        <span id="player-duration">0:00</span>
      </div>
      <div class="retro-player-controls">
        <button class="retro-btn" id="player-prev">⏮</button>
        <button class="retro-btn retro-btn-play" id="player-play">▶</button>
        <button class="retro-btn" id="player-next">⏭</button>
      </div>
      <div class="retro-player-volume">
        <span class="retro-volume-label">VOL</span>
        <input type="range" class="retro-volume-slider" id="player-volume" min="0" max="100" value="50" />
        <span class="retro-volume-pct" id="player-vol-pct">50%</span>
      </div>
      <div class="retro-player-playlist" id="player-playlist"></div>
    </div>
  </div>` : ''}

  <!-- Footer -->
  <footer class="cyber-footer">
    <div class="footer-content">
      <span class="footer-brand">\u2BE4 PUSHNAMI \u00B7 MMXXVI</span>
      <span class="footer-status">
        <span class="status-dot"></span>
        ALL TEMPLES OPERATIONAL
      </span>
    </div>
  </footer>

  <script>
    window.__CONFIG__ = {
      visitorId: "${visitorId}",
      variant: "${variant}",
      experimentId: ${experimentId ? `"${experimentId}"` : "null"},
      metricsUrl: "${METRICS_SERVICE_PUBLIC_URL}",
      abServiceUrl: "${AB_SERVICE_PUBLIC_URL}",
    };
  </script>
  <script src="/script.js"></script>
</body>
</html>`;
}

app.listen(PORT, () => {
  console.log(`Landing page running on port ${PORT}`);
  console.log(`A/B Service: ${AB_SERVICE_URL}`);
  console.log(`Metrics Service: ${METRICS_SERVICE_URL}`);
});
