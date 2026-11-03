/* ============================================================
   OLYMPUS: SURVIVAL — HUD, announcer, cinematic supers
   ============================================================ */

const HUD = (() => {
  const SERIF = 'Georgia, "Times New Roman", serif';
  const SANS = '"Trebuchet MS", "Segoe UI", sans-serif';
  const lerp = (a, b, t) => a + (b - a) * t;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const easeOut = (t) => 1 - Math.pow(1 - t, 3);

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

  const STATUS_LABELS = {
    slow: 'SLOW', confuse: 'CONFUSED', blind: 'BLIND', stun: 'STUNNED', freeze: 'FROZEN',
    burn: 'BURNING', poison: 'POISONED', root: 'ROOTED', armor: 'ARMOURED', reflect: 'REFLECT',
    regen: 'REGEN', damageUp: 'POWER UP', attackSpeed: 'BLOODLUST', speedUp: 'HASTE',
    barrier: 'BARRIER', illusion: 'ILLUSION', counter: 'COUNTER', molten: 'MOLTEN',
    bleed: 'BLEEDING', foresight: 'FORESIGHT', charm: 'CHARMED'
  };

  function draw(c, game) {
    const fighters = game.fighters;
    if (!fighters || fighters.length < 2) return;

    drawTopBar(c, game, fighters[0], 0);
    drawTopBar(c, game, fighters[1], 1);
    drawTimer(c, game);
    drawCombo(c, fighters[0], 0);
    drawCombo(c, fighters[1], 1);
    drawMeterHint(c, game, fighters[0], 0);
    drawMeterHint(c, game, fighters[1], 1);
    drawAnnouncement(c, game);
    if (game.cinematic) drawCinematic(c, game);
    if (game.mode === 'training' && !game.cinematic) drawTrainingMarkers(c, game);
  }

  function fmtName(n) { return n || ''; }

  function drawTopBar(c, game, f, side) {
    if (!f) return;
    const left = side === 0;
    const x0 = left ? 46 : 1234 - 500;
    const w = 500;
    const y = 44;
    const h = 22;
    const chip = f.displayHp !== undefined ? f.displayHp : f.hp;
    const ratio = clamp(f.hp / f.maxHp, 0, 1);
    const chipRatio = clamp(chip / f.maxHp, 0, 1);

    // name
    c.save();
    c.textAlign = left ? 'left' : 'right';
    c.fillStyle = '#f5ecd8';
    c.font = `bold 21px ${SERIF}`;
    const nameX = left ? x0 : x0 + w;
    c.shadowColor = 'rgba(255,200,90,0.35)';
    c.shadowBlur = 12;
    c.fillText(fmtName(f.char.name), nameX, 31);
    c.shadowBlur = 0;
    c.font = `10px ${SANS}`;
    c.fillStyle = 'rgba(245,236,216,0.55)';
    c.fillText(f.char.role, left ? nameX + 2 : nameX - 2, 31);
    c.restore();

    // bar frame
    c.save();
    c.fillStyle = 'rgba(8,6,12,0.78)';
    roundRect(c, x0 - 3, y - 3, w + 6, h + 6, 4); c.fill();
    c.strokeStyle = 'rgba(255,216,120,0.4)';
    c.lineWidth = 1.5;
    roundRect(c, x0 - 3, y - 3, w + 6, h + 6, 4); c.stroke();

    // chip trail
    const chipW = w * chipRatio;
    c.fillStyle = 'rgba(255,235,180,0.4)';
    if (left) c.fillRect(x0, y, chipW, h);
    else c.fillRect(x0 + w - chipW, y, chipW, h);

    // health
    const hpW = w * ratio;
    const grad = c.createLinearGradient(x0, 0, x0 + w, 0);
    if (ratio > 0.55) {
      grad.addColorStop(0, '#67e0a3'); grad.addColorStop(0.5, '#c9f06a'); grad.addColorStop(1, '#ffe27a');
    } else if (ratio > 0.28) {
      grad.addColorStop(0, '#ffd873'); grad.addColorStop(1, '#ff9b3d');
    } else {
      grad.addColorStop(0, '#ff6b4a'); grad.addColorStop(1, '#c41f3a');
    }
    c.fillStyle = grad;
    if (left) c.fillRect(x0, y, hpW, h);
    else c.fillRect(x0 + w - hpW, y, hpW, h);

    // gloss
    c.fillStyle = 'rgba(255,255,255,0.16)';
    if (left) c.fillRect(x0, y, hpW, h * 0.4);
    else c.fillRect(x0 + w - hpW, y, hpW, h * 0.4);

    // segment ticks
    c.strokeStyle = 'rgba(0,0,0,0.22)';
    c.lineWidth = 1;
    for (let i = 1; i < 10; i++) {
      const tx = x0 + (w / 10) * i;
      c.beginPath(); c.moveTo(tx, y); c.lineTo(tx, y + h); c.stroke();
    }

    // fury meter
    const fy = y + h + 9;
    const fh = 8;
    const meter = clamp(f.meter / 100, 0, 1);
    c.fillStyle = 'rgba(8,6,12,0.8)';
    roundRect(c, x0, fy, w, fh, 3); c.fill();
    const fg = c.createLinearGradient(x0, 0, x0 + w, 0);
    fg.addColorStop(0, '#6a4bff');
    fg.addColorStop(0.5, '#b678ff');
    fg.addColorStop(1, '#ffd873');
    c.fillStyle = fg;
    const mw = w * meter;
    if (left) c.fillRect(x0, fy, mw, fh);
    else c.fillRect(x0 + w - mw, fy, mw, fh);
    if (f.meter >= 100) {
      c.globalAlpha = 0.35 + Math.sin(game.time * 6) * 0.2;
      c.fillStyle = '#fff3c4';
      if (left) c.fillRect(x0, fy - 2, w, fh + 4);
      else c.fillRect(x0, fy - 2, w, fh + 4);
      c.globalAlpha = 1;
    }
    // thresholds
    for (const th of [0.25, 0.5]) {
      const tx = left ? x0 + w * th : x0 + w - w * th;
      c.strokeStyle = 'rgba(0,0,0,0.55)';
      c.lineWidth = 2;
      c.beginPath(); c.moveTo(tx, fy - 1); c.lineTo(tx, fy + fh + 1); c.stroke();
    }
    c.textAlign = left ? 'left' : 'right';
    c.font = `9px ${SANS}`;
    c.fillStyle = 'rgba(255,226,122,0.7)';
    c.fillText('FURY', left ? x0 + 2 : x0 + w - 2, fy + fh + 10);
    if (f.meter >= 25) {
      c.fillStyle = f.meter >= 100 ? '#fff3c4' : 'rgba(255,255,255,0.45)';
      c.font = `9px ${SANS}`;
      c.fillText(f.meter >= 100 ? 'SUPER READY' : f.meter >= 50 ? 'DIVINE ART' : 'ENHANCED', left ? x0 + 44 : x0 + w - 44, fy + fh + 10);
    }

    // round wins pips
    const py = y - 12;
    const pips = f.wins || 0;
    for (let i = 0; i < 2; i++) {
      const px = left ? x0 + w - 10 - i * 18 : x0 + 10 + i * 18;
      c.beginPath();
      c.arc(px, py, 5, 0, Math.PI * 2);
      c.fillStyle = i < pips ? '#ffd873' : 'rgba(255,255,255,0.14)';
      c.fill();
      c.strokeStyle = i < pips ? '#fff3c4' : 'rgba(255,255,255,0.25)';
      c.lineWidth = 1;
      c.stroke();
    }

    // status badges
    if (f.status) {
      const keys = Object.keys(f.status).filter(k => f.status[k] && STATUS_LABELS[k]);
      let bx = left ? x0 : x0 + w;
      c.font = `8px ${SANS}`;
      c.textAlign = 'center';
      keys.slice(0, 4).forEach((k, i) => {
        const label = STATUS_LABELS[k];
        const tw = c.measureText(label).width + 10;
        const px = left ? bx + tw / 2 : bx - tw / 2;
        const pyy = fy + fh + 18;
        c.fillStyle = 'rgba(30,20,40,0.8)';
        roundRect(c, px - tw / 2, pyy - 8, tw, 12, 3); c.fill();
        c.strokeStyle = 'rgba(255,216,120,0.3)';
        c.lineWidth = 0.8; c.stroke();
        c.fillStyle = 'rgba(255,235,200,0.85)';
        c.fillText(label, px, pyy + 1);
        if (left) bx += tw + 4; else bx -= tw + 4;
      });
    }
    c.restore();
  }

  function drawTimer(c, game) {
    c.save();
    const cx = GAME_W / 2;
    // frame
    c.fillStyle = 'rgba(8,6,12,0.85)';
    c.beginPath(); c.arc(cx, 58, 47, 0, Math.PI * 2); c.fill();
    c.strokeStyle = 'rgba(255,216,120,0.7)';
    c.lineWidth = 2;
    c.beginPath(); c.arc(cx, 58, 47, 0, Math.PI * 2); c.stroke();
    c.strokeStyle = 'rgba(255,216,120,0.25)';
    c.lineWidth = 5;
    c.beginPath(); c.arc(cx, 58, 41, 0, Math.PI * 2); c.stroke();

    // round label
    c.textAlign = 'center';
    c.font = `9px ${SANS}`;
    c.fillStyle = 'rgba(255,236,190,0.65)';
    c.fillText(game.mode === 'training' ? 'TRAINING' : `ROUND ${game.round}`, cx, 26);

    // time
    const timeLeft = Math.max(0, Math.ceil(game.timer));
    const low = timeLeft <= 10 && game.roundState === 'fight';
    c.font = `bold ${low ? 40 : 36}px ${SERIF}`;
    c.fillStyle = low ? (Math.sin(game.time * 12) > 0 ? '#ff6b4a' : '#ffd873') : '#f5ecd8';
    c.shadowColor = low ? 'rgba(255,80,50,0.6)' : 'rgba(255,216,120,0.3)';
    c.shadowBlur = 14;
    c.fillText(game.mode === 'training' ? '∞' : String(timeLeft).padStart(2, '0'), cx, 70);
    c.restore();

    // best-of dots
    c.save();
    c.textAlign = 'center';
    c.font = `8px ${SANS}`;
    c.fillStyle = 'rgba(255,255,255,0.4)';
    c.fillText('BEST OF 3', cx, 92);
    c.restore();
  }

  function drawCombo(c, f, side) {
    if (!f || !f.comboHits || f.comboHits < 2 || f.comboTimer <= 0) return;
    const x = side === 0 ? 76 : 1204;
    const y = 190;
    const a = clamp(f.comboTimer / 0.4, 0, 1);
    const pop = 1 + Math.max(0, (f.comboTimer - 1.4)) * 2;
    c.save();
    c.globalAlpha = a;
    c.textAlign = side === 0 ? 'left' : 'right';
    c.translate(x, y);
    c.scale(pop, pop);
    c.font = `bold 30px ${SERIF}`;
    c.fillStyle = '#ffe27a';
    c.strokeStyle = 'rgba(20,10,20,0.8)';
    c.lineWidth = 4;
    c.strokeText(`${f.comboHits} HIT`, 0, 0);
    c.fillText(`${f.comboHits} HIT`, 0, 0);
    c.font = `12px ${SANS}`;
    c.fillStyle = 'rgba(255,235,200,0.8)';
    c.fillText('COMBO', 0, 18);
    c.restore();
  }

  function drawMeterHint(c, game, f, side) {
    if (!f || game.cinematic || game.roundState !== 'fight') return;
    if (f.meter < 25 && !(f.status && Object.keys(f.status).length)) return;
    const x = side === 0 ? 76 : 1204;
    const y = 132;
    c.save();
    c.textAlign = side === 0 ? 'left' : 'right';
    if (f.meter >= 100) {
      const pulse = 0.65 + Math.sin(game.time * 7) * 0.25;
      c.globalAlpha = pulse;
      c.font = `bold 12px ${SANS}`;
      c.fillStyle = '#ffe27a';
      c.fillText('SUPER READY — ' + keyLabel(Input.bindings[side === 0 ? 'p1' : 'p2'].super), x, y);
    } else if (f.meter >= 50) {
      c.globalAlpha = 0.8;
      c.font = `11px ${SANS}`;
      c.fillStyle = '#d9c7ff';
      c.fillText('DIVINE ART READY', x, y);
    } else if (f.meter >= 25) {
      c.globalAlpha = 0.6;
      c.font = `10px ${SANS}`;
      c.fillStyle = '#b6a6ee';
      c.fillText('ENHANCED SPECIAL READY', x, y);
    }
    c.restore();
  }

  function drawTrainingMarkers(c, game) {
    // labels above fighters in training
    game.fighters.forEach((f, i) => {
      if (!f) return;
      c.save();
      c.textAlign = 'center';
      c.font = `9px ${SANS}`;
      c.fillStyle = 'rgba(255,255,255,0.35)';
      c.fillText(i === 0 ? 'P1' : (game.mode === 'training' ? 'DUMMY' : 'P2'), f.x, f.y - f.currentHeight() - 26);
      c.restore();
    });
    c.save();
    c.textAlign = 'center';
    c.font = `10px ${SANS}`;
    c.fillStyle = 'rgba(255,240,210,0.45)';
    c.fillText('TRAINING · health and fury regenerate · ESC to pause', GAME_W / 2, GAME_H - 14);
    c.restore();
  }

  /* ---------------- Announcer ---------------- */
  function drawAnnouncement(c, game) {
    const an = game.announce;
    if (!an) return;
    const p = 1 - an.t / an.dur;
    let alpha = 1;
    let scale = 1;
    if (an.t < 0.18) {
      alpha = an.t / 0.18;
      scale = 0.75 + (an.t / 0.18) * 0.3;
    } else if (an.t > an.dur - 0.35) {
      alpha = Math.max(0, (an.dur - an.t) / 0.35);
    }
    c.save();
    c.globalAlpha = alpha;
    c.textAlign = 'center';
    c.translate(GAME_W / 2, an.y || 300);
    c.scale(scale, scale);
    c.font = `bold ${an.size || 74}px ${SERIF}`;
    c.lineWidth = 8;
    c.strokeStyle = 'rgba(12,8,18,0.8)';
    c.strokeText(an.text, 0, 0);
    const grad = c.createLinearGradient(0, -40, 0, 40);
    grad.addColorStop(0, '#fff8dc');
    grad.addColorStop(0.5, an.color || '#ffd873');
    grad.addColorStop(1, '#c9982f');
    c.fillStyle = grad;
    c.shadowColor = an.glow || 'rgba(255,200,80,0.5)';
    c.shadowBlur = 30;
    c.fillText(an.text, 0, 0);
    if (an.sub) {
      c.shadowBlur = 10;
      c.font = `13px ${SANS}`;
      c.fillStyle = 'rgba(255,244,220,0.85)';
      c.fillText(an.sub, 0, 32);
    }
    c.restore();
  }

  /* ---------------- Cinematic supers ---------------- */
  function drawCinematic(c, game) {
    const cin = game.cinematic;
    const p = clamp(cin.t / cin.dur, 0, 1);
    const att = cin.attacker;
    const def = cin.defender;
    if (!att || !def) return;
    const pal = att.char.palette;

    c.save();
    // darken
    c.fillStyle = `rgba(4,3,10,${0.55 + Math.sin(p * Math.PI) * 0.12})`;
    c.fillRect(0, 0, GAME_W, GAME_H);

    // speed lines
    c.save();
    c.globalCompositeOperation = 'lighter';
    c.globalAlpha = 0.1 + Math.sin(p * Math.PI) * 0.1;
    for (let i = 0; i < 26; i++) {
      const a = Render.seeded(i) * Math.PI * 2;
      const r1 = 200 + Render.seeded(i + 9) * 400;
      const len = 200 + Render.seeded(i + 3) * 500;
      c.strokeStyle = pal.glow;
      c.lineWidth = 1 + Render.seeded(i + 2) * 2;
      c.beginPath();
      c.moveTo(GAME_W / 2 + Math.cos(a) * r1, GAME_H / 2 + Math.sin(a) * r1 * 0.6);
      c.lineTo(GAME_W / 2 + Math.cos(a) * (r1 + len), GAME_H / 2 + Math.sin(a) * (r1 + len) * 0.6);
      c.stroke();
    }
    c.restore();

    // coloured vignette
    c.save();
    c.globalAlpha = 0.5;
    Render.drawVignette(c, 'rgba(4,2,10,', 0.85);
    c.restore();

    // attacker spotlight
    Render.glowCircle(c, att.x, att.y - att.currentHeight() * 0.5, 260, hexToRgba(pal.glow, 0.6), 0.4);

    // character-specific event
    const cx = def.x;
    const cy = def.y - def.currentHeight() * 0.5;
    const t = cin.t;
    drawCinematicEvent(c, cin, p, t, cx, cy, pal);

    // impact flash
    if (cin.flash > 0) {
      c.globalAlpha = Math.min(0.85, cin.flash);
      c.fillStyle = '#ffffff';
      c.fillRect(0, 0, GAME_W, GAME_H);
      c.globalAlpha = 1;
    }

    // name banner
    const bp = clamp((p - 0.02) / 0.12, 0, 1);
    if (bp > 0) {
      c.save();
      c.globalAlpha = bp;
      c.translate(0, (1 - easeOut(bp)) * 40);
      const bw = 760;
      const bx = (GAME_W - bw) / 2;
      const by = 512;
      c.fillStyle = 'rgba(8,6,16,0.82)';
      c.beginPath();
      c.moveTo(bx, by);
      c.lineTo(bx + bw, by);
      c.lineTo(bx + bw - 30, by + 78);
      c.lineTo(bx + 30, by + 78);
      c.closePath();
      c.fill();
      c.strokeStyle = 'rgba(255,216,120,0.8)';
      c.lineWidth = 1.5;
      c.stroke();
      c.textAlign = 'center';
      c.font = `bold 32px ${SERIF}`;
      c.fillStyle = '#ffe27a';
      c.shadowColor = hexToRgba(pal.glow, 0.9);
      c.shadowBlur = 18;
      c.fillText(att.char.ultimate.name, GAME_W / 2, by + 40);
      c.shadowBlur = 0;
      c.font = `11px ${SANS}`;
      c.fillStyle = 'rgba(255,240,210,0.7)';
      c.fillText(att.char.name + '  ·  DIVINE FURY', GAME_W / 2, by + 62);
      c.restore();
    }
    c.restore();
  }

  function hexToRgba(hex, alpha) {
    if (!hex) return 'rgba(255,216,120,' + (alpha === undefined ? 1 : alpha) + ')';
    if (hex.startsWith('rgba')) return hex;
    const h = hex.replace('#', '');
    const r = parseInt(h.slice(0, 2), 16);
    const g = parseInt(h.slice(2, 4), 16);
    const b = parseInt(h.slice(4, 6), 16);
    return `rgba(${r},${g},${b},${alpha === undefined ? 1 : alpha})`;
  }

  function drawCinematicEvent(c, cin, p, t, cx, cy, pal) {
    const kind = cin.kind;
    const cxScreen = cx;
    const cyScreen = cy;
    const atkX = cin.attacker.x;
    const atkY = cin.attacker.y - cin.attacker.currentHeight() * 0.55;

    c.save();
    switch (kind) {
      case 'athena': {
        // Zeus silhouette behind attacker
        if (p > 0.08) {
          c.save();
          c.globalAlpha = 0.3 * clamp((p - 0.08) * 5, 0, 1);
          const zx = atkX - 110;
          const shoulders = atkY - 170;
          const headY = shoulders - 62;
          Render.glowCircle(c, zx, headY, 190, 'rgba(207,228,255,0.5)', 0.35);
          c.fillStyle = '#cfe4ff';
          // long robe
          c.beginPath();
          c.moveTo(zx - 34, shoulders);
          c.lineTo(zx - 64, GROUND_Y - 8);
          c.lineTo(zx - 32, GROUND_Y - 42);
          c.lineTo(zx - 6, GROUND_Y - 4);
          c.lineTo(zx + 22, GROUND_Y - 46);
          c.lineTo(zx + 52, GROUND_Y - 6);
          c.lineTo(zx + 34, shoulders);
          c.closePath();
          c.fill();
          // torso
          c.fillRect(zx - 36, shoulders - 6, 72, 120);
          // arms raised to the storm
          c.strokeStyle = '#cfe4ff';
          c.lineCap = 'round';
          c.lineWidth = 22;
          c.beginPath();
          c.moveTo(zx - 30, shoulders + 20);
          c.lineTo(zx - 100, shoulders - 50);
          c.lineTo(zx - 128, shoulders - 120);
          c.stroke();
          c.beginPath();
          c.moveTo(zx + 30, shoulders + 20);
          c.lineTo(zx + 104, shoulders - 55);
          c.lineTo(zx + 130, shoulders - 118);
          c.stroke();
          // head
          c.beginPath(); c.arc(zx, headY, 27, 0, Math.PI * 2); c.fill();
          // crown
          c.beginPath();
          c.moveTo(zx - 30, headY - 20);
          c.lineTo(zx - 24, headY - 62);
          c.lineTo(zx - 6, headY - 34);
          c.lineTo(zx + 10, headY - 70);
          c.lineTo(zx + 26, headY - 32);
          c.lineTo(zx + 32, headY - 60);
          c.lineTo(zx + 36, headY - 16);
          c.closePath();
          c.fill();
          // beard
          c.beginPath();
          c.moveTo(zx - 26, headY + 2);
          c.quadraticCurveTo(zx - 18, headY + 72, zx, headY + 82);
          c.quadraticCurveTo(zx + 18, headY + 72, zx + 26, headY + 2);
          c.lineTo(zx + 15, headY - 6);
          c.lineTo(zx - 15, headY - 6);
          c.closePath();
          c.fill();
          // glowing eyes
          c.fillStyle = '#ffffff';
          c.strokeStyle = 'rgba(255,255,255,0.6)';
          c.lineWidth = 2;
          c.beginPath(); c.arc(zx - 10, headY - 8, 3.5, 0, Math.PI * 2); c.fill();
          c.beginPath(); c.arc(zx + 10, headY - 8, 3.5, 0, Math.PI * 2); c.fill();
          c.restore();
        }
        // gathering storm beams
        if (p < 0.55) {
          for (let i = 0; i < 3; i++) {
            const bx = atkX - 100 + i * 100;
            c.globalAlpha = 0.25 + Math.sin(t * 20 + i) * 0.1;
            c.strokeStyle = '#bfe9ff';
            c.lineWidth = 2 + i;
            c.beginPath(); c.moveTo(bx, 0); c.lineTo(bx + Math.sin(t * 5 + i) * 12, cyScreen - 80); c.stroke();
          }
        }
        // bolt
        if (p > 0.3) {
          drawLightning(c, atkX - 30, 0, cxScreen, cyScreen, '#dff4ff', 10, t, 5);
          drawLightning(c, atkX + 60, 0, cxScreen - 30, cyScreen + 30, '#9fdcff', 5, t + 2, 4);
          Render.glowCircle(c, cxScreen, cyScreen, 220, 'rgba(190,240,255,0.8)', 0.5);
        }
        break;
      }
      case 'hera': {
        // golden chains and hearts
        if (p > 0.1) {
          c.globalAlpha = 0.75;
          c.strokeStyle = '#ffd873';
          c.lineWidth = 4;
          for (let i = 0; i < 4; i++) {
            c.beginPath();
            const rad = 120 + i * 26;
            for (let a = 0; a <= Math.PI * 2; a += 0.2) {
              const rr = rad + Math.sin(a * 3 + t * 3 + i) * 14;
              const x = cxScreen + Math.cos(a) * rr;
              const y = cyScreen + Math.sin(a) * rr * 0.8;
              if (a === 0) c.moveTo(x, y); else c.lineTo(x, y);
            }
            c.stroke();
          }
          Render.glowCircle(c, cxScreen, cyScreen, 200, 'rgba(255,216,115,0.6)', 0.4);
          // hearts
          for (let i = 0; i < 12; i++) {
            const a = Render.seeded(i + 40) * Math.PI * 2 + t;
            const r = 60 + Render.seeded(i) * 180;
            drawHeart(c, cxScreen + Math.cos(a) * r, cyScreen + Math.sin(a) * r * 0.7, 6 + Render.seeded(i + 2) * 8, '#ff9fc4', 0.6);
          }
          if (p > 0.55) {
            Render.glowCircle(c, cxScreen, cyScreen, 260, 'rgba(255,240,180,0.9)', 0.6);
          }
        }
        break;
      }
      case 'poseidon': {
        // giant wave
        c.save();
        c.translate(cxScreen, 0);
        const waveH = 260 * easeOut(clamp((p - 0.1) * 2, 0, 1));
        const g = c.createLinearGradient(0, GAME_H, 0, GAME_H - waveH);
        g.addColorStop(0, 'rgba(10,80,120,0.9)');
        g.addColorStop(0.6, 'rgba(50,190,220,0.8)');
        g.addColorStop(1, 'rgba(210,255,255,0.85)');
        c.fillStyle = g;
        c.beginPath();
        c.moveTo(-500, GAME_H);
        for (let i = 0; i <= 10; i++) {
          const x = -500 + i * 100;
          const y = GAME_H - waveH + Math.sin(i * 0.8 + t * 5) * 30 - (i > 3 && i < 7 ? 70 : 0);
          c.lineTo(x, y);
        }
        c.lineTo(500, GAME_H);
        c.closePath();
        c.fill();
        c.strokeStyle = 'rgba(230,255,255,0.8)';
        c.lineWidth = 5;
        c.beginPath();
        for (let i = 0; i <= 10; i++) {
          const x = -500 + i * 100;
          const y = GAME_H - waveH + Math.sin(i * 0.8 + t * 5) * 30 - (i > 3 && i < 7 ? 70 : 0);
          if (i === 0) c.moveTo(x, y); else c.lineTo(x, y);
        }
        c.stroke();
        c.restore();
        // water hand
        if (p > 0.42) {
          const hp = clamp((p - 0.42) * 3, 0, 1);
          c.save();
          c.globalAlpha = 0.55 * hp;
          c.fillStyle = '#5fdcff';
          const hx = cxScreen + 160;
          const hy = cyScreen + 60;
          c.beginPath();
          c.ellipse(hx, hy + 50, 80, 40, 0, 0, Math.PI * 2); c.fill();
          for (let i = 0; i < 4; i++) {
            c.beginPath();
            c.ellipse(hx - 60 + i * 38, hy, 16, 60, (i - 1.5) * 0.2, 0, Math.PI * 2);
            c.fill();
          }
          c.globalAlpha = 0.8;
          Render.glowCircle(c, cxScreen, cyScreen, 220, 'rgba(120,240,255,0.7)', 0.5);
          c.restore();
        }
        break;
      }
      case 'hephaestus': {
        // red sky + meteors
        c.fillStyle = `rgba(180,40,0,${0.12 + Math.sin(p * Math.PI) * 0.14})`;
        c.fillRect(0, 0, GAME_W, GAME_H);
        if (p > 0.15) {
          for (let i = 0; i < 7; i++) {
            const seed = i * 37;
            const mt = ((t * (0.8 + Render.seeded(seed) * 0.8) + Render.seeded(seed + 4)) % 1.4);
            if (mt > 1.2) continue;
            const mx = cxScreen - 400 + Render.seeded(seed + 1) * 700 + mt * 300;
            const my = -100 + mt * (cyScreen + 220);
            c.save();
            c.translate(mx, my);
            c.rotate(0.8);
            c.fillStyle = '#ffb347';
            c.beginPath(); c.ellipse(0, 0, 34, 16, 0, 0, Math.PI * 2); c.fill();
            c.fillStyle = '#fff0a0';
            c.beginPath(); c.arc(10, 0, 8, 0, Math.PI * 2); c.fill();
            c.globalAlpha = 0.3;
            c.fillStyle = '#ff6a1f';
            c.beginPath(); c.ellipse(-90, 0, 100, 7, 0, 0, Math.PI * 2); c.fill();
            c.restore();
          }
          // crack
          c.strokeStyle = 'rgba(255,150,50,0.8)';
          c.lineWidth = 5 + Math.sin(t * 8) * 2;
          c.beginPath();
          c.moveTo(cxScreen - 200, GROUND_Y);
          c.lineTo(cxScreen - 100, GROUND_Y - 40);
          c.lineTo(cxScreen - 40, GROUND_Y - 20);
          c.lineTo(cxScreen + 40, GROUND_Y - 120);
          c.lineTo(cxScreen + 100, GROUND_Y - 80);
          c.lineTo(cxScreen + 200, GROUND_Y);
          c.stroke();
          Render.glowCircle(c, cxScreen, GROUND_Y, 300, 'rgba(255,120,30,0.5)', 0.5);
        }
        break;
      }
      case 'furies': {
        // three sisters + nightmare
        if (p > 0.08) {
          for (let i = 0; i < 3; i++) {
            const a = t * 0.8 + i * (Math.PI * 2 / 3);
            const sx = cxScreen + Math.cos(a) * 130;
            const sy = cyScreen + Math.sin(a) * 50;
            c.save();
            c.globalAlpha = 0.55;
            c.translate(sx, sy);
            c.fillStyle = i === 0 ? '#4a1526' : i === 1 ? '#9f6bff' : '#1a0d16';
            c.beginPath(); c.ellipse(0, 60, 42, 130, 0, 0, Math.PI * 2); c.fill();
            c.beginPath(); c.arc(0, -70, 26, 0, Math.PI * 2); c.fill();
            c.fillStyle = '#ff5f8f';
            c.beginPath(); c.arc(-8, -74, 3, 0, Math.PI * 2); c.fill();
            c.beginPath(); c.arc(8, -74, 3, 0, Math.PI * 2); c.fill();
            c.restore();
            // claw slash
            c.globalAlpha = 0.7;
            c.strokeStyle = '#ff5f8f';
            c.lineWidth = 4;
            for (let k = 0; k < 3; k++) {
              c.beginPath();
              c.moveTo(sx - 60, sy - 60 + k * 20);
              c.lineTo(sx + 60, sy + 40 + k * 20);
              c.stroke();
            }
          }
          Render.glowCircle(c, cxScreen, cyScreen, 300, 'rgba(159,107,255,0.5)', 0.4);
        }
        break;
      }
      case 'aphrodite': {
        if (p > 0.05) {
          for (let i = 0; i < 24; i++) {
            const a = Render.seeded(i + 11) * Math.PI * 2 + t * 0.6;
            const r = 40 + Render.seeded(i + 5) * 240;
            const x = cxScreen + Math.cos(a) * r;
            const y = cyScreen + Math.sin(a) * r * 0.7;
            c.globalAlpha = 0.55 + Math.sin(t * 4 + i) * 0.2;
            drawHeart(c, x, y, 5 + Render.seeded(i + 2) * 10, i % 2 ? '#ff6f9f' : '#ffd9e6', 0.7);
          }
          Render.glowCircle(c, cxScreen, cyScreen, 280, 'rgba(255,130,180,0.6)', 0.5);
          // reaching hand silhouette
          if (p > 0.45) {
            c.globalAlpha = 0.55;
            c.fillStyle = '#ffd9e6';
            c.save();
            c.translate(cxScreen, cyScreen + 20);
            c.rotate(-0.4);
            c.beginPath(); c.ellipse(0, 0, 18, 80, 0, 0, Math.PI * 2); c.fill();
            for (let i = 0; i < 4; i++) {
              c.beginPath(); c.ellipse(-30 + i * 20, -80, 6, 24, 0, 0, Math.PI * 2); c.fill();
            }
            c.restore();
            if (p > 0.6) {
              Render.glowCircle(c, cxScreen, cyScreen, 140, 'rgba(255,40,90,0.8)', 0.5);
            }
          }
        }
        break;
      }
      case 'apollo': {
        // sun grows
        const sun = 40 + easeOut(clamp(p * 1.6, 0, 1)) * 260;
        Render.glowCircle(c, atkX, atkY - 120, sun * 1.6, 'rgba(255,220,100,0.7)', 0.6);
        c.fillStyle = 'rgba(255,248,200,0.9)';
        c.beginPath(); c.arc(atkX, atkY - 120, sun * 0.7, 0, Math.PI * 2); c.fill();
        if (p > 0.3) {
          // beam
          const beam = clamp((p - 0.3) * 3, 0, 1);
          c.save();
          c.globalAlpha = 0.7 * beam;
          c.globalCompositeOperation = 'lighter';
          const g = c.createLinearGradient(atkX, atkY - 120, cxScreen, cyScreen);
          g.addColorStop(0, 'rgba(255,255,220,0.95)');
          g.addColorStop(0.6, 'rgba(255,220,100,0.7)');
          g.addColorStop(1, 'rgba(255,180,60,0.1)');
          c.fillStyle = g;
          c.beginPath();
          c.moveTo(atkX - 20, atkY - 150);
          c.lineTo(cxScreen - 120, cyScreen - 100);
          c.lineTo(cxScreen + 120, cyScreen + 100);
          c.lineTo(atkX + 20, atkY - 90);
          c.closePath();
          c.fill();
          c.restore();
          Render.glowCircle(c, cxScreen, cyScreen, 220, 'rgba(255,240,160,0.8)', 0.5);
        }
        break;
      }
      case 'ares': {
        // red rage + flurry
        c.fillStyle = `rgba(140,20,10,${0.14 + Math.sin(p * Math.PI) * 0.12})`;
        c.fillRect(0, 0, GAME_W, GAME_H);
        if (p > 0.15) {
          for (let i = 0; i < 5; i++) {
            const r = ((t * 200 + i * 60) % 400);
            c.globalAlpha = 0.4 * (1 - r / 400);
            c.strokeStyle = '#ff5b3d';
            c.lineWidth = 4;
            c.beginPath();
            c.arc(cxScreen, cyScreen, r, 0, Math.PI * 2);
            c.stroke();
          }
          // slash flashes
          for (let i = 0; i < 8; i++) {
            const ph = (t * 3 + i * 0.9) % 2;
            if (ph > 0.5) continue;
            const a = Render.seeded(i + 2) * Math.PI;
            c.globalAlpha = 0.65;
            c.strokeStyle = '#ffd1c0';
            c.lineWidth = 3;
            c.beginPath();
            c.moveTo(cxScreen + Math.cos(a) * 130, cyScreen + Math.sin(a) * 130);
            c.lineTo(cxScreen - Math.cos(a) * 130, cyScreen - Math.sin(a) * 130);
            c.stroke();
          }
          Render.glowCircle(c, cxScreen, cyScreen, 260, 'rgba(255,80,40,0.6)', 0.5);
        }
        break;
      }
      case 'artemis': {
        // moon + hounds + arrow
        if (p > 0.05) {
          c.fillStyle = 'rgba(2,10,20,0.35)';
          c.fillRect(0, 0, GAME_W, GAME_H);
          const mp = clamp((p - 0.05) * 2, 0, 1);
          Render.glowCircle(c, 1020, 120, 300 * mp, 'rgba(180,255,220,0.4)', 0.5);
          c.globalAlpha = 0.7 * mp;
          c.fillStyle = '#dfffe9';
          c.beginPath(); c.arc(1020, 120, 60 * mp, 0, Math.PI * 2); c.fill();
          // hounds
          if (p > 0.25) {
            for (let i = 0; i < 3; i++) {
              const hx = cxScreen - 320 + ((t * 500 + i * 90) % 640);
              const hy = GROUND_Y - 20;
              c.globalAlpha = 0.55;
              c.save();
              c.translate(hx, hy);
              c.scale(1.4, 1.4);
              c.fillStyle = '#0a1a12';
              c.beginPath(); c.ellipse(0, -16, 34, 12, 0, 0, Math.PI * 2); c.fill();
              c.beginPath(); c.arc(28, -26, 12, 0, Math.PI * 2); c.fill();
              c.fillStyle = '#a8ffcf';
              c.beginPath(); c.arc(32, -29, 2.4, 0, Math.PI * 2); c.fill();
              c.restore();
            }
          }
          // giant arrow
          if (p > 0.55) {
            const ap = clamp((p - 0.55) * 4, 0, 1);
            c.globalAlpha = 0.85;
            c.strokeStyle = '#dfffe9';
            c.lineWidth = 6;
            c.beginPath();
            c.moveTo(300, 300);
            c.lineTo(300 + 700 * ap, 300 + 120 * ap);
            c.stroke();
            c.fillStyle = '#a8ffcf';
            c.beginPath();
            c.moveTo(300 + 700 * ap, 300 + 120 * ap);
            c.lineTo(300 + 660 * ap, 280 + 120 * ap);
            c.lineTo(300 + 640 * ap, 330 + 120 * ap);
            c.fill();
          }
        }
        break;
      }
      case 'zeus': {
        // storm bolts
        if (p > 0.08) {
          c.fillStyle = 'rgba(8,14,40,0.4)';
          c.fillRect(0, 0, GAME_W, GAME_H);
          for (let i = 0; i < 8; i++) {
            const bx = 120 + i * 150 + Math.sin(t * 3 + i) * 20;
            drawLightning(c, bx, 0, bx + Math.sin(t * 2 + i) * 60, GROUND_Y - 120 - (i % 3) * 60, '#bfe9ff', 3 + (i % 3), t + i, 3);
          }
          Render.glowCircle(c, cxScreen, cyScreen, 320, 'rgba(120,200,255,0.5)', 0.5);
          if (p > 0.55) {
            drawLightning(c, cxScreen + 40, 0, cxScreen, cyScreen + 60, '#ffffff', 26, t * 2, 7);
            drawLightning(c, cxScreen - 60, 0, cxScreen - 20, cyScreen + 80, '#bfe9ff', 12, t * 2 + 2, 6);
            Render.glowCircle(c, cxScreen, cyScreen, 380, 'rgba(200,240,255,0.9)', 0.65);
          }
        }
        break;
      }
      default: break;
    }
    c.restore();
  }

  function drawLightning(c, x1, y1, x2, y2, color, width, t, segs) {
    const n = segs || 5;
    c.save();
    c.strokeStyle = color;
    c.lineCap = 'round';
    c.lineJoin = 'round';
    c.shadowColor = color;
    c.shadowBlur = 20;
    c.lineWidth = width;
    c.beginPath();
    c.moveTo(x1, y1);
    for (let i = 1; i <= n; i++) {
      const p = i / n;
      const nx = lerp(x1, x2, p) + (i === n ? 0 : (Render.seeded(i + Math.floor(t * 8)) - 0.5) * 80);
      const ny = lerp(y1, y2, p) + (i === n ? 0 : (Render.seeded(i + 7 + Math.floor(t * 8)) - 0.5) * 40);
      c.lineTo(nx, ny);
    }
    c.stroke();
    c.lineWidth = Math.max(1, width * 0.35);
    c.strokeStyle = '#ffffff';
    c.shadowBlur = 10;
    c.stroke();
    c.restore();
  }

  function drawHeart(c, x, y, size, color, alpha) {
    c.save();
    c.globalAlpha = alpha === undefined ? 1 : alpha;
    c.translate(x, y);
    c.fillStyle = color;
    c.beginPath();
    c.moveTo(0, size * 0.9);
    c.bezierCurveTo(-size * 1.8, -size * 0.5, -size * 1.1, -size * 1.8, 0, -size * 0.8);
    c.bezierCurveTo(size * 1.1, -size * 1.8, size * 1.8, -size * 0.5, 0, size * 0.9);
    c.fill();
    c.restore();
  }

  return { draw, drawLightning };
})();
