/* ============================================================
   OLYMPUS: SURVIVAL — Fighter class
   ============================================================ */

let FIGHTER_ID = 1;

/* Movement tuning. Distances are in stage pixels; times in seconds. */
const MOVEMENT = {
  groundAccel: 2900,     // px/s² while a direction is held
  groundDecel: 2400,     // px/s² when the direction is released
  turnAccel: 4400,       // px/s² when reversing (harder push off the ground)
  airAccel: 1250,        // px/s² of air control
  gravityRise: 2500,
  gravityFall: 2750,
  maxFall: 1750,
  jumpCutDelay: 0.08,    // let go after this long for a shorter hop
  jumpCutSpeed: 380,
  dashTime: 0.18,
  dashSpeed: 820,
  dashEndSpeed: 620,
  gaitPerPixel: 0.039,   // keeps the stride locked to distance travelled
  walkFootstepSpeed: 60
};

/* Move `current` toward `target` by at most `maxDelta`. */
function approach(current, target, maxDelta) {
  if (current < target) return Math.min(current + maxDelta, target);
  return Math.max(current - maxDelta, target);
}

class Fighter {
  constructor(charId, playerIndex, isCPU, game) {
    this.id = FIGHTER_ID++;
    this.char = CHAR_BY_ID[charId];
    this.playerIndex = playerIndex;
    this.isCPU = !!isCPU;
    this.game = game;
    const vis = (typeof Render !== 'undefined' && Render.VIS) ? Render.VIS[charId] : null;
    this.visual = vis || null;
    this.scale = vis ? vis.scale : 1;

    this.maxHp = MAX_HP;
    this.hp = MAX_HP;
    this.displayHp = MAX_HP;
    this.meter = 0;

    this.x = playerIndex === 0 ? 400 : 880;
    this.y = GROUND_Y;
    this.vx = 0;
    this.vy = 0;
    this.facing = playerIndex === 0 ? 1 : -1;

    this.state = 'idle';
    this.stateTime = 0;
    this.gait = 0;
    this.gaitX = this.x;
    this.animOffset = Math.random() * 10;

    this.attackMove = null;
    this.attackT = 0;
    this.attackHit = false;
    this.attackSpeedStat = 1 + (this.char.stats.speed - 5) * 0.02;
    this.walkSpeed = 190 + this.char.stats.speed * 18;
    this.powerMult = 0.82 + this.char.stats.power * 0.045;
    this.defenseMult = 1.12 - this.char.stats.defense * 0.03;

    this.crouching = false;
    this.blocking = false;
    this.blockstunT = 0;
    this.airAttackUsed = false;
    this.jumpHeld = false;

    this.status = {};
    this.cooldowns = {};
    this.blockStreak = 0;
    this.blockStreakTimer = 0;
    this.hitStreak = 0;
    this.hitStreakTimer = 0;
    this.charmStacks = 0;
    this.charmTimer = 0;

    this.comboHits = 0;
    this.comboTimer = 0;
    this.lastAttackWasThis = 0;
    this.hitFlash = 0;
    this.hitstop = 0;
    this.flashTimer = 0;
    this.ko = false;
    this.koTime = 0;
    this.wins = 0;
    this.frozenTime = 0;

    this.dashCd = 0;
    this.dashTime = 0;
    this.dashDuration = MOVEMENT.dashTime;
    this.dashDir = 1;
    this.dashTrailT = 0;
    this.skidCd = 0;
    this.lastTap = { left: -9, right: -9 };

    // Visual-only movement flourishes.
    this.landSquash = 0;
    this.lastFootPhase = 0;

    this.buffered = null;

    this.specialT = 0;
    this.castTime = 0;
    this.pendingSpecial = null;
    this.castPose = 'cast';
    this.specialEnhanced = false;
    this.specialName = '';

    this.superArmor = 0;
    this.invuln = 0;
    this.alpha = 1;

    this.ultimateUsed = false;
    this.matchReached = false;
  }

  /* ---------------- Geometry ---------------- */
  currentHeight() {
    if (this.crouching && this.grounded() && this.state !== 'jump' && this.state !== 'hit') {
      return 128 * this.scale;
    }
    return 182 * this.scale;
  }

  hurtbox() {
    const h = this.currentHeight();
    const w = 66 * this.scale;
    return { x: this.x - w / 2, y: this.y - h, w, h };
  }

  hitbox(move) {
    const w = move.hitW || 60;
    const h = move.hitH || 50;
    const cx = this.x + this.facing * (move.reach || 70);
    const cy = this.y + (move.hitY || -90);
    return { x: cx - w / 2, y: cy - h / 2, w, h };
  }

  grounded() {
    return this.y >= GROUND_Y - 0.6;
  }

  isVisible() { return true; }

  /* ---------------- Round setup ---------------- */
  resetRound(x, facing, keepMeter) {
    this.hp = this.maxHp;
    this.displayHp = this.maxHp;
    if (!keepMeter) this.meter = 0;
    this.x = x;
    this.y = GROUND_Y;
    this.vx = 0;
    this.vy = 0;
    this.facing = facing;
    this.state = 'idle';
    this.stateTime = 0;
    this.crouching = false;
    this.blocking = false;
    this.attackMove = null;
    this.attackT = 0;
    this.attackHit = false;
    this.status = {};
    this.cooldowns = {};
    this.comboHits = 0;
    this.comboTimer = 0;
    this.hitFlash = 0;
    this.ko = false;
    this.koTime = 0;
    this.airAttackUsed = false;
    this.blockStreak = 0;
    this.hitStreak = 0;
    this.charmStacks = 0;
    this.superArmor = 0;
    this.invuln = 0;
    this.blockstunT = 0;
    this.dashTime = 0;
    this.dashTrailT = 0;
    this.skidCd = 0;
    this.landSquash = 0;
    this.lastFootPhase = 0;
    this.jumpHeld = false;
    this.gait = 0;
    this.gaitX = x;
    this.pendingSpecial = null;
    this.buffered = null;
    this.alpha = 1;
    this.castTime = 0;
    this.specialT = 0;
    this.animOffset = Math.random() * 10;
  }

