/* ============================================================
   OLYMPUS: SURVIVAL — CPU opponent
   ============================================================ */

const AI = (() => {
  const DIFF = {
    easy: { react: 0.52, block: 0.24, special: 0.28, aggression: 0.55, ult: 0.35, mistakes: 0.22 },
    normal: { react: 0.3, block: 0.55, special: 0.5, aggression: 0.75, ult: 0.7, mistakes: 0.1 },
    hard: { react: 0.16, block: 0.82, special: 0.72, aggression: 0.94, ult: 0.95, mistakes: 0.03 }
  };

  function emptyInput() { return { held: {}, pressed: {} }; }

  function preferredDistance(self) {
    const r = self.char.stats.range;
    if (self.char.id === 'artemis' || self.char.id === 'apollo') return 330;
    if (self.char.id === 'poseidon') return 280;
    if (self.char.id === 'hera') return 240;
    if (self.char.id === 'aphrodite') return 110;
    if (self.char.id === 'ares' || self.char.id === 'hephaestus') return 100;
    return 140 + r * 10;
  }

  function specialFit(self, sp, dist) {
    if (!sp) return 0;
    if ((self.cooldowns[sp.id] || 0) > 0) return 0;
    switch (sp.kind) {
      case 'projectile':
        return dist > 200 ? 1 : dist > 120 ? 0.4 : 0.08;
      case 'quake':
        return dist < (sp.radius || 400) ? 1 : 0.1;
      case 'burst':
        return dist < (sp.radius || 300) ? 1 : 0.05;
      case 'flash':
        return dist < (sp.radius || 500) ? 0.9 : 0.1;
      case 'trap':
        return dist < 400 ? 0.7 : 0.15;
      case 'summon':
        return dist > 120 ? 0.8 : 0.3;
      case 'teleport':
        return dist > 100 ? 0.9 : 0.5;
      case 'counter':
        return 0.55;
      case 'buff':
        if (sp.self && sp.self.regen) {
          return self.hp < self.maxHp * 0.62 ? 1 : 0.1;
        }
        return 0.45;
      default:
        return 0.5;
    }
  }

  function choosePlan(self, opp, diff, dist) {
    const game = self.game;
    const pref = preferredDistance(self);
    const hpRatio = self.hp / self.maxHp;
    const r = Math.random();

    // finish with fury
    if (self.meter >= 100 && dist < 620 && Math.random() < diff.ult) return 'super';

    // emergency healing
    if (self.char.id === 'apollo' && hpRatio < 0.45) {
      const heal = self.char.specials.findIndex(s => s.id === 'divine_healing');
      if (heal >= 0 && (self.cooldowns[self.char.specials[heal].id] || 0) <= 0) return 'special2';
    }

    // avoid hazards
    if (game.hazards && game.hazards.length) {
      for (const h of game.hazards) {
        const hd = Math.abs(self.x - h.x);
        if (hd < h.radius + 55) {
          return 'avoid';
        }
      }
    }

    // defend against an active attack
    if (opp.state === 'attack' && dist < 230) {
      if (self.char.id === 'athena' && (self.cooldowns.strategic_counter || 0) <= 0 && Math.random() < 0.5) return 'special3';
      if (Math.random() < diff.block) return 'block';
      if (Math.random() < 0.35) return 'backoff';
    }

    // anti-air
    if (!opp.grounded() && dist < 220) {
      if (Math.random() < 0.5) return 'kick';
      return 'block';
    }

    // punish blocked opponents with heavy attacks
    if (opp.state === 'block' && dist < 150 && Math.random() < 0.5) return 'heavy';

    // specials
    if (Math.random() < diff.special) {
      const options = [];
      for (let i = 0; i < self.char.specials.length; i++) {
        const sp = self.char.specials[i];
        const fit = specialFit(self, sp, dist);
        if (fit > 0) options.push({ i, w: fit });
      }
      if (options.length) {
        let total = 0;
        for (const o of options) total += o.w;
        let pick = Math.random() * total;
        for (const o of options) {
          pick -= o.w;
          if (pick <= 0) {
            return o.i === 0 ? 'special1' : o.i === 1 ? 'special2' : 'special3';
          }
        }
      }
    }

    // distance management
    if (dist > pref + 110) {
      if (r < 0.2 && self.grounded()) return 'jumpIn';
      return 'approach';
    }
    if (dist < 65) {
      if (r < 0.2) return 'backoff';
      if (r < 0.55) return 'punch';
      if (r < 0.8) return 'kick';
      return 'block';
    }
    if (dist > pref + 25) return 'approach';
    if (dist < pref - 90) return 'backoff';

    if (r < 0.32) return 'punch';
    if (r < 0.55) return 'kick';
    if (r < 0.68) return 'heavy';
    if (r < 0.76) return 'block';
    if (r < 0.84) return 'approach';
    if (r < 0.9) return 'jumpIn';
    return 'idle';
  }

  function think(self, opp, dt, dummy) {
    const res = emptyInput();
    if (dummy || !opp || self.ko || opp.ko) return res;
    if (self.game.roundState !== 'fight') return res;
    if (self.status && (self.status.stun || self.status.freeze)) return res;
    if (self.status && self.status.blind && Math.random() < 0.004) {
      // blinded: lose track of the opponent for a moment
      return res;
    }

    if (!self.ai) {
      self.ai = { plan: 'idle', planT: 0, timer: 0, fresh: true, jumpDir: 0 };
    }
    const s = self.ai;
    const diff = DIFF[self.game.difficulty] || DIFF.normal;
    const dist = Math.abs(opp.x - self.x);
    const toOpp = opp.x > self.x ? 1 : -1;
    const forwardKey = toOpp > 0 ? 'right' : 'left';
    const backKey = toOpp > 0 ? 'left' : 'right';

    s.timer -= dt;
    s.planT -= dt;

    // reactive block
    if (self.grounded() && opp.state === 'attack' && dist < 210 && !self.status.stun) {
      if (Math.random() < diff.block * dt * 14) {
        s.plan = 'block';
        s.planT = 0.32 + Math.random() * 0.25;
        s.timer = 0.25;
        s.fresh = true;
      }
    }

    if (s.timer <= 0 || s.planT <= 0) {
      s.plan = choosePlan(self, opp, diff, dist);
      s.planT = {
        approach: 0.3 + Math.random() * 0.35,
        backoff: 0.25 + Math.random() * 0.3,
        block: 0.3 + Math.random() * 0.4,
        punch: 0.25, kick: 0.3, heavy: 0.4,
        special1: 0.35, special2: 0.35, special3: 0.45,
        super: 0.4, jumpIn: 0.4, avoid: 0.4, idle: 0.25
      }[s.plan] || 0.3;
      s.timer = diff.react * (0.8 + Math.random() * 0.7);
      s.fresh = true;
    }
    if (Math.random() < diff.mistakes && s.fresh && s.plan !== 'block') {
      // occasional hesitation
      s.plan = 'idle';
      s.planT = 0.15;
    }

    switch (s.plan) {
      case 'approach': {
        const pref = preferredDistance(self);
        if (dist > pref - 20) res.held[forwardKey] = true;
        if (self.grounded() && Math.random() < 0.008) res.pressed.up = true;
        break;
      }
      case 'backoff':
        res.held[backKey] = true;
        break;
      case 'avoid': {
        let nearest = null;
        let best = 9999;
        for (const h of self.game.hazards || []) {
          const d = Math.abs(self.x - h.x);
          if (d < best) { best = d; nearest = h; }
        }
        if (nearest) {
          const away = self.x < nearest.x ? 'left' : 'right';
          res.held[away] = true;
        }
        break;
      }
      case 'block':
        res.held.block = true;
        if (Math.random() < 0.02 && self.grounded()) res.pressed.up = true;
        break;
      case 'jumpIn':
        if (s.fresh && self.grounded()) {
          res.pressed.up = true;
          res.held[forwardKey] = true;
        } else if (!self.grounded()) {
          res.held[forwardKey] = true;
          if (dist < 190 && Math.random() < 0.12) res.pressed.punch = true;
        }
        break;
      case 'punch':
        if (s.fresh) res.pressed.punch = true;
        break;
      case 'kick':
        if (s.fresh) res.pressed.kick = true;
        break;
      case 'heavy':
        if (s.fresh) {
          res.held[forwardKey] = true;
          res.pressed.punch = true;
        }
        break;
      case 'special1':
        if (s.fresh) res.pressed.s1 = true;
        break;
      case 'special2':
        if (s.fresh) res.pressed.s2 = true;
        break;
      case 'special3':
        if (s.fresh) { res.pressed.s1 = true; res.pressed.s2 = true; }
        break;
      case 'super':
        if (s.fresh) res.pressed.super = true;
        break;
      case 'idle':
      default:
        break;
    }

    s.fresh = false;
    return res;
  }

  return { think, DIFF };
})();
