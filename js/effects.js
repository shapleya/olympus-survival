/* ============================================================
   OLYMPUS: SURVIVAL — Particles, projectiles, traps, summons
   ============================================================ */

let FX_ID = 1;

const PARTICLE_STYLES = {
  spark: { colors: ['#ffe9a8', '#ffcf5a', '#fff8e0'], size: [1.5, 3.5], life: [0.2, 0.5], grav: 500, speed: [80, 360], additive: true },
  dust: { colors: ['#c9b79b', '#a08e77', '#e4dbc9'], size: [2, 5], life: [0.3, 0.8], grav: -40, speed: [20, 110], additive: false },
  gold: { colors: ['#ffe27a', '#ffc93c', '#fff6c9'], size: [2, 4.5], life: [0.35, 0.8], grav: 120, speed: [40, 220], additive: true },
  petal: { colors: ['#ffb3c8', '#ff7fa6', '#ffe0ea', '#e8507f'], size: [3, 6], life: [0.6, 1.5], grav: 40, speed: [20, 100], additive: false, spin: true },
  ember: { colors: ['#ffb347', '#ff6a1f', '#ffe28a'], size: [1.5, 3.5], life: [0.4, 1.1], grav: -120, speed: [30, 180], additive: true },
  bubble: { colors: ['#a8f0ff', '#65d8f0', '#e0ffff'], size: [2, 5], life: [0.7, 1.6], grav: -140, speed: [10, 60], additive: true },
  soul: { colors: ['#b678ff', '#7a4bd6', '#e0d0ff'], size: [2, 5], life: [0.8, 1.8], grav: -60, speed: [10, 70], additive: true },
  firefly: { colors: ['#c8ffb0', '#8affae', '#f0ffe0'], size: [1.5, 3], life: [1, 2.4], grav: -10, speed: [5, 40], additive: true },
  heart: { colors: ['#ff6f9f', '#ffb3c8', '#ff2e6e'], size: [3, 6], life: [0.6, 1.2], grav: -80, speed: [30, 130], additive: false, spin: true },
  water: { colors: ['#6fe6ff', '#2ec4e6', '#d8fbff'], size: [2, 5], life: [0.3, 0.8], grav: 600, speed: [60, 300], additive: true },
  poison: { colors: ['#79ff7a', '#3dbb4a', '#d6ffd0'], size: [2, 5], life: [0.4, 1.0], grav: -60, speed: [30, 140], additive: true },
  blood: { colors: ['#ff4a4a', '#a11717', '#ff9a7a'], size: [2, 4], life: [0.3, 0.7], grav: 520, speed: [60, 260], additive: false },
  void: { colors: ['#9f6bff', '#5b2b9e', '#2a1040'], size: [4, 9], life: [0.4, 1.1], grav: -30, speed: [20, 120], additive: true },
  lightning: { colors: ['#d8f4ff', '#9fdcff', '#ffffff'], size: [1.5, 3], life: [0.15, 0.4], grav: 0, speed: [120, 500], additive: true },
  feather: { colors: ['#e8e2d0', '#b8d8d2', '#ffffff'], size: [3, 6], life: [0.8, 1.6], grav: 30, speed: [20, 80], additive: false, spin: true },
  shard: { colors: ['#cfe4f5', '#8fb7d6', '#ffffff'], size: [2, 5], life: [0.4, 0.9], grav: 620, speed: [60, 300], additive: false },
  smoke: { colors: ['#6d6470', '#403a45', '#9a8f9e'], size: [6, 14], life: [0.5, 1.2], grav: -60, speed: [10, 70], additive: false },
  sun: { colors: ['#fff6c9', '#ffe27a', '#ffb347'], size: [2, 5], life: [0.3, 0.9], grav: 30, speed: [40, 240], additive: true }
};

class Particle {
  constructor(game, x, y, style, opts = {}) {
    const st = PARTICLE_STYLES[style] || PARTICLE_STYLES.spark;
    this.id = FX_ID++;
    this.x = x; this.y = y;
    this.style = style;
    this.colors = opts.colors || st.colors;
    this.color = this.colors[(Math.random() * this.colors.length) | 0];
    const sp = opts.speed || st.speed;
    const ang = opts.angle !== undefined ? opts.angle + (Math.random() - 0.5) * (opts.spread || 1.4) : Math.random() * Math.PI * 2;
    const speed = sp[0] + Math.random() * (sp[1] - sp[0]);
    this.vx = Math.cos(ang) * speed;
    this.vy = Math.sin(ang) * speed;
    if (opts.vx !== undefined) this.vx = opts.vx + (Math.random() - 0.5) * 40;
    if (opts.vy !== undefined) this.vy = opts.vy + (Math.random() - 0.5) * 40;
    const life = opts.life || st.life;
    this.life = life[0] + Math.random() * (life[1] - life[0]);
    this.maxLife = this.life;
    const size = opts.size || st.size;
    this.size = size[0] + Math.random() * (size[1] - size[0]);
    this.gravity = opts.gravity !== undefined ? opts.gravity : st.grav;
    this.additive = opts.additive !== undefined ? opts.additive : st.additive;
    this.drag = opts.drag !== undefined ? opts.drag : 1.5;
    this.rot = Math.random() * Math.PI * 2;
    this.spin = opts.spin !== undefined ? opts.spin : (st.spin ? (Math.random() - 0.5) * 8 : 0);
    this.glow = opts.glow !== false;
    this.dead = false;
  }
  update(dt) {
    this.life -= dt;
    if (this.life <= 0) { this.dead = true; return; }
    this.vy += this.gravity * dt;
    this.vx *= Math.max(0, 1 - this.drag * dt);
    this.vy *= Math.max(0, 1 - this.drag * 0.35 * dt);
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.rot += this.spin * dt;
  }
}