  /* ---------------- Status helpers ---------------- */
  addMeter(v) {
    if (this.ko) return;
    const before = this.meter;
    this.meter = Math.max(0, Math.min(100, this.meter + v));
    if (before < 100 && this.meter >= 100 && this.playerIndex === 0) {
      AudioSys.play('meterFull');
    }
  }

  buff(key, t, v, extra) {
    if (this.ko) return;
    const cur = this.status[key];
    if (cur && cur.t > t) {
      if (v !== undefined) cur.v = Math.max(cur.v || 0, v);
      if (extra) Object.assign(cur, extra);
      return;
    }
    const obj = { t, v };
    if (extra) Object.assign(obj, extra);
    this.status[key] = obj;
  }

  applyBuff(self, duration, enhanced) {
    const mult = enhanced ? 1.25 : 1;
    for (const key of Object.keys(self)) {
      const val = self[key];
      if (key === 'barrier') {
        this.buff('barrier', duration, (this.status.barrier ? this.status.barrier.v : 0) + val * mult);
      } else if (key === 'regen') {
        this.buff('regen', duration, val * mult);
      } else if (key === 'reflect' || key === 'armor' || key === 'damageUp' || key === 'speedUp' || key === 'attackSpeed') {
        this.buff(key, duration, val);
      } else if (key === 'illusion') {
        this.buff('illusion', duration);
      } else if (key === 'molten') {
        this.buff('molten', duration, val);
      } else {
        this.buff(key, duration, val);
      }
    }
  }

  damageMultiplier() {
    let m = this.powerMult;
    if (this.status.damageUp) m *= 1 + this.status.damageUp.v;
    if (this.status.molten) m *= 1.08;
    const missing = 1 - this.hp / this.maxHp;
    if (this.char.id === 'ares') m *= 1 + 0.35 * missing;
    if (this.char.id === 'furies') m *= 1 + 0.35 * missing;
    if (this.char.id === 'athena' && this.status.foresight) m *= 1.2;
    const opp = this.opponent;
    if (this.char.id === 'artemis' && opp && Math.abs(opp.x - this.x) > 350) m *= 1.25;
    if (this.char.id === 'zeus') m *= 1.05;
    if (this.char.id === 'aphrodite' && opp && opp.status.charm) m *= 1.2;
    return m;
  }

  speedMultiplier() {
    let m = 1;
    if (this.status.slow) m *= this.status.slow.v || 0.55;
    if (this.status.speedUp) m *= 1 + this.status.speedUp.v;
    if (this.status.root) m *= 0;
    if (this.char.id === 'furies') m *= 1 + 0.25 * (1 - this.hp / this.maxHp);
    if (this.char.id === 'poseidon' && this.game.arena && this.game.arena.id === 'sea') m *= 1.12;
    return m;
  }

  attackSpeedMultiplier() {
    let m = this.attackSpeedStat;
    if (this.status.attackSpeed) m *= 1 + this.status.attackSpeed.v;
    if (this.status.slow) m *= 0.82;
    return m;
  }

  damageTakenMultiplier(tag, sourceType, attacker) {
    let m = this.defenseMult;
    if (this.status.armor) m *= 1 - this.status.armor.v;
    if (this.char.id === 'hera' && this.hp / this.maxHp < 0.3) m *= 0.85;
    if (this.char.id === 'poseidon' && tag === 'water') m *= 0.7;
    if (this.char.id === 'zeus' && tag !== 'physical') m *= 0.75;
    if (this.status.foresight) m *= 0.9;
    return m;
  }

