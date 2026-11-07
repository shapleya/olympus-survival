/* ============================================================
   OLYMPUS: SURVIVAL — bootstrap / main loop
   ============================================================ */

(function () {
  let lastTime = 0;
  let padStartPrev = false;
  let started = false;

  // Frame-time readout. Toggle with F3, or open the page with ?perf / #perf.
  let perfEl = null;
  let perfOn = false;
  let perfFrames = 0;
  let perfMs = 0;
  let perfWorst = 0;
  let perfSince = 0;

  function setPerf(on) {
    perfOn = !!on;
    if (perfEl) perfEl.classList.toggle('hidden', !perfOn);
    perfFrames = 0;
    perfMs = 0;
    perfWorst = 0;
    perfSince = performance.now();
  }

  function updatePerf(now, frameMs) {
    if (!perfOn || !perfEl) return;
    perfFrames++;
    perfMs += frameMs;
    if (frameMs > perfWorst) perfWorst = frameMs;
    if (now - perfSince >= 400) {
      const avg = perfMs / Math.max(1, perfFrames);
      const fps = avg > 0 ? Math.round(1000 / avg) : 0;
      perfEl.textContent = `${fps} FPS · ${avg.toFixed(1)} ms · worst ${perfWorst.toFixed(1)} ms`;
      perfFrames = 0;
      perfMs = 0;
      perfWorst = 0;
      perfSince = now;
    }
  }

  function boot() {
    if (started) return;
    started = true;
    const canvas = document.getElementById('game');
    Game.init(canvas);
    UI.init();

    perfEl = document.getElementById('perf');
    const perfRequested = /(?:^|[?&#])perf(?:[=&]|$)/.test(location.search + location.hash);
    setPerf(perfRequested);
    window.addEventListener('keydown', (e) => {
      if (e.code === 'F3') {
        e.preventDefault();
        setPerf(!perfOn);
      }
    });

    lastTime = performance.now();
    requestAnimationFrame(frame);
  }

  function frame(now) {
    const rawMs = now - lastTime;
    const dt = Math.min(0.05, Math.max(0, rawMs / 1000));
    lastTime = now;

    updatePerf(now, rawMs);
    Input.poll();

    // pause with a controller's Start button
    let startDown = false;
    if (navigator.getGamepads) {
      const pads = navigator.getGamepads();
      for (const p of pads) {
        if (p && p.buttons && p.buttons[9] && p.buttons[9].pressed) startDown = true;
      }
    }
    if (startDown && !padStartPrev) UI.togglePause();
    padStartPrev = startDown;

    if (Game.active) {
      if (!Game.paused) Game.update(dt);
      Game.draw();
    } else {
      Game.drawBackdrop(dt);
    }

    requestAnimationFrame(frame);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