function spawnParticles(game, x, y, style, count, opts = {}) {
  if (game.particles.length > 520) count = Math.min(count, 6);
  for (let i = 0; i < count; i++) {
    game.particles.push(new Particle(game, x, y, style, opts));
  }
}

class FloatText {
  constructor(game, x, y, text, opts = {}) {
    this.x = x; this.y = y; this.text = text;
    this.life = opts.life || 1.0;
    this.maxLife = this.life;
    this.color = opts.color || '#ffffff';
    this.size = opts.size || 26;
    this.vy = opts.vy || -90;
    this.vx = opts.vx || 0;
    this.bold = opts.bold !== false;
    this.stroke = opts.stroke || 'rgba(0,0,0,0.7)';
    this.dead = false;
    this.shadow = opts.shadow || null;
    this.scale = opts.scale || 1;
  }
  update(dt) {
    this.life -= dt;
    if (this.life <= 0) this.dead = true;
    this.y += this.vy * dt;
    this.x += this.vx * dt;
    this.vy *= 0.96;
  }
}

/* ---------------- Projectiles ---------------- */
class Projectile {
  constructor(game, owner, props) {
    this.id = FX_ID++;
    this.owner = owner;
    this.props = props;
    this.facing = owner.facing;
    this.x = owner.x + owner.facing * 54;
    this.y = owner.y + (props.y || -100);
    this.vx = (props.speed || 500) * owner.facing;
    this.vy = props.vy || 0;
    this.w = props.w || 30;
    this.h = props.h || 30;
    this.life = props.life || 2;
    this.maxLife = this.life;
    this.damage = props.damage || 30;
    this.tag = props.tag || 'physical';
    this.shape = props.shape || 'orb';
    this.color = props.color || '#ffd873';
    this.glow = props.glow || this.color;
    this.pierce = !!props.pierce;
    this.big = !!props.big;
    this.wave = !!props.wave;
    this.wiggle = !!props.wiggle;
    this.ghost = !!props.ghost;
    this.homing = props.homing || 0;
    this.trail = props.trail || null;
    this.trailTimer = 0;
    this.status = props.status || null;
    this.kb = props.kb || 120;
    this.kbY = props.kbY || 0;
    this.enhanced = !!props.enhanced;
    this.hitSet = new Set();
    this.dead = false;
    this.maxHits = props.maxHits || 1;
    this.hits = 0;
    this.t = 0;
    this.rot = 0;
    this.baseY = this.y;
    this.enabled = true;
    this.powerMult = 1;

    if (this.wave) {
      this.y = GROUND_Y - this.h * 0.5;
      this.baseY = this.y;
    }
    this.startX = this.x;
  }

  update(dt, game) {
    this.t += dt;
    this.life -= dt;
    if (this.life <= 0) { this.dead = true; return; }
    if (this.maxLife - this.life < 0.06) this.enabled = true;

    if (this.homing) {
      const target = this.owner.opponent;
      if (target && !target.ko) {
        const ty = target.y - target.currentHeight() * 0.55;
        const dy = ty - this.y;
        this.vy = THREE_CLAMP(dy * 3.2, -this.homing * 4, this.homing * 4);
      }
    }
    if (this.wiggle) {
      this.y = this.baseY + Math.sin(this.t * 18) * 16;
    }
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    if (this.homing && !this.wave) this.baseY = this.y;
    if (this.wave) {
      this.y = GROUND_Y - this.h * 0.5;
    }
    this.rot += dt * 6 * (this.vx > 0 ? 1 : -1);

    if (this.trail) {
      this.trailTimer -= dt;
      if (this.trailTimer <= 0) {
        this.trailTimer = 0.025;
        const style = this.trail === 'water' ? 'water' : this.trail === 'poison' ? 'poison' :
          this.trail === 'heart' ? 'heart' : this.trail === 'lightning' ? 'lightning' :
            this.trail === 'void' ? 'void' : this.trail === 'petal' ? 'petal' :
              this.trail === 'sun' ? 'sun' : this.trail === 'silver' ? 'shard' : 'gold';
        spawnParticles(game, this.x, this.y, style, this.big ? 2 : 1, {
          speed: [5, 60], life: [0.2, 0.5], gravity: 0, size: this.big ? [3, 7] : [1.5, 3.5]
        });
      }
    }

    if (this.x < WALL_L - 60 || this.x > WALL_R + 60 || this.y > GROUND_Y + 40) {
      if (Math.random() < 0.5) spawnParticles(game, this.x, Math.min(this.y, GROUND_Y), 'spark', 4, { speed: [20, 90] });
      this.dead = true;
      return;
    }

    const targets = game.fighters;
    for (const f of targets) {
      if (f === this.owner) continue;
      if (f.ko) continue;
      if (this.hitSet.has(f.id)) continue;
      const hb = f.hurtbox();
      const box = { x: this.x - this.w / 2, y: this.y - this.h / 2, w: this.w, h: this.h };
      if (aabb(box, hb)) {
        const dir = this.vx >= 0 ? 1 : -1;
        game.projectileHit(this, f, dir);
        this.hits++;
        this.hitSet.add(f.id);
        if (!this.pierce || this.hits >= this.maxHits) {
          this.dead = true;
          break;
        }
      }
    }
  }
}