  /* ---------------- Update ---------------- */
  update(dt, input, opponent) {
    this.opponent = opponent;
    this.stateTime += dt;
    // Advance the walk cycle from the distance actually covered since the
    // previous frame. This includes body pushes and wall stops, so the feet
    // stay planted rather than skating.
    if (this.gaitX === undefined) this.gaitX = this.x;
    this.gait = (this.gait || 0) + (this.x - this.gaitX) * MOVEMENT.gaitPerPixel;
    this.gaitX = this.x;
    this.displayHp += (this.hp - this.displayHp) * Math.min(1, dt * 7);
    if (Math.abs(this.displayHp - this.hp) < 0.5) this.displayHp = this.hp;
    this.hitFlash = Math.max(0, this.hitFlash - dt * 3.6);
    this.dashCd = Math.max(0, this.dashCd - dt);
    this.landSquash = Math.max(0, (this.landSquash || 0) - dt * 7);
    if (this.skidCd > 0) this.skidCd = Math.max(0, this.skidCd - dt);
    this.superArmor = Math.max(0, this.superArmor - dt);
    this.invuln = Math.max(0, this.invuln - dt);
    if (this.blockstunT > 0) this.blockstunT = Math.max(0, this.blockstunT - dt);
    if (this.zeusCounterCd > 0) this.zeusCounterCd = Math.max(0, this.zeusCounterCd - dt);
    if (this.comboTimer > 0) {
      this.comboTimer -= dt;
      if (this.comboTimer <= 0) this.comboHits = 0;
    }
    if (this.blockStreakTimer > 0) {
      this.blockStreakTimer -= dt;
      if (this.blockStreakTimer <= 0) this.blockStreak = 0;
    }
    if (this.charmTimer > 0) {
      this.charmTimer -= dt;
      if (this.charmTimer <= 0) this.charmStacks = 0;
    }
    for (const key in this.cooldowns) {
      if (this.cooldowns[key] > 0) this.cooldowns[key] = Math.max(0, this.cooldowns[key] - dt);
    }

    this.updateStatuses(dt);

    if (this.ko) {
      this.koTime += dt;
      this.updatePhysics(dt, opponent);
      return;
    }

    if (this.game.cinematic) {
      // during a cinematic the two participants hold their dramatic poses
      if (this.state !== 'ultimate' && this.state !== 'hit') {
        this.state = 'idle';
      }
      this.vx = 0;
      this.updatePhysics(dt, opponent);
      return;
    }

    if (this.status.freeze) {
      this.state = 'frozen';
      this.vx = 0;
      this.updatePhysics(dt, opponent);
      return;
    }
    if (this.status.stun) {
      if (this.state !== 'stunned') { this.state = 'stunned'; this.stateTime = 0; }
      this.vx *= Math.exp(-6.3 * dt);
      this.updatePhysics(dt, opponent);
      return;
    }

    if (this.status.root) {
      this.vx = 0;
    }

    const confused = !!this.status.confuse;
    let inp = input;
    if (confused) {
      inp = {
        held: Object.assign({}, input.held),
        pressed: Object.assign({}, input.pressed)
      };
      const l = inp.held.left, r = inp.held.right;
      inp.held.left = r; inp.held.right = l;
      const pl = inp.pressed.left, pr = inp.pressed.right;
      inp.pressed.left = pr; inp.pressed.right = pl;
    }

    // hitstun / blockstun / knockdown
    if (this.state === 'hit') {
      this.vx *= Math.exp(-2.1 * dt);
      this.updatePhysics(dt, opponent);
      if (this.state !== 'hit') return;
      if (this.grounded() && this.stateTime > 0.05 && this.stateTime > (this.hitstunDur || 0.25)) {
        this.toIdle();
      }
      return;
    }

    if (this.state === 'down') {
      this.vx *= Math.exp(-6.3 * dt);
      this.updatePhysics(dt, opponent);
      if (this.stateTime > 0.45) this.toIdle();
      return;
    }

    // A dash is a committed burst: it runs for its full duration instead of
    // being overwritten by the held direction on the very next frame.
    if (this.state === 'dash') {
      this.updatePhysics(dt, opponent);
      return;
    }

    if (this.state === 'attack') {
      this.updateAttack(dt, opponent);
      this.updatePhysics(dt, opponent);
      return;
    }

    if (this.state === 'special') {
      this.updateSpecial(dt, opponent);
      this.updatePhysics(dt, opponent);
      return;
    }

    // actionable
    if (this.state !== 'block') this.blocking = false;
    this.handleInput(dt, inp, opponent);
    this.updatePhysics(dt, opponent);
    this.updateFootsteps();
  }

  updateStatuses(dt) {
    const st = this.status;
    for (const key of Object.keys(st)) {
      const s = st[key];
      if (!s) { delete st[key]; continue; }
      if (key === 'barrier') {
        s.t -= dt;
        if (s.t <= 0 || s.v <= 0) delete st[key];
        continue;
      }
      s.t -= dt;
      if (s.t <= 0) { delete st[key]; continue; }
      if (key === 'poison' || key === 'burn' || key === 'bleed') {
        this.dotAccum = (this.dotAccum || 0) + dt;
        if (this.dotAccum >= 0.45) {
          this.dotAccum = 0;
          const dmg = (s.dps || 8) * 0.45;
          this.hp = Math.max(0, this.hp - dmg * this.defenseMult);
          this.game.addDamageText(this, dmg, key === 'poison' ? '#79ff7a' : key === 'burn' ? '#ff9b3d' : '#ff4a4a', true);
          spawnParticles(this.game, this.x + (Math.random() - 0.5) * 30, this.y - this.currentHeight() * (0.3 + Math.random() * 0.5),
            key === 'poison' ? 'poison' : key === 'burn' ? 'ember' : 'blood', 2, { speed: [20, 80] });
          if (this.hp <= 0) this.game.checkKO(this);
        }
      }
      if (key === 'regen') {
        this.hp = Math.min(this.maxHp, this.hp + (s.v || 20) * dt);
      }
    }

    // passive regeneration
    if (this.char.id === 'apollo' && !this.ko) {
      const rate = (this.game.arena && this.game.arena.id === 'olympus') ? 8 : 3;
      this.hp = Math.min(this.maxHp, this.hp + rate * dt);
    }
    if (this.char.id === 'hera' && this.hp / this.maxHp < 0.3 && this.hp > 0) {
      this.hp = Math.min(this.maxHp, this.hp + 4 * dt);
    }
    if (this.game.mode === 'training') {
      this.hp = Math.min(this.maxHp, this.hp + 22 * dt);
      this.addMeter(10 * dt);
    }
  }

