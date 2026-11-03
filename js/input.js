/* ============================================================
   OLYMPUS: SURVIVAL — Keyboard / gamepad input
   ============================================================ */

const Input = (() => {
  const down = new Set();
  const bindings = {
    p1: Object.assign({}, DEFAULT_BINDINGS.p1),
    p2: Object.assign({}, DEFAULT_BINDINGS.p2)
  };
  const players = {
    p1: { held: {}, prev: {}, pressed: {}, released: {} },
    p2: { held: {}, prev: {}, pressed: {}, released: {} }
  };
  let capture = null;
  let pads = [];
  let anyPressedThisFrame = false;

  function saveBindings() {
    try { localStorage.setItem('olympus_bindings', JSON.stringify(bindings)); } catch (e) { /* ignore */ }
  }

  try {
    const raw = localStorage.getItem('olympus_bindings');
    if (raw) {
      const parsed = JSON.parse(raw);
      let migrated = false;
      for (const pid of ['p1', 'p2']) {
        if (!parsed || !parsed[pid]) continue;
        Object.assign(bindings[pid], parsed[pid]);
        // Move saves that still match a previous default layout onto the new
        // defaults. Custom remaps are left alone.
        const onLegacyDefault = LEGACY_DEFAULT_BINDINGS.some(layout =>
          ACTIONS.every(a => bindings[pid][a.id] === layout[pid][a.id])
        );
        if (onLegacyDefault) {
          Object.assign(bindings[pid], DEFAULT_BINDINGS[pid]);
          migrated = true;
        }
      }
      if (migrated) saveBindings();
    }
  } catch (e) { /* ignore */ }

  const GAME_KEYS = new Set([
    'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Space', 'Tab',
    'KeyW', 'KeyA', 'KeyS', 'KeyD', 'KeyF', 'KeyG', 'KeyH', 'KeyR', 'KeyT', 'KeyY',
    'KeyJ', 'KeyK', 'KeyL', 'KeyU', 'KeyI', 'KeyO'
  ]);

  function isBound(code) {
    for (const p of ['p1', 'p2']) for (const a of ACTIONS) if (bindings[p][a.id] === code) return true;
    return false;
  }

  window.addEventListener('keydown', (e) => {
    if (capture) {
      e.preventDefault();
      const cb = capture;
      capture = null;
      cb(e.code, e.key);
      return;
    }
    if (isBound(e.code) || GAME_KEYS.has(e.code)) e.preventDefault();
    if (!e.repeat) anyPressedThisFrame = true;
    down.add(e.code);
  }, { passive: false });

  window.addEventListener('keyup', (e) => {
    down.delete(e.code);
  });

  window.addEventListener('blur', () => down.clear());

  window.addEventListener('gamepadconnected', (e) => {
    pads[e.gamepad.index] = e.gamepad;
    if (typeof UI !== 'undefined' && UI.toast) UI.toast('Controller connected');
  });

  window.addEventListener('gamepaddisconnected', (e) => {
    delete pads[e.gamepad.index];
  });

  function readPad(index) {
    const gp = navigator.getGamepads ? navigator.getGamepads()[index] : null;
    if (!gp) return null;
    const held = {};
    const ax = gp.axes[0] || 0;
    const ay = gp.axes[1] || 0;
    if (ax < -0.38) held.left = true;
    if (ax > 0.38) held.right = true;
    if (ay < -0.55) held.up = true;
    if (ay > 0.55) held.down = true;
    if (gp.buttons[14] && gp.buttons[14].pressed) held.left = true;
    if (gp.buttons[15] && gp.buttons[15].pressed) held.right = true;
    if (gp.buttons[12] && gp.buttons[12].pressed) held.up = true;
    if (gp.buttons[13] && gp.buttons[13].pressed) held.down = true;
    // A punch, B kick, X special 1, Y special 2, bumpers/triggers block, RT super
    if (gp.buttons[0] && gp.buttons[0].pressed) held.punch = true;
    if (gp.buttons[1] && gp.buttons[1].pressed) held.kick = true;
    if (gp.buttons[2] && gp.buttons[2].pressed) held.s1 = true;
    if (gp.buttons[3] && gp.buttons[3].pressed) held.s2 = true;
    if ((gp.buttons[4] && gp.buttons[4].pressed) ||
        (gp.buttons[5] && gp.buttons[5].pressed) ||
        (gp.buttons[6] && gp.buttons[6].pressed)) held.block = true;
    if (gp.buttons[7] && gp.buttons[7].pressed) held.super = true;
    gp.__startPressed = gp.buttons[9] && gp.buttons[9].pressed;
    return held;
  }

  function poll() {
    anyPressedThisFrame = false;
    const connected = navigator.getGamepads ? navigator.getGamepads() : [];
    for (const pid of ['p1', 'p2']) {
      const p = players[pid];
      p.prev = p.held;
      const held = {};
      for (const a of ACTIONS) {
        if (down.has(bindings[pid][a.id])) held[a.id] = true;
      }
      const padIndex = pid === 'p1' ? 0 : 1;
      if (connected[padIndex]) {
        const pad = readPad(padIndex);
        if (pad) for (const k in pad) if (pad[k]) held[k] = true;
      }
      p.held = held;
      p.pressed = {};
      p.released = {};
      for (const a of ACTIONS) {
        const id = a.id;
        if (held[id] && !p.prev[id]) p.pressed[id] = true;
        if (!held[id] && p.prev[id]) p.released[id] = true;
        if (p.pressed[id]) anyPressedThisFrame = true;
      }
    }
    return players;
  }

  function beginCapture(cb) { capture = cb; }

  function resetPlayer(pid) { players[pid].held = {}; }

  function setBinding(pid, action, code) {
    // Prevent the same physical key from being bound to more than one action.
    for (const p of ['p1', 'p2']) {
      for (const a of ACTIONS) {
        if (p === pid && a.id === action) continue;
        if (bindings[p][a.id] === code) bindings[p][a.id] = null;
      }
    }
    bindings[pid][action] = code;
    saveBindings();
  }

  function resetBindings() {
    Object.assign(bindings.p1, DEFAULT_BINDINGS.p1);
    Object.assign(bindings.p2, DEFAULT_BINDINGS.p2);
    saveBindings();
  }

  return {
    bindings, players, poll, beginCapture, setBinding, resetBindings,
    isBound, keyLabel,
    get anyPressed() { return anyPressedThisFrame; },
    get gamepads() { return navigator.getGamepads ? navigator.getGamepads() : []; }
  };
})();
