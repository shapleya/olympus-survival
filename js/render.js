/* ============================================================
   OLYMPUS: SURVIVAL — Rendering: arenas, characters, effects
   ============================================================ */

const Render = (() => {
  let canvas, ctx, dpr = 1;
  const SERIF = 'Georgia, "Times New Roman", serif';

  function init(el) {
    canvas = el;
    ctx = canvas.getContext('2d');
    resize();
    window.addEventListener('resize', resize);
  }

  function resize() {
    dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = GAME_W * dpr;
    canvas.height = GAME_H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.imageSmoothingEnabled = true;
  }

  function beginFrame() {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
    ctx.clearRect(0, 0, GAME_W, GAME_H);
  }

  /* ---------------- Math helpers ---------------- */
  const lerp = (a, b, t) => a + (b - a) * t;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const easeOut = (t) => 1 - Math.pow(1 - t, 3);
  const easeIn = (t) => t * t * t;
  const easeInOut = (t) => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

  function seeded(i) {
    const x = Math.sin(i * 127.1 + 311.7) * 43758.5453;
    return x - Math.floor(x);
  }

  function roundRect(c, x, y, w, h, r) {
    const rr = Math.min(r, Math.abs(w) / 2, Math.abs(h) / 2);
    c.beginPath();
    c.moveTo(x + rr, y);
    c.arcTo(x + w, y, x + w, y + h, rr);
    c.arcTo(x + w, y + h, x, y + h, rr);
    c.arcTo(x, y + h, x, y, rr);
    c.arcTo(x, y, x + w, y, rr);
    c.closePath();
  }

  function glowCircle(c, x, y, r, color, alpha) {
    const g = c.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, color);
    g.addColorStop(1, 'rgba(0,0,0,0)');
    c.save();
    c.globalAlpha = alpha === undefined ? 0.6 : alpha;
    c.globalCompositeOperation = 'lighter';
    c.fillStyle = g;
    c.beginPath();
    c.arc(x, y, r, 0, Math.PI * 2);
    c.fill();
    c.restore();
  }

  /* ============================================================
     ARENAS
     ============================================================ */
  function drawArena(c, game) {
    const arena = game.arena;
    const t = game.time;
    const id = arena ? arena.id : 'olympus';
    const sky = arena ? arena.sky : ['#0d1230', '#3c2a63', '#c9776b'];
    const g = c.createLinearGradient(0, 0, 0, GAME_H);
    g.addColorStop(0, sky[0]);
    g.addColorStop(0.55, sky[1]);
    g.addColorStop(1, sky[2]);
    c.fillStyle = g;
    c.fillRect(0, 0, GAME_W, GAME_H);

    switch (id) {
      case 'olympus': drawOlympus(c, t, arena); break;
      case 'sea': drawSea(c, t, arena); break;
      case 'forge': drawForge(c, t, arena); break;
      case 'underworld': drawUnderworld(c, t, arena); break;
      case 'garden': drawGarden(c, t, arena); break;
      case 'forest': drawForest(c, t, arena); break;
      default: drawOlympus(c, t, arena);
    }
    drawFloor(c, id, t, arena);
  }

  function drawOlympus(c, t, arena) {
    // sun
    glowCircle(c, 930, 170, 330, 'rgba(255,214,120,0.55)', 0.55);
    c.fillStyle = 'rgba(255,235,180,0.9)';
    c.beginPath(); c.arc(930, 170, 46, 0, Math.PI * 2); c.fill();

    // distant mountains
    for (let layer = 0; layer < 2; layer++) {
      c.fillStyle = layer === 0 ? 'rgba(40,36,70,0.55)' : 'rgba(26,24,50,0.8)';
      c.beginPath();
      c.moveTo(0, 420);
      for (let i = 0; i <= 12; i++) {
        const x = i * 118;
        const y = 380 - seeded(i + layer * 20) * 150 - layer * 20;
        c.lineTo(x, y);
      }
      c.lineTo(GAME_W, 470); c.lineTo(0, 470); c.closePath(); c.fill();
    }

    // clouds
    for (let i = 0; i < 7; i++) {
      const cx = ((i * 233 + t * (8 + i * 3)) % (GAME_W + 400)) - 200;
      const cy = 150 + seeded(i) * 220;
      c.save();
      c.globalAlpha = 0.11 + seeded(i + 4) * 0.1;
      c.fillStyle = '#ffe9c4';
      c.beginPath();
      c.ellipse(cx, cy, 150 + seeded(i) * 80, 26, 0, 0, Math.PI * 2);
      c.ellipse(cx + 70, cy - 14, 100, 22, 0, 0, Math.PI * 2);
      c.fill();
      c.restore();
    }

    // temple pediment behind
    c.save();
    c.fillStyle = 'rgba(226,220,205,0.16)';
    c.beginPath();
    c.moveTo(470, 330); c.lineTo(640, 210); c.lineTo(810, 330); c.closePath(); c.fill();
    for (let i = 0; i < 4; i++) {
      c.fillRect(500 + i * 88, 330, 26, 150);
    }
    c.restore();

    // columns
    const cols = [130, 340, 940, 1150];
    for (let i = 0; i < cols.length; i++) {
      const x = cols[i];
      drawColumn(c, x, 250, 46, GROUND_Y - 250, 'rgba(216,208,190,0.55)', 'rgba(255,216,120,0.35)');
    }

    // braziers
    for (const bx of [60, 1220]) {
      c.fillStyle = 'rgba(30,26,40,0.9)';
      c.fillRect(bx - 6, GROUND_Y - 120, 12, 120);
      c.fillStyle = '#b99b57';
      c.beginPath(); c.ellipse(bx, GROUND_Y - 122, 22, 9, 0, 0, Math.PI * 2); c.fill();
      const fl = 12 + Math.sin(t * 9 + bx) * 5;
      glowCircle(c, bx, GROUND_Y - 140, 60, 'rgba(255,170,60,0.6)', 0.4);
      c.fillStyle = '#ffb347';
      c.beginPath();
      c.moveTo(bx - 10, GROUND_Y - 124);
      c.quadraticCurveTo(bx - 4, GROUND_Y - 150 - fl, bx + 2, GROUND_Y - 128);
      c.quadraticCurveTo(bx + 8, GROUND_Y - 152 - fl * 0.7, bx + 12, GROUND_Y - 124);
      c.fill();
    }

    // god rays
    c.save();
    c.globalCompositeOperation = 'lighter';
    c.globalAlpha = 0.07;
    for (let i = 0; i < 6; i++) {
      c.fillStyle = '#ffe9b0';
      c.beginPath();
      c.moveTo(930, 170);
      c.lineTo(930 - 500 + i * 180, GAME_H);
      c.lineTo(930 - 430 + i * 180, GAME_H);
      c.closePath();
      c.fill();
    }
    c.restore();
  }

  function drawColumn(c, x, y, w, h, color, trim) {
    c.save();
    // shaft
    const g = c.createLinearGradient(x, 0, x + w, 0);
    g.addColorStop(0, 'rgba(0,0,0,0.25)');
    g.addColorStop(0.35, color);
    g.addColorStop(0.7, color);
    g.addColorStop(1, 'rgba(0,0,0,0.35)');
    c.fillStyle = g;
    c.fillRect(x, y, w, h);
    // fluting
    c.strokeStyle = 'rgba(40,32,50,0.18)';
    c.lineWidth = 1;
    for (let i = 1; i < 4; i++) {
      c.beginPath(); c.moveTo(x + i * w / 4, y + 24); c.lineTo(x + i * w / 4, y + h); c.stroke();
    }
    // capital + base
    c.fillStyle = trim;
    c.fillRect(x - 10, y, w + 20, 18);
    c.fillRect(x - 12, y + 8, w + 24, 10);
    c.fillRect(x - 8, y + h - 16, w + 16, 16);
    c.fillRect(x - 14, y + h - 26, w + 28, 12);
    // volutes
    c.beginPath(); c.arc(x - 6, y + 12, 8, 0, Math.PI * 2); c.fill();
    c.beginPath(); c.arc(x + w + 6, y + 12, 8, 0, Math.PI * 2); c.fill();
    c.restore();
  }

  function drawSea(c, t) {
    glowCircle(c, 640, 80, 500, 'rgba(80,220,255,0.4)', 0.35);
    // light rays
    c.save();
    c.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 7; i++) {
      c.globalAlpha = 0.04 + 0.03 * Math.sin(t * 0.7 + i);
      c.fillStyle = '#8ff4ff';
      c.beginPath();
      c.moveTo(120 + i * 170, 0);
      c.lineTo(60 + i * 170, GAME_H);
      c.lineTo(180 + i * 170, GAME_H);
      c.closePath();
      c.fill();
    }
    c.restore();

    // distant ruins
    c.save();
    c.globalAlpha = 0.5;
    for (let i = 0; i < 5; i++) {
      const x = 80 + i * 280;
      const h = 110 + seeded(i) * 110;
      c.fillStyle = 'rgba(12,60,74,0.75)';
      c.fillRect(x, GROUND_Y - h, 34, h);
      c.fillStyle = 'rgba(20,85,96,0.7)';
      c.fillRect(x - 10, GROUND_Y - h - 12, 54, 14);
    }
    c.restore();

    // seaweed
    for (let i = 0; i < 12; i++) {
      const x = seeded(i + 3) * GAME_W;
      c.strokeStyle = 'rgba(30,120,110,0.4)';
      c.lineWidth = 4;
      c.beginPath();
      c.moveTo(x, GROUND_Y);
      for (let j = 1; j <= 5; j++) {
        c.lineTo(x + Math.sin(t * 1.2 + i + j) * 12, GROUND_Y - j * 22);
      }
      c.stroke();
    }

    // fish silhouettes
    for (let i = 0; i < 5; i++) {
      const fx = ((t * (20 + i * 6) + i * 260) % (GAME_W + 300)) - 150;
      const fy = 220 + seeded(i) * 220;
      c.save();
      c.globalAlpha = 0.18;
      c.fillStyle = '#a8e8ff';
      c.beginPath();
      c.ellipse(fx, fy, 26, 9, 0, 0, Math.PI * 2);
      c.moveTo(fx - 24, fy);
      c.lineTo(fx - 40, fy - 9);
      c.lineTo(fx - 40, fy + 9);
      c.fill();
      c.restore();
    }

    // surface caustics
    c.save();
    c.strokeStyle = 'rgba(180,255,255,0.18)';
    c.lineWidth = 3;
    for (let i = 0; i < 4; i++) {
      c.beginPath();
      for (let x = 0; x <= GAME_W; x += 24) {
        const y = 30 + i * 16 + Math.sin(x * 0.02 + t * 2 + i) * 10;
        if (x === 0) c.moveTo(x, y); else c.lineTo(x, y);
      }
      c.stroke();
    }
    c.restore();
  }

  function drawForge(c, t) {
    glowCircle(c, 640, 560, 620, 'rgba(255,110,30,0.45)', 0.65);
    glowCircle(c, 640, 660, 500, 'rgba(255,170,50,0.5)', 0.5);

    // furnace arch
    c.fillStyle = 'rgba(20,14,14,0.9)';
    c.beginPath();
    c.moveTo(470, GROUND_Y);
    c.lineTo(470, 380);
    c.quadraticCurveTo(640, 250, 810, 380);
    c.lineTo(810, GROUND_Y);
    c.closePath();
    c.fill();
    const fg = c.createRadialGradient(640, 520, 20, 640, 520, 220);
    fg.addColorStop(0, 'rgba(255,220,120,0.95)');
    fg.addColorStop(0.45, 'rgba(255,120,30,0.7)');
    fg.addColorStop(1, 'rgba(80,20,0,0)');
    c.fillStyle = fg;
    c.beginPath();
    c.ellipse(640, 530, 210, 150, 0, 0, Math.PI * 2);
    c.fill();

    // furnace mouth
    c.fillStyle = 'rgba(10,5,4,0.9)';
    c.beginPath();
    c.ellipse(640, 540, 110, 90, 0, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = 'rgba(255,190,80,0.85)';
    c.beginPath();
    c.ellipse(640, 548, 76, 54, 0, 0, Math.PI * 2);
    c.fill();
    for (let i = 0; i < 5; i++) {
      c.fillStyle = 'rgba(255,120,30,0.7)';
      c.beginPath();
      c.arc(600 + i * 22, 520 + Math.sin(t * 3 + i) * 8, 6, 0, Math.PI * 2);
      c.fill();
    }

    // pipes running up the walls
    c.save();
    c.strokeStyle = 'rgba(56,40,38,0.9)';
    c.lineWidth = 18;
    c.beginPath(); c.moveTo(80, GROUND_Y); c.lineTo(80, 300); c.quadraticCurveTo(100, 250, 160, 250); c.stroke();
    c.beginPath(); c.moveTo(1200, GROUND_Y); c.lineTo(1200, 320); c.quadraticCurveTo(1180, 260, 1100, 260); c.stroke();
    c.strokeStyle = 'rgba(255,140,50,0.35)';
    c.lineWidth = 4;
    c.beginPath(); c.moveTo(80, GROUND_Y); c.lineTo(80, 300); c.quadraticCurveTo(100, 250, 160, 250); c.stroke();
    c.beginPath(); c.moveTo(1200, GROUND_Y); c.lineTo(1200, 320); c.quadraticCurveTo(1180, 260, 1100, 260); c.stroke();
    c.restore();

    // giant leaning hammer
    c.save();
    c.translate(1130, GROUND_Y - 10);
    c.rotate(-0.55);
    c.fillStyle = 'rgba(30,22,20,0.95)';
    c.fillRect(-8, -220, 16, 220);
    c.fillStyle = 'rgba(72,58,52,0.95)';
    c.fillRect(-44, -250, 88, 54);
    c.fillStyle = 'rgba(255,150,50,0.25)';
    c.fillRect(-44, -250, 88, 8);
    c.restore();

    // weapon rack
    c.save();
    c.strokeStyle = 'rgba(90,70,58,0.8)';
    c.lineWidth = 3;
    for (let i = 0; i < 4; i++) {
      const wx = 170 + i * 22;
      c.beginPath(); c.moveTo(wx, GROUND_Y - 30); c.lineTo(wx + 18, GROUND_Y - 190 - (i % 2) * 20); c.stroke();
      c.fillStyle = 'rgba(180,180,180,0.5)';
      c.beginPath(); c.moveTo(wx + 18, GROUND_Y - 190); c.lineTo(wx + 12, GROUND_Y - 214); c.lineTo(wx + 26, GROUND_Y - 208); c.closePath(); c.fill();
    }
    c.strokeStyle = 'rgba(90,70,58,0.8)';
    c.lineWidth = 6;
    c.beginPath(); c.moveTo(150, GROUND_Y - 30); c.lineTo(280, GROUND_Y - 30); c.stroke();
    c.restore();

    // anvils with hot rims
    for (const ax of [240, 1040]) {
      c.fillStyle = 'rgba(18,14,16,0.95)';
      c.fillRect(ax - 40, GROUND_Y - 60, 80, 60);
      c.fillStyle = '#3a3034';
      c.beginPath();
      c.moveTo(ax - 70, GROUND_Y - 62);
      c.lineTo(ax + 70, GROUND_Y - 62);
      c.lineTo(ax + 50, GROUND_Y - 84);
      c.lineTo(ax - 50, GROUND_Y - 84);
      c.fill();
      c.strokeStyle = 'rgba(255,150,50,0.55)';
      c.lineWidth = 2;
      c.beginPath();
      c.moveTo(ax - 70, GROUND_Y - 62);
      c.lineTo(ax + 70, GROUND_Y - 62);
      c.stroke();
      glowCircle(c, ax, GROUND_Y - 70, 60, 'rgba(255,120,30,0.35)', 0.3);
    }

    // braziers
    for (const bx of [360, 930]) {
      c.fillStyle = 'rgba(40,28,24,0.95)';
      c.fillRect(bx - 5, GROUND_Y - 100, 10, 100);
      c.fillStyle = '#7a5a32';
      c.beginPath(); c.ellipse(bx, GROUND_Y - 102, 24, 8, 0, 0, Math.PI * 2); c.fill();
      const fl = 10 + Math.sin(t * 8 + bx) * 5;
      glowCircle(c, bx, GROUND_Y - 118, 46, 'rgba(255,150,50,0.5)', 0.35);
      c.fillStyle = '#ffb347';
      c.beginPath();
      c.moveTo(bx - 10, GROUND_Y - 104);
      c.quadraticCurveTo(bx, GROUND_Y - 136 - fl, bx + 10, GROUND_Y - 104);
      c.fill();
    }

    // chains
    c.save();
    c.strokeStyle = 'rgba(90,80,80,0.5)';
    c.lineWidth = 4;
    for (let i = 0; i < 4; i++) {
      const x = 120 + i * 340;
      c.beginPath();
      c.moveTo(x, 0);
      for (let y = 0; y < 300; y += 20) {
        c.lineTo(x + Math.sin(y * 0.1 + i) * 6, y);
      }
      c.stroke();
    }
    c.restore();

    // smoke haze
    for (let i = 0; i < 5; i++) {
      c.globalAlpha = 0.06;
      c.fillStyle = '#ffd9a0';
      c.beginPath();
      c.ellipse(200 + i * 240, 380 + Math.sin(t * 0.4 + i) * 20, 180, 60, 0, 0, Math.PI * 2);
      c.fill();
      c.globalAlpha = 1;
    }
  }

  function drawUnderworld(c, t) {
    glowCircle(c, 640, 700, 600, 'rgba(120,60,180,0.35)', 0.5);
    // giant gate structure
    c.save();
    c.fillStyle = 'rgba(18,11,30,0.92)';
    c.fillRect(420, 320, 440, GROUND_Y - 320);
    c.fillStyle = 'rgba(5,3,10,0.98)';
    c.beginPath();
    c.moveTo(470, GROUND_Y);
    c.lineTo(470, 410);
    c.quadraticCurveTo(640, 250, 810, 410);
    c.lineTo(810, GROUND_Y);
    c.closePath();
    c.fill();
    // gate pillars
    c.fillStyle = 'rgba(90,74,112,0.55)';
    c.fillRect(420, 320, 34, GROUND_Y - 320);
    c.fillRect(826, 320, 34, GROUND_Y - 320);
    c.fillStyle = 'rgba(190,170,210,0.25)';
    for (let i = 0; i < 5; i++) {
      c.fillRect(426, 350 + i * 48, 22, 3);
      c.fillRect(832, 350 + i * 48, 22, 3);
    }
    c.strokeStyle = 'rgba(150,110,210,0.6)';
    c.lineWidth = 7;
    c.beginPath();
    c.moveTo(470, GROUND_Y);
    c.lineTo(470, 410);
    c.quadraticCurveTo(640, 250, 810, 410);
    c.lineTo(810, GROUND_Y);
    c.stroke();
    // gate glow
    glowCircle(c, 640, 470, 200, 'rgba(90,255,180,0.16)', 0.4);
    c.restore();

    // chains hanging from the dark
    c.save();
    c.strokeStyle = 'rgba(100,80,120,0.35)';
    c.lineWidth = 3;
    for (let i = 0; i < 6; i++) {
      const x = 100 + i * 220 + Math.sin(t * 0.4 + i) * 6;
      c.beginPath();
      c.moveTo(x, 0);
      c.lineTo(x, 130 + seeded(i) * 90);
      c.stroke();
      c.fillStyle = 'rgba(80,64,100,0.5)';
      c.beginPath();
      c.arc(x, 140 + seeded(i) * 90, 5, 0, Math.PI * 2);
      c.fill();
    }
    c.restore();

    // stalactites
    for (let i = 0; i < 14; i++) {
      const x = seeded(i) * GAME_W;
      const h = 40 + seeded(i + 5) * 150;
      c.fillStyle = 'rgba(14,8,24,0.95)';
      c.beginPath();
      c.moveTo(x - 26, 0); c.lineTo(x + 26, 0); c.lineTo(x, h); c.closePath(); c.fill();
    }

    // floating souls
    for (let i = 0; i < 11; i++) {
      const sx = (seeded(i + 2) * GAME_W + Math.sin(t * 0.4 + i) * 40) % GAME_W;
      const sy = 240 + seeded(i + 9) * 300 + Math.sin(t * 0.8 + i) * 20;
      glowCircle(c, sx, sy, 26 + seeded(i) * 16, 'rgba(160,110,255,0.5)', 0.45);
      c.fillStyle = 'rgba(220,200,255,0.6)';
      c.beginPath(); c.arc(sx, sy, 4, 0, Math.PI * 2); c.fill();
    }

    // bone pillars
    for (const px of [180, 1100]) {
      c.fillStyle = 'rgba(200,180,180,0.2)';
      for (let i = 0; i < 7; i++) {
        c.fillRect(px - 28 + i * 8, GROUND_Y - 190 - i * 6, 7, 190 + i * 6);
        c.beginPath();
        c.arc(px - 25 + i * 8, GROUND_Y - 192 - i * 6, 4, 0, Math.PI * 2);
        c.fill();
      }
    }

    // skull piles
    for (const sx of [90, 1140]) {
      for (let i = 0; i < 4; i++) {
        const x = sx + (seeded(i + sx) - 0.5) * 70;
        const y = GROUND_Y - 8 - i * 14;
        c.fillStyle = 'rgba(210,200,190,0.28)';
        c.beginPath(); c.arc(x, y, 8, 0, Math.PI * 2); c.fill();
        c.fillStyle = 'rgba(20,14,24,0.8)';
        c.beginPath(); c.arc(x - 3, y - 1, 2, 0, Math.PI * 2); c.fill();
        c.beginPath(); c.arc(x + 3, y - 1, 2, 0, Math.PI * 2); c.fill();
      }
    }

    // purple braziers
    for (const bx of [340, 950]) {
      c.fillStyle = 'rgba(40,28,50,0.9)';
      c.fillRect(bx - 5, GROUND_Y - 90, 10, 90);
      c.fillStyle = '#5a4a6a';
      c.beginPath(); c.ellipse(bx, GROUND_Y - 92, 20, 7, 0, 0, Math.PI * 2); c.fill();
      const fl = 12 + Math.sin(t * 7 + bx) * 5;
      glowCircle(c, bx, GROUND_Y - 112, 50, 'rgba(170,90,255,0.55)', 0.4);
      c.fillStyle = 'rgba(190,120,255,0.9)';
      c.beginPath();
      c.moveTo(bx - 9, GROUND_Y - 94);
      c.quadraticCurveTo(bx, GROUND_Y - 130 - fl, bx + 9, GROUND_Y - 94);
      c.fill();
    }

    // mist
    for (let i = 0; i < 5; i++) {
      c.globalAlpha = 0.05;
      c.fillStyle = '#b678ff';
      c.beginPath();
      c.ellipse(150 + i * 260, GROUND_Y - 20 - Math.sin(t * 0.5 + i) * 12, 220, 70, 0, 0, Math.PI * 2);
      c.fill();
      c.globalAlpha = 1;
    }
  }

  function drawGarden(c, t) {
    glowCircle(c, 300, 160, 380, 'rgba(255,160,200,0.4)', 0.4);
    glowCircle(c, 980, 120, 300, 'rgba(255,220,160,0.25)', 0.3);

    // distant hedge wall
    c.fillStyle = 'rgba(36,20,44,0.85)';
    for (let i = 0; i < 6; i++) {
      const x = i * 260 - 40;
      c.beginPath();
      c.ellipse(x, GROUND_Y - 90, 170, 110, 0, 0, Math.PI * 2);
      c.fill();
    }

    // statues on pedestals
    for (const sx of [270, 1010]) {
      c.save();
      c.fillStyle = 'rgba(200,180,200,0.13)';
      c.fillRect(sx - 34, GROUND_Y - 44, 68, 44);
      c.fillRect(sx - 24, GROUND_Y - 66, 48, 22);
      c.fillStyle = 'rgba(230,214,228,0.2)';
      c.beginPath(); c.ellipse(sx, GROUND_Y - 118, 24, 54, 0, 0, Math.PI * 2); c.fill();
      c.beginPath(); c.arc(sx, GROUND_Y - 168, 16, 0, Math.PI * 2); c.fill();
      c.beginPath();
      c.moveTo(sx - 18, GROUND_Y - 140); c.lineTo(sx - 56, GROUND_Y - 100); c.lineTo(sx - 40, GROUND_Y - 92); c.lineTo(sx - 12, GROUND_Y - 116); c.closePath(); c.fill();
      c.fillStyle = 'rgba(255,170,200,0.2)';
      c.beginPath(); c.arc(sx, GROUND_Y - 176, 8, 0, Math.PI * 2); c.fill();
      c.restore();
    }

    // fountain
    c.save();
    c.fillStyle = 'rgba(210,200,210,0.28)';
    c.fillRect(560, GROUND_Y - 190, 160, 30);
    c.fillRect(590, GROUND_Y - 170, 100, 20);
    c.fillRect(620, GROUND_Y - 240, 40, 60);
    c.fillStyle = 'rgba(150,230,255,0.35)';
    c.beginPath(); c.ellipse(640, GROUND_Y - 175, 60, 14, 0, 0, Math.PI * 2); c.fill();
    c.strokeStyle = 'rgba(190,240,255,0.35)';
    c.lineWidth = 3;
    for (let i = -2; i <= 2; i++) {
      c.beginPath();
      c.moveTo(640, GROUND_Y - 240);
      c.quadraticCurveTo(640 + i * 40, GROUND_Y - 300, 640 + i * 90, GROUND_Y - 170);
      c.stroke();
    }
    glowCircle(c, 640, GROUND_Y - 200, 90, 'rgba(150,230,255,0.2)', 0.35);
    c.restore();

    // rose arches
    for (const ax of [70, 1210]) {
      const dir = ax < 640 ? 1 : -1;
      c.strokeStyle = 'rgba(70,36,64,0.8)';
      c.lineWidth = 14;
      c.beginPath();
      c.moveTo(ax, GROUND_Y);
      c.quadraticCurveTo(ax + dir * 120, 220, ax + dir * 260, GROUND_Y);
      c.stroke();
      for (let i = 0; i < 9; i++) {
        const p = i / 8;
        const bx = ax + dir * Math.sin(p * Math.PI) * 130;
        const by = GROUND_Y - Math.sin(p * Math.PI) * 300 + 30;
        glowCircle(c, bx, by, 24, 'rgba(255,110,160,0.5)', 0.45);
        c.fillStyle = i % 2 ? '#ff7fa6' : '#ffb3c8';
        c.beginPath(); c.arc(bx, by, 5, 0, Math.PI * 2); c.fill();
        c.fillStyle = 'rgba(90,180,120,0.45)';
        c.beginPath(); c.ellipse(bx + 7, by + 5, 7, 3, 0.5, 0, Math.PI * 2); c.fill();
      }
    }

    // hanging vines
    for (let i = 0; i < 10; i++) {
      const x = 40 + i * 135;
      const len = 60 + seeded(i + 4) * 150;
      c.strokeStyle = 'rgba(70,120,80,0.5)';
      c.lineWidth = 2.5;
      c.beginPath();
      c.moveTo(x, 0);
      c.quadraticCurveTo(x + Math.sin(t * 0.5 + i) * 12, len * 0.5, x + Math.sin(t * 0.5 + i) * 20, len);
      c.stroke();
      for (let k = 1; k <= 3; k++) {
        c.fillStyle = 'rgba(255,140,180,0.7)';
        c.beginPath();
        c.arc(x + Math.sin(t * 0.5 + i) * 20 * (k / 3), len * (k / 3), 4, 0, Math.PI * 2);
        c.fill();
      }
    }

    // rose bushes at the edges
    for (const bx of [40, 1240]) {
      for (let i = 0; i < 6; i++) {
        c.fillStyle = 'rgba(40,90,60,0.7)';
        c.beginPath();
        c.ellipse(bx + (seeded(i + bx) - 0.5) * 90, GROUND_Y - 20 - seeded(i) * 20, 40, 26, 0, 0, Math.PI * 2);
        c.fill();
        c.fillStyle = '#ff7fa6';
        c.beginPath();
        c.arc(bx + (seeded(i + bx + 3) - 0.5) * 80, GROUND_Y - 30 - seeded(i + 2) * 30, 4, 0, Math.PI * 2);
        c.fill();
      }
    }

    // petals on floor
    for (let i = 0; i < 32; i++) {
      const x = seeded(i) * GAME_W;
      const y = GROUND_Y + 8 + seeded(i + 3) * 80;
      c.fillStyle = 'rgba(255,140,180,0.25)';
      c.beginPath(); c.ellipse(x, y, 5, 3, seeded(i) * 3, 0, Math.PI * 2); c.fill();
    }

    // glowing motes
    for (let i = 0; i < 10; i++) {
      const gx = (seeded(i + 10) * GAME_W + Math.sin(t * 0.4 + i) * 50);
      const gy = 260 + seeded(i + 14) * 280 + Math.cos(t * 0.6 + i) * 20;
      glowCircle(c, gx, gy, 12, 'rgba(255,200,230,0.5)', 0.4);
    }
  }

  function drawForest(c, t) {
    // moon
    glowCircle(c, 1020, 150, 260, 'rgba(190,255,230,0.35)', 0.5);
    c.fillStyle = 'rgba(225,255,240,0.9)';
    c.beginPath(); c.arc(1020, 150, 58, 0, Math.PI * 2); c.fill();
    c.fillStyle = 'rgba(190,220,210,0.25)';
    c.beginPath(); c.arc(1000, 138, 12, 0, Math.PI * 2); c.fill();
    c.beginPath(); c.arc(1042, 172, 8, 0, Math.PI * 2); c.fill();

    // pine layers
    for (let layer = 0; layer < 3; layer++) {
      c.fillStyle = layer === 0 ? 'rgba(10,34,30,0.65)' : layer === 1 ? 'rgba(7,26,24,0.85)' : 'rgba(4,16,16,0.95)';
      for (let i = 0; i < 9; i++) {
        const x = i * 165 + layer * 55 - 80;
        const baseY = 470 + layer * 50;
        const h = 300 - layer * 60 + seeded(i + layer * 9) * 90;
        c.beginPath();
        c.moveTo(x, baseY);
        c.lineTo(x + 70, baseY);
        c.lineTo(x + 35, baseY - h);
        c.closePath();
        c.fill();
      }
    }
    // foreground grass
    c.strokeStyle = 'rgba(40,110,90,0.5)';
    c.lineWidth = 2;
    for (let i = 0; i < 70; i++) {
      const x = seeded(i + 4) * GAME_W;
      const h = 10 + seeded(i) * 26;
      c.beginPath();
      c.moveTo(x, GROUND_Y + 4);
      c.quadraticCurveTo(x + Math.sin(t + i) * 6, GROUND_Y - h * 0.6, x + Math.sin(t + i) * 10, GROUND_Y - h);
      c.stroke();
    }
    // fireflies
    for (let i = 0; i < 12; i++) {
      const fx = (seeded(i + 1) * GAME_W + Math.sin(t * 0.5 + i) * 60);
      const fy = 260 + seeded(i + 5) * 300 + Math.cos(t * 0.7 + i) * 30;
      glowCircle(c, fx, fy, 10, 'rgba(190,255,190,0.7)', 0.5 + Math.sin(t * 3 + i) * 0.2);
    }
    // stone altar
    c.fillStyle = 'rgba(90,110,105,0.35)';
    c.fillRect(560, GROUND_Y - 40, 160, 40);
    c.fillStyle = 'rgba(110,130,125,0.3)';
    c.fillRect(590, GROUND_Y - 70, 100, 30);
  }

  function drawFloor(c, id, t, arena) {
    // stone platform
    const g = c.createLinearGradient(0, GROUND_Y - 10, 0, GAME_H);
    if (id === 'forge') {
      g.addColorStop(0, 'rgba(80,50,40,0.95)');
      g.addColorStop(1, 'rgba(30,18,16,0.98)');
    } else if (id === 'underworld') {
      g.addColorStop(0, 'rgba(50,40,70,0.95)');
      g.addColorStop(1, 'rgba(14,10,22,0.98)');
    } else if (id === 'sea') {
      g.addColorStop(0, 'rgba(30,90,100,0.85)');
      g.addColorStop(1, 'rgba(4,26,38,0.98)');
    } else if (id === 'garden') {
      g.addColorStop(0, 'rgba(80,50,70,0.85)');
      g.addColorStop(1, 'rgba(24,14,24,0.98)');
    } else if (id === 'forest') {
      g.addColorStop(0, 'rgba(36,64,56,0.9)');
      g.addColorStop(1, 'rgba(8,18,18,0.98)');
    } else {
      g.addColorStop(0, 'rgba(120,112,130,0.8)');
      g.addColorStop(1, 'rgba(32,28,42,0.98)');
    }
    c.fillStyle = g;
    c.fillRect(0, GROUND_Y, GAME_W, GAME_H - GROUND_Y);

    // perspective tiles
    c.save();
    c.strokeStyle = 'rgba(255,255,255,0.05)';
    c.lineWidth = 2;
    for (let i = 0; i < 12; i++) {
      const x = i * 120;
      c.beginPath();
      c.moveTo(x, GROUND_Y);
      c.lineTo(x - 90, GAME_H);
      c.stroke();
    }
    for (let i = 1; i < 5; i++) {
      const y = GROUND_Y + Math.pow(i / 5, 1.7) * (GAME_H - GROUND_Y);
      c.beginPath(); c.moveTo(0, y); c.lineTo(GAME_W, y); c.stroke();
    }
    c.restore();

    // gold trim
    const acc = (arena && arena.accent) || '#ffd873';
    const trim = c.createLinearGradient(0, GROUND_Y - 6, 0, GROUND_Y + 8);
    trim.addColorStop(0, 'rgba(255,240,190,0.75)');
    trim.addColorStop(0.5, acc);
    trim.addColorStop(1, 'rgba(120,90,40,0.8)');
    c.fillStyle = trim;
    c.fillRect(0, GROUND_Y - 3, GAME_W, 7);
    c.globalAlpha = 0.18;
    c.fillStyle = acc;
    c.fillRect(0, GROUND_Y + 4, GAME_W, 2);
    c.globalAlpha = 1;

    // cracks
    for (let i = 0; i < 8; i++) {
      const x = seeded(i + 2) * GAME_W;
      c.strokeStyle = 'rgba(0,0,0,0.22)';
      c.lineWidth = 1.5;
      c.beginPath();
      c.moveTo(x, GROUND_Y + 12 + seeded(i) * 60);
      c.lineTo(x + 20, GROUND_Y + 30 + seeded(i + 3) * 60);
      c.lineTo(x + 5, GROUND_Y + 55 + seeded(i + 6) * 50);
      c.stroke();
    }

    if (id === 'forge') {
      // lava channels at the arena edges
      for (const [x0, x1] of [[0, 86], [GAME_W - 86, GAME_W]]) {
        const lg = c.createLinearGradient(0, GROUND_Y + 4, 0, GAME_H);
        lg.addColorStop(0, 'rgba(255,170,60,0.85)');
        lg.addColorStop(0.5, 'rgba(220,70,10,0.75)');
        lg.addColorStop(1, 'rgba(90,20,0,0.9)');
        c.fillStyle = lg;
        c.fillRect(x0, GROUND_Y + 5, x1 - x0, GAME_H - GROUND_Y);
        glowCircle(c, (x0 + x1) / 2, GROUND_Y + 20, 90, 'rgba(255,120,30,0.6)', 0.35);
      }
      // glowing floor cracks
      for (let i = 0; i < 5; i++) {
        const x = 130 + seeded(i + 21) * (GAME_W - 260);
        c.strokeStyle = 'rgba(255,140,40,0.35)';
        c.lineWidth = 2;
        c.beginPath();
        c.moveTo(x, GROUND_Y + 20);
        c.lineTo(x + 25, GROUND_Y + 42);
        c.lineTo(x + 10, GROUND_Y + 70);
        c.stroke();
        glowCircle(c, x + 15, GROUND_Y + 45, 40, 'rgba(255,120,30,0.3)', 0.2);
      }
    } else if (id === 'underworld') {
      // river Styx glow under the stone
      const rg = c.createLinearGradient(0, GROUND_Y, 0, GAME_H);
      rg.addColorStop(0, 'rgba(140,80,240,0.22)');
      rg.addColorStop(0.55, 'rgba(50,20,100,0.1)');
      rg.addColorStop(1, 'rgba(10,4,20,0)');
      c.fillStyle = rg;
      c.fillRect(0, GROUND_Y, GAME_W, GAME_H - GROUND_Y);
      for (let i = 0; i < 6; i++) {
        c.strokeStyle = 'rgba(150,90,255,0.18)';
        c.lineWidth = 2;
        c.beginPath();
        for (let x = 0; x <= GAME_W; x += 40) {
          const y = GROUND_Y + 22 + i * 13 + Math.sin(x * 0.012 + t * 0.8 + i) * 6;
          if (x === 0) c.moveTo(x, y); else c.lineTo(x, y);
        }
        c.stroke();
      }
    } else if (id === 'garden') {
      // mossy edges and fallen petals
      for (let i = 0; i < 14; i++) {
        const x = seeded(i + 31) * GAME_W;
        c.fillStyle = 'rgba(80,130,90,0.16)';
        c.beginPath();
        c.ellipse(x, GROUND_Y + 30 + seeded(i + 3) * 60, 30 + seeded(i) * 30, 8, 0, 0, Math.PI * 2);
        c.fill();
      }
      for (let i = 0; i < 16; i++) {
        c.fillStyle = 'rgba(255,150,185,0.3)';
        c.beginPath();
        c.ellipse(seeded(i + 44) * GAME_W, GROUND_Y + 12 + seeded(i + 7) * 90, 4, 2, seeded(i) * 3, 0, Math.PI * 2);
        c.fill();
      }
    } else if (id === 'sea') {
      // caustic ripples
      for (let i = 0; i < 4; i++) {
        c.strokeStyle = 'rgba(140,240,255,0.1)';
        c.lineWidth = 2;
        c.beginPath();
        for (let x = 0; x <= GAME_W; x += 30) {
          const y = GROUND_Y + 24 + i * 20 + Math.sin(x * 0.02 + t + i) * 5;
          if (x === 0) c.moveTo(x, y); else c.lineTo(x, y);
        }
        c.stroke();
      }
    } else if (id === 'forest') {
      // moss and roots
      for (let i = 0; i < 18; i++) {
        const x = seeded(i + 60) * GAME_W;
        c.strokeStyle = 'rgba(60,130,100,0.16)';
        c.lineWidth = 2;
        c.beginPath();
        c.moveTo(x, GROUND_Y + 8);
        c.quadraticCurveTo(x + 12, GROUND_Y + 30, x + 4, GROUND_Y + 55);
        c.stroke();
      }
    }
  }

  /* ============================================================
     CHARACTER RIG
     ============================================================ */
  const VIS = {
    athena: { scale: 1.0, bulk: 1.0, gown: false, cape: '#2f6fb5', helm: 'athena', weapon: 'spear', offhand: 'shield', skirt: '#e7eef7' },
    hera: { scale: 1.0, bulk: 0.95, gown: true, cape: null, helm: 'crown', weapon: 'sceptre', offhand: null, peacock: true },
    poseidon: { scale: 1.07, bulk: 1.14, gown: false, cape: null, helm: 'sea', weapon: 'trident', offhand: null, beard: '#e8e2d0' },
    hephaestus: { scale: 1.08, bulk: 1.32, gown: false, cape: null, helm: null, weapon: 'hammer', offhand: null, beard: '#3a2b22', apron: true },
    furies: { scale: 1.0, bulk: 0.94, gown: false, cape: '#2a0a15', helm: null, weapon: 'claws', offhand: null, wings: true },
    aphrodite: { scale: 0.95, bulk: 0.9, gown: true, cape: null, helm: null, weapon: 'mirror', offhand: null, hairLong: true },
    apollo: { scale: 1.0, bulk: 1.0, gown: false, cape: '#b8821f', helm: 'laurel', weapon: 'bow', offhand: null },
    ares: { scale: 1.05, bulk: 1.2, gown: false, cape: '#8f1f1f', helm: 'ares', weapon: 'sword', offhand: 'shield' },
    artemis: { scale: 0.96, bulk: 0.95, gown: false, cape: null, helm: 'circlet', weapon: 'bow', offhand: null, quiver: true },
    zeus: { scale: 1.09, bulk: 1.12, gown: true, cape: '#2b4a8f', helm: 'crown', weapon: 'bolt', offhand: null, beard: '#f2ead8' }
  };

  const WEAPON_DEFAULT = {
    spear: -0.6, trident: -0.55, hammer: -1.9, sceptre: -0.5,
    sword: 0.45, bolt: -0.35, bow: -0.1, claws: 0, mirror: 0.6
  };

  function makePose() {
    return {
      hipOff: 0, lean: 0, bob: 0, head: 0,
      armB: [0.42, 1.45], armF: [0.55, 1.35],
      legB: [-0.24, 0.16], legF: [0.2, -0.18],
      weapon: null, shield: 0.2, spin: 1, shadowAlpha: 1, gowned: false
    };
  }

  function getPose(f, t) {
    const p = makePose();
    const H = 205 * (VIS[f.char.id] ? VIS[f.char.id].scale : 1);
    const v = VIS[f.char.id] || VIS.athena;
    p.weapon = WEAPON_DEFAULT[v.weapon] !== undefined ? WEAPON_DEFAULT[v.weapon] : 0;
    const st = f.state;
    const bob = Math.sin(t * 2.3 + f.animOffset) * H * 0.005;

    if (st === 'idle' && !f.ko) {
      p.bob = bob;
      p.lean = 0.02;
      p.hipOff = Math.sin(t * 2.3 + f.animOffset) * H * 0.004;
    }

    if (st === 'walk' || st === 'dash') {
      const ph = f.gait || t * 9;
      const sp = st === 'dash' ? 1.5 : 1;
      p.legB = [Math.sin(ph) * 0.55 * sp - 0.1, 0.25 + Math.max(0, Math.sin(ph)) * 0.4];
      p.legF = [-Math.sin(ph) * 0.55 * sp + 0.1, 0.25 + Math.max(0, -Math.sin(ph)) * 0.4];
      p.armB = [0.42 - Math.sin(ph) * 0.28, 1.45];
      p.armF = [0.55 + Math.sin(ph) * 0.24, 1.35];
      p.bob = Math.abs(Math.sin(ph)) * H * 0.012;
      p.lean = st === 'dash' ? 0.12 : 0.04;
    }

    if (st === 'crouch' || (f.crouching && st !== 'jump' && st !== 'attack' && st !== 'hit')) {
      p.hipOff = H * 0.16;
      p.legB = [-0.5, 1.35];
      p.legF = [0.5, -1.2];
      p.armB = [0.55, 1.45];
      p.armF = [0.7, 1.35];
      p.lean = 0.05;
    }

    if (st === 'jump' || st === 'air') {
      const up = f.vy < 0;
      p.legB = up ? [-0.75, 1.5] : [-0.35, 1.1];
      p.legF = up ? [0.65, -1.35] : [0.45, -0.9];
      p.armB = up ? [0.9, 0.8] : [0.5, 1.2];
      p.armF = up ? [1.1, 0.7] : [0.7, 1.2];
      p.hipOff = H * 0.02;
    }

    if (st === 'block') {
      p.hipOff = H * 0.05;
      p.legB = [-0.45, 0.9];
      p.legF = [0.38, -0.8];
      p.armB = [0.8, 1.55];
      p.armF = [1.0, 1.35];
      p.lean = -0.02;
      p.head = -0.05;
    }

    if (st === 'hit' || st === 'stunned') {
      p.lean = -0.16;
      p.head = -0.2;
      p.armB = [0.1, 0.5];
      p.armF = [0.4, 0.6];
      p.legB = [-0.15, 0.35];
      p.legF = [0.25, -0.2];
      if (st === 'stunned') p.head = Math.sin(t * 5) * 0.15;
    }

    if (st === 'ko') {
      p.lean = -0.1;
      p.head = -0.3;
      p.armB = [0.3, 0.2];
      p.armF = [0.5, 0.2];
      p.legB = [-0.2, 0.3];
      p.legF = [0.2, -0.2];
    }

    if (st === 'attack' && f.attackMove) {
      applyAttackPose(p, f, H);
    }

    if (st === 'special') {
      if (f.castPose) {
        applyAttackPose(p, {
          attackMove: { pose: f.castPose, startup: 0.15, active: 0.2, recovery: 0.2 },
          attackT: f.specialT || 0
        }, H);
      } else {
        p.armF = [2.5, 0.3];
        p.armB = [2.3, 0.4];
        p.lean = -0.03;
        p.weapon = p.weapon - 0.9;
        p.hipOff = H * 0.01;
      }
    }

    if (st === 'ultimate') {
      p.armF = [2.7, 0.15];
      p.armB = [2.5, 0.2];
      p.lean = -0.06;
      p.head = -0.2;
      p.weapon = p.weapon - 1.2;
    }

    if (st === 'victory') {
      p.armF = [2.55, 0.15];
      p.weapon = p.weapon - 1.1;
      p.armB = [0.3, 0.4];
      p.lean = -0.04;
      p.head = -0.1;
    }

    if (f.status && f.status.root) {
      p.legB = [-0.3, 0.2];
      p.legF = [0.3, -0.2];
    }

    p.gowned = v.gown;
    return p;
  }

  function applyAttackPose(p, f, H) {
    const mv = f.attackMove;
    const t = f.attackT;
    const su = mv.startup, ac = mv.active, rc = mv.recovery;
    let strike = 0;
    if (t >= su) strike = clamp((t - su) / Math.max(0.001, ac), 0, 1);
    let rec = 0;
    if (t > su + ac) rec = clamp((t - su - ac) / Math.max(0.001, rc), 0, 1);
    const ext = (t < su ? 0 : (rec > 0 ? 1 - easeIn(rec) : easeOut(strike)));
    const coil = t < su ? easeOut(t / Math.max(0.001, su)) : 0;
    const pose = mv.pose;

    switch (pose) {
      case 'punch':
      case 'slap':
        p.armF = [lerp(0.55, 1.62, ext), lerp(1.35, 0.02, ext)];
        p.armB = [lerp(0.42, 0.2, ext), 1.6];
        p.lean = 0.04 + ext * 0.1;
        p.hipOff = H * 0.01 * ext;
        p.weapon = (p.weapon || 0) + ext * 0.4;
        break;
      case 'kick':
        p.legF = [lerp(0.2, 1.55, ext), lerp(-0.18, 0.02, ext)];
        p.legB = [-0.3, 0.35];
        p.lean = -0.04 - ext * 0.06;
        p.armB = [0.3, 0.9];
        p.armF = [0.35, 0.8];
        p.hipOff = -H * 0.015 * ext;
        break;
      case 'thrust':
        p.armF = [lerp(0.55, 1.5, ext), lerp(1.35, 0.05, ext)];
        p.armB = [lerp(0.4, 1.2, ext), lerp(1.4, 0.5, ext)];
        p.lean = 0.05 + ext * 0.16;
        p.hipOff = -H * 0.01;
        p.legF = [0.3 + ext * 0.2, -0.3];
        p.weapon = lerp(p.weapon, 0.02, ext);
        break;
      case 'heavy':
        p.armF = [lerp(0.55, 2.6, coil * 0.9 + ext * 0.1), lerp(1.35, 0.1, Math.max(coil * 0.5, ext))];
        p.armB = [lerp(0.42, 2.3, coil * 0.7 + ext * 0.1), 0.3];
        p.weapon = lerp(p.weapon, -2.5, coil);
        p.weapon = lerp(p.weapon, 0.55, ext);
        p.lean = -0.05 + ext * 0.16;
        p.legF = [0.25 + ext * 0.15, -0.2];
        break;
      case 'uppercut':
        p.armF = [lerp(1.2, 2.7, ext), lerp(0.8, 0.1, ext)];
        p.weapon = lerp(-0.8, -2.6, ext);
        p.lean = -0.05 + ext * 0.05;
        p.hipOff = -H * 0.02 * ext;
        break;
      case 'back':
        p.armB = [lerp(0.42, -1.35, ext), lerp(1.45, 0.1, ext)];
        p.armF = [0.55, 1.2];
        p.lean = 0.02 - ext * 0.1;
        p.head = -ext * 0.2;
        p.weapon = p.weapon + ext * 1.2;
        p.legF = [0.2, -0.3];
        break;
      case 'air':
        p.legF = [1.2, 0.1];
        p.legB = [0.2, 1.1];
        p.armB = [1.3, 0.5];
        p.armF = [1.5, 0.3];
        p.weapon = 0.3;
        p.hipOff = H * 0.01;
        break;
      case 'airthrust':
        p.armF = [1.35, 0.1];
        p.armB = [0.9, 0.8];
        p.legB = [-0.5, 1.2];
        p.legF = [0.7, -1];
        p.weapon = 0.6;
        break;
      case 'airkick':
        p.legF = [1.45, 0.05];
        p.legB = [-0.7, 1.3];
        p.armB = [1.1, 0.5];
        p.armF = [0.9, 0.6];
        p.hipOff = H * 0.02;
        break;
      case 'slam':
        p.armF = [lerp(2.7, 1.35, ext), lerp(0.1, 0.15, ext)];
        p.armB = [lerp(2.5, 1.2, ext), 0.2];
        p.weapon = lerp(-2.8, 0.9, ext);
        p.hipOff = H * 0.02 + ext * H * 0.03;
        p.legB = [-0.4, 1.2];
        p.legF = [0.4, -1.1];
        break;
      case 'spin':
        p.spin = Math.cos(t * 24) * 0.9 + 0.1;
        p.armF = [1.4, 0.2];
        p.armB = [1.2, 0.3];
        p.weapon = t * 22;
        p.legF = [0.9, -0.4];
        break;
      case 'sweep':
        p.legF = [lerp(0.2, 1.35, ext), lerp(-0.2, 0.0, ext)];
        p.hipOff = H * 0.18;
        p.legB = [-0.4, 1.4];
        p.lean = 0.12;
        p.armF = [0.9, 1.0];
        p.armB = [-0.2, 0.6];
        break;
      case 'crouchpunch':
        p.hipOff = H * 0.16;
        p.legB = [-0.5, 1.35];
        p.legF = [0.5, -1.2];
        p.armF = [lerp(0.7, 1.4, ext), lerp(1.3, 0.1, ext)];
        p.lean = 0.05;
        break;
      case 'cast':
        p.armF = [2.5, 0.3];
        p.armB = [2.25, 0.45];
        p.weapon = p.weapon - 1.0;
        p.lean = -0.03;
        break;
      case 'shoot':
        p.armF = [1.45, 0.15];
        p.armB = [0.7, 1.9];
        p.weapon = -0.05;
        p.lean = 0.02;
        p.legF = [0.3, -0.3];
        break;
      case 'summon':
        p.armF = [2.35, 0.5];
        p.armB = [2.5, 0.4];
        p.weapon = p.weapon - 0.9;
        p.head = -0.1;
        break;
      case 'counter':
        p.armF = [1.1, 1.2];
        p.armB = [0.9, 1.3];
        p.weapon = 0.2;
        p.lean = 0.08;
        break;
      case 'rage':
        p.armF = [2.0, 0.5];
        p.armB = [1.9, 0.5];
        p.weapon = p.weapon - 0.6;
        p.head = -0.2;
        p.lean = -0.08;
        break;
      case 'heal':
        p.armF = [2.6, 0.2];
        p.armB = [2.4, 0.3];
        p.head = -0.15;
        break;
      default:
        break;
    }
  }

  function joint(ox, oy, a1, l1, a2, l2) {
    const ex = ox + Math.sin(a1) * l1;
    const ey = oy + Math.cos(a1) * l1;
    const a = a1 + a2;
    const hx = ex + Math.sin(a) * l2;
    const hy = ey + Math.cos(a) * l2;
    return { ex, ey, hx, hy, a };
  }

  function limb(c, ox, oy, a1, l1, a2, l2, w, color, skin, outline) {
    const j = joint(ox, oy, a1, l1, a2, l2);
    c.lineCap = 'round';
    c.lineJoin = 'round';
    c.strokeStyle = outline || 'rgba(12,8,18,0.85)';
    c.lineWidth = w + 4;
    c.beginPath(); c.moveTo(ox, oy); c.lineTo(j.ex, j.ey); c.lineTo(j.hx, j.hy); c.stroke();
    c.strokeStyle = color;
    c.lineWidth = w;
    c.beginPath(); c.moveTo(ox, oy); c.lineTo(j.ex, j.ey); c.stroke();
    c.strokeStyle = skin;
    c.lineWidth = w * 0.92;
    c.beginPath(); c.moveTo(j.ex, j.ey); c.lineTo(j.hx, j.hy); c.stroke();
    return j;
  }

  function drawBoot(c, x, y, angle, size, color) {
    c.save();
    c.translate(x, y);
    c.rotate(angle);
    c.fillStyle = color;
    roundRect(c, -size * 0.35, -size * 0.3, size * 1.25, size * 0.75, 4);
    c.fill();
    c.restore();
  }

  function drawHand(c, x, y, r, color, outline) {
    c.fillStyle = outline || 'rgba(12,8,18,0.85)';
    c.beginPath(); c.arc(x, y, r + 1.5, 0, Math.PI * 2); c.fill();
    c.fillStyle = color;
    c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.fill();
  }

  function drawHead(c, f, v, pal, cx, cy, r, t, p) {
    const id = f.char.id;
    // hair behind
    c.fillStyle = pal.hair;
    if (v.hairLong) {
      c.beginPath(); c.ellipse(cx - r * 0.15, cy + r * 0.35, r * 1.15, r * 1.5, 0, 0, Math.PI * 2); c.fill();
    } else {
      c.beginPath(); c.arc(cx - r * 0.12, cy - r * 0.08, r * 1.06, 0, Math.PI * 2); c.fill();
    }

    // neck
    c.fillStyle = pal.skin;
    c.fillRect(cx - r * 0.3, cy + r * 0.7, r * 0.6, r * 0.5);

    // face
    c.fillStyle = pal.skin;
    c.beginPath(); c.ellipse(cx + r * 0.05, cy, r * 0.86, r, 0, 0, Math.PI * 2); c.fill();

    // eyes (facing right)
    const eyeColor = (id === 'furies' || id === 'zeus') ? pal.glow : '#20161c';
    c.fillStyle = eyeColor;
    c.beginPath(); c.ellipse(cx + r * 0.42, cy - r * 0.08, r * 0.1, r * 0.14, 0, 0, Math.PI * 2); c.fill();
    if (id === 'furies' || id === 'zeus') {
      glowCircle(c, cx + r * 0.42, cy - r * 0.08, r * 0.7, pal.glow, 0.5);
    }

    // nose / mouth hint
    c.strokeStyle = 'rgba(90,50,50,0.55)';
    c.lineWidth = 1.2;
    c.beginPath();
    c.moveTo(cx + r * 0.68, cy + r * 0.1);
    c.lineTo(cx + r * 0.76, cy + r * 0.22);
    c.stroke();

    // beards
    if (v.beard) {
      c.fillStyle = v.beard;
      c.beginPath();
      c.moveTo(cx - r * 0.1, cy + r * 0.45);
      c.quadraticCurveTo(cx - r * 0.2, cy + r * 1.65, cx + r * 0.75, cy + r * 1.15);
      c.quadraticCurveTo(cx + r * 0.9, cy + r * 0.6, cx + r * 0.72, cy + r * 0.5);
      c.closePath();
      c.fill();
    }

    // headgear
    c.save();
    if (v.helm === 'athena' || v.helm === 'ares') {
      const crestColor = id === 'ares' ? '#d94a2e' : '#e7eef7';
      // helmet dome
      c.fillStyle = pal.metal;
      c.beginPath();
      c.arc(cx, cy - r * 0.15, r * 1.1, Math.PI * 0.95, Math.PI * 2.05);
      c.lineTo(cx + r * 0.95, cy + r * 0.2);
      c.lineTo(cx + r * 0.6, cy + r * 0.2);
      c.lineTo(cx + r * 0.6, cy - r * 0.3);
      c.lineTo(cx - r * 0.9, cy - r * 0.3);
      c.closePath();
      c.fill();
      // cheek guard
      c.fillStyle = pal.metal;
      c.beginPath();
      c.moveTo(cx + r * 0.5, cy - r * 0.2);
      c.lineTo(cx + r * 0.95, cy + r * 0.1);
      c.lineTo(cx + r * 0.75, cy + r * 0.8);
      c.lineTo(cx + r * 0.5, cy + r * 0.6);
      c.closePath();
      c.fill();
      // crest
      c.fillStyle = crestColor;
      c.beginPath();
      c.moveTo(cx - r * 0.5, cy - r * 1.0);
      c.quadraticCurveTo(cx + r * 0.2, cy - r * 2.1, cx + r * 1.2, cy - r * 1.4);
      c.quadraticCurveTo(cx + r * 0.5, cy - r * 1.1, cx + r * 0.3, cy - r * 0.85);
      c.closePath();
      c.fill();
      if (id === 'athena') {
        // owl eyes on helmet
        c.fillStyle = pal.accent;
        c.beginPath(); c.arc(cx + r * 0.15, cy - r * 0.35, r * 0.09, 0, Math.PI * 2); c.fill();
        c.beginPath(); c.arc(cx + r * 0.55, cy - r * 0.35, r * 0.09, 0, Math.PI * 2); c.fill();
      }
    } else if (v.helm === 'crown') {
      c.fillStyle = pal.accent;
      c.beginPath();
      c.moveTo(cx - r * 0.75, cy - r * 0.55);
      c.lineTo(cx - r * 0.55, cy - r * 1.3);
      c.lineTo(cx - r * 0.2, cy - r * 0.8);
      c.lineTo(cx + r * 0.1, cy - r * 1.45);
      c.lineTo(cx + r * 0.4, cy - r * 0.8);
      c.lineTo(cx + r * 0.7, cy - r * 1.25);
      c.lineTo(cx + r * 0.85, cy - r * 0.5);
      c.closePath();
      c.fill();
      c.fillStyle = 'rgba(255,255,255,0.5)';
      c.beginPath(); c.arc(cx + r * 0.1, cy - r * 1.1, r * 0.09, 0, Math.PI * 2); c.fill();
    } else if (v.helm === 'sea') {
      c.fillStyle = pal.metal;
      c.beginPath();
      c.moveTo(cx - r * 0.8, cy - r * 0.5);
      for (let i = 0; i < 4; i++) {
        c.lineTo(cx - r * 0.6 + i * r * 0.45, cy - r * (1.15 + (i % 2) * 0.3));
      }
      c.lineTo(cx + r * 0.85, cy - r * 0.5);
      c.closePath();
      c.fill();
    } else if (v.helm === 'laurel') {
      c.strokeStyle = '#f7d66b';
      c.fillStyle = '#f7d66b';
      c.lineWidth = r * 0.16;
      c.beginPath();
      c.arc(cx, cy - r * 0.1, r * 1.0, Math.PI * 1.15, Math.PI * 1.95);
      c.stroke();
      for (let i = 0; i < 5; i++) {
        const a = Math.PI * 1.15 + i * 0.2;
        c.beginPath();
        c.ellipse(cx + Math.cos(a) * r, cy - r * 0.1 + Math.sin(a) * r, r * 0.22, r * 0.1, a + Math.PI / 2, 0, Math.PI * 2);
        c.fill();
      }
    } else if (v.helm === 'circlet') {
      c.strokeStyle = pal.metal;
      c.lineWidth = r * 0.16;
      c.beginPath();
      c.arc(cx, cy - r * 0.05, r * 1.0, Math.PI * 1.1, Math.PI * 1.9);
      c.stroke();
      c.fillStyle = pal.metal;
      c.beginPath(); c.arc(cx, cy - r * 1.05, r * 0.16, 0, Math.PI * 2); c.fill();
    } else if (id === 'aphrodite') {
      // flower crown
      for (let i = 0; i < 5; i++) {
        const a = Math.PI * 1.1 + i * 0.2;
        c.fillStyle = i % 2 ? '#ff9fc4' : '#ffd9e6';
        c.beginPath();
        c.arc(cx + Math.cos(a) * r * 0.95, cy - r * 0.15 + Math.sin(a) * r * 0.95, r * 0.16, 0, Math.PI * 2);
        c.fill();
      }
    } else if (id === 'hephaestus') {
      // soot smudges
      c.fillStyle = 'rgba(40,24,20,0.4)';
      c.beginPath(); c.arc(cx + r * 0.3, cy + r * 0.25, r * 0.12, 0, Math.PI * 2); c.fill();
      c.beginPath(); c.arc(cx - r * 0.3, cy - r * 0.1, r * 0.1, 0, Math.PI * 2); c.fill();
    } else if (id === 'furies') {
      // wild hair spikes
      c.fillStyle = pal.hair;
      for (let i = 0; i < 6; i++) {
        const a = -Math.PI * 0.8 + i * 0.28;
        c.beginPath();
        c.moveTo(cx + Math.cos(a) * r * 0.6, cy + Math.sin(a) * r * 0.6);
        c.lineTo(cx + Math.cos(a) * r * 1.8, cy + Math.sin(a) * r * 1.8);
        c.lineTo(cx + Math.cos(a + 0.18) * r * 0.7, cy + Math.sin(a + 0.18) * r * 0.7);
        c.closePath();
        c.fill();
      }
      // serpent
      c.strokeStyle = '#5a9c4a';
      c.lineWidth = 3;
      c.beginPath();
      c.moveTo(cx - r * 0.4, cy - r * 0.9);
      c.quadraticCurveTo(cx + r * 0.3, cy - r * 1.5, cx + r * 0.7, cy - r * 1.0);
      c.stroke();
    }

    if (v.peacock) {
      for (let i = 0; i < 5; i++) {
        const a = -Math.PI * 0.55 - i * 0.22;
        const fx = cx + Math.cos(a) * r * 3.2;
        const fy = cy + Math.sin(a) * r * 3.2;
        c.strokeStyle = 'rgba(28,143,138,0.75)';
        c.lineWidth = 2.5;
        c.beginPath();
        c.moveTo(cx - r * 0.2, cy);
        c.quadraticCurveTo(cx + Math.cos(a) * r * 1.6, cy - r * 1.4, fx, fy);
        c.stroke();
        c.fillStyle = i % 2 ? '#2eb8ad' : '#ffd873';
        c.beginPath();
        c.ellipse(fx, fy, r * 0.28, r * 0.45, a, 0, Math.PI * 2);
        c.fill();
        c.fillStyle = '#1a4f66';
        c.beginPath(); c.arc(fx, fy, r * 0.14, 0, Math.PI * 2); c.fill();
      }
    }
    c.restore();
  }

  /* ---------------- Weapons ---------------- */
  function drawWeapon(c, type, hx, hy, angle, pal, id, t, sc) {
    c.save();
    c.translate(hx, hy);
    c.rotate(angle);
    c.scale(sc || 1, sc || 1);
    const dark = 'rgba(20,14,20,0.9)';
    if (type === 'spear') {
      c.strokeStyle = dark; c.lineWidth = 7; c.lineCap = 'round';
      c.beginPath(); c.moveTo(-38, 0); c.lineTo(74, 0); c.stroke();
      c.strokeStyle = '#8a5a32'; c.lineWidth = 4.5;
      c.beginPath(); c.moveTo(-38, 0); c.lineTo(74, 0); c.stroke();
      c.fillStyle = pal.metal;
      c.beginPath(); c.moveTo(74, 0); c.lineTo(96, -7); c.lineTo(112, 0); c.lineTo(96, 7); c.closePath(); c.fill();
      c.fillStyle = pal.accent;
      c.beginPath(); c.arc(72, 0, 4, 0, Math.PI * 2); c.fill();
    } else if (type === 'trident') {
      c.strokeStyle = dark; c.lineWidth = 8; c.lineCap = 'round';
      c.beginPath(); c.moveTo(-44, 0); c.lineTo(78, 0); c.stroke();
      c.strokeStyle = '#1c6b70'; c.lineWidth = 5;
      c.beginPath(); c.moveTo(-44, 0); c.lineTo(78, 0); c.stroke();
      c.strokeStyle = pal.metal; c.lineWidth = 5;
      c.beginPath(); c.moveTo(78, 0); c.lineTo(78, -22); c.stroke();
      c.beginPath(); c.moveTo(78, 0); c.lineTo(78, 22); c.stroke();
      c.beginPath(); c.moveTo(78, 0); c.lineTo(108, 0); c.stroke();
      for (const yy of [-22, 0, 22]) {
        c.beginPath(); c.moveTo(78, yy); c.lineTo(92, yy); c.stroke();
        c.fillStyle = pal.metal;
        c.beginPath(); c.moveTo(92, yy - 4); c.lineTo(104, yy); c.lineTo(92, yy + 4); c.closePath(); c.fill();
      }
      c.fillStyle = pal.glow;
      c.beginPath(); c.arc(78, 0, 6, 0, Math.PI * 2); c.fill();
    } else if (type === 'hammer') {
      c.strokeStyle = dark; c.lineWidth = 9; c.lineCap = 'round';
      c.beginPath(); c.moveTo(-30, 0); c.lineTo(46, 0); c.stroke();
      c.strokeStyle = '#6b4a2e'; c.lineWidth = 6;
      c.beginPath(); c.moveTo(-30, 0); c.lineTo(46, 0); c.stroke();
      c.fillStyle = dark;
      roundRect(c, 38, -30, 46, 60, 6); c.fill();
      c.fillStyle = '#8d8177';
      roundRect(c, 40, -28, 42, 56, 5); c.fill();
      c.fillStyle = '#ff9b3d';
      roundRect(c, 46, -10 + Math.sin(t * 4) * 2, 30, 8, 3); c.fill();
      c.fillStyle = '#c9bcae';
      roundRect(c, 48, -24, 26, 6, 3); c.fill();
    } else if (type === 'sceptre') {
      c.strokeStyle = dark; c.lineWidth = 7; c.lineCap = 'round';
      c.beginPath(); c.moveTo(-34, 0); c.lineTo(50, 0); c.stroke();
      c.strokeStyle = '#b9912f'; c.lineWidth = 4;
      c.beginPath(); c.moveTo(-34, 0); c.lineTo(50, 0); c.stroke();
      glowCircle(c, 58, 0, 26, 'rgba(255,220,120,0.75)', 0.6);
      c.fillStyle = pal.accent;
      c.beginPath(); c.arc(58, 0, 10, 0, Math.PI * 2); c.fill();
      c.fillStyle = '#fff8d0';
      c.beginPath(); c.arc(55, -3, 4, 0, Math.PI * 2); c.fill();
      c.strokeStyle = pal.accent; c.lineWidth = 2.5;
      c.beginPath(); c.arc(58, 0, 16, 0, Math.PI * 2); c.stroke();
    } else if (type === 'sword') {
      c.fillStyle = dark;
      c.beginPath(); c.moveTo(-14, -6); c.lineTo(12, -6); c.lineTo(12, 6); c.lineTo(-14, 6); c.closePath(); c.fill();
      c.fillStyle = '#c9b06a';
      c.fillRect(10, -14, 6, 28);
      c.fillStyle = pal.metal;
      c.beginPath(); c.moveTo(16, -6); c.lineTo(92, -3); c.lineTo(102, 0); c.lineTo(92, 3); c.lineTo(16, 6); c.closePath(); c.fill();
      c.fillStyle = 'rgba(255,255,255,0.35)';
      c.beginPath(); c.moveTo(20, -3); c.lineTo(90, -1); c.lineTo(90, 0.5); c.lineTo(20, 0); c.closePath(); c.fill();
      c.fillStyle = '#8f1f1f'; c.beginPath(); c.arc(-2, 0, 5, 0, Math.PI * 2); c.fill();
    } else if (type === 'bolt') {
      c.fillStyle = 'rgba(160,225,255,0.35)';
      const bolt = (s) => {
        c.beginPath();
        c.moveTo(-8 * s, -34 * s);
        c.lineTo(12 * s, -10 * s);
        c.lineTo(2 * s, -6 * s);
        c.lineTo(22 * s, 20 * s);
        c.lineTo(4 * s, 12 * s);
        c.lineTo(-2 * s, 40 * s);
        c.lineTo(-16 * s, 8 * s);
        c.lineTo(-4 * s, 4 * s);
        c.closePath();
      };
      bolt(1.5); c.fill();
      c.fillStyle = '#e8fbff';
      bolt(1.0); c.fill();
    } else if (type === 'bow') {
      c.strokeStyle = '#8a5a32'; c.lineWidth = 6;
      c.beginPath(); c.arc(14, 0, 44, -Math.PI * 0.55, Math.PI * 0.55); c.stroke();
      c.strokeStyle = 'rgba(255,255,255,0.65)'; c.lineWidth = 1.5;
      c.beginPath();
      c.moveTo(14 + Math.cos(-Math.PI * 0.55) * 44, Math.sin(-Math.PI * 0.55) * 44);
      c.lineTo(14 + Math.cos(Math.PI * 0.55) * 44, Math.sin(Math.PI * 0.55) * 44);
      c.stroke();
      // string pull based on t
      c.strokeStyle = 'rgba(255,255,255,0.5)'; c.lineWidth = 1;
      c.beginPath(); c.moveTo(14, -37); c.lineTo(2, 0); c.lineTo(14, 37); c.stroke();
      if (id === 'apollo' || id === 'artemis') {
        glowCircle(c, 20, 0, 30, 'rgba(255,240,160,0.4)', 0.25);
      }
    } else if (type === 'claws') {
      // claws are drawn at the hands instead
    } else if (type === 'mirror') {
      c.fillStyle = 'rgba(255,230,240,0.9)';
      c.beginPath(); c.ellipse(18, 0, 14, 22, 0, 0, Math.PI * 2); c.fill();
      c.strokeStyle = '#d9a13a'; c.lineWidth = 4;
      c.beginPath(); c.ellipse(18, 0, 16, 24, 0, 0, Math.PI * 2); c.stroke();
      c.fillStyle = 'rgba(255,255,255,0.5)';
      c.beginPath(); c.ellipse(14, -6, 4, 8, -0.4, 0, Math.PI * 2); c.fill();
      c.strokeStyle = '#ffd873'; c.lineWidth = 5;
      c.beginPath(); c.moveTo(0, 0); c.lineTo(-10, 24); c.stroke();
    }
    c.restore();
  }

  function drawShield(c, type, hx, hy, angle, pal, id, sc) {
    c.save();
    c.translate(hx, hy);
    c.rotate(angle);
    c.scale(sc || 1, sc || 1);
    c.fillStyle = 'rgba(15,10,18,0.9)';
    c.beginPath(); c.ellipse(2, 0, 24, 32, 0, 0, Math.PI * 2); c.fill();
    c.fillStyle = pal.metal;
    c.beginPath(); c.ellipse(0, 0, 21, 29, 0, 0, Math.PI * 2); c.fill();
    c.strokeStyle = pal.accent;
    c.lineWidth = 3;
    c.beginPath(); c.ellipse(0, 0, 15, 22, 0, 0, Math.PI * 2); c.stroke();
    c.fillStyle = pal.secondary;
    if (id === 'athena') {
      // owl face
      c.beginPath(); c.arc(-3, -5, 4, 0, Math.PI * 2); c.fill();
      c.beginPath(); c.arc(6, -5, 4, 0, Math.PI * 2); c.fill();
      c.fillStyle = pal.accent;
      c.beginPath(); c.moveTo(0, 2); c.lineTo(4, 8); c.lineTo(-4, 8); c.closePath(); c.fill();
    } else {
      // crossed blades
      c.strokeStyle = pal.accent; c.lineWidth = 3;
      c.beginPath(); c.moveTo(-9, -14); c.lineTo(9, 14); c.stroke();
      c.beginPath(); c.moveTo(9, -14); c.lineTo(-9, 14); c.stroke();
    }
    c.restore();
  }

  function drawBackExtras(c, f, v, pal, t, p, H) {
    const id = f.char.id;
    if (v.cape) {
      const sway = Math.sin(t * 2.2 + f.animOffset) * 8;
      c.fillStyle = v.cape;
      c.globalAlpha = 0.85;
      c.beginPath();
      c.moveTo(-H * 0.1, -H * 0.8);
      c.quadraticCurveTo(-H * 0.38 + sway, -H * 0.5, -H * 0.3 + sway, -H * 0.02);
      c.lineTo(-H * 0.05 + sway * 0.4, -H * 0.06);
      c.lineTo(-H * 0.01, -H * 0.72);
      c.closePath();
      c.fill();
      c.globalAlpha = 1;
    }
    if (v.wings) {
      for (let i = 0; i < 3; i++) {
        const a = t * 1.4 + i * 0.4 + f.animOffset;
        const spread = Math.sin(a) * 0.12;
        c.save();
        c.translate(-H * 0.05, -H * 0.68);
        c.rotate(-0.5 - spread - i * 0.18);
        c.fillStyle = i % 2 ? 'rgba(74,21,38,0.8)' : 'rgba(26,13,22,0.9)';
        c.beginPath();
        c.moveTo(0, 0);
        c.quadraticCurveTo(-H * 0.5, -H * 0.18, -H * 0.55, -H * 0.52);
        c.quadraticCurveTo(-H * 0.18, -H * 0.4, 0, -H * 0.08);
        c.closePath();
        c.fill();
        c.strokeStyle = 'rgba(214,75,122,0.5)';
        c.lineWidth = 1.5;
        c.beginPath(); c.moveTo(0, 0); c.quadraticCurveTo(-H * 0.3, -H * 0.2, -H * 0.52, -H * 0.45); c.stroke();
        c.restore();
      }
    }
    if (v.quiver) {
      c.save();
      c.translate(-H * 0.14, -H * 0.62);
      c.rotate(-0.4);
      c.fillStyle = '#3a2b22';
      c.fillRect(-6, -16, 12, 40);
      c.strokeStyle = '#cfe4d8'; c.lineWidth = 2;
      for (let i = 0; i < 3; i++) {
        c.beginPath(); c.moveTo(-4 + i * 4, -16); c.lineTo(-7 + i * 4, -34); c.stroke();
        c.fillStyle = '#a8ffcf';
        c.beginPath(); c.moveTo(-7 + i * 4, -34); c.lineTo(-3 + i * 4, -38); c.lineTo(-1 + i * 4, -33); c.fill();
      }
      c.restore();
    }
    if (id === 'furies') {
      // two sister shadows
      for (const off of [-46, 44]) {
        c.save();
        c.globalAlpha = 0.22;
        c.translate(off, 0);
        c.fillStyle = '#2a0a15';
        c.beginPath();
        c.ellipse(0, -H * 0.5, H * 0.07, H * 0.34, off > 0 ? 0.08 : -0.08, 0, Math.PI * 2);
        c.fill();
        c.beginPath(); c.arc(0, -H * 0.86, H * 0.085, 0, Math.PI * 2); c.fill();
        c.strokeStyle = '#ff5f8f';
        c.lineWidth = 2;
        c.beginPath(); c.moveTo(-H * 0.03, -H * 0.86); c.lineTo(H * 0.04, -H * 0.86); c.stroke();
        c.restore();
      }
    }
  }

  function drawTorso(c, f, v, pal, H, hip, shoulder, bulk) {
    const id = f.char.id;
    const waistW = H * 0.1 * bulk;
    const chestW = H * 0.135 * bulk;
    const g = c.createLinearGradient(-chestW, 0, chestW, 0);
    g.addColorStop(0, pal.secondary);
    g.addColorStop(0.5, pal.primary);
    g.addColorStop(1, pal.secondary);
    c.fillStyle = g;
    c.beginPath();
    c.moveTo(hip.x - waistW, hip.y);
    c.quadraticCurveTo(hip.x - waistW * 1.2, hip.y - H * 0.12, shoulder.x - chestW, shoulder.y + H * 0.02);
    c.quadraticCurveTo(shoulder.x, shoulder.y - H * 0.03, shoulder.x + chestW, shoulder.y + H * 0.02);
    c.quadraticCurveTo(hip.x + waistW * 1.2, hip.y - H * 0.12, hip.x + waistW, hip.y);
    c.closePath();
    c.fill();

    // chest armour / toga
    c.fillStyle = pal.accent;
    c.globalAlpha = 0.9;
    c.beginPath();
    c.moveTo(shoulder.x - chestW * 0.95, shoulder.y + H * 0.02);
    c.quadraticCurveTo(shoulder.x, shoulder.y + H * 0.03, shoulder.x + chestW * 0.95, shoulder.y + H * 0.02);
    c.lineTo(shoulder.x + chestW * 0.5, shoulder.y + H * 0.1);
    c.lineTo(shoulder.x - chestW * 0.5, shoulder.y + H * 0.1);
    c.closePath();
    c.fill();
    c.globalAlpha = 1;

    if (id === 'athena' || id === 'ares' || id === 'zeus') {
      // breastplate
      c.fillStyle = v.gown ? 'rgba(255,255,255,0.22)' : 'rgba(255,255,255,0.18)';
      c.beginPath();
      c.ellipse(shoulder.x + chestW * 0.2, shoulder.y + H * 0.1, chestW * 0.6, H * 0.09, 0.1, 0, Math.PI * 2);
      c.fill();
    }
    if (id === 'hephaestus') {
      // apron + molten cracks
      c.fillStyle = 'rgba(40,28,24,0.95)';
      c.beginPath();
      c.moveTo(-waistW * 1.1, hip.y - H * 0.02);
      c.lineTo(waistW * 1.1, hip.y - H * 0.02);
      c.lineTo(waistW * 1.3, hip.y + H * 0.22);
      c.lineTo(-waistW * 1.3, hip.y + H * 0.22);
      c.closePath();
      c.fill();
      c.strokeStyle = '#ff9b3d';
      c.lineWidth = 1.5;
      c.globalAlpha = 0.7;
      c.beginPath();
      c.moveTo(-waistW * 0.5, hip.y);
      c.lineTo(0, hip.y + H * 0.1);
      c.lineTo(waistW * 0.4, hip.y + H * 0.06);
      c.stroke();
      c.globalAlpha = 1;
    }
    if (id === 'poseidon') {
      // scale armour
      c.strokeStyle = 'rgba(255,255,255,0.16)';
      c.lineWidth = 1;
      for (let i = 0; i < 4; i++) {
        c.beginPath();
        c.arc(shoulder.x - chestW * 0.5 + i * chestW * 0.33, shoulder.y + H * 0.09, H * 0.03, 0, Math.PI);
        c.stroke();
      }
    }
    if (id === 'hera' || id === 'aphrodite') {
      // necklace
      c.strokeStyle = pal.accent;
      c.lineWidth = 2;
      c.beginPath();
      c.arc(shoulder.x, shoulder.y + H * 0.02, H * 0.08, 0.15, Math.PI - 0.15);
      c.stroke();
      c.fillStyle = pal.accent;
      c.beginPath(); c.arc(shoulder.x, shoulder.y + H * 0.11, 3.5, 0, Math.PI * 2); c.fill();
    }

    // belt
    c.fillStyle = pal.metal;
    c.globalAlpha = 0.75;
    c.fillRect(hip.x - waistW * 1.02, hip.y - H * 0.035, waistW * 2.04, H * 0.025);
    c.globalAlpha = 1;

    // skirt
    if (!v.gown) {
      c.fillStyle = pal.secondary;
      c.beginPath();
      c.moveTo(hip.x - waistW, hip.y - H * 0.02);
      c.lineTo(hip.x + waistW, hip.y - H * 0.02);
      c.lineTo(hip.x + waistW * 1.5, hip.y + H * 0.13);
      c.lineTo(hip.x - waistW * 1.5, hip.y + H * 0.13);
      c.closePath();
      c.fill();
      if (id === 'athena' || id === 'ares') {
        c.fillStyle = pal.metal;
        for (let i = -1; i <= 1; i++) {
          c.beginPath();
          c.moveTo(hip.x + i * waistW * 0.8 - 6, hip.y + H * 0.02);
          c.lineTo(hip.x + i * waistW * 0.8 + 6, hip.y + H * 0.02);
          c.lineTo(hip.x + i * waistW * 0.8, hip.y + H * 0.15);
          c.closePath();
          c.fill();
        }
      }
    } else {
      // long gown
      const sway = Math.sin(f.stateTime * 2 + f.animOffset) * H * 0.006;
      const g2 = c.createLinearGradient(0, hip.y, 0, 0);
      g2.addColorStop(0, pal.primary);
      g2.addColorStop(0.5, pal.secondary);
      g2.addColorStop(1, pal.primary);
      c.fillStyle = g2;
      c.beginPath();
      c.moveTo(hip.x - waistW * 1.15, hip.y - H * 0.02);
      c.quadraticCurveTo(hip.x - waistW * 1.8 + sway, hip.y + H * 0.25, hip.x - waistW * 2.2 + sway, H * 0.0);
      c.lineTo(hip.x + waistW * 2.0 + sway, 0);
      c.quadraticCurveTo(hip.x + waistW * 1.7, hip.y + H * 0.25, hip.x + waistW * 1.15, hip.y - H * 0.02);
      c.closePath();
      c.fill();
      // folds
      c.strokeStyle = 'rgba(30,20,40,0.18)';
      c.lineWidth = 1.5;
      for (let i = -1; i <= 1; i++) {
        c.beginPath();
        c.moveTo(hip.x + i * waistW * 0.7, hip.y);
        c.quadraticCurveTo(hip.x + i * waistW * 1.2, hip.y + H * 0.2, hip.x + i * waistW * 1.5, -4);
        c.stroke();
      }
    }
  }

  function drawStatus(c, f, H, t) {
    const st = f.status || {};
    if (st.freeze) {
      c.save();
      c.globalAlpha = 0.55;
      const g = c.createLinearGradient(0, -H, 0, 0);
      g.addColorStop(0, 'rgba(180,240,255,0.1)');
      g.addColorStop(1, 'rgba(120,210,255,0.55)');
      c.fillStyle = g;
      roundRect(c, -H * 0.2, -H * 0.92, H * 0.4, H * 0.94, 12);
      c.fill();
      c.strokeStyle = 'rgba(220,250,255,0.8)';
      c.lineWidth = 2;
      for (let i = 0; i < 5; i++) {
        c.beginPath();
        c.moveTo(-H * 0.18 + i * H * 0.09, -H * 0.9);
        c.lineTo(-H * 0.1 + i * H * 0.09, -H * 0.1);
        c.stroke();
      }
      c.restore();
    }
    if (st.barrier) {
      const pulse = 1 + Math.sin(t * 5) * 0.02;
      c.save();
      c.globalAlpha = 0.3;
      c.strokeStyle = '#ffe9a8';
      c.lineWidth = 3;
      c.beginPath();
      c.ellipse(0, -H * 0.45, H * 0.36 * pulse, H * 0.56 * pulse, 0, 0, Math.PI * 2);
      c.stroke();
      c.globalAlpha = 0.08;
      c.fillStyle = '#ffe9a8';
      c.fill();
      c.restore();
    }
    if (st.stun || st.confuse) {
      for (let i = 0; i < 3; i++) {
        const a = t * 4 + i * 2.1;
        const cx = Math.cos(a) * 22;
        const cy = -H * 0.98 + Math.sin(a) * 7;
        c.fillStyle = i === 0 ? '#ffe27a' : i === 1 ? '#9fdcff' : '#ff9fc4';
        c.beginPath();
        for (let k = 0; k < 5; k++) {
          const aa = -Math.PI / 2 + k * Math.PI * 0.4;
          const rr = k % 2 ? 3 : 7;
          if (k === 0) c.moveTo(cx + Math.cos(aa) * rr, cy + Math.sin(aa) * rr);
          else c.lineTo(cx + Math.cos(aa) * rr, cy + Math.sin(aa) * rr);
        }
        c.closePath(); c.fill();
      }
    }
    if (st.burn) {
      for (let i = 0; i < 3; i++) {
        const fx = -12 + i * 12 + Math.sin(t * 9 + i) * 4;
        const fy = -H * 0.15 - (t * 40 + i * 20) % 50;
        c.fillStyle = 'rgba(255,150,50,0.7)';
        c.beginPath();
        c.moveTo(fx - 4, fy + 10);
        c.quadraticCurveTo(fx, fy - 8, fx + 4, fy + 10);
        c.fill();
      }
    }
    if (st.poison || st.bleed) {
      for (let i = 0; i < 4; i++) {
        const px = -18 + i * 12;
        const py = -H * 0.5 + Math.sin(t * 3 + i * 1.7) * 20;
        c.fillStyle = st.poison ? 'rgba(121,255,122,0.55)' : 'rgba(255,70,70,0.55)';
        c.beginPath(); c.arc(px, py, 3, 0, Math.PI * 2); c.fill();
      }
    }
    if (st.root) {
      c.strokeStyle = 'rgba(168,255,207,0.75)';
      c.lineWidth = 2;
      for (let i = 0; i < 4; i++) {
        c.beginPath();
        c.moveTo(-26 + i * 16, 0);
        c.quadraticCurveTo(-18 + i * 14, -18, -10 + i * 12, -34);
        c.stroke();
      }
    }
  }

  function drawFighter(c, f, game, opts = {}) {
    const v = VIS[f.char.id] || VIS.athena;
    const pal = f.char.palette;
    const t = game ? game.time : performance.now() / 1000;
    const H = 205 * v.scale;
    const bulk = v.bulk;
    const wsc = H / 168;
    const p = getPose(f, t);
    const hip = { x: 0, y: -H * 0.46 + p.hipOff + p.bob, }
    const shoulder = { x: p.lean * H * 0.14, y: -H * 0.79 + p.hipOff * 0.22 + p.bob };
    const headR = H * 0.095;

    // illusion doubles
    if (!opts.ghost && f.status && f.status.illusion) {
      const ghostBase = {
        char: f.char, y: f.y, facing: f.facing, state: f.state, stateTime: f.stateTime,
        attackMove: f.attackMove, attackT: f.attackT, ko: false, status: {}, animOffset: f.animOffset,
        gait: f.gait, crouching: f.crouching, hitFlash: 0, specialT: f.specialT, castPose: f.castPose
      };
      for (const off of [-36, 36]) {
        const g = Object.assign({}, ghostBase, { x: f.x + off });
        drawFighter(c, g, game, { ghost: true, alpha: off < 0 ? 0.2 : 0.14, noShadow: true });
      }
    }

    if (opts.ghost) c.globalAlpha = opts.alpha;

    c.save();
    c.translate(f.x, f.y);
    // shadow
    if (!opts.noShadow) {
      const sh = c.createRadialGradient(0, 0, 2, 0, 0, H * 0.42);
      sh.addColorStop(0, 'rgba(0,0,0,0.4)');
      sh.addColorStop(1, 'rgba(0,0,0,0)');
      c.fillStyle = sh;
      c.beginPath();
      c.ellipse(0, 0, H * 0.42, H * 0.1, 0, 0, Math.PI * 2);
      c.fill();
    }
    c.scale(f.facing || 1, 1);
    if (f.ko) {
      const a = Math.min(1.45, (f.koTime || 0) * 2.4);
      c.translate(0, -H * 0.02);
      c.rotate(-a * 0.92);
      c.translate(0, H * 0.02);
    }
    if (p.spin !== 1) c.scale(p.spin, 1);

    // afterimages / illusion clones
    if (f.status && f.status.illusion && !opts.ghost) {
      c.globalAlpha = 0.78 + Math.sin(t * 14) * 0.08;
    }

    // cape, wings, sisters
    drawBackExtras(c, f, v, pal, t, p, H);

    // limbs geometry
    const legBLen = H * 0.235, legFLen = H * 0.245;
    const armLen = H * 0.17, foreLen = H * 0.18;
    const outline = 'rgba(10,7,14,0.9)';

    const backLeg = joint(hip.x, hip.y, p.legB[0], legBLen, p.legB[1], legFLen);
    const frontLeg = joint(hip.x, hip.y, p.legF[0], legBLen, p.legF[1], legFLen);
    const backArm = joint(shoulder.x, shoulder.y, p.armB[0], armLen, p.armB[1], foreLen);
    const frontArm = joint(shoulder.x, shoulder.y, p.armF[0], armLen, p.armF[1], foreLen);

    // back leg
    limb(c, hip.x, hip.y, p.legB[0], legBLen, p.legB[1], legFLen, H * 0.075 * bulk, pal.secondary, pal.skin, outline);
    drawBoot(c, backLeg.hx, backLeg.hy, -backLeg.a * 0.3, H * 0.07, '#241a20');
    // back arm
    const armBackColor = v.gown ? pal.primary : pal.secondary;
    limb(c, shoulder.x, shoulder.y, p.armB[0], armLen, p.armB[1], foreLen, H * 0.055 * bulk, armBackColor, pal.skin, outline);
    drawHand(c, backArm.hx, backArm.hy, H * 0.033, pal.skin, outline);
    // offhand shield / mirror
    if (v.offhand === 'shield') {
      drawShield(c, 'shield', backArm.hx, backArm.hy, 0.3, pal, f.char.id, wsc);
    } else if (v.weapon === 'mirror') {
      drawWeapon(c, 'mirror', frontArm.hx, frontArm.hy, p.weapon, pal, f.char.id, t, wsc);
    }

    // torso
    drawTorso(c, f, v, pal, H, hip, shoulder, bulk);

    // front leg
    limb(c, hip.x, hip.y, p.legF[0], legFLen, p.legF[1], legFLen, H * 0.08 * bulk, pal.primary, pal.skin, outline);
    drawBoot(c, frontLeg.hx, frontLeg.hy, -frontLeg.a * 0.3, H * 0.075, pal.secondary);

    // front arm
    limb(c, shoulder.x, shoulder.y, p.armF[0], armLen, p.armF[1], foreLen, H * 0.058 * bulk, pal.primary, pal.skin, outline);
    drawHand(c, frontArm.hx, frontArm.hy, H * 0.034, pal.skin, outline);

    // shoulder pauldron
    if (f.char.id === 'athena' || f.char.id === 'ares' || f.char.id === 'zeus' || f.char.id === 'poseidon') {
      c.fillStyle = pal.metal;
      c.beginPath();
      c.ellipse(shoulder.x + H * 0.015, shoulder.y, H * 0.07, H * 0.05, -0.3, 0, Math.PI * 2);
      c.fill();
      c.strokeStyle = pal.accent;
      c.lineWidth = 1.5;
      c.stroke();
    }

    // weapon
    if (v.weapon === 'claws') {
      c.save();
      c.translate(frontArm.hx, frontArm.hy);
      c.rotate(frontArm.a);
      c.scale(wsc, wsc);
      c.strokeStyle = 'rgba(255,120,160,0.9)';
      c.lineWidth = 2.5;
      for (let i = -1; i <= 1; i++) {
        c.beginPath();
        c.moveTo(0, i * 7);
        c.quadraticCurveTo(16, i * 10, 24, i * 7);
        c.stroke();
      }
      c.restore();
    } else if (v.weapon !== 'mirror') {
      let wa = p.weapon;
      drawWeapon(c, v.weapon, frontArm.hx, frontArm.hy, wa, pal, f.char.id, t, wsc);
    }

    // head
    drawHead(c, f, v, pal, shoulder.x + H * 0.015, shoulder.y - H * 0.135, headR, t, p);

    // glowing eyes / aura for special state
    if (f.state === 'special' || f.state === 'ultimate') {
      glowCircle(c, shoulder.x, -H * 0.7, H * 0.65, f.char.palette.glow, 0.18);
    }

    // status overlays
    drawStatus(c, f, H, t);

    // hit flash
    if (f.hitFlash > 0) {
      c.save();
      c.globalCompositeOperation = 'lighter';
      c.globalAlpha = Math.min(0.5, f.hitFlash * 3);
      c.fillStyle = '#ffffff';
      c.beginPath();
      c.ellipse(0, -H * 0.5, H * 0.18, H * 0.42, 0, 0, Math.PI * 2);
      c.fill();
      c.restore();
    }

    c.restore();
  }

  /* ---------------- Minions / hazards / projectiles ---------------- */
  function drawMinion(c, m, t) {
    const dir = m.owner.opponent ? Math.sign(m.owner.opponent.x - m.x) || 1 : 1;
    c.save();
    c.translate(m.x, m.y);
    c.scale(dir, 1);
    c.globalAlpha = Math.min(1, m.life * 2);
    // shadow
    c.fillStyle = 'rgba(0,0,0,0.3)';
    c.beginPath(); c.ellipse(0, 0, 30, 7, 0, 0, Math.PI * 2); c.fill();
    // body
    const bounce = Math.abs(Math.sin(m.run)) * 8;
    c.translate(0, -bounce);
    c.fillStyle = 'rgba(10,30,22,0.9)';
    c.beginPath(); c.ellipse(-4, -26, 30, 13, -0.1, 0, Math.PI * 2); c.fill();
    c.fillStyle = m.color;
    c.globalAlpha *= 0.55;
    c.beginPath(); c.ellipse(-4, -28, 28, 11, -0.1, 0, Math.PI * 2); c.fill();
    c.globalAlpha = Math.min(1, m.life * 2);
    // legs
    c.strokeStyle = 'rgba(10,30,22,0.9)';
    c.lineWidth = 4;
    for (let i = 0; i < 2; i++) {
      const ph = m.run + i * Math.PI;
      c.beginPath();
      c.moveTo(-10 + i * 18, -18);
      c.lineTo(-10 + i * 18 + Math.sin(ph) * 8, -2);
      c.stroke();
    }
    // head
    c.fillStyle = m.color;
    c.beginPath(); c.ellipse(22, -36, 13, 9, -0.2, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#0a1a12';
    c.beginPath(); c.moveTo(30, -34); c.lineTo(40, -31); c.lineTo(30, -29); c.closePath(); c.fill();
    c.fillStyle = '#ffef8a';
    c.beginPath(); c.arc(27, -39, 2.2, 0, Math.PI * 2); c.fill();
    // tail
    c.strokeStyle = m.color;
    c.lineWidth = 3;
    c.beginPath();
    c.moveTo(-30, -32);
    c.quadraticCurveTo(-48, -44 + Math.sin(t * 8) * 4, -42, -54);
    c.stroke();
    c.restore();
  }

  function drawHazard(c, h, t) {
    const pulse = 1 + Math.sin(t * 4) * 0.06;
    c.save();
    if (h.type === 'lava') {
      glowCircle(c, h.x, GROUND_Y - 6, h.radius * 1.5, 'rgba(255,120,30,0.55)', 0.5);
      c.fillStyle = 'rgba(255,140,40,0.75)';
      c.beginPath(); c.ellipse(h.x, GROUND_Y - 2, h.radius * pulse, h.radius * 0.25, 0, 0, Math.PI * 2); c.fill();
      c.fillStyle = 'rgba(255,220,120,0.8)';
      c.beginPath(); c.ellipse(h.x, GROUND_Y - 4, h.radius * 0.55 * pulse, h.radius * 0.12, 0, 0, Math.PI * 2); c.fill();
      for (let i = 0; i < 3; i++) {
        const bx = h.x - h.radius * 0.5 + i * h.radius * 0.5;
        c.fillStyle = 'rgba(255,200,90,0.6)';
        c.beginPath();
        c.arc(bx, GROUND_Y - 8 - Math.abs(Math.sin(t * 3 + i)) * 16, 4, 0, Math.PI * 2);
        c.fill();
      }
    } else if (h.type === 'snare') {
      glowCircle(c, h.x, GROUND_Y - 8, h.radius, 'rgba(168,255,207,0.3)', 0.3);
      c.strokeStyle = 'rgba(168,255,207,0.8)';
      c.lineWidth = 3;
      c.beginPath(); c.ellipse(h.x, GROUND_Y - 3, h.radius, h.radius * 0.22, 0, 0, Math.PI * 2); c.stroke();
      for (let i = 0; i < 6; i++) {
        const a = t * 0.8 + i * Math.PI / 3;
        c.beginPath();
        c.moveTo(h.x + Math.cos(a) * h.radius * 0.9, GROUND_Y - 3 + Math.sin(a) * h.radius * 0.2);
        c.lineTo(h.x + Math.cos(a) * h.radius * 0.5, GROUND_Y - 26);
        c.stroke();
      }
    }
    c.restore();
  }

  function drawProjectile(c, pr, t) {
    c.save();
    c.translate(pr.x, pr.y);
    const dir = pr.vx >= 0 ? 1 : -1;
    c.scale(dir, 1);
    const shape = pr.shape;
    const col = pr.color;
    glowCircle(c, 0, 0, pr.big ? pr.w * 0.9 : pr.w * 0.75, pr.glow, 0.35);

    if (shape === 'spear') {
      c.rotate(0.0);
      c.strokeStyle = '#8a5a32'; c.lineWidth = 4;
      c.beginPath(); c.moveTo(-pr.w * 0.5, 0); c.lineTo(pr.w * 0.25, 0); c.stroke();
      c.fillStyle = col;
      c.beginPath();
      c.moveTo(pr.w * 0.25, -7); c.lineTo(pr.w * 0.55, 0); c.lineTo(pr.w * 0.25, 7);
      c.closePath(); c.fill();
      c.strokeStyle = pr.glow; c.lineWidth = 2;
      c.beginPath(); c.moveTo(-pr.w * 0.5, 0); c.lineTo(pr.w * 0.3, 0); c.stroke();
    } else if (shape === 'arrow') {
      c.strokeStyle = '#c9b06a'; c.lineWidth = 2.5;
      c.beginPath(); c.moveTo(-pr.w * 0.5, 0); c.lineTo(pr.w * 0.32, 0); c.stroke();
      c.fillStyle = col;
      c.beginPath(); c.moveTo(pr.w * 0.32, -5); c.lineTo(pr.w * 0.55, 0); c.lineTo(pr.w * 0.32, 5); c.closePath(); c.fill();
      c.fillStyle = pr.glow;
      c.beginPath(); c.moveTo(-pr.w * 0.5, 0); c.lineTo(-pr.w * 0.3, -5); c.lineTo(-pr.w * 0.25, 0); c.lineTo(-pr.w * 0.3, 5); c.closePath(); c.fill();
    } else if (shape === 'bolt') {
      c.fillStyle = 'rgba(160,225,255,0.35)';
      c.beginPath();
      c.moveTo(-22, -20); c.lineTo(6, -6); c.lineTo(-4, 0); c.lineTo(24, 20);
      c.lineTo(4, 6); c.lineTo(0, 22); c.lineTo(-12, 2); c.lineTo(-2, -2); c.closePath(); c.fill();
      c.fillStyle = '#ffffff';
      c.beginPath();
      c.moveTo(-18, -14); c.lineTo(2, -4); c.lineTo(-2, 0); c.lineTo(18, 14);
      c.lineTo(2, 4); c.lineTo(0, 14); c.lineTo(-8, 2); c.closePath(); c.fill();
    } else if (shape === 'heart') {
      c.rotate(Math.sin(t * 6) * 0.1);
      c.fillStyle = col;
      c.beginPath();
      c.moveTo(0, 10);
      c.bezierCurveTo(-22, -6, -12, -24, 0, -10);
      c.bezierCurveTo(12, -24, 22, -6, 0, 10);
      c.fill();
      c.fillStyle = 'rgba(255,255,255,0.5)';
      c.beginPath(); c.ellipse(-6, -6, 3, 4, -0.4, 0, Math.PI * 2); c.fill();
    } else if (shape === 'snake') {
      c.strokeStyle = col; c.lineWidth = 7; c.lineCap = 'round';
      c.beginPath();
      for (let i = 0; i <= 8; i++) {
        const x = -pr.w * 0.5 + i * pr.w / 8;
        const y = Math.sin(i * 1.1 + t * 10) * 8;
        if (i === 0) c.moveTo(x, y); else c.lineTo(x, y);
      }
      c.stroke();
      c.fillStyle = '#d6ffd0';
      c.beginPath(); c.arc(pr.w * 0.45, 0, 4, 0, Math.PI * 2); c.fill();
      c.fillStyle = '#ff3b3b';
      c.beginPath(); c.arc(pr.w * 0.45, 0, 1.8, 0, Math.PI * 2); c.fill();
    } else if (shape === 'wave') {
      c.fillStyle = 'rgba(255,255,255,0.18)';
      c.fillRect(-pr.w * 0.5, -pr.h * 0.5, pr.w, pr.h);
      for (let i = 0; i < 5; i++) {
        c.fillStyle = i % 2 ? col : 'rgba(255,255,255,0.35)';
        c.beginPath();
        c.ellipse(-pr.w * 0.15 + i * pr.w * 0.14, -pr.h * 0.15 + Math.sin(t * 6 + i) * 10, pr.w * 0.26, pr.h * 0.3, 0, 0, Math.PI * 2);
        c.fill();
      }
      // crest
      c.strokeStyle = pr.glow; c.lineWidth = 4;
      c.beginPath();
      for (let i = 0; i <= 6; i++) {
        const x = -pr.w * 0.5 + i * pr.w / 6;
        const y = -pr.h * 0.5 + Math.sin(i * 1.2 + t * 7) * 10;
        if (i === 0) c.moveTo(x, y); else c.lineTo(x, y);
      }
      c.stroke();
    } else {
      // orb / water
      c.fillStyle = col;
      c.beginPath(); c.arc(0, 0, pr.w * 0.42, 0, Math.PI * 2); c.fill();
      c.fillStyle = 'rgba(255,255,255,0.5)';
      c.beginPath(); c.arc(-pr.w * 0.12, -pr.h * 0.12, pr.w * 0.16, 0, Math.PI * 2); c.fill();
      c.strokeStyle = pr.glow;
      c.lineWidth = 2;
      c.beginPath(); c.arc(0, 0, pr.w * 0.55, 0, Math.PI * 2); c.stroke();
    }
    c.restore();
  }

  function drawParticles(c, game) {
    for (const p of game.particles) {
      const a = Math.max(0, p.life / p.maxLife);
      c.save();
      c.globalAlpha = a * (p.additive ? 0.9 : 0.75);
      if (p.additive) c.globalCompositeOperation = 'lighter';
      c.fillStyle = p.color;
      c.translate(p.x, p.y);
      if (p.spin || p.style === 'petal' || p.style === 'feather') {
        c.rotate(p.rot);
        c.beginPath();
        c.ellipse(0, 0, p.size * 1.6, p.size * 0.7, 0, 0, Math.PI * 2);
        c.fill();
      } else {
        c.beginPath();
        c.arc(0, 0, p.size * (0.5 + a * 0.5), 0, Math.PI * 2);
        c.fill();
      }
      c.restore();
    }
  }

  function drawTexts(c, game) {
    for (const tx of game.texts) {
      const a = Math.min(1, tx.life / (tx.maxLife * 0.5));
      c.save();
      c.globalAlpha = a;
      c.font = `${tx.bold ? 'bold ' : ''}${tx.size}px ${SERIF}`;
      c.textAlign = 'center';
      c.lineWidth = 4;
      c.strokeStyle = tx.stroke;
      c.strokeText(tx.text, tx.x, tx.y);
      if (tx.shadow) {
        c.shadowColor = tx.shadow;
        c.shadowBlur = 16;
      }
      c.fillStyle = tx.color;
      c.fillText(tx.text, tx.x, tx.y);
      c.restore();
    }
  }

  /* ---------------- Ambient particles ---------------- */
  function spawnAmbient(game) {
    const id = game.arena ? game.arena.id : 'olympus';
    const style = id === 'forge' ? 'ember' : id === 'sea' ? 'bubble' :
      id === 'underworld' ? 'soul' : id === 'garden' ? 'petal' :
        id === 'forest' ? 'firefly' : 'spark';
    const x = WALL_L + Math.random() * (WALL_R - WALL_L);
    const y = id === 'sea' ? GROUND_Y + Math.random() * 40 : GROUND_Y - Math.random() * 20;
    game.particles.push(new Particle(game, x, y, style, {
      speed: [5, 30], life: [1.5, 3.5], gravity: -20, size: [1.5, 4]
    }));
  }

  /* ---------------- Background cinematic dimming ---------------- */
  function drawVignette(c, color, alpha) {
    const g = c.createRadialGradient(GAME_W / 2, GAME_H / 2, GAME_H * 0.25, GAME_W / 2, GAME_H / 2, GAME_H * 0.85);
    g.addColorStop(0, 'rgba(0,0,0,0)');
    g.addColorStop(1, (color || 'rgba(0,0,0,') + alpha + ')');
    c.fillStyle = g;
    c.fillRect(0, 0, GAME_W, GAME_H);
  }

  /* ---------------- Portrait for UI ---------------- */
  function drawPortrait(el, charId, w, h) {
    const cv = el;
    const d = Math.min(2, window.devicePixelRatio || 1);
    cv.width = w * d; cv.height = h * d;
    const c2 = cv.getContext('2d');
    c2.setTransform(d, 0, 0, d, 0, 0);
    const ch = CHAR_BY_ID[charId];
    if (!ch) return;
    const v = VIS[charId];
    const H = 205 * v.scale;
    const scale = (h * 0.82) / H;
    const t = 1.2 + (charId.length % 5) * 0.2;
    const fake = {
      char: ch, x: 0, y: 0, facing: 1, state: 'idle', stateTime: t,
      attackMove: null, attackT: 0, ko: false, status: {}, animOffset: charId.length,
      gait: 0, crouching: false, hitFlash: 0
    };
    c2.save();
    c2.translate(w / 2, h * 0.93);
    c2.scale(scale, scale);
    // subtle glow
    const g = c2.createRadialGradient(0, -H * 0.5, 0, 0, -H * 0.5, H * 0.6);
    g.addColorStop(0, ch.palette.glow + '44');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    c2.fillStyle = g;
    c2.fillRect(-w / scale, -h / scale, (w / scale) * 2, (h / scale) * 2);
    drawFighter(c2, fake, { time: t, arena: null }, { noShadow: true });
    c2.restore();
  }

  return {
    init, resize, beginFrame, drawArena, drawFighter, drawMinion, drawHazard, drawProjectile,
    drawParticles, drawTexts, spawnAmbient, drawVignette, drawPortrait,
    glowCircle, roundRect, lerp, clamp, easeOut, easeIn, easeInOut, seeded, VIS
  };
})();