  updatePhysics(dt, opponent) {
    if (!this.grounded()) {
      // Heavier on the way down than on the way up: jumps feel weighty
      // without changing how high they go.
      const gravity = this.vy < 0 ? MOVEMENT.gravityRise : MOVEMENT.gravityFall;
      this.vy = Math.min(MOVEMENT.maxFall, this.vy + gravity * dt);
      this.y += this.vy * dt;
      this.x += this.vx * dt;
      if (this.y >= GROUND_Y) {
        this.y = GROUND_Y;
        const landingVy = this.vy;
        this.vy = 0;
        this.airAttackUsed = false;
        this.jumpHeld = false;
        // Squash scales with impact speed and is read by the renderer.
        this.landSquash = Math.max(this.landSquash || 0, Math.min(1, landingVy / 1150));
        if (this.state === 'hit') {
          this.state = 'down';
          this.stateTime = 0;
          this.vx *= 0.4;
          this.game.addShake(6);
          spawnParticles(this.game, this.x, GROUND_Y, 'dust', 10, { speed: [40, 160], angle: -Math.PI / 2, spread: 2 });
          AudioSys.play('heavy');
        } else if (this.state === 'jump') {
          this.state = 'idle';
          this.stateTime = 0;
          this.game.addShake(2);
          const dust = landingVy > 700 ? 10 : 6;
          spawnParticles(this.game, this.x, GROUND_Y, 'dust', dust, {
            speed: [20, 90 + Math.min(120, landingVy * 0.08)], angle: -Math.PI / 2, spread: 2.4
          });
        }
        if (landingVy > 700) this.game.addShake(3);
      }
    } else {
      this.y = GROUND_Y;
      if (this.vy > 0) this.vy = 0;
      this.x += this.vx * dt;

      if (this.state === 'dash') {
        this.dashTime -= dt;
        const p = 1 - Math.max(0, this.dashTime) / this.dashDuration;
        this.vx = this.status.root ? 0 : this.dashDir * (MOVEMENT.dashSpeed + (MOVEMENT.dashEndSpeed - MOVEMENT.dashSpeed) * p);
        this.dashTrailT -= dt;
        if (this.dashTrailT <= 0) {
          this.dashTrailT = 0.04;
          this.game.afterimages.push({
            x: this.x, y: this.y, facing: this.facing, char: this.char,
            life: 0.22, maxLife: 0.22, playerIndex: this.playerIndex
          });
        }
        if (this.dashTime <= 0) this.toIdle();
      } else if (this.state !== 'walk') {
        // Frame-rate independent ground friction (knockback, whiffs, landing).
        this.vx *= Math.exp(-15 * dt);
        if (Math.abs(this.vx) < 3) this.vx = 0;
      }
    }
    this.x = Math.max(WALL_L, Math.min(WALL_R, this.x));
  }

  /* Small dust puffs on each footfall, synced to the walk cycle. */
  updateFootsteps() {
    if (this.ko || this.state !== 'walk' || !this.grounded()) {
      this.lastFootPhase = Math.floor((this.gait || 0) / Math.PI);
      return;
    }
    const speed = Math.abs(this.vx);
    if (speed < MOVEMENT.walkFootstepSpeed) {
      this.lastFootPhase = Math.floor((this.gait || 0) / Math.PI);
      return;
    }
    const phase = Math.floor((this.gait || 0) / Math.PI);
    if (phase === this.lastFootPhase) return;
    this.lastFootPhase = phase;
    if (this.game.particles.length < 240) {
      spawnParticles(this.game, this.x - this.facing * 9, GROUND_Y, 'dust', 2, {
        speed: [8, 34], angle: -Math.PI / 2, spread: 2.4,
        life: [0.22, 0.42], size: [1.2, 2.6]
      });
    }
  }

  canAct() {
    if (this.ko || this.game.cinematic) return false;
    if (this.status.freeze || this.status.stun) return false;
    if (this.state === 'attack' || this.state === 'special' || this.state === 'hit' ||
      this.state === 'down' || this.state === 'ultimate' || this.state === 'stunned' || this.state === 'frozen') return false;
    return true;
  }

