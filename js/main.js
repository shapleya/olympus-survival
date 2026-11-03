/* ============================================================
   OLYMPUS: SURVIVAL — bootstrap / main loop
   ============================================================ */

(function () {
  let lastTime = 0;
  let padStartPrev = false;
  let started = false;

  function boot() {
    if (started) return;
    started = true;
    const canvas = document.getElementById('game');
    Game.init(canvas);
    UI.init();

    lastTime = performance.now();
    requestAnimationFrame(frame);
  }

  function frame(now) {
    const dt = Math.min(0.05, Math.max(0, (now - lastTime) / 1000));
    lastTime = now;

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
