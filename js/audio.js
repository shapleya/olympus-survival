/* ============================================================
   OLYMPUS: SURVIVAL — Procedural audio (no asset files)
   ============================================================ */

const AudioSys = (() => {
  let ctx = null;
  let master = null;
  let noiseBuf = null;
  let ambient = null;
  let muted = false;
  let started = false;

  try { muted = localStorage.getItem('olympus_muted') === '1'; } catch (e) { /* ignore */ }

  function ensure() {
    if (ctx) {
      if (ctx.state === 'suspended') ctx.resume();
      return true;
    }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return false;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = muted ? 0 : 0.55;
    master.connect(ctx.destination);
    // prebuild noise
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 1.2, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    started = true;
    return true;
  }

  function toggleMute() {
    muted = !muted;
    if (master) master.gain.setTargetAtTime(muted ? 0 : 0.55, ctx.currentTime, 0.02);
    if (!muted && ambient) ambient.gain.gain.setTargetAtTime(0.07, ctx.currentTime, 0.4);
    else if (ambient) ambient.gain.gain.setTargetAtTime(0, ctx.currentTime, 0.15);
    try { localStorage.setItem('olympus_muted', muted ? '1' : '0'); } catch (e) { /* ignore */ }
    return muted;
  }

  function noise(dur, gain, filterFreq, type, q) {
    if (!ensure() || muted) return;
    const src = ctx.createBufferSource();
    src.buffer = noiseBuf;
    const flt = ctx.createBiquadFilter();
    flt.type = type || 'lowpass';
    flt.frequency.value = filterFreq || 900;
    flt.Q.value = q || 0.8;
    const g = ctx.createGain();
    g.gain.setValueAtTime(gain, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + dur);
    src.connect(flt); flt.connect(g); g.connect(master);
    src.start();
    src.stop(ctx.currentTime + dur);
  }

  function tone(freq, dur, gain, type, slideTo, delay) {
    if (!ensure() || muted) return;
    const t0 = ctx.currentTime + (delay || 0);
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type || 'sine';
    o.frequency.setValueAtTime(freq, t0);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), t0 + dur);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(gain, t0 + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g); g.connect(master);
    o.start(t0); o.stop(t0 + dur + 0.02);
  }

  function chord(freqs, dur, gain, type, delay) {
    freqs.forEach((f, i) => tone(f, dur, gain / freqs.length, type, null, (delay || 0) + i * 0.015));
  }

  const SFX = {
    ui() { tone(660, 0.07, 0.09, 'triangle', 880); },
    select() { chord([523, 659, 784], 0.35, 0.12, 'triangle'); },
    back() { tone(320, 0.12, 0.08, 'triangle', 220); },
    error() { tone(160, 0.2, 0.14, 'square', 110); },
    round() { chord([196, 262, 330], 0.8, 0.13, 'sawtooth'); },
    fight() { chord([330, 415, 494, 660], 0.9, 0.14, 'sawtooth'); },
    ko() {
      tone(160, 0.9, 0.24, 'sawtooth', 42);
      noise(0.7, 0.2, 500, 'lowpass');
      chord([110, 138, 165], 1.3, 0.1, 'triangle', 0.1);
    },
    victory() { chord([392, 494, 587, 784], 1.5, 0.13, 'triangle'); },
    whoosh() { noise(0.16, 0.09, 1800, 'bandpass', 1.2); },
    punch() {
      noise(0.1, 0.34, 1100, 'lowpass');
      tone(120, 0.12, 0.26, 'sine', 55);
    },
    kick() {
      noise(0.13, 0.32, 800, 'lowpass');
      tone(90, 0.16, 0.28, 'sine', 45);
    },
    heavy() {
      noise(0.22, 0.4, 600, 'lowpass');
      tone(72, 0.26, 0.34, 'sine', 34);
    },
    hit() {
      noise(0.08, 0.24, 2000, 'bandpass', 1.5);
      tone(200, 0.08, 0.14, 'square', 90);
    },
    block() {
      noise(0.09, 0.2, 3400, 'bandpass', 4);
      tone(880, 0.09, 0.1, 'square', 620);
    },
    counter() {
      tone(1040, 0.14, 0.16, 'square', 1560);
      noise(0.12, 0.16, 3000, 'bandpass', 2);
    },
    cast() {
      tone(300, 0.32, 0.1, 'sine', 720);
      noise(0.28, 0.07, 1400, 'bandpass', 1.4);
    },
    shoot() {
      noise(0.12, 0.13, 2600, 'bandpass', 2);
      tone(900, 0.14, 0.1, 'triangle', 1600);
    },
    projectile() { tone(520, 0.1, 0.06, 'sine', 260); },
    fire() { noise(0.5, 0.16, 700, 'lowpass'); tone(90, 0.4, 0.14, 'sawtooth', 40); },
    water() { noise(0.5, 0.2, 1200, 'lowpass'); tone(260, 0.4, 0.08, 'sine', 130); },
    thunder() {
      noise(0.7, 0.34, 1200, 'lowpass');
      tone(60, 0.6, 0.24, 'sawtooth', 30);
      tone(1400, 0.08, 0.12, 'square', 400);
    },
    quake() {
      noise(0.8, 0.36, 240, 'lowpass');
      tone(48, 0.8, 0.3, 'sine', 24);
    },
    heal() { chord([523, 659, 784, 1046], 0.8, 0.08, 'sine'); },
    heart() { tone(720, 0.22, 0.09, 'sine', 1080); tone(960, 0.2, 0.06, 'sine', 1280, 0.08); },
    trap() { tone(220, 0.25, 0.1, 'triangle', 110); noise(0.2, 0.1, 600, 'lowpass'); },
    summon() {
      noise(0.35, 0.13, 900, 'bandpass', 2);
      tone(180, 0.35, 0.12, 'sawtooth', 420);
    },
    teleport() { tone(1500, 0.18, 0.1, 'square', 200); noise(0.16, 0.1, 2600, 'bandpass', 2); },
    super() {
      chord([98, 147, 196], 2.0, 0.16, 'sawtooth');
      noise(1.4, 0.18, 400, 'lowpass');
      tone(55, 2.2, 0.2, 'sine', 30);
    },
    superHit() {
      noise(0.5, 0.45, 500, 'lowpass');
      tone(55, 0.7, 0.4, 'sine', 25);
      chord([220, 277, 330], 0.8, 0.12, 'sawtooth');
    },
    charge() { tone(160, 1.2, 0.06, 'sawtooth', 900); },
    meterFull() { chord([784, 988, 1175], 0.5, 0.09, 'triangle'); },
    comboHit(n) {
      const base = 440 * Math.pow(1.059, Math.min(24, (n || 0) * 2));
      tone(base, 0.1, 0.08, 'triangle', base * 1.4);
    }
  };

  function play(name) {
    if (muted) return;
    if (!ensure()) return;
    const fn = SFX[name];
    if (fn) {
      try { fn(); } catch (e) { /* ignore audio errors */ }
    }
  }

  function startAmbient() {
    if (!ensure() || ambient) return;
    const g = ctx.createGain();
    g.gain.value = muted ? 0 : 0.065;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 320;
    filter.Q.value = 1.2;
    const o1 = ctx.createOscillator();
    const o2 = ctx.createOscillator();
    o1.type = 'sawtooth'; o1.frequency.value = 55;
    o2.type = 'sawtooth'; o2.frequency.value = 82.5; o2.detune.value = 8;
    const lfo = ctx.createOscillator();
    const lfoGain = ctx.createGain();
    lfo.frequency.value = 0.07;
    lfoGain.gain.value = 140;
    lfo.connect(lfoGain);
    lfoGain.connect(filter.frequency);
    o1.connect(filter); o2.connect(filter);
    filter.connect(g); g.connect(master);
    o1.start(); o2.start(); lfo.start();
    ambient = { g, o1, o2, lfo, gain: g };
  }

  function stopAmbient() {
    if (!ambient || !ctx) return;
    try {
      ambient.gain.gain.setTargetAtTime(0, ctx.currentTime, 0.25);
      const a = ambient;
      setTimeout(() => {
        try { a.o1.stop(); a.o2.stop(); a.lfo.stop(); } catch (e) { /* ignore */ }
      }, 900);
    } catch (e) { /* ignore */ }
    ambient = null;
  }

  return {
    play, ensure, toggleMute, startAmbient, stopAmbient,
    get muted() { return muted; }
  };
})();