  handleInput(dt, input, opponent) {
    if (this.game.roundState !== 'fight' && this.game.mode !== 'training') {
      if (this.state !== 'idle' && this.state !== 'victory' && this.state !== 'ko') this.toIdle();
      return;
    }
    if (!this.grounded()) {
      // Variable jump height: releasing jump after the initial rise cuts the
      // hop short, so a tap is a small hop and a hold is a full leap.
      if (this.jumpHeld && !input.held.up && this.state === 'jump' &&
          this.stateTime > MOVEMENT.jumpCutDelay && this.vy < -MOVEMENT.jumpCutSpeed) {
        this.vy = -MOVEMENT.jumpCutSpeed;
        this.jumpHeld = false;
      }
      // air attacks
      if ((input.pressed.punch || input.pressed.kick) && !this.airAttackUsed) {
        this.airAttackUsed = true;
        const move = input.pressed.punch ? this.char.basics.air : this.char.basics.airKick;
        this.startAttack({ move, air: true });
        return;
      }
      // Air control accelerates rather than snapping, and keeps momentum
      // that is already faster than walking speed.
      const airDir = (input.held.right ? 1 : 0) - (input.held.left ? 1 : 0);
      if (airDir !== 0) {
        const airMax = this.walkSpeed * this.speedMultiplier();
        if (this.vx * airDir < airMax) {
          this.vx = approach(this.vx, airDir * airMax, MOVEMENT.airAccel * dt);
        }
      }
      return;
    }

    // block
    if (this.blockstunT > 0) {
      this.blocking = true;
      this.state = 'block';
      this.vx = 0;
      return;
    }
    if (input.held.block && this.state !== 'attack') {
      this.crouching = !!input.held.down;
      if (this.state !== 'block') {
        this.state = 'block';
        this.stateTime = 0;
      }
      this.blocking = true;
      this.vx = 0;
      return;
    } else if (this.state === 'block') {
      this.blocking = false;
      this.toIdle();
    }

    // dash double tap
    const now = this.game.time;
    if (input.pressed.left) {
      if (now - this.lastTap.left < 0.26 && this.dashCd <= 0) {
        this.startDash(-1);
        this.lastTap.left = -9;
        return;
      }
      this.lastTap.left = now;
    }
    if (input.pressed.right) {
      if (now - this.lastTap.right < 0.26 && this.dashCd <= 0) {
        this.startDash(1);
        this.lastTap.right = -9;
        return;
      }
      this.lastTap.right = now;
    }

    if (input.pressed.up) {
      // Only a held jump can be cut short; a tap or a scripted jump (CPU)
      // still gets the full arc.
      this.jumpHeld = !!input.held.up;
      this.jump();
      return;
    }

    this.crouching = !!input.held.down;

    // specials (both special buttons = third art)
    const comboSpecial = (input.pressed.s1 && input.held.s2) || (input.pressed.s2 && input.held.s1) ||
      (input.pressed.s1 && input.pressed.s2);
    if (comboSpecial) {
      this.trySpecial(2);
      return;
    }
    if (input.pressed.s1) { this.trySpecial(0); return; }
    if (input.pressed.s2) { this.trySpecial(1); return; }
    if (input.pressed.super) { this.useSuper(); return; }

    const dir = (input.held.right ? 1 : 0) - (input.held.left ? 1 : 0);
    const forward = dir === this.facing && dir !== 0;
    const back = dir === -this.facing && dir !== 0;

    if (input.pressed.punch) {
      let move;
      if (input.held.down) move = this.char.basics.lowPunch;
      else if (forward) move = this.char.basics.forward;
      else if (back) move = this.char.basics.back;
      else move = this.char.basics.punch;
      this.startAttack({ move });
      return;
    }
    if (input.pressed.kick) {
      let move;
      if (input.held.down) move = this.char.basics.sweep;
      else if (forward) move = this.char.basics.forward;
      else if (back) move = this.char.basics.back;
      else move = this.char.basics.kick;
      this.startAttack({ move });
      return;
    }

    // Ground movement: accelerate/decelerate with weight instead of teleporting
    // to full speed. The gait advances with distance travelled, so feet stay
    // planted to the floor rather than skating.
    if (this.status.root) { this.vx = 0; this.state = 'idle'; return; }
    const spd = this.walkSpeed * this.speedMultiplier();
    if (dir !== 0) {
      const reversing = this.vx !== 0 && Math.sign(this.vx) !== dir;
      const accel = reversing ? MOVEMENT.turnAccel : MOVEMENT.groundAccel;
      this.vx = approach(this.vx, dir * spd, accel * dt);
      this.state = 'walk';
      if (reversing && Math.abs(this.vx) > 150 && this.skidCd <= 0) {
        this.skidCd = 0.32;
        spawnParticles(this.game, this.x, GROUND_Y, 'dust', 4, {
          speed: [15, 70], angle: -Math.PI / 2, spread: 2.3,
          life: [0.25, 0.5], size: [1.5, 3]
        });
      }
    } else {
      this.vx = approach(this.vx, 0, MOVEMENT.groundDecel * dt);
      // Keep the stride alive through the short glide to a stop.
      this.state = Math.abs(this.vx) > 8 ? 'walk' : 'idle';
    }
  }

  tryBuffered() {
    if (!this.buffered) return;
    this.buffered.t -= this.game.lastDt || 0.016;
    if (this.buffered.t <= 0) { this.buffered = null; return; }
    if (this.canAct() && this.grounded()) {
      const action = this.buffered.action;
      this.buffered = null;
      if (action === 'punch') this.startAttack({ move: this.char.basics.punch });
      else if (action === 'kick') this.startAttack({ move: this.char.basics.kick });
    }
  }

  jump() {
    if (!this.grounded() || this.ko) return;
    this.state = 'jump';
    this.stateTime = 0;
    this.vy = -1070;
    this.y -= 2;
    this.vx *= 0.75; // carry running momentum into the air
    this.airAttackUsed = false;
    this.crouching = false;
    this.blocking = false;
    AudioSys.play('whoosh');
    spawnParticles(this.game, this.x, GROUND_Y, 'dust', 8, { speed: [30, 120], angle: -Math.PI / 2, spread: 2.2 });
  }

  startDash(dir) {
    this.state = 'dash';
    this.stateTime = 0;
    this.dashDuration = MOVEMENT.dashTime;
    this.dashTime = this.dashDuration;
    this.dashCd = 0.55;
    this.dashDir = dir;
    this.dashTrailT = 0;
    this.vx = dir * MOVEMENT.dashSpeed;
    this.crouching = false;
    this.blocking = false;
    AudioSys.play('whoosh');
    spawnParticles(this.game, this.x, GROUND_Y, 'dust', 5, {
      speed: [30, 110], angle: dir > 0 ? Math.PI : 0, spread: 1.6
    });
    this.game.afterimages.push({ x: this.x, y: this.y, facing: this.facing, char: this.char, life: 0.25, maxLife: 0.25, playerIndex: this.playerIndex });
  }

