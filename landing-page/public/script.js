/**
 * Pushnami Landing Page - Vaporwave Neo-Classical Edition
 * Client-side tracking & interactions
 */
(function () {
  "use strict";

  const { visitorId, variant, experimentId, metricsUrl, toggles } = window.__CONFIG__;
  const tog = toggles || {};

  // --- Event Tracking ---
  async function trackEvent(eventType, eventName, metadata = {}) {
    try {
      await fetch(`${metricsUrl}/api/events`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          visitor_id: visitorId,
          experiment_id: experimentId,
          variant: variant,
          event_type: eventType,
          event_name: eventName,
          metadata: metadata,
          page_url: window.location.href,
          user_agent: navigator.userAgent,
        }),
      });
    } catch (err) {
      console.warn("Failed to track event:", err.message);
    }
  }

  // Track page view on load
  trackEvent("page_view", "landing_page", {
    referrer: document.referrer || null,
    screen_width: window.innerWidth,
  });

  // --- Click Tracking for data-track elements ---
  document.addEventListener("click", function (e) {
    const tracked = e.target.closest("[data-track]");
    if (tracked) {
      trackEvent("click", tracked.dataset.track, {
        element: tracked.tagName.toLowerCase(),
        text: tracked.textContent.trim().substring(0, 100),
      });
    }
  });

  // --- 3D Sculpture Animation Controller ---
  // First button press: play forward (lying → standing).
  // Every subsequent press: toggle direction (standing → lying → standing → …)
  // Uses RAF polling only — no reliance on model-viewer events.
  const sculptureAnim = {
    hasTriggered: false,   // has the forward animation completed at least once?
    isAtEnd: false,        // is the model frozen at the last frame (standing)?
    isAnimating: false,    // is any animation currently running?
    rafId: null,           // requestAnimationFrame ID
    ready: false,          // is the model loaded and animation system initialized?
    duration: 0,           // cached animation duration
  };

  function initSculpture() {
    const mv = document.getElementById("sculpture");
    if (!mv) return;

    mv.addEventListener("load", () => {
      // Pause immediately — don't let it render the default pose
      mv.pause();
      mv.currentTime = 0;

      // Duration may not be available until after a play/pause cycle.
      // Poll until it is, keeping the model hidden at frame 0.
      function waitForDuration() {
        if (mv.duration && mv.duration > 0) {
          sculptureAnim.duration = mv.duration;
          sculptureAnim.ready = true;
          mv.style.opacity = "1";
          console.log("[sculpture] ready, duration:", sculptureAnim.duration);
        } else {
          // Briefly play and immediately pause to kick-start internals
          mv.play();
          mv.pause();
          mv.currentTime = 0;
          requestAnimationFrame(waitForDuration);
        }
      }
      waitForDuration();
    });
  }

  function playSculptureForward() {
    const mv = document.getElementById("sculpture");
    if (!mv || !sculptureAnim.ready || sculptureAnim.isAnimating) return;

    if (sculptureAnim.rafId) {
      cancelAnimationFrame(sculptureAnim.rafId);
      sculptureAnim.rafId = null;
    }

    sculptureAnim.isAnimating = true;
    sculptureAnim.isAtEnd = false;

    mv.currentTime = 0;
    mv.play();

    const dur = sculptureAnim.duration;
    // Stop at 75% of the animation to avoid the final pose
    const endTime = dur * 0.77;
    let prevTime = 0;

    function watch() {
      const t = mv.currentTime;

      // Catch near-end: pause before model-viewer can loop
      if (t >= endTime && dur > 0) {
        mv.pause();
        mv.currentTime = endTime;
        sculptureAnim.isAnimating = false;
        sculptureAnim.isAtEnd = true;
        sculptureAnim.hasTriggered = true;
        sculptureAnim.rafId = null;
        console.log("[sculpture] forward done, frozen at", mv.currentTime);
        return;
      }

      // Catch wraparound: time jumped backward = it looped past the end
      if (prevTime > dur * 0.5 && t < dur * 0.25) {
        mv.pause();
        mv.currentTime = endTime;
        sculptureAnim.isAnimating = false;
        sculptureAnim.isAtEnd = true;
        sculptureAnim.hasTriggered = true;
        sculptureAnim.rafId = null;
        console.log("[sculpture] forward done (wraparound), frozen at", mv.currentTime);
        return;
      }

      prevTime = t;
      sculptureAnim.rafId = requestAnimationFrame(watch);
    }

    sculptureAnim.rafId = requestAnimationFrame(watch);
  }

  function playSculptureReverse() {
    const mv = document.getElementById("sculpture");
    if (!mv || !sculptureAnim.ready || sculptureAnim.isAnimating) return;

    if (sculptureAnim.rafId) {
      cancelAnimationFrame(sculptureAnim.rafId);
      sculptureAnim.rafId = null;
    }

    sculptureAnim.isAnimating = true;
    sculptureAnim.isAtEnd = false;
    mv.pause();

    // Pin to 75% mark (same point forward freezes at)
    mv.currentTime = sculptureAnim.duration * 0.75;
    console.log("[sculpture] reverse starting from", mv.currentTime);

    let lastTs = performance.now();

    function stepBack(now) {
      const dt = (now - lastTs) / 1000;
      lastTs = now;

      const newTime = mv.currentTime - dt;

      if (newTime <= 0.01) {
        mv.currentTime = 0;
        sculptureAnim.isAnimating = false;
        sculptureAnim.isAtEnd = false;
        sculptureAnim.rafId = null;
        console.log("[sculpture] reverse complete, frozen at start");
        return;
      }

      mv.currentTime = newTime;
      sculptureAnim.rafId = requestAnimationFrame(stepBack);
    }

    sculptureAnim.rafId = requestAnimationFrame(stepBack);
  }

  // Toggle sculpture animation: forward if at start, reverse if at end
  function toggleSculpture() {
    if (!sculptureAnim.ready || sculptureAnim.isAnimating) return;

    if (!sculptureAnim.hasTriggered) {
      playSculptureForward();
    } else if (sculptureAnim.isAtEnd) {
      playSculptureReverse();
    } else {
      playSculptureForward();
    }
  }

  // --- CTA Handler ---
  window.handleCTA = function (type) {
    trackEvent("click", `cta_${type}`, { cta_type: type });

    // Any CTA press toggles the sculpture animation
    toggleSculpture();

    const btn = event.currentTarget;
    const originalText = btn.querySelector(".btn-content").textContent;
    btn.querySelector(".btn-content").textContent = "\u2234 OFFERING RECEIVED";
    btn.style.pointerEvents = "none";
    setTimeout(() => {
      btn.querySelector(".btn-content").textContent = originalText;
      btn.style.pointerEvents = "auto";
    }, 1500);
  };

  // --- Form Submit Handler ---
  window.handleFormSubmit = function (e) {
    e.preventDefault();
    const email = document.getElementById("email").value;
    const company = document.getElementById("company").value;

    trackEvent("form_submit", "contact_form", {
      has_email: !!email,
      has_company: !!company,
    });

    const btn = e.target.querySelector('button[type="submit"]');
    const originalText = btn.querySelector(".btn-content").textContent;
    btn.querySelector(".btn-content").textContent =
      "\u2234 THE ORACLE HAS RECEIVED YOUR WORDS";
    btn.classList.add("success");
    e.target.reset();

    setTimeout(() => {
      btn.querySelector(".btn-content").textContent = originalText;
      btn.classList.remove("success");
    }, 3000);
  };

  // --- Sculpture scroll rotation ---
  // Slowly orbit the camera as the user scrolls the page
  function initSculptureScrollRotation() {
    const mv = document.getElementById("sculpture");
    if (!mv) return;

    const baseOrbitDeg = 0; // starting horizontal orbit angle
    const rotationRange = 60; // total degrees of rotation across a full page scroll

    window.addEventListener("scroll", function () {
      const scrollFraction =
        window.scrollY / (document.documentElement.scrollHeight - window.innerHeight);
      const orbitDeg = baseOrbitDeg + scrollFraction * rotationRange;
      mv.cameraOrbit = `${orbitDeg}deg 80deg 4m`;
    });
  }

  // --- Scroll tracking ---
  let scrollMilestones = { 25: false, 50: false, 75: false, 100: false };
  window.addEventListener(
    "scroll",
    debounce(function () {
      const scrollPercent = Math.round(
        ((window.scrollY + window.innerHeight) /
          document.documentElement.scrollHeight) *
          100
      );
      for (const milestone of [25, 50, 75, 100]) {
        if (scrollPercent >= milestone && !scrollMilestones[milestone]) {
          scrollMilestones[milestone] = true;
          trackEvent("scroll", `scroll_${milestone}`, {
            percent: milestone,
          });
        }
      }
    }, 200)
  );

  function debounce(fn, delay) {
    let timer;
    return function (...args) {
      clearTimeout(timer);
      timer = setTimeout(() => fn.apply(this, args), delay);
    };
  }

  // --- Animated stat counters ---
  function animateCounters() {
    document.querySelectorAll(".stat-value[data-count]").forEach((el) => {
      const target = parseFloat(el.dataset.count);
      const isDecimal = target % 1 !== 0;
      const duration = 2500;
      const start = performance.now();

      function update(now) {
        const elapsed = now - start;
        const progress = Math.min(elapsed / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        const current = target * eased;

        el.textContent = isDecimal
          ? current.toFixed(1)
          : Math.floor(current).toLocaleString();

        if (progress < 1) {
          requestAnimationFrame(update);
        }
      }

      requestAnimationFrame(update);
    });
  }

  // --- Prophecies Fulfilled metric ticker ---
  function initMetricTickers() {
    const section = document.getElementById("metrics");
    if (!section) return;

    let fired = false;

    const observer = new IntersectionObserver(
      (entries) => {
        if (fired || !entries[0].isIntersecting) return;
        fired = true;

        // Animate ring fills
        section.querySelectorAll(".ring-fill[data-progress]").forEach((circle) => {
          const target = parseFloat(circle.dataset.progress);
          circle.style.setProperty("--progress", target);
        });

        // Animate number tickers
        section.querySelectorAll(".metric-value[data-target]").forEach((el) => {
          const target = parseFloat(el.dataset.target);
          const suffix = el.dataset.suffix || "";
          const isDecimal = target % 1 !== 0;
          const duration = 2000;
          const start = performance.now();

          function tick(now) {
            const elapsed = now - start;
            const progress = Math.min(elapsed / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3);
            const current = target * eased;

            el.textContent = (isDecimal ? current.toFixed(1) : Math.floor(current)) + suffix;

            if (progress < 1) requestAnimationFrame(tick);
          }

          requestAnimationFrame(tick);
        });
      },
      { threshold: 0.3 }
    );

    observer.observe(section);
  }

  // --- Greek Character Rain Effect ---
  function initMatrixRain() {
    const canvas = document.getElementById("matrix-rain");
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    // Greek letters, classical symbols, and digits
    const chars =
      "\u0391\u0392\u0393\u0394\u0395\u0396\u0397\u0398\u0399\u039A\u039B\u039C\u039D\u039E\u039F\u03A0\u03A1\u03A3\u03A4\u03A5\u03A6\u03A7\u03A8\u03A9\u03B1\u03B2\u03B3\u03B4\u03B5\u03B6\u03B7\u03B8\u03B9\u03BA\u03BB\u03BC\u03BD\u03BE\u03BF\u03C0\u03C1\u03C3\u03C4\u03C5\u03C6\u03C7\u03C8\u03C9\u2600\u2609\u263D\u2640\u2642\u2643\u2644\u2645\u2646\u2647";
    const fontSize = 16;
    const columns = Math.floor(canvas.width / fontSize);
    const drops = new Array(columns).fill(0).map(() => Math.random() * -50);

    const style = getComputedStyle(document.documentElement);
    const primary = style.getPropertyValue("--primary").trim();
    const secondary = style.getPropertyValue("--secondary").trim();

    function draw() {
      // Slower, dreamier fade for vaporwave feel
      ctx.fillStyle = "rgba(26, 26, 46, 0.04)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.font = `${fontSize}px serif`;

      for (let i = 0; i < drops.length; i++) {
        if (drops[i] < 0) {
          drops[i] += 0.5;
          continue;
        }

        const char = chars[Math.floor(Math.random() * chars.length)];
        // Alternate colors between primary and secondary
        ctx.fillStyle = i % 3 === 0 ? primary : secondary;
        ctx.globalAlpha = 0.6 + Math.random() * 0.4;
        ctx.fillText(char, i * fontSize, drops[i] * fontSize);
        ctx.globalAlpha = 1;

        if (drops[i] * fontSize > canvas.height && Math.random() > 0.985) {
          drops[i] = Math.random() * -20;
        }
        drops[i] += 0.5; // Slower descent
      }
    }

    setInterval(draw, 60);

    window.addEventListener("resize", () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    });
  }

  // --- Theme-aware lightning color palette ---
  const isNeonTheme = variant === "neon";
  const lightning = isNeonTheme
    ? { outer: "255, 113, 206", mid: "255, 140, 220", hex: "#ff71ce", flash: "255, 113, 206" }   // pink
    : { outer: "1, 205, 254",   mid: "80, 220, 255",  hex: "#01cdfe", flash: "1, 205, 254" };    // blue

  // --- Neon Lightning Strike Effect ---
  function spawnLightning(x, y) {
    const canvas = document.createElement("canvas");
    canvas.className = "lightning-canvas";
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    document.body.appendChild(canvas);

    const ctx = canvas.getContext("2d");
    const bolts = [];

    // Generate a jagged lightning bolt from top of screen to the click point
    function generateBolt(startX, startY, endX, endY, depth) {
      const points = [{ x: startX, y: startY }];
      const segments = 8 + Math.floor(Math.random() * 6);
      const dx = (endX - startX) / segments;
      const dy = (endY - startY) / segments;

      for (let i = 1; i < segments; i++) {
        const jitter = (Math.random() - 0.5) * (80 - depth * 20);
        points.push({
          x: startX + dx * i + jitter,
          y: startY + dy * i + (Math.random() - 0.5) * 15,
        });
      }
      points.push({ x: endX, y: endY });

      // Spawn a branch from a random midpoint
      if (depth < 2 && Math.random() > 0.3) {
        const branchIdx = Math.floor(points.length * 0.3 + Math.random() * points.length * 0.4);
        const bp = points[branchIdx];
        const branchLen = 40 + Math.random() * 80;
        const angle = (Math.random() - 0.5) * 1.2 + (endX > startX ? 0.3 : -0.3);
        generateBolt(
          bp.x, bp.y,
          bp.x + Math.cos(angle) * branchLen,
          bp.y + Math.sin(angle + 1) * branchLen,
          depth + 1
        );
      }

      bolts.push({ points, width: Math.max(1, 3 - depth), alpha: 1 - depth * 0.3 });
    }

    // Main bolt: from random point near top down to cursor
    const sourceX = x + (Math.random() - 0.5) * 100;
    generateBolt(sourceX, 0, x, y, 0);

    // Draw all bolts
    function drawBolts() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      for (const bolt of bolts) {
        if (bolt.points.length < 2) continue;

        // Outer bloom glow
        ctx.beginPath();
        ctx.moveTo(bolt.points[0].x, bolt.points[0].y);
        for (let i = 1; i < bolt.points.length; i++) {
          ctx.lineTo(bolt.points[i].x, bolt.points[i].y);
        }
        ctx.strokeStyle = `rgba(${lightning.outer}, ${0.25 * bolt.alpha})`;
        ctx.lineWidth = bolt.width + 12;
        ctx.shadowColor = lightning.hex;
        ctx.shadowBlur = 40;
        ctx.stroke();

        // Mid glow
        ctx.beginPath();
        ctx.moveTo(bolt.points[0].x, bolt.points[0].y);
        for (let i = 1; i < bolt.points.length; i++) {
          ctx.lineTo(bolt.points[i].x, bolt.points[i].y);
        }
        ctx.strokeStyle = `rgba(${lightning.mid}, ${0.6 * bolt.alpha})`;
        ctx.lineWidth = bolt.width + 4;
        ctx.shadowColor = lightning.hex;
        ctx.shadowBlur = 20;
        ctx.stroke();

        // Core bright line
        ctx.beginPath();
        ctx.moveTo(bolt.points[0].x, bolt.points[0].y);
        for (let i = 1; i < bolt.points.length; i++) {
          ctx.lineTo(bolt.points[i].x, bolt.points[i].y);
        }
        ctx.strokeStyle = `rgba(255, 255, 255, ${0.95 * bolt.alpha})`;
        ctx.lineWidth = bolt.width;
        ctx.shadowColor = "#fff";
        ctx.shadowBlur = 8;
        ctx.stroke();
      }

      ctx.shadowBlur = 0;
    }

    // Flash: draw, then flicker, then fade
    drawBolts();

    // Brief screen flash
    ctx.fillStyle = `rgba(${lightning.flash}, 0.06)`;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Flicker effect: quickly redraw with slight variation
    setTimeout(() => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      drawBolts();
    }, 50);

    setTimeout(() => {
      ctx.globalAlpha = 0.5;
      drawBolts();
      ctx.globalAlpha = 1;
    }, 120);

    // Fade out and remove
    setTimeout(() => {
      canvas.classList.add("fade-out");
    }, 200);

    setTimeout(() => {
      canvas.remove();
    }, 600);
  }

  // --- Lightning strike targeting the wireframe cube ---
  function strikeCube() {
    const wrapper = document.querySelector(".wireframe-cube-wrapper");
    if (!wrapper) return;

    const rect = wrapper.getBoundingClientRect();
    // Pick a random point along the edges of the cube's bounding box
    const side = Math.floor(Math.random() * 4);
    let tx, ty;
    switch (side) {
      case 0: tx = rect.left + Math.random() * rect.width; ty = rect.top; break;
      case 1: tx = rect.right; ty = rect.top + Math.random() * rect.height; break;
      case 2: tx = rect.left + Math.random() * rect.width; ty = rect.bottom; break;
      case 3: tx = rect.left; ty = rect.top + Math.random() * rect.height; break;
    }

    // Draw the bolt from the top of the viewport down to the cube edge
    const canvas = document.createElement("canvas");
    canvas.className = "lightning-canvas";
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    document.body.appendChild(canvas);

    const ctx = canvas.getContext("2d");
    const bolts = [];

    function generateBolt(startX, startY, endX, endY, depth) {
      const points = [{ x: startX, y: startY }];
      const segments = 8 + Math.floor(Math.random() * 6);
      const dx = (endX - startX) / segments;
      const dy = (endY - startY) / segments;

      for (let i = 1; i < segments; i++) {
        const jitter = (Math.random() - 0.5) * (80 - depth * 20);
        points.push({
          x: startX + dx * i + jitter,
          y: startY + dy * i + (Math.random() - 0.5) * 15,
        });
      }
      points.push({ x: endX, y: endY });

      if (depth < 2 && Math.random() > 0.4) {
        const branchIdx = Math.floor(points.length * 0.3 + Math.random() * points.length * 0.4);
        const bp = points[branchIdx];
        const branchLen = 30 + Math.random() * 60;
        const angle = (Math.random() - 0.5) * 1.2;
        generateBolt(
          bp.x, bp.y,
          bp.x + Math.cos(angle) * branchLen,
          bp.y + Math.sin(angle + 1) * branchLen,
          depth + 1
        );
      }

      bolts.push({ points, width: Math.max(1, 3 - depth), alpha: 1 - depth * 0.3 });
    }

    const sourceX = tx + (Math.random() - 0.5) * 120;
    generateBolt(sourceX, 0, tx, ty, 0);

    function drawBolts() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (const bolt of bolts) {
        if (bolt.points.length < 2) continue;
        // Outer bloom
        ctx.beginPath();
        ctx.moveTo(bolt.points[0].x, bolt.points[0].y);
        for (let i = 1; i < bolt.points.length; i++) ctx.lineTo(bolt.points[i].x, bolt.points[i].y);
        ctx.strokeStyle = `rgba(${lightning.outer}, ${0.25 * bolt.alpha})`;
        ctx.lineWidth = bolt.width + 12;
        ctx.shadowColor = lightning.hex;
        ctx.shadowBlur = 40;
        ctx.stroke();
        // Mid glow
        ctx.beginPath();
        ctx.moveTo(bolt.points[0].x, bolt.points[0].y);
        for (let i = 1; i < bolt.points.length; i++) ctx.lineTo(bolt.points[i].x, bolt.points[i].y);
        ctx.strokeStyle = `rgba(${lightning.mid}, ${0.6 * bolt.alpha})`;
        ctx.lineWidth = bolt.width + 4;
        ctx.shadowColor = lightning.hex;
        ctx.shadowBlur = 20;
        ctx.stroke();
        // Core
        ctx.beginPath();
        ctx.moveTo(bolt.points[0].x, bolt.points[0].y);
        for (let i = 1; i < bolt.points.length; i++) ctx.lineTo(bolt.points[i].x, bolt.points[i].y);
        ctx.strokeStyle = `rgba(255, 255, 255, ${0.95 * bolt.alpha})`;
        ctx.lineWidth = bolt.width;
        ctx.shadowColor = "#fff";
        ctx.shadowBlur = 8;
        ctx.stroke();
      }
      ctx.shadowBlur = 0;
    }

    drawBolts();

    // Flash the cube
    const cube = document.querySelector(".wireframe-cube");
    if (cube) {
      cube.classList.add("struck");
      setTimeout(() => cube.classList.remove("struck"), 150);
      setTimeout(() => cube.classList.add("struck"), 200);
      setTimeout(() => cube.classList.remove("struck"), 350);
    }

    // Flicker bolt
    setTimeout(() => { ctx.clearRect(0, 0, canvas.width, canvas.height); drawBolts(); }, 50);
    setTimeout(() => { ctx.globalAlpha = 0.5; drawBolts(); ctx.globalAlpha = 1; }, 120);
    setTimeout(() => canvas.classList.add("fade-out"), 250);
    setTimeout(() => canvas.remove(), 650);
  }

  // Attach lightning to button clicks (not sculpture area)
  document.addEventListener("click", function (e) {
    // Skip if clicking inside the sculpture section
    if (e.target.closest(".sculpture-section")) return;
    const btn = e.target.closest(".cyber-btn, button[type='submit']");
    if (btn) {
      spawnLightning(e.clientX, e.clientY);
      // Separate bolt strikes the cube with a slight delay
      setTimeout(() => strikeCube(), 80);
    }
  });

  // Clicking the sculpture/cube area: strike cube + toggle animation
  document.addEventListener("click", function (e) {
    if (e.target.closest(".sculpture-section")) {
      strikeCube();
      toggleSculpture();
    }
  });

  // --- Retro Music Player ---
  async function initMusicPlayer() {
    // Load track list from server API
    let tracks = [];
    try {
      const res = await fetch("/api/tracks");
      tracks = await res.json();
    } catch (err) {
      console.warn("[music] Failed to load tracks:", err.message);
    }
    if (tracks.length === 0) return;

    const audio = new Audio();
    audio.volume = 0.5;
    audio.crossOrigin = "anonymous";
    let currentIdx = 0;
    let isPlaying = false;

    // Web Audio API for waveform visualizer
    let audioCtx = null;
    let analyser = null;
    let sourceNode = null;
    let freqData = null;

    function ensureAudioContext() {
      if (audioCtx) return;
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      analyser = audioCtx.createAnalyser();
      analyser.fftSize = 128;
      analyser.smoothingTimeConstant = 0.8;
      freqData = new Uint8Array(analyser.frequencyBinCount);
      sourceNode = audioCtx.createMediaElementSource(audio);
      sourceNode.connect(analyser);
      analyser.connect(audioCtx.destination);
    }

    // Waveform canvas
    const waveCanvas = document.getElementById("player-waveform");
    const waveCtx = waveCanvas ? waveCanvas.getContext("2d") : null;
    let waveRafId = null;

    function sizeWaveCanvas() {
      if (!waveCanvas) return;
      waveCanvas.width = waveCanvas.clientWidth * (window.devicePixelRatio || 1);
      waveCanvas.height = waveCanvas.clientHeight * (window.devicePixelRatio || 1);
    }
    if (waveCanvas) {
      sizeWaveCanvas();
      window.addEventListener("resize", sizeWaveCanvas);
    }

    function drawWaveform() {
      if (!waveCtx || !analyser) { waveRafId = null; return; }
      analyser.getByteFrequencyData(freqData);

      const w = waveCanvas.width;
      const h = waveCanvas.height;
      waveCtx.clearRect(0, 0, w, h);

      const bars = analyser.frequencyBinCount;
      const barW = w / bars;
      const dpr = window.devicePixelRatio || 1;

      for (let i = 0; i < bars; i++) {
        const val = freqData[i] / 255;
        const barH = val * h;
        const x = i * barW;
        const y = h - barH;

        // Gradient from purple at bottom to pink at top
        const grad = waveCtx.createLinearGradient(x, h, x, y);
        grad.addColorStop(0, "rgba(185, 103, 255, 0.9)");
        grad.addColorStop(0.6, "rgba(255, 113, 206, 0.8)");
        grad.addColorStop(1, "rgba(1, 205, 254, 0.7)");
        waveCtx.fillStyle = grad;
        waveCtx.fillRect(x + 0.5 * dpr, y, barW - 1 * dpr, barH);

        // Top glow cap
        if (val > 0.05) {
          waveCtx.fillStyle = `rgba(255, 230, 245, ${val * 0.6})`;
          waveCtx.fillRect(x + 0.5 * dpr, y, barW - 1 * dpr, 2 * dpr);
        }
      }

      // Scanline overlay
      waveCtx.fillStyle = "rgba(0, 0, 0, 0.08)";
      for (let y = 0; y < h; y += 4 * dpr) {
        waveCtx.fillRect(0, y, w, 1 * dpr);
      }

      waveRafId = requestAnimationFrame(drawWaveform);
    }

    function startWaveform() {
      ensureAudioContext();
      if (audioCtx.state === "suspended") audioCtx.resume();
      if (!waveRafId) waveRafId = requestAnimationFrame(drawWaveform);
    }

    function stopWaveform() {
      if (waveRafId) {
        cancelAnimationFrame(waveRafId);
        waveRafId = null;
      }
      // Draw flat line
      if (waveCtx) {
        waveCtx.clearRect(0, 0, waveCanvas.width, waveCanvas.height);
      }
    }

    const playBtn = document.getElementById("player-play");
    const prevBtn = document.getElementById("player-prev");
    const nextBtn = document.getElementById("player-next");
    const trackDisplay = document.getElementById("player-track");
    const currentEl = document.getElementById("player-current");
    const durationEl = document.getElementById("player-duration");
    const barEl = document.getElementById("player-bar");
    const barWrap = barEl?.parentElement;
    const toggleBtn = document.getElementById("player-toggle");
    const playerBody = document.getElementById("player-body");
    const playlistEl = document.getElementById("player-playlist");

    if (!playBtn) return;

    // Build playlist
    tracks.forEach((t, i) => {
      const btn = document.createElement("button");
      btn.className = "retro-track" + (i === 0 ? " active" : "");
      btn.textContent = `${String(i + 1).padStart(2, "0")} ${t.name.toUpperCase()}`;
      btn.addEventListener("click", () => {
        loadTrack(i);
        playAudio();
        trackEvent("click", "music_track_select", { track: t.name, index: i });
      });
      playlistEl.appendChild(btn);
    });

    function formatTime(s) {
      if (!s || isNaN(s)) return "0:00";
      const m = Math.floor(s / 60);
      const sec = Math.floor(s % 60);
      return `${m}:${sec.toString().padStart(2, "0")}`;
    }

    function loadTrack(idx) {
      currentIdx = idx;
      audio.src = tracks[idx].src;
      trackDisplay.textContent = tracks[idx].name.toUpperCase();
      // Update active state in playlist
      playlistEl.querySelectorAll(".retro-track").forEach((el, i) => {
        el.classList.toggle("active", i === idx);
      });
    }

    function playAudio() {
      audio.play();
      isPlaying = true;
      playBtn.textContent = "\u23F8";
      startWaveform();
      trackEvent("click", "music_play", { track: tracks[currentIdx].name });
    }

    function pauseAudio() {
      audio.pause();
      isPlaying = false;
      playBtn.textContent = "\u25B6";
      stopWaveform();
      trackEvent("click", "music_pause", { track: tracks[currentIdx].name });
    }

    playBtn.addEventListener("click", () => {
      if (!audio.src) loadTrack(0);
      if (isPlaying) {
        pauseAudio();
      } else {
        playAudio();
      }
    });

    prevBtn.addEventListener("click", () => {
      const idx = (currentIdx - 1 + tracks.length) % tracks.length;
      loadTrack(idx);
      if (isPlaying) playAudio();
      trackEvent("click", "music_prev", { track: tracks[idx].name });
    });

    nextBtn.addEventListener("click", () => {
      const idx = (currentIdx + 1) % tracks.length;
      loadTrack(idx);
      if (isPlaying) playAudio();
      trackEvent("click", "music_next", { track: tracks[idx].name });
    });

    // Auto-advance to next track
    audio.addEventListener("ended", () => {
      const idx = (currentIdx + 1) % tracks.length;
      loadTrack(idx);
      playAudio();
    });

    // Progress bar update
    audio.addEventListener("timeupdate", () => {
      if (!audio.duration) return;
      const pct = (audio.currentTime / audio.duration) * 100;
      barEl.style.width = pct + "%";
      currentEl.textContent = formatTime(audio.currentTime);
    });

    audio.addEventListener("loadedmetadata", () => {
      durationEl.textContent = formatTime(audio.duration);
    });

    // Click-to-seek on progress bar
    if (barWrap) {
      barWrap.addEventListener("click", (e) => {
        const rect = barWrap.getBoundingClientRect();
        const pct = (e.clientX - rect.left) / rect.width;
        if (audio.duration) audio.currentTime = pct * audio.duration;
      });
    }

    // Volume slider
    const volumeSlider = document.getElementById("player-volume");
    const volPct = document.getElementById("player-vol-pct");
    if (volumeSlider) {
      volumeSlider.addEventListener("input", () => {
        const vol = parseInt(volumeSlider.value, 10);
        audio.volume = vol / 100;
        volPct.textContent = vol + "%";
      });
    }

    // Minimize toggle
    toggleBtn.addEventListener("click", () => {
      playerBody.classList.toggle("collapsed");
      toggleBtn.textContent = playerBody.classList.contains("collapsed") ? "+" : "\u2013";
      trackEvent("click", "music_player_toggle", {
        state: playerBody.classList.contains("collapsed") ? "minimized" : "expanded",
      });
    });

    // Pre-load first track info
    loadTrack(0);
  }

  // --- Cyber Building Scroll Animation ---
  function initCyberBuilding() {
    const section = document.getElementById("cyber-building");
    const img = document.getElementById("cyber-building-img");
    const progressEl = document.getElementById("cyber-building-progress");
    if (!section || !img) return;

    const TOTAL_FRAMES = 60;
    const PREFIX = "/images/cyber-building/grok-video-a90209b8-1c90-444c-83bc-59af24a0f77b_";

    // Build frame paths
    const framePaths = [];
    for (let i = 0; i < TOTAL_FRAMES; i++) {
      framePaths.push(PREFIX + String(i).padStart(3, "0") + ".jpg");
    }

    // Preload all frames into Image objects
    const frames = framePaths.map((src) => {
      const image = new Image();
      image.src = src;
      return image;
    });

    let currentFrame = -1;
    const contactSection = document.getElementById("contact");

    // Theme-aware color for particles
    const particleRgb = getComputedStyle(document.documentElement).getPropertyValue("--primary-rgb").trim();

    // --- Particle system (two fixed canvases: behind + in front of video) ---
    const particlesEnabled = tog.show_scroll_particles !== false;
    let backCanvas, frontCanvas, backCtx, frontCtx;

    if (particlesEnabled) {
      backCanvas = document.createElement("canvas");
      backCanvas.className = "cyber-particles-layer cyber-particles-back";
      document.body.appendChild(backCanvas);

      frontCanvas = document.createElement("canvas");
      frontCanvas.className = "cyber-particles-layer cyber-particles-front";
      document.body.appendChild(frontCanvas);

      backCtx = backCanvas.getContext("2d");
      frontCtx = frontCanvas.getContext("2d");
    }
    const particles = [];
    let lastScrollY = window.scrollY;
    let scrollDir = -1; // -1 = up (scroll down), 1 = down (scroll up)
    let particleRafId = null;

    function sizeParticleCanvases() {
      if (!particlesEnabled) return;
      backCanvas.width = frontCanvas.width = window.innerWidth;
      backCanvas.height = frontCanvas.height = window.innerHeight;
    }
    if (particlesEnabled) {
      sizeParticleCanvases();
      window.addEventListener("resize", sizeParticleCanvases);
    }

    function spawnParticles(count, intensity, dir) {
      const w = frontCanvas.width;
      const h = frontCanvas.height;
      for (let i = 0; i < count; i++) {
        const x = w * 0.1 + Math.random() * w * 0.8;
        const y = h * 0.3 + Math.random() * h * 0.5;
        const size = 2 + Math.random() * 4;
        particles.push({
          x,
          y,
          vx: (Math.random() - 0.5) * 0.8,
          vy: dir * (0.8 + Math.random() * 1.8),
          size,
          alpha: (0.5 + Math.random() * 0.5) * intensity,
          life: 1.0,
          decay: 0.004 + Math.random() * 0.008,
          layer: Math.random() < 0.5 ? "back" : "front",
        });
      }
    }

    function drawParticle(ctx, p) {
      const a = p.alpha * p.life;

      // Outer glow
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * 4, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${particleRgb}, ${(a * 0.2).toFixed(3)})`;
      ctx.fill();

      // Mid glow
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * 2, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${particleRgb}, ${(a * 0.5).toFixed(3)})`;
      ctx.fill();

      // Bright core
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255, 255, 255, ${(a * 0.95).toFixed(3)})`;
      ctx.fill();
    }

    function tickParticles() {
      backCtx.clearRect(0, 0, backCanvas.width, backCanvas.height);
      frontCtx.clearRect(0, 0, frontCanvas.width, frontCanvas.height);

      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        // Smoothly steer vy toward current scroll direction
        const targetVy = scrollDir * Math.abs(p.vy);
        p.vy += (targetVy - p.vy) * 0.08;
        p.x += p.vx;
        p.y += p.vy;
        p.life -= p.decay;

        if (p.life <= 0) {
          particles.splice(i, 1);
          continue;
        }

        drawParticle(p.layer === "back" ? backCtx : frontCtx, p);
      }

      if (particles.length > 0) {
        particleRafId = requestAnimationFrame(tickParticles);
      } else {
        particleRafId = null;
      }
    }

    function onScroll() {
      const rect = section.getBoundingClientRect();
      const sectionTop = -rect.top;
      const scrollableHeight = section.offsetHeight - window.innerHeight;

      if (scrollableHeight <= 0) return;

      const progress = Math.max(0, Math.min(1, sectionTop / scrollableHeight));
      const frameIndex = Math.min(TOTAL_FRAMES - 1, Math.floor(progress * TOTAL_FRAMES));

      if (frameIndex !== currentFrame && frameIndex >= 0 && frameIndex < TOTAL_FRAMES) {
        currentFrame = frameIndex;
        img.src = frames[frameIndex].src;
        if (progressEl) {
          progressEl.textContent =
            String(frameIndex).padStart(3, "0") + " / " + String(TOTAL_FRAMES - 1).padStart(3, "0");
        }
      }

      // Drive the electric blue glow intensity based on proximity to contact section
      if (contactSection) {
        const glowIntensity = Math.max(0, Math.min(1, (progress - 0.3) / 0.7));
        const eased = glowIntensity * glowIntensity;
        contactSection.style.setProperty("--glow-intensity", eased.toFixed(3));
      }

      // Spawn particles on scroll
      if (particlesEnabled) {
        const currentScrollY = window.scrollY;
        const scrollDelta = currentScrollY - lastScrollY;
        const absDelta = Math.abs(scrollDelta);
        if (absDelta > 1) scrollDir = scrollDelta > 0 ? -1 : 1;
        lastScrollY = currentScrollY;

        const inSection = progress > 0.02 && progress < 0.98;
        const showCanvases = inSection || particles.length > 0 ? "block" : "none";
        backCanvas.style.display = showCanvases;
        frontCanvas.style.display = showCanvases;

        if (absDelta > 1 && inSection) {
          const spawnCount = Math.min(3, Math.ceil(absDelta / 12));
          const intensity = 0.4 + progress * 0.6;
          spawnParticles(spawnCount, intensity, scrollDir);

          if (!particleRafId) {
            particleRafId = requestAnimationFrame(tickParticles);
          }
        }
      }
    }

    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
  }

  // --- Cursor Orb ---
  function initCursorOrb() {
    const orb = document.createElement("div");
    orb.className = "cursor-orb";
    orb.innerHTML = '<span class="cursor-orb-ring"></span><span class="cursor-orb-ring2"></span>';
    document.body.appendChild(orb);

    let mouseX = window.innerWidth / 2;
    let mouseY = window.innerHeight / 2;
    // Anchor follows the cursor with a long delay
    let anchorX = mouseX;
    let anchorY = mouseY;
    let orbAngle = 0;
    let time = 0;

    const ORBIT_RADIUS = 30;
    const ORBIT_SPEED = 1.8;
    const ANCHOR_EASE = 0.018; // slower = longer delay

    let jitterX = 0;
    let jitterY = 0;

    document.addEventListener("mousemove", function (e) {
      mouseX = e.clientX;
      mouseY = e.clientY;
    });

    document.addEventListener("click", function () {
      jitterX = (Math.random() - 0.5) * 60;
      jitterY = (Math.random() - 0.5) * 60;
    });

    function tick() {
      time += 0.016;

      // Decay jitter
      jitterX *= 0.9;
      jitterY *= 0.9;

      // Anchor lazily chases the cursor
      anchorX += (mouseX - anchorX) * ANCHOR_EASE;
      anchorY += (mouseY - anchorY) * ANCHOR_EASE;

      // Orbit around the anchor point
      orbAngle += ORBIT_SPEED * 0.016;
      const orbX = anchorX + Math.cos(orbAngle) * ORBIT_RADIUS + jitterX;
      const orbY = anchorY + Math.sin(orbAngle) * ORBIT_RADIUS + jitterY;

      orb.style.left = orbX + "px";
      orb.style.top = orbY + "px";

      // Proximity detection — distance from orb to actual cursor
      const dx = mouseX - orbX;
      const dy = mouseY - orbY;
      const dist = Math.sqrt(dx * dx + dy * dy);

      const NEAR_THRESHOLD = 35;
      if (dist < NEAR_THRESHOLD) {
        orb.classList.add("near");
      } else {
        orb.classList.remove("near");
      }

      requestAnimationFrame(tick);
    }

    requestAnimationFrame(tick);
  }

  // --- Neon Selection Box ---
  function initNeonSelect() {
    let box = null;
    let startX = 0;
    let startY = 0;
    let dragging = false;

    document.addEventListener("mousedown", function (e) {
      // Don't trigger on buttons, inputs, links, or the music player
      if (e.target.closest("button, input, a, .retro-player, .cyber-btn")) return;

      startX = e.clientX;
      startY = e.clientY;
      dragging = true;

      box = document.createElement("div");
      box.className = "neon-select-box";
      box.style.left = startX + "px";
      box.style.top = startY + "px";
      box.style.width = "0px";
      box.style.height = "0px";
      document.body.appendChild(box);
    });

    document.addEventListener("mousemove", function (e) {
      if (!dragging || !box) return;

      const x = Math.min(e.clientX, startX);
      const y = Math.min(e.clientY, startY);
      const w = Math.abs(e.clientX - startX);
      const h = Math.abs(e.clientY - startY);

      box.style.left = x + "px";
      box.style.top = y + "px";
      box.style.width = w + "px";
      box.style.height = h + "px";
    });

    document.addEventListener("mouseup", function () {
      if (!dragging || !box) return;
      dragging = false;

      const rect = box.getBoundingClientRect();
      const deadBox = box;
      box = null;

      // Too small = just a click, discard
      if (rect.width < 8 || rect.height < 8) {
        deadBox.remove();
        return;
      }

      // Disintegrate: spawn fragments, remove the box
      disintegrate(deadBox, rect);
    });

    // Theme-aware primary color for fragments
    const selectRgb = getComputedStyle(document.documentElement).getPropertyValue("--primary-rgb").trim();

    // Reusable canvas for disintegration — no DOM element spam
    const disintCanvas = document.createElement("canvas");
    disintCanvas.style.cssText = "position:fixed;top:0;left:0;width:100vw;height:100vh;pointer-events:none;z-index:9997;display:none;";
    document.body.appendChild(disintCanvas);
    const disintCtx = disintCanvas.getContext("2d");
    let disintFragments = [];
    let disintRafId = null;

    function sizeDisintCanvas() {
      disintCanvas.width = window.innerWidth;
      disintCanvas.height = window.innerHeight;
    }
    sizeDisintCanvas();
    window.addEventListener("resize", sizeDisintCanvas);

    function disintegrate(el, rect) {
      const COLS = Math.max(2, Math.ceil(rect.width / 24));
      const ROWS = Math.max(2, Math.ceil(rect.height / 24));
      const fragW = rect.width / COLS;
      const fragH = rect.height / ROWS;
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;

      for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
          const fx = rect.left + c * fragW;
          const fy = rect.top + r * fragH;
          disintFragments.push({
            x: fx, y: fy, w: fragW, h: fragH,
            vx: (fx - cx) * 0.02 + (Math.random() - 0.5) * 3,
            vy: (fy - cy) * 0.02 + (Math.random() - 0.5) * 3 - 1,
            alpha: 1,
            rot: 0,
            rotV: (Math.random() - 0.5) * 0.15,
          });
        }
      }

      el.remove();
      disintCanvas.style.display = "block";

      if (!disintRafId) {
        disintRafId = requestAnimationFrame(tickDisint);
      }
    }

    function tickDisint() {
      disintCtx.clearRect(0, 0, disintCanvas.width, disintCanvas.height);

      for (let i = disintFragments.length - 1; i >= 0; i--) {
        const f = disintFragments[i];
        f.x += f.vx;
        f.y += f.vy;
        f.vy += 0.1;
        f.rot += f.rotV;
        f.alpha -= 0.04;

        if (f.alpha <= 0) {
          disintFragments.splice(i, 1);
          continue;
        }

        disintCtx.save();
        disintCtx.translate(f.x + f.w / 2, f.y + f.h / 2);
        disintCtx.rotate(f.rot);
        const s = 0.5 + f.alpha * 0.5;
        disintCtx.scale(s, s);
        disintCtx.globalAlpha = f.alpha;
        disintCtx.fillStyle = `rgba(${selectRgb}, 0.7)`;
        disintCtx.shadowColor = `rgba(${selectRgb}, 0.5)`;
        disintCtx.shadowBlur = 4;
        disintCtx.fillRect(-f.w / 2, -f.h / 2, f.w, f.h);
        disintCtx.restore();
      }

      if (disintFragments.length > 0) {
        disintRafId = requestAnimationFrame(tickDisint);
      } else {
        disintRafId = null;
        disintCanvas.style.display = "none";
      }
    }
  }

  // --- Initialize ---
  document.addEventListener("DOMContentLoaded", function () {
    animateCounters();
    initMetricTickers();
    initMatrixRain();
    initSculpture();
    initSculptureScrollRotation();
    initMusicPlayer();
    if (tog.show_scroll_video !== false) initCyberBuilding();
    if (tog.show_cursor_orb !== false) initCursorOrb();
    if (tog.show_neon_select !== false) initNeonSelect();
  });

  // Track time on page
  let startTime = Date.now();
  window.addEventListener("beforeunload", function () {
    const timeOnPage = Math.round((Date.now() - startTime) / 1000);
    trackEvent("engagement", "time_on_page", {
      seconds: timeOnPage,
    });
  });
})();