function THREE_CLAMP(v, a, b) { return Math.max(a, Math.min(b, v)); }

/* ---------------- Traps / hazards ---------------- */
class Hazard {
  constructor(game, owner, props) {
    this.id = FX_ID++;
    this.owner = owner;
    this.type = props.type || 'lava';
    this.x = props.x !== undefined ? props.x : owner.opponent.x;
    this.y = GROUND_Y;
    this.radius = props.radius || 60;
    this.life = props.duration || 5;
    this.maxLife = this.life;
    this.dps = props.dps || 25;
    this.damage = props.damage || 30;
    this.root = props.root || 1.4;
    this.color = props.color || '#ff8a2b';
    this.tick = 0;
    this.triggered = false;
    this.dead = false;
    this.t = 0;
    this.enhanced = !!props.enhanced;
  }
  update(dt, game) {
    this.t += dt;
    this.life -= dt;
    if (this.life <= 0) { this.dead = true; return; }
    this.tick -= dt;
    const target = this.owner.opponent;
    if (!target || target.ko) return;
    const dx = Math.abs(target.x - this.x);
    if (dx > this.radius + 26) return;
    if (!target.grounded()) return;

    if (this.type === 'lava') {
      if (this.tick <= 0) {
        this.tick = 0.42;
        game.applyHit(this.owner, target, {
          damage: this.dps * 0.42, tag: 'fire', kb: 0, kbY: 0,
          hitstun: 0.02, sourceType: 'trap', name: 'Molten Metal', chip: false, minor: true
        });
        spawnParticles(game, target.x, GROUND_Y - 10, 'ember', 6, { speed: [30, 120] });
      }
    } else if (this.type === 'snare' && !this.triggered) {
      this.triggered = true;
      game.applyHit(this.owner, target, {
        damage: this.damage, tag: 'divine', kb: 0, kbY: 0,
        status: { root: this.root, slow: this.root + 0.4 },
        hitstun: 0.15, sourceType: 'trap', name: 'Moon Snare', chip: false
      });
      spawnParticles(game, target.x, GROUND_Y - 20, 'gold', 16, { speed: [40, 160], life: [0.4, 0.9] });
      this.dead = true;
    }
  }
}

/* ---------------- Summons (hunting hounds) ---------------- */
class Minion {
  constructor(game, owner, props, offset) {
    this.id = FX_ID++;
    this.owner = owner;
    this.type = props.type || 'hound';
    this.x = owner.x + owner.facing * 40 + (offset || 0) * 46;
    this.y = GROUND_Y;
    this.vx = 0;
    this.speed = props.speed || 380;
    this.damage = props.damage || 30;
    this.life = props.life || 3.5;
    this.maxLife = this.life;
    this.color = props.color || '#a8ffcf';
    this.biteCd = 0;
    this.dead = false;
    this.t = 0;
    this.run = 0;
    this.enhanced = !!props.enhanced;
    this.animOffset = Math.random() * 10;
  }
  update(dt, game) {
    this.t += dt;
    this.life -= dt;
    this.biteCd -= dt;
    if (this.life <= 0) {
      spawnParticles(game, this.x, this.y - 30, 'smoke', 8, { speed: [20, 80] });
      this.dead = true;
      return;
    }
    const target = this.owner.opponent;
    if (!target) return;
    const dir = Math.sign(target.x - this.x) || 1;
    if (Math.abs(target.x - this.x) > 40) {
      this.vx = dir * this.speed;
      this.x += this.vx * dt;
      this.run += dt * 14;
    } else {
      this.vx = 0;
    }
    this.x = THREE_CLAMP(this.x, WALL_L + 20, WALL_R - 20);
    if (this.biteCd <= 0 && Math.abs(target.x - this.x) < 56 && target.grounded()) {
      this.biteCd = 0.7;
      game.applyHit(this.owner, target, {
        damage: this.damage, tag: 'physical', kb: 130, kbY: 40,
        hitstun: 0.25, sourceType: 'summon', name: 'Hound Bite', chip: false,
        status: this.enhanced ? { bleed: 2 } : null
      });
      spawnParticles(game, target.x, target.y - 50, 'blood', 8, { speed: [40, 160] });
    }
  }
}

function aabb(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}