  startAttack({ move, air }) {
    if (!this.canAct()) {
      if (move) this.buffered = { action: move.id === 'kick' ? 'kick' : 'punch', t: 0.18 };
      return;
    }
    this.state = 'attack';
    this.stateTime = 0;
    this.attackMove = move;
    this.attackT = 0;
    this.attackHit = false;
    this.blocking = false;
    this.crouching = move.low || this.crouching;
    if (!air) this.vx *= 0.2;
    if (move.guardBreak) this.superArmor = 0;
    if (move.id === 'forward' || move.id === 'back') AudioSys.play('whoosh');
    else AudioSys.play('whoosh');
  }

  updateAttack(dt, opponent) {
    const move = this.attackMove;
    if (!move) { this.toIdle(); return; }
    const spd = this.attackSpeedMultiplier();
    this.attackT += dt * spd;
    this.stateTime += dt;

    const activeStart = move.startup;
    const activeEnd = move.startup + move.active;
    if (this.attackT >= activeStart && this.attackT <= activeEnd) {
      if (!this.attackHit) {
        const hb = this.hitbox(move);
        const oppBox = opponent.hurtbox();
        if (!opponent.ko && aabb(hb, oppBox)) {
          this.attackHit = true;
          this.game.applyHit(this, opponent, {
            damage: move.damage,
            tag: move.tag || 'physical',
            kb: move.kb || 100,
            kbY: move.kbY || 0,
            hitstun: move.hitstun || 0.25,
            blockstun: move.blockstun || 0.12,
            status: move.status || null,
            sourceType: 'basic',
            name: move.name,
            chip: 0.18,
            knockdown: !!move.knockdown,
            guardBreak: move.guardBreak || 0,
            meter: move.meter || 5
          });
        }
      }
    }
    const total = (move.startup + move.active + move.recovery) / Math.max(0.1, spd);
    if (this.attackT >= total) {
      this.attackMove = null;
      this.attackT = 0;
      this.attackHit = false;
      this.crouching = false;
      this.toIdle();
      this.tryBuffered();
    }
  }

  poseForSpecial(sp) {
    const fx = sp.fx;
    if (fx === 'shoot') return 'shoot';
    if (fx === 'summon') return 'summon';
    if (fx === 'counter') return 'counter';
    if (fx === 'teleport') return 'cast';
    if (fx === 'heal') return 'heal';
    if (fx === 'quake') return 'slam';
    if (fx === 'rage') return 'rage';
    if (fx === 'madness') return 'rage';
    if (fx === 'moon') return 'cast';
    if (fx === 'heart' || fx === 'petal') return 'cast';
    return 'cast';
  }

  trySpecial(index) {
    if (!this.canAct() || !this.grounded()) return;
    if (this.game.roundState !== 'fight' && this.game.mode !== 'training') return;
    const sp = this.char.specials[index];
    if (!sp) return;
    if ((this.cooldowns[sp.id] || 0) > 0) {
      this.game.addText(this.x, this.y - this.currentHeight() - 20, 'COOLDOWN', {
        color: 'rgba(255,200,120,0.8)', size: 14, life: 0.6, vy: -40
      });
      return;
    }
    this.startSpecial(sp, false);
  }

  startSpecial(sp, enhanced) {
    this.state = 'special';
    this.stateTime = 0;
    this.specialT = 0;
    this.castTime = sp.cast || 0.3;
    this.pendingSpecial = sp;
    this.specialEnhanced = !!enhanced;
    this.specialName = sp.name;
    this.castPose = this.poseForSpecial(sp);
    this.cooldowns[sp.id] = (sp.cd || 6) * (enhanced ? 0.75 : 1);
    this.blocking = false;
    this.vx = 0;
    this.superArmor = Math.max(this.superArmor, 0.12);
    AudioSys.play('cast');
    if (enhanced) {
      this.game.addText(this.x, this.y - this.currentHeight() - 26, 'ENHANCED', {
        color: '#ffd873', size: 18, life: 0.8, vy: -50, shadow: 'rgba(255,200,80,0.7)'
      });
      this.addMeter(-0);
    }
  }

  updateSpecial(dt, opponent) {
    this.specialT += dt;
    this.stateTime += dt;
    if (this.pendingSpecial && this.specialT >= this.castTime) {
      const sp = this.pendingSpecial;
      this.pendingSpecial = null;
      this.executeSpecial(sp, this.specialEnhanced, opponent);
    }
    if (this.specialT >= this.castTime + 0.28) {
      this.toIdle();
    }
  }

