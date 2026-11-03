/* ============================================================
   OLYMPUS: SURVIVAL — Match controller
   ============================================================ */

const Game = {
  init(canvas) {
    this.canvas = canvas;
    Render.init(canvas);
    this.ctx = canvas.getContext('2d');
    this.active = false;
    this.paused = false;
    this.mode = 'versus';
    this.fighters = [];
    this.projectiles = [];
    this.hazards = [];
    this.minions = [];
    this.particles = [];
    this.texts = [];
    this.afterimages = [];
    this.schedules = [];
    this.time = 0;
    this.lastDt = 0.016;
    this.round = 1;
    this.timer = ROUND_TIME;
    this.roundState = 'intro';
    this.introTimer = 0;
    this.koTimer = 0;
    this.overTimer = 0;
    this.roundWinner = null;
    this.result = null;
    this.announce = null;
    this.cinematic = null;
    this.pendingKO = null;
    this.shake = 0;
    this.flash = 0;
    this.flashColor = '#ffffff';
    this.hitstop = 0;
    this.slowmo = 0;
    this.comboPop = 0;
    this.arena = ARENA_BY_ID.olympus;
    this.onMatchEnd = null;
    this.matchEnded = false;
    this.ambientTimer = 0;
    this.difficulty = 'normal';
    this.frameCount = 0;
  },

  startMatch(cfg) {
    this.mode = cfg.mode || 'versus';
    this.difficulty = cfg.difficulty || 'normal';
    this.arena = ARENA_BY_ID[cfg.arena] || ARENA_BY_ID.olympus;
    this.p1CharId = cfg.p1;
    this.p2CharId = cfg.p2;
    this.p2Human = !!cfg.p2Human;
    this.arcade = cfg.arcade || null;
    this.round = 1;
    this.result = null;
    this.matchEnded = false;
    this.overTimer = 0;
    this.roundWinner = null;
    this.cinematic = null;
    this.pendingKO = null;
    this.projectiles = [];
    this.hazards = [];
    this.minions = [];
    this.particles = [];
    this.texts = [];
    this.afterimages = [];
    this.schedules = [];
    this.time = 0;
    this.hitstop = 0;
    this.slowmo = 0;
    this.shake = 0;
    this.flash = 0;
    this.paused = false;
    this.active = true;

    const p1 = new Fighter(cfg.p1, 0, false, this);
    const p2 = new Fighter(cfg.p2, 1, !this.p2Human, this);
    p1.wins = 0; p2.wins = 0;
    this.fighters = [p1, p2];
    p1.opponent = p2; p2.opponent = p1;
    this.startRound(true);
    AudioSys.startAmbient();
  },

  startRound(first) {
    this.projectiles = [];
    this.hazards = [];
    this.minions = [];
    this.texts = [];
    this.afterimages = [];
    this.schedules = [];
    this.cinematic = null;
    this.pendingKO = null;
    this.introTimer = 2.35;
    this.roundState = 'intro';
    this.timer = ROUND_TIME;
    this.koTimer = 0;
    this.roundWinner = null;
    this.flash = 0;
    this.hitstop = 0;
    this.slowmo = 0;

    const keepMeter = !first;
    const [p1, p2] = this.fighters;
    const m1 = keepMeter ? Math.min(60, p1.meter) : 0;
    const m2 = keepMeter ? Math.min(60, p2.meter) : 0;
    p1.resetRound(390, 1, true);
    p2.resetRound(890, -1, true);
    p1.meter = m1; p2.meter = m2;
    p1.lastHitType = null; p2.lastHitType = null;
    if (this.mode === 'training') {
      p1.meter = Math.max(p1.meter, 50);
      this.roundState = 'fight';
      this.introTimer = 0;
      this.announce = null;
    }
    this.announce = {
      text: this.mode === 'training' ? 'TRAINING' : `ROUND ${this.round}`,
      sub: this.mode === 'training' ? 'Press ESC to return to the menu' : this.arena.name,
      t: 0, dur: this.mode === 'training' ? 1.8 : 1.5, size: 66, color: '#ffd873',
      glow: 'rgba(255,200,80,0.5)', y: 300
    };
    AudioSys.play('round');
    if (this.mode !== 'training') {
      this.schedule(1.55, () => {
        if (this.roundState === 'intro') {
          this.announce = {
            text: 'FIGHT!', t: 0, dur: 0.9, size: 96, color: '#ff8a5a',
            glow: 'rgba(255,90,50,0.7)', y: 310
          };
          AudioSys.play('fight');
        }
      });
    }
  },

  schedule(delay, fn) {
    this.schedules.push({ t: delay, fn });
  },

  update(dt) {
    if (!this.active || this.paused) return;
    dt = Math.min(dt, 0.05);
    this.lastDt = dt;
    this.frameCount++;
    this.time += dt;

    // announce timer always advances
    if (this.announce) {
      this.announce.t += dt;
      if (this.announce.t >= this.announce.dur) this.announce = null;
    }

    // flash & shake decay
    if (this.flash > 0) this.flash = Math.max(0, this.flash - dt * 3.2);
    this.shake = Math.max(0, this.shake - dt * 45);

    // schedules
    for (let i = this.schedules.length - 1; i >= 0; i--) {
      const s = this.schedules[i];
      s.t -= dt;
      if (s.t <= 0) {
        this.schedules.splice(i, 1);
        try { s.fn(); } catch (e) { console.error(e); }
      }
    }

    if (this.cinematic) {
      this.updateCinematic(dt);
      this.updateParticles(dt);
      this.updateTexts(dt);
      this.spawnAmbient(dt);
      this.updateAfterimages(dt);
      return;
    }

    if (this.hitstop > 0) {
      this.hitstop = Math.max(0, this.hitstop - dt);
      this.updateParticles(dt);
      this.updateTexts(dt);
      return;
    }

    const scale = this.slowmo > 0 ? 0.35 : 1;
    if (this.slowmo > 0) this.slowmo = Math.max(0, this.slowmo - dt);

    if (this.roundState === 'intro') {
      this.introTimer -= dt;
      if (this.introTimer <= 0) {
        this.roundState = 'fight';
        this.timer = ROUND_TIME;
      }
    } else if (this.roundState === 'fight') {
      if (this.mode !== 'training') {
        this.timer -= dt;
        if (this.timer <= 0) {
          this.timer = 0;
          this.timeOver();
        }
      } else {
        this.timer = ROUND_TIME;
      }
    } else if (this.roundState === 'ko') {
      this.koTimer -= dt;
      if (this.roundWinner && !this.roundWinner.ko && this.roundWinner.state !== 'victory' && this.koTimer < 2.55) {
        this.roundWinner.state = 'victory';
        this.roundWinner.stateTime = 0;
      }
      if (this.koTimer <= 0) {
        if (this.roundWinner && this.roundWinner.wins >= 2) {
          this.endMatch();
        } else {
          this.round++;
          this.startRound(false);
        }
        return;
      }
    } else if (this.roundState === 'over') {
      this.overTimer -= dt;
      if (this.overTimer <= 0 && !this.matchEnded) {
        this.matchEnded = true;
        if (this.onMatchEnd) this.onMatchEnd(this.result);
      }
    }

    // inputs
    let in0 = { held: {}, pressed: {} };
    let in1 = { held: {}, pressed: {} };
    if (this.roundState === 'fight' || this.roundState === 'ko' || this.roundState === 'intro') {
      if (!this.fighters[0].isCPU) in0 = Input.players.p1;
      else in0 = AI.think(this.fighters[0], this.fighters[1], this.lastDt * scale, false);
      if (!this.fighters[1].isCPU) in1 = Input.players.p2;
      else in1 = AI.think(this.fighters[1], this.fighters[0], this.lastDt * scale, this.mode === 'training');
    }

    const [f1, f2] = this.fighters;
    if (this.roundState === 'intro') {
      in0 = { held: {}, pressed: {} };
      in1 = { held: {}, pressed: {} };
    }

    f1.update(this.lastDt * scale, in0, f2);
    f2.update(this.lastDt * scale, in1, f1);

    this.resolveBodies(f1, f2, this.lastDt * scale);

    // face each other
    for (const f of this.fighters) {
      if (!f.ko && f.grounded() && (f.state === 'idle' || f.state === 'walk' || f.state === 'crouch' || f.state === 'block')) {
        const other = f === f1 ? f2 : f1;
        if (other) f.facing = other.x >= f.x ? 1 : -1;
      }
    }

    this.updateProjectiles(dt * scale);
    this.updateHazards(dt * scale);
    this.updateMinions(dt * scale);
    this.updateParticles(dt * scale);
    this.updateTexts(dt);
    this.updateAfterimages(dt * scale);
    this.spawnAmbient(dt);
    this.comboPop = Math.max(0, this.comboPop - dt * 3);
  },

  resolveBodies(a, b, dt) {
    if (!a || !b || a.ko || b.ko) return;
    if (Math.abs(a.y - b.y) > 80) return;
    const minDist = 34 * (a.scale + b.scale) + 26;
    let dx = b.x - a.x;
    let d = Math.abs(dx);
    if (d >= minDist) return;
    let dir = Math.sign(dx);
    if (d < 0.001) { dir = a.facing || 1; d = 0.001; }
    // Soft positional separation: resolves small overlaps over a few frames
    // instead of teleporting the bodies apart, which reads as weight rather
    // than jitter. Deep overlap (a dash landing on someone) still resolves fully.
    const overlap = minDist - d;
    const soft = 1 - Math.exp(-40 * (dt || 1 / 60));
    const k = Math.max(soft, Math.min(1, overlap / 20));
    const push = overlap * k * 0.5;
    a.x -= dir * push;
    b.x += dir * push;
    // Transfer a little of the closing velocity so contact feels like contact.
    const closing = (a.vx - b.vx) * dir;
    if (closing > 0) {
      const transfer = Math.min(closing, 180) * 0.18;
      a.vx -= dir * transfer;
      b.vx += dir * transfer;
    }
    a.x = Math.max(WALL_L, Math.min(WALL_R, a.x));
    b.x = Math.max(WALL_L, Math.min(WALL_R, b.x));
  },

  /* ---------------- Entities ---------------- */
  updateProjectiles(dt) {
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i];
      p.update(dt, this);
      if (p.dead) this.projectiles.splice(i, 1);
    }
  },

  updateHazards(dt) {
    for (let i = this.hazards.length - 1; i >= 0; i--) {
      const h = this.hazards[i];
      h.update(dt, this);
      if (h.dead) this.hazards.splice(i, 1);
    }
  },

  updateMinions(dt) {
    for (let i = this.minions.length - 1; i >= 0; i--) {
      const m = this.minions[i];
      m.update(dt, this);
      if (m.dead) this.minions.splice(i, 1);
    }
  },

  updateParticles(dt) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.update(dt);
      if (p.dead) this.particles.splice(i, 1);
    }
  },

  updateTexts(dt) {
    for (let i = this.texts.length - 1; i >= 0; i--) {
      const t = this.texts[i];
      t.update(dt);
      if (t.dead) this.texts.splice(i, 1);
    }
  },

  updateAfterimages(dt) {
    for (let i = this.afterimages.length - 1; i >= 0; i--) {
      const a = this.afterimages[i];
      a.life -= dt;
      if (a.life <= 0) this.afterimages.splice(i, 1);
    }
  },

  spawnAmbient(dt) {
    this.ambientTimer -= dt;
    if (this.ambientTimer <= 0 && this.particles.length < 240) {
      this.ambientTimer = 0.12 + Math.random() * 0.2;
      Render.spawnAmbient(this);
    }
  },

  /* ---------------- Status & damage ---------------- */
  applyStatus(target, status, source, mult) {
    if (!target || !status) return;
    const m = mult || 1;
    const charmBonus = (source && source.char.id === 'aphrodite' && target.status.charm) ? 1.5 : 1;
    for (const key of Object.keys(status)) {
      let v = status[key];
      if (typeof v !== 'number') continue;
      if (key === 'poison' || key === 'burn' || key === 'bleed') {
        const dps = key === 'poison' ? 9 : key === 'burn' ? 11 : 7;
        target.buff(key, v * m * charmBonus, 0, { dps });
      } else if (key === 'slow') {
        target.buff('slow', v * m * charmBonus, 0.55);
      } else if (key === 'confuse' || key === 'blind' || key === 'freeze' || key === 'stun' || key === 'root' || key === 'charm') {
        target.buff(key, v * m * charmBonus, 0);
      } else if (key === 'armor') {
        target.buff('armor', v * m, 0.4);
      } else {
        target.buff(key, v * m, 0);
      }
    }
    if (target.char.id === 'zeus' && status.lightning) { /* reserved */ }
  },

  applyHit(attacker, defender, opts) {
    if (!attacker || !defender || defender.ko || attacker.ko) return { hit: false };
    if (this.roundState !== 'fight' && this.mode !== 'training' && opts.sourceType !== 'ultimate') return { hit: false };
    if (defender.invuln > 0 && opts.sourceType !== 'ultimate') return { hit: false };
    const dir = opts.dir || (attacker.x <= defender.x ? 1 : -1);

    // Illusion: negate the hit
    if (defender.status.illusion && opts.sourceType !== 'ultimate') {
      delete defender.status.illusion;
      attacker.buff('confuse', 1.8, 0);
      this.addText(defender.x, defender.y - defender.currentHeight() - 30, 'ILLUSION!', {
        color: '#ff9fc4', size: 22, life: 1.0, vy: -50, shadow: 'rgba(255,120,170,0.8)'
      });
      spawnParticles(this, defender.x, defender.y - 90, 'heart', 24, { speed: [40, 180] });
      AudioSys.play('heart');
      this.addShake(3);
      return { hit: false, illusion: true };
    }

    // Counter stance
    if (defender.status.counter && opts.sourceType !== 'ultimate') {
      const c = defender.status.counter;
      delete defender.status.counter;
      const counterDmg = (c.v || 80) * defender.damageMultiplier() * attacker.damageTakenMultiplier('divine', 'counter', defender);
      attacker.hp = Math.max(0, attacker.hp - counterDmg);
      attacker.state = 'hit';
      attacker.stateTime = 0;
      attacker.hitstunDur = c.stun || 0.7;
      attacker.vx = (attacker.x >= defender.x ? 1 : -1) * 380;
      attacker.vy = -260;
      attacker.y -= 2;
      attacker.hitFlash = 1;
      attacker.buff('stun', c.stun || 0.7, 0);
      defender.addMeter(14);
      this.addDamageText(attacker, counterDmg, '#ffe27a');      this.addText(attacker.x, attacker.y - attacker.currentHeight() - 40, 'COUNTER!', {
        color: '#fff3c4', size: 26, life: 1.1, vy: -50, shadow: 'rgba(255,216,115,0.9)'
      });
      spawnParticles(this, attacker.x, attacker.y - 100, 'spark', 26, { speed: [80, 340], colors: ['#fff3c4', '#ffd873', '#ffffff'] });
      this.addShake(12);
      this.hitstop = 0.09;
      AudioSys.play('counter');
      this.checkKO(attacker);
      return { hit: true, counter: true };
    }

    const blocking = defender.blocking && defender.grounded() && !opts.unblockable;
    let guardCrushed = false;
    if (blocking && opts.guardBreak && Math.abs(attacker.x - defender.x) < 220) {
      if (Math.random() < opts.guardBreak) guardCrushed = true;
    }
    if (blocking && attacker.char.id === 'hephaestus' && (opts.sourceType === 'basic')) {
      guardCrushed = true;
    }

    let damage = opts.damage || 20;
    damage *= attacker.damageMultiplier();
    const comboHits = attacker.comboHits || 0;
    if (opts.sourceType !== 'ultimate') {
      damage *= Math.max(0.42, Math.pow(0.9, comboHits));
    }
    if (attacker.status.molten) damage *= 1.08;
    if (blocking && attacker.char.id === 'hephaestus') damage *= 1.35;
    damage *= defender.damageTakenMultiplier(opts.tag || 'physical', opts.sourceType, attacker);

    if (blocking && !guardCrushed) {
      const chip = damage * (opts.chip !== undefined ? opts.chip : 0.18);
      let remaining = chip;
      if (defender.status.barrier) {
        const absorbed = Math.min(defender.status.barrier.v, remaining);
        defender.status.barrier.v -= absorbed;
        remaining -= absorbed;
        if (defender.status.barrier.v <= 0) delete defender.status.barrier;
      }
      defender.hp = Math.max(0, defender.hp - remaining);
      defender.hitFlash = Math.max(defender.hitFlash, 0.5);
      defender.blockstunT = Math.max(defender.blockstunT || 0, opts.blockstun || 0.12);
      defender.onBlockSuccess(attacker);
      attacker.addMeter(2 + (opts.meter || 4) * 0.25);
      defender.addMeter(4.5);
      defender.vx = dir * 40;
      spawnParticles(this, defender.x - dir * 26, defender.y - defender.currentHeight() * 0.6, 'spark', 8, {
        speed: [30, 160], colors: ['#ffe9a8', '#ffffff']
      });
      AudioSys.play('block');
      this.addShake(2.5);
      this.hitstop = 0.035;
      this.addText(defender.x, defender.y - defender.currentHeight() - 14, 'BLOCKED', {
        color: 'rgba(255,240,200,0.8)', size: 13, life: 0.5, vy: -30
      });
      if (remaining > 1) this.addDamageText(defender, remaining, '#c9e4ff', true);
      this.checkKO(defender);
      return { hit: false, blocked: true };
    }

    if (guardCrushed) {
      defender.blocking = false;
      defender.state = 'stun';
      defender.buff('stun', 0.45, 0);
      this.addText(defender.x, defender.y - defender.currentHeight() - 26, 'GUARD BREAK', {
        color: '#ffb347', size: 20, life: 0.9, vy: -50
      });
      AudioSys.play('counter');
    }

    // barrier absorbs
    const reflectBase = damage;
    if (defender.status.barrier) {
      const absorbed = Math.min(defender.status.barrier.v, damage);
      defender.status.barrier.v -= absorbed;
      damage -= absorbed;
      if (absorbed > 0) {
        spawnParticles(this, defender.x, defender.y - defender.currentHeight() * 0.55, 'gold', 14, { speed: [40, 200] });
        this.addText(defender.x, defender.y - defender.currentHeight() - 18, 'SHIELD', {
          color: '#ffe9a8', size: 14, life: 0.6, vy: -40
        });
      }
      if (defender.status.barrier.v <= 0) delete defender.status.barrier;
    }

    damage = Math.max(0, damage);

    // Reflect works even if the barrier absorbed the whole strike.
    if (defender.status.reflect && opts.sourceType !== 'ultimate') {
      const ref = reflectBase * defender.status.reflect.v;
      if (ref > 1) {
        attacker.hp = Math.max(0, attacker.hp - ref);
        this.addDamageText(attacker, ref, '#9fe6ff', true);
        spawnParticles(this, attacker.x, attacker.y - attacker.currentHeight() * 0.6, 'shard', 8, { speed: [40, 180] });
        this.addText(attacker.x, attacker.y - attacker.currentHeight() - 14, 'REFLECT', {
          color: '#9fe6ff', size: 12, life: 0.6, vy: -30
        });
        this.checkKO(attacker);
      }
    }

    if (damage > 0.5) {
      this.lastHitType = opts.sourceType;
      defender.hp = Math.max(0, defender.hp - damage);
      defender.hitFlash = 1;
      defender.state = 'hit';
      defender.stateTime = 0;
      defender.hitstunDur = opts.hitstun || 0.3;
      defender.vx = dir * (opts.kb || 120);
      if (opts.kbY) {
        defender.vy = -opts.kbY;
        defender.y -= 2;
        defender.state = 'hit';
      }
      if (opts.knockdown) {
        defender.vy = Math.min(defender.vy, -240);
      }
      defender.crouching = false;
      defender.blocking = false;
      this.addDamageText(defender, damage, opts.sourceType === 'ultimate' ? '#ffe27a' : '#ffffff');
      this.hitstop = opts.sourceType === 'ultimate' ? 0.02 : Math.min(0.14, 0.035 + damage / 1400);
      this.addShake(Math.min(16, 2 + damage / 14));
      this.spawnHitParticles(defender, opts.tag, damage, dir);

      // combo counter
      if (opts.sourceType !== 'trap') {
        attacker.comboHits = (attacker.comboHits || 0) + 1;
        attacker.comboTimer = 1.8;
        this.comboPop = 1;
        if (attacker.comboHits > 1) AudioSys.play('comboHit');
      }

      // meters
      attacker.addMeter(damage * 0.13 + (opts.meter || 5) * 0.5);
      defender.addMeter(damage * 0.09);

      // status from the attack
      if (opts.status) this.applyStatus(defender, opts.status, attacker, 1);
      if (attacker.status.molten && (opts.tag === 'physical' || opts.sourceType === 'basic')) {
        this.applyStatus(defender, { burn: 4 }, attacker, 1);
      }

      // Aphrodite's passive reacts to being hit
      defender.onHitLanded(attacker);

      // Zeus lightning counter
      if (defender.char.id === 'zeus' && (opts.sourceType === 'special' || opts.sourceType === 'projectile' || opts.sourceType === 'super') && !attacker.ko) {
        defender.zeusCounterCd = defender.zeusCounterCd || 0;
        if (defender.zeusCounterCd <= 0 && Math.random() < 0.22) {
          defender.zeusCounterCd = 2.5;
          this.applyHit(defender, attacker, {
            damage: 32, tag: 'lightning', kb: 260, kbY: 80,
            hitstun: 0.45, sourceType: 'passive', name: 'Lightning Counter', chip: 0,
            status: { stun: 0.35 }, dir: defender.x < attacker.x ? 1 : -1
          });
          spawnParticles(this, attacker.x, attacker.y - 90, 'lightning', 20, { speed: [80, 320] });
          this.addText(defender.x, defender.y - defender.currentHeight() - 20, 'LIGHTNING COUNTER', {
            color: '#bfe9ff', size: 14, life: 0.9, vy: -40
          });
          AudioSys.play('thunder');
        }
      }

      // audio
      if (opts.sourceType === 'ultimate') AudioSys.play('superHit');
      else if (opts.tag === 'lightning') AudioSys.play('thunder');
      else if (opts.tag === 'water') AudioSys.play('water');
      else if (opts.tag === 'fire') AudioSys.play('fire');
      else if (Math.abs(opts.kb || 0) > 280) AudioSys.play('heavy');
      else AudioSys.play('hit');

      this.checkKO(defender);

      // Hera ultimate special: self-inflicted damage
      if (opts.extraSelfDamage && damage > 0) {
        defender.hp = Math.max(0, defender.hp - opts.extraSelfDamage);
        this.addDamageText(defender, opts.extraSelfDamage, '#ffb3c8');
        this.checkKO(defender);
      }

      // heal attacker
      if (opts.healAttacker && attacker.hp > 0) {
        attacker.hp = Math.min(attacker.maxHp, attacker.hp + opts.healAttacker);
        this.addText(attacker.x, attacker.y - attacker.currentHeight() - 20, '+' + Math.round(opts.healAttacker), {
          color: '#b8ffcf', size: 18, life: 0.9, vy: -60
        });
      }

      return { hit: true, damage };
    }

    return { hit: false };
  },

  projectileHit(pr, target, dir) {
    const r = this.applyHit(pr.owner, target, {
      damage: pr.damage,
      tag: pr.tag,
      kb: pr.kb,
      kbY: pr.kbY,
      hitstun: 0.28,
      blockstun: 0.16,
      status: pr.status,
      sourceType: pr.props.wave ? 'special' : 'projectile',
      name: pr.props.name || 'Projectile',
      chip: 0.18,
      dir,
      meter: 6
    });
    spawnParticles(this, pr.x, pr.y, 'spark', 12, {
      speed: [50, 220], colors: [pr.color, pr.glow, '#ffffff']
    });
    this.addShake(r.hit ? 6 : 3);
    return r;
  },

  spawnHitParticles(target, tag, damage, dir) {
    const x = target.x;
    const y = target.y - target.currentHeight() * 0.58;
    const count = Math.min(34, 8 + Math.floor(damage / 8));
    if (tag === 'water') {
      spawnParticles(this, x, y, 'water', count, { speed: [60, 260], angle: dir > 0 ? 0 : Math.PI, spread: 1.6 });
    } else if (tag === 'fire') {
      spawnParticles(this, x, y, 'ember', count, { speed: [50, 240] });
    } else if (tag === 'lightning') {
      spawnParticles(this, x, y, 'lightning', count, { speed: [100, 380] });
    } else if (tag === 'light') {
      spawnParticles(this, x, y, 'sun', count, { speed: [60, 280] });
    } else if (tag === 'psychic') {
      spawnParticles(this, x, y, 'void', count, { speed: [40, 220] });
    } else if (tag === 'poison') {
      spawnParticles(this, x, y, 'poison', count, { speed: [50, 220] });
    } else if (tag === 'divine') {
      spawnParticles(this, x, y, 'gold', count, { speed: [60, 280] });
    } else {
      spawnParticles(this, x, y, 'spark', count, { speed: [60, 300], angle: dir > 0 ? 0 : Math.PI, spread: 1.8 });
      spawnParticles(this, x, y, 'blood', Math.floor(count * 0.4), { speed: [40, 200], angle: dir > 0 ? 0 : Math.PI, spread: 1.4 });
    }
  },

  checkKO(f) {
    if (!f || f.hp > 0 || f.ko) return;
    f.hp = 0;
    if (this.mode === 'training') {
      f.ko = false;
      f.hp = f.maxHp;
      f.state = 'idle';
      f.stateTime = 0;
      f.status = {};
      f.vx = 0; f.vy = 0; f.y = GROUND_Y;
      this.addText(f.x, f.y - f.currentHeight() - 30, 'RESET', { color: '#9fe6ff', size: 22, life: 1.0 });
      spawnParticles(this, f.x, f.y - 60, 'gold', 20, { speed: [40, 180] });
      return;
    }
    if (this.roundState === 'ko' || this.roundState === 'over') return;
    f.ko = true;
    f.state = 'ko';
    f.koTime = 0;
    f.stateTime = 0;
    f.vx = (f.x < (f.opponent ? f.opponent.x : 640) ? -1 : 1) * 260;
    f.vy = -420;
    f.y -= 2;
    f.hitFlash = 1;
    this.flash = 0.75;
    this.flashColor = '#ffffff';
    this.addShake(18);
    this.slowmo = 1.2;
    AudioSys.play('ko');
    spawnParticles(this, f.x, f.y - 100, 'spark', 36, { speed: [80, 380] });

    const other = f.opponent;
    let winner = null;
    if (other && !other.ko) winner = other;
    if (winner) {
      winner.wins = (winner.wins || 0) + 1;
      this.roundWinner = winner;
    } else {
      // double knockout: give both a win
      f.wins = (f.wins || 0) + 1;
      if (other) other.wins = (other.wins || 0) + 1;
      this.roundWinner = other && !other.ko ? other : null;
    }
    this.roundState = 'ko';
    this.koTimer = 3.7;
    const perfect = winner && winner.hp >= winner.maxHp;
    this.announce = {
      text: perfect ? 'PERFECT!' : 'K.O.',
      sub: winner ? `${winner.char.name} TAKES THE ROUND` : 'DOUBLE KNOCKOUT',
      t: 0, dur: 2.4, size: perfect ? 72 : 92,
      color: perfect ? '#ffe27a' : '#ff6b4a',
      glow: 'rgba(255,120,60,0.7)', y: 320
    };
  },

  timeOver() {
    if (this.roundState !== 'fight') return;
    this.lastHitType = null;
    const [a, b] = this.fighters;
    const ra = a.hp / a.maxHp;
    const rb = b.hp / b.maxHp;
    let winner = null;
    if (Math.abs(ra - rb) < 0.001) {
      winner = a.meter >= b.meter ? a : b;
    } else {
      winner = ra > rb ? a : b;
    }
    this.roundWinner = winner;
    if (winner) winner.wins = (winner.wins || 0) + 1;
    this.roundState = 'ko';
    this.koTimer = 3.4;
    this.announce = {
      text: 'TIME OVER', sub: winner ? `${winner.char.name} WINS THE ROUND` : 'DRAW',
      t: 0, dur: 2.4, size: 76, color: '#ffd873', glow: 'rgba(255,200,80,0.6)', y: 320
    };
    AudioSys.play('ko');
    if (winner) {
      winner.state = 'victory';
      winner.stateTime = 0;
    }
    const loser = winner === a ? b : a;
    if (loser) { loser.state = 'idle'; loser.blocking = false; }
  },

  endMatch() {
    if (this.roundState === 'over') return;
    const [a, b] = this.fighters;
    const winnerIdx = a.wins > b.wins ? 0 : b.wins > a.wins ? 1 : 0;
    const winner = this.fighters[winnerIdx];
    this.roundState = 'over';
    this.overTimer = 2.8;
    this.result = {
      mode: this.mode,
      winnerIdx,
      winnerChar: winner.char.id,
      p1Char: this.p1CharId,
      p2Char: this.p2CharId,
      wins: [a.wins, b.wins],
      arcade: this.arcade,
      finisher: this.lastHitType === 'ultimate'
    };
    this.announce = {
      text: this.mode === 'versus' ? `PLAYER ${winnerIdx + 1} WINS` : winnerIdx === 0 ? 'VICTORY' : 'DEFEAT',
      sub: `${winner.char.name} — ${winner.char.role}`,
      t: 0, dur: 2.7, size: this.mode === 'versus' ? 58 : 82,
      color: winnerIdx === 0 ? '#ffe27a' : '#ff8a5a',
      glow: 'rgba(255,200,80,0.6)', y: 310
    };
    AudioSys.play(winnerIdx === 0 ? 'victory' : 'ko');
    winner.state = 'victory';
    winner.stateTime = 0;
    this.slowmo = 0.6;
  },

  /* ---------------- Ultimate cinematics ---------------- */
  startUltimate(attacker) {
    if (!attacker || this.cinematic || attacker.meter < 100 || attacker.ko) return;
    const defender = attacker.opponent;
    if (!defender || defender.ko) return;
    attacker.meter = 0;
    attacker.state = 'ultimate';
    attacker.stateTime = 0;
    attacker.vx = 0;
    attacker.invuln = 4;
    defender.state = 'hit';
    defender.stateTime = 0;
    defender.hitstunDur = 4;
    defender.vx = 0;
    defender.vy = 0;
    defender.y = GROUND_Y;
    defender.blocking = false;

    this.projectiles = [];
    this.minions = [];
    this.hazards = [];
    this.cinematic = {
      attacker, defender,
      kind: attacker.char.ultimate.kind,
      t: 0, dur: 3.05,
      damageApplied: false,
      flash: 0,
      heal: attacker.char.ultimate.heal || 0
    };
    this.hitstop = 0;
    this.slowmo = 0;
    this.addShake(6);
    this.flash = 0.25;
    this.flashColor = attacker.char.palette.glow;
    AudioSys.play('super');
    AudioSys.play('charge');
    spawnParticles(this, attacker.x, attacker.y - attacker.currentHeight() * 0.5, 'gold', 40, {
      speed: [60, 300], colors: [attacker.char.palette.glow, attacker.char.palette.accent, '#ffffff']
    });
  },

  updateCinematic(dt) {
    const cin = this.cinematic;
    if (!cin) return;
    cin.t += dt;
    const attacker = cin.attacker;
    const defender = cin.defender;
    if (cin.flash > 0) cin.flash = Math.max(0, cin.flash - dt * 2.5);

    if (cin.t >= 1.55 && !cin.damageApplied) {
      cin.damageApplied = true;
      const ult = attacker.char.ultimate;
      const extra = ULTIMATE_EXTRAS[attacker.char.id] || {};
      const dir = attacker.x <= defender.x ? 1 : -1;
      this.flash = 0.62;
      this.flashColor = attacker.char.palette.glow;
      this.addShake(26);
      cin.flash = 0.35;
      AudioSys.play('superHit');
      spawnParticles(this, defender.x, defender.y - defender.currentHeight() * 0.5, 'spark', 60, {
        speed: [120, 520], colors: [attacker.char.palette.glow, '#ffffff', attacker.char.palette.accent]
      });
      if (cin.kind === 'poseidon') {
        spawnParticles(this, defender.x, GROUND_Y - 30, 'water', 50, { speed: [80, 340] });
      } else if (cin.kind === 'hephaestus') {
        spawnParticles(this, defender.x, defender.y - 30, 'ember', 50, { speed: [80, 360] });
      } else if (cin.kind === 'aphrodite') {
        spawnParticles(this, defender.x, defender.y - 90, 'heart', 40, { speed: [50, 260] });
      } else if (cin.kind === 'artemis') {
        spawnParticles(this, defender.x, defender.y - 80, 'shard', 40, { speed: [80, 340] });
      } else if (cin.kind === 'zeus' || cin.kind === 'athena') {
        spawnParticles(this, defender.x, defender.y - 90, 'lightning', 50, { speed: [100, 420] });
        AudioSys.play('thunder');
      }
      this.applyHit(attacker, defender, {
        damage: ult.damage,
        tag: extra.tag || 'divine',
        kb: extra.kb || 650,
        kbY: extra.kbY || 360,
        hitstun: 1.4,
        unblockable: true,
        sourceType: 'ultimate',
        name: ult.name,
        chip: 0,
        status: extra.status || null,
        extraSelfDamage: extra.selfDamage || 0,
        healAttacker: cin.heal,
        dir
      });
      if (attacker.hp < attacker.maxHp && cin.heal) {
        // handled in applyHit
      }
      if (attacker.char.id === 'apollo') {
        attacker.hp = Math.min(attacker.maxHp, attacker.hp + 100);
        this.addText(attacker.x, attacker.y - attacker.currentHeight() - 24, '+100', { color: '#b8ffcf', size: 20, life: 1.0, vy: -50 });
      }
      if (attacker.char.id === 'aphrodite') {
        attacker.hp = Math.min(attacker.maxHp, attacker.hp + 150);
        this.addText(attacker.x, attacker.y - attacker.currentHeight() - 24, '+150', { color: '#b8ffcf', size: 20, life: 1.0, vy: -50 });
      }
    }

    if (cin.t >= cin.dur) {
      this.cinematic = null;
      attacker.state = 'idle';
      attacker.stateTime = 0;
      attacker.invuln = 0.2;
      if (!defender.ko) {
        defender.state = 'hit';
        defender.stateTime = 0;
        defender.hitstunDur = 0.55;
      }
      this.slowmo = 0.4;
      this.addShake(4);
      if (this.pendingKO) {
        const p = this.pendingKO;
        this.pendingKO = null;
        this.checkKO(p.fighter);
      }
    }
  },

  /* ---------------- Text / effects helpers ---------------- */
  addText(x, y, text, opts = {}) {
    this.texts.push(new FloatText(this, x, y, text, {
      color: opts.color || '#ffffff',
      size: opts.size || 20,
      life: opts.life || 0.9,
      vy: opts.vy !== undefined ? opts.vy : -60,
      stroke: opts.stroke || 'rgba(10,6,14,0.8)',
      shadow: opts.shadow || null
    }));
  },

  addDamageText(target, damage, color, minor) {
    this.texts.push(new FloatText(this, target.x + (Math.random() - 0.5) * 30, target.y - target.currentHeight() * 0.75, String(Math.round(damage)), {
      color: color || '#ffffff',
      size: minor ? 16 : 24,
      life: minor ? 0.55 : 0.8,
      vy: minor ? -40 : -80,
      stroke: 'rgba(10,6,14,0.8)'
    }));
  },

  addShake(v) {
    this.shake = Math.min(30, this.shake + v);
  },

  /* ---------------- Drawing ---------------- */
  drawBackdrop(dt) {
    this.time += Math.min(dt, 0.05);
    this.spawnAmbient(Math.min(dt, 0.05));
    this.updateParticles(Math.min(dt, 0.05));
    Render.beginFrame();
    Render.drawArena(this.ctx, this);
    Render.drawParticles(this.ctx, this);
    Render.drawVignette(this.ctx, 'rgba(0,0,0,', 0.55);
  },

  draw() {
    const ctx = this.ctx;
    Render.beginFrame();
    const shakeX = this.shake > 0 ? (Math.random() - 0.5) * this.shake : 0;
    const shakeY = this.shake > 0 ? (Math.random() - 0.5) * this.shake * 0.6 : 0;
    ctx.save();
    ctx.translate(shakeX, shakeY);

    Render.drawArena(ctx, this);

    // afterimages
    for (const a of this.afterimages) {
      ctx.save();
      ctx.globalAlpha = (a.life / a.maxLife) * 0.25;
      ctx.fillStyle = CHAR_BY_ID[a.char.id].palette.glow;
      ctx.beginPath();
      ctx.ellipse(a.x, GROUND_Y - 75, 26, 74, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    for (const h of this.hazards) Render.drawHazard(ctx, h, this.time);
    for (const m of this.minions) Render.drawMinion(ctx, m, this.time);
    for (const p of this.projectiles) Render.drawProjectile(ctx, p, this.time);

    // fighters (draw the airborne / further one first)
    const order = this.fighters.slice().sort((a, b) => {
      if (a.ko !== b.ko) return a.ko ? -1 : 1;
      return a.y - b.y;
    });
    for (const f of order) {
      if (!f) continue;
      Render.drawFighter(ctx, f, this);
    }

    Render.drawParticles(ctx, this);
    Render.drawTexts(ctx, this);

    ctx.restore();

    // cinematic focus
    Render.drawVignette(ctx, 'rgba(0,0,0,', 0.36);

    // HUD
    HUD.draw(ctx, this);

    // full-screen flash
    if (this.flash > 0) {
      ctx.save();
      ctx.globalAlpha = Math.min(0.85, this.flash);
      ctx.fillStyle = this.flashColor;
      ctx.fillRect(0, 0, GAME_W, GAME_H);
      ctx.restore();
    }

    // blind effect for the human player
    const p1Blind = this.fighters[0] && this.fighters[0].status.blind;
    if (p1Blind) {
      ctx.save();
      const grd = ctx.createRadialGradient(GAME_W / 2, GAME_H / 2, 120, GAME_W / 2, GAME_H / 2, 800);
      grd.addColorStop(0, 'rgba(5,3,12,0.15)');
      grd.addColorStop(1, 'rgba(5,3,12,0.82)');
      ctx.fillStyle = grd;
      ctx.fillRect(0, 0, GAME_W, GAME_H);
      ctx.restore();
    }

    // paused veil is handled by UI, but keep a dim layer if paused for safety
  },

  quit() {
    this.active = false;
    this.paused = false;
    this.matchEnded = false;
    this.cinematic = null;
    this.fighters = [];
    this.projectiles = [];
    this.hazards = [];
    this.minions = [];
    this.particles = [];
    this.texts = [];
    this.afterimages = [];
    this.schedules = [];
    this.announce = null;
    this.result = null;
    this.roundState = 'intro';
    AudioSys.stopAmbient();
  },

  setPaused(v) {
    this.paused = v;
  }
};

const ULTIMATE_EXTRAS = {
  athena: { tag: 'lightning', status: { stun: 0.8 }, kb: 620, kbY: 320 },
  hera: { tag: 'divine', status: { confuse: 3.0 }, selfDamage: 45, kb: 550, kbY: 260 },
  poseidon: { tag: 'water', status: { slow: 2.2 }, kb: 760, kbY: 380 },
  hephaestus: { tag: 'fire', status: { burn: 5 }, kb: 580, kbY: 300 },
  furies: { tag: 'psychic', status: { confuse: 3.2, blind: 2.5 }, kb: 600, kbY: 320 },
  aphrodite: { tag: 'divine', status: { charm: 4 }, kb: 520, kbY: 280 },
  apollo: { tag: 'light', status: { blind: 2.5 }, kb: 600, kbY: 340 },
  ares: { tag: 'physical', status: { stun: 1.0 }, kb: 700, kbY: 400 },
  artemis: { tag: 'physical', status: { root: 2.0 }, kb: 600, kbY: 320 },
  zeus: { tag: 'lightning', status: { stun: 1.2 }, kb: 760, kbY: 420 }
};