  executeSpecial(sp, enhanced, opponent) {
    const game = this.game;
    const target = opponent;
    const dmgMult = enhanced ? 1.55 : 1;
    const durMult = enhanced ? 1.3 : 1;

    switch (sp.kind) {
      case 'projectile': {
        const props = Object.assign({}, sp.proj);
        props.damage = (props.damage || 40) * dmgMult;
        props.enhanced = enhanced;
        if (enhanced) {
          props.w *= 1.2; props.h *= 1.2;
          if (props.speed) props.speed *= 1.08;
        }
        const count = props.count || 1;
        for (let i = 0; i < count; i++) {
          const p = Object.assign({}, props);
          if (count > 1) {
            p.y = (props.y || -100) + (i - (count - 1) / 2) * 34;
          }
          game.projectiles.push(new Projectile(game, this, p));
        }
        spawnParticles(game, this.x + this.facing * 50, this.y - 110, 'spark', 10, {
          speed: [40, 180], angle: this.facing > 0 ? 0 : Math.PI, spread: 1.2, colors: [props.color, props.glow]
        });
        AudioSys.play('projectile');
        break;
      }
      case 'buff': {
        this.applyBuff(sp.self || {}, sp.duration || 4, enhanced);
        const fx = sp.fx;
        if (fx === 'flame') {
          spawnParticles(game, this.x, this.y - 80, 'ember', 24, { speed: [30, 160] });
          AudioSys.play('fire');
        } else if (fx === 'heal') {
          spawnParticles(game, this.x, this.y - 80, 'gold', 24, { speed: [20, 120], angle: -Math.PI / 2, spread: 1.2 });
          game.addText(this.x, this.y - this.currentHeight() - 20, 'HEALING', { color: '#b8ffcf', size: 16, life: 0.9 });
          AudioSys.play('heal');
        } else if (fx === 'heart') {
          spawnParticles(game, this.x, this.y - 90, 'heart', 20, { speed: [30, 140] });
          AudioSys.play('heart');
        } else {
          Render.glowCircle(game.ctx, this.x, this.y - 90, 120, this.char.palette.glow, 0.3);
          spawnParticles(game, this.x, this.y - 90, 'gold', 18, { speed: [20, 120] });
          AudioSys.play('cast');
        }
        break;
      }
      case 'quake': {
        game.addShake(sp.shake || 14);
        AudioSys.play('quake');
        const dx = Math.abs(target.x - this.x);
        spawnParticles(game, this.x, GROUND_Y, 'dust', 30, { speed: [80, 320], angle: -Math.PI / 2, spread: 2.8 });
        spawnParticles(game, this.x, GROUND_Y - 10, 'shard', 20, { speed: [100, 300], angle: -Math.PI / 2, spread: 2.4 });
        if (dx <= (sp.radius || 400) && target.grounded() && !target.ko) {
          game.applyHit(this, target, {
            damage: (sp.damage || 50) * dmgMult,
            tag: 'physical', kb: 180, kbY: 200,
            hitstun: 0.5, blockstun: 0.2, unblockable: true,
            status: { stun: (sp.stun || 0.5) * durMult },
            sourceType: 'special', name: sp.name, chip: 0,
            knockdown: !!sp.knockdown
          });
        }
        break;
      }
      case 'burst': {
        game.addShake(10);
        AudioSys.play(sp.fx === 'thunder' ? 'thunder' : 'heavy');
        const dx = Math.abs(target.x - this.x);
        spawnParticles(game, this.x, this.y - 90, 'spark', 30, { speed: [120, 400], colors: [sp.color || this.char.palette.glow] });
        if (dx <= (sp.radius || 300) && !target.ko) {
          game.applyHit(this, target, {
            damage: (sp.damage || 40) * dmgMult,
            tag: 'divine', kb: sp.kb || 300, kbY: sp.kbY || 80,
            hitstun: 0.4, blockstun: 0.2,
            status: sp.stun ? { stun: sp.stun * durMult } : null,
            sourceType: 'special', name: sp.name, chip: 0.1
          });
        }
        break;
      }
      case 'trap': {
        const props = Object.assign({}, sp.trap);
        let tx = target.x;
        if (props.type === 'lava') tx = this.x + this.facing * 120;
        if (props.type === 'snare') tx = target.x;
        props.x = THREE_CLAMP(tx, WALL_L + 30, WALL_R - 30);
        props.duration *= durMult;
        props.damage *= dmgMult;
        props.dps = (props.dps || 30) * dmgMult;
        props.enhanced = enhanced;
        game.hazards.push(new Hazard(game, this, props));
        spawnParticles(game, props.x, GROUND_Y - 10, props.type === 'lava' ? 'ember' : 'gold', 20, { speed: [30, 180] });
        AudioSys.play('trap');
        break;
      }
      case 'summon': {
        const props = Object.assign({}, sp.summon);
        props.damage *= dmgMult;
        props.life *= durMult;
        props.enhanced = enhanced;
        for (let i = 0; i < (props.count || 2); i++) {
          game.minions.push(new Minion(game, this, props, i));
        }
        spawnParticles(game, this.x, this.y - 40, 'smoke', 16, { speed: [30, 140] });
        AudioSys.play('summon');
        break;
      }
      case 'counter': {
        this.buff('counter', (sp.duration || 1) * durMult, (sp.damage || 80) * dmgMult, { stun: (sp.stun || 0.6) * durMult });
        spawnParticles(game, this.x, this.y - 80, 'gold', 16, { speed: [20, 100] });
        AudioSys.play('counter');
        break;
      }
      case 'flash': {
        game.flash = 0.55;
        game.flashColor = this.char.palette.glow;
        game.addShake(8);
        AudioSys.play(sp.fx === 'madness' ? 'super' : 'thunder');
        const dx = Math.abs(target.x - this.x);
        spawnParticles(game, this.x, this.y - 100, sp.fx === 'madness' ? 'void' : 'sun', 40, {
          speed: [100, 420], colors: [this.char.palette.glow, this.char.palette.accent]
        });
        if (dx <= (sp.radius || 520) && !target.ko) {
          game.applyHit(this, target, {
            damage: (sp.damage || 20) * dmgMult,
            tag: sp.fx === 'madness' ? 'psychic' : 'light',
            kb: 120, kbY: 40,
            hitstun: 0.2, blockstun: 0.2,
            status: sp.status ? cloneStatus(sp.status, durMult) : null,
            sourceType: 'special', name: sp.name, chip: 0.2, unblockable: true
          });
        }
        break;
      }
      case 'teleport': {
        const opp = target;
        const behind = opp.x + (opp.facing * -1) * 90;
        const dest = THREE_CLAMP(behind, WALL_L + 30, WALL_R - 30);
        spawnParticles(game, this.x, this.y - 80, 'lightning', 26, { speed: [60, 260] });
        this.x = dest;
        this.facing = Math.sign(opp.x - this.x) || 1;
        spawnParticles(game, this.x, this.y - 80, 'lightning', 26, { speed: [60, 260] });
        AudioSys.play('teleport');
        game.addShake(6);
        if (Math.abs(opp.x - this.x) < 170 && !opp.ko) {
          game.applyHit(this, opp, {
            damage: (sp.damage || 50) * dmgMult,
            tag: 'lightning', kb: 240, kbY: 120,
            hitstun: 0.35, blockstun: 0.16,
            status: { stun: (sp.stun || 0.4) * durMult },
            sourceType: 'special', name: sp.name, chip: 0.15
          });
        }
        break;
      }
      default: break;
    }
  }

  useSuper() {
    if (!this.canAct() || !this.grounded()) return;
    if (this.meter >= 100) {
      this.game.startUltimate(this);
    } else if (this.meter >= 50) {
      this.meter -= 50;
      this.startDivineCombo();
    } else if (this.meter >= 25) {
      this.meter -= 25;
      const sp = this.char.specials[0];
      this.cooldowns[sp.id] = 0;
      this.startSpecial(sp, true);
    } else {
      this.game.addText(this.x, this.y - this.currentHeight() - 20, 'FURY TOO LOW', {
        color: 'rgba(200,180,255,0.8)', size: 14, life: 0.7, vy: -40
      });
      AudioSys.play('error');
    }
  }

  startDivineCombo() {
    const game = this.game;
    this.state = 'special';
    this.stateTime = 0;
    this.specialT = 0;
    this.castTime = 0.95;
    this.pendingSpecial = null;
    this.castPose = 'rage';
    this.specialName = this.char.combo.name;
    this.superArmor = 1.1;
    game.addShake(5);
    game.addText(this.x, this.y - this.currentHeight() - 24, 'DIVINE ART', {
      color: '#ffd873', size: 22, life: 1.1, vy: -40, shadow: 'rgba(255,200,80,0.8)'
    });
    AudioSys.play('super');
    const opp = this.opponent;
    if (!opp) return;
    const hits = [
      { t: 0.2, dmg: 30, kb: 60, last: false },
      { t: 0.4, dmg: 30, kb: 40, last: false },
      { t: 0.6, dmg: 34, kb: 80, last: false },
      { t: 0.85, dmg: 58, kb: 420, last: true }
    ];
    for (const h of hits) {
      game.schedule(h.t, () => {
        if (this.ko || opp.ko) return;
        // close the gap for the flurry
        if (!h.last && Math.abs(opp.x - this.x) > 90) {
          this.x = opp.x - this.facing * 70;
          this.x = THREE_CLAMP(this.x, WALL_L + 30, WALL_R - 30);
        }
        const dx = Math.abs(opp.x - this.x);
        if (dx > 240) return;
        game.applyHit(this, opp, {
          damage: h.dmg,
          tag: 'divine',
          kb: h.kb,
          kbY: h.last ? 160 : 30,
          hitstun: h.last ? 0.6 : 0.25,
          blockstun: 0.15,
          chip: 0.2,
          sourceType: 'super',
          name: this.char.combo.name,
          unblockable: h.last
        });
        spawnParticles(game, opp.x, opp.y - opp.currentHeight() * 0.6, 'spark', 18, {
          colors: [this.char.palette.glow, this.char.palette.accent, '#ffffff'],
          speed: [80, 320]
        });
        AudioSys.play(h.last ? 'heavy' : 'hit');
        game.addShake(h.last ? 14 : 4);
      });
    }
  }

  toIdle() {
    if (this.ko) return;
    this.state = 'idle';
    this.stateTime = 0;
    this.attackMove = null;
    this.attackT = 0;
    this.blocking = false;
    this.crouching = false;
  }

  get hitstunRemaining() {
    return this.hitstunDur || 0;
  }

  onBlockSuccess(attacker) {
    if (this.char.id === 'athena') {
      this.blockStreak++;
      this.blockStreakTimer = 4;
      if (this.blockStreak >= 3) {
        this.blockStreak = 0;
        this.buff('foresight', 2.5, 0.2);
        if (attacker) attacker.buff('slow', 2.2, 0.55);
        this.addMeter(10);
        this.game.addText(this.x, this.y - this.currentHeight() - 30, 'FORESIGHT', {
          color: '#9fe6ff', size: 18, life: 1.0, vy: -40, shadow: 'rgba(159,230,255,0.8)'
        });
      }
    }
    if (this.char.id === 'hephaestus' && attacker) {
      // handled in damage calc
    }
    this.addMeter(4);
  }

  onHitLanded(attacker) {
    // Aphrodite passive: being hit repeatedly charms the attacker
    if (this.char.id === 'aphrodite' && attacker) {
      this.charmStacks++;
      this.charmTimer = 4;
      if (this.charmStacks >= 5) {
        this.charmStacks = 0;
        attacker.buff('charm', 4, 0);
        this.addMeter(15);
        this.game.addText(attacker.x, attacker.y - attacker.currentHeight() - 30, 'CHARMED', {
          color: '#ff9fc4', size: 18, life: 1.0, vy: -40, shadow: 'rgba(255,120,170,0.8)'
        });
        spawnParticles(this.game, attacker.x, attacker.y - 80, 'heart', 20, { speed: [30, 140] });
      }
    }
  }
}

function cloneStatus(status, mult) {
  const out = {};
  for (const k of Object.keys(status)) {
    const v = status[k];
    out[k] = typeof v === 'number' ? v * (mult || 1) : v;
  }
  return out;
}
