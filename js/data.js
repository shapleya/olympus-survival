/* ============================================================
   OLYMPUS: SURVIVAL — Roster, moves, arenas, controls
   ============================================================ */

const GAME_W = 1280;
const GAME_H = 720;
const GROUND_Y = 604;
const WALL_L = 74;
const WALL_R = 1206;
const ROUND_TIME = 60;
const MAX_HP = 1000;

const BASIC_TEMPLATE = {
  punch: {
    name: 'Punch', startup: 0.065, active: 0.08, recovery: 0.16,
    damage: 34, reach: 64, hitW: 62, hitY: -104, hitH: 48,
    hitstun: 0.24, blockstun: 0.12, kb: 110, kbY: 0,
    pose: 'punch', sfx: 'punch', tag: 'physical', meter: 5
  },
  kick: {
    name: 'Kick', startup: 0.11, active: 0.09, recovery: 0.22,
    damage: 45, reach: 86, hitW: 72, hitY: -80, hitH: 56,
    hitstun: 0.28, blockstun: 0.14, kb: 200, kbY: 70,
    pose: 'kick', sfx: 'kick', tag: 'physical', meter: 6
  },
  forward: {
    name: 'Forward Attack', startup: 0.19, active: 0.1, recovery: 0.31,
    damage: 64, reach: 108, hitW: 86, hitY: -98, hitH: 66,
    hitstun: 0.34, blockstun: 0.18, kb: 300, kbY: 100,
    pose: 'heavy', sfx: 'heavy', tag: 'physical', meter: 9, guardBreak: 0.22
  },
  back: {
    name: 'Back Attack', startup: 0.15, active: 0.1, recovery: 0.27,
    damage: 50, reach: 82, hitW: 78, hitY: -96, hitH: 60,
    hitstun: 0.3, blockstun: 0.16, kb: 260, kbY: 40,
    pose: 'back', sfx: 'heavy', tag: 'physical', meter: 8
  },
  air: {
    name: 'Jump Attack', startup: 0.08, active: 0.2, recovery: 0.14,
    damage: 52, reach: 74, hitW: 78, hitY: -92, hitH: 84,
    hitstun: 0.3, blockstun: 0.14, kb: 200, kbY: 40,
    pose: 'air', sfx: 'kick', tag: 'physical', meter: 8
  },
  airKick: {
    name: 'Aerial Kick', startup: 0.1, active: 0.18, recovery: 0.16,
    damage: 46, reach: 84, hitW: 70, hitY: -70, hitH: 64,
    hitstun: 0.28, blockstun: 0.14, kb: 240, kbY: 60,
    pose: 'airkick', sfx: 'kick', tag: 'physical', meter: 7
  },
  lowPunch: {
    name: 'Low Punch', startup: 0.07, active: 0.08, recovery: 0.19,
    damage: 26, reach: 66, hitW: 60, hitY: -62, hitH: 48,
    hitstun: 0.22, blockstun: 0.1, kb: 90, kbY: 0,
    pose: 'crouchpunch', sfx: 'punch', tag: 'physical', meter: 5, low: true
  },
  sweep: {
    name: 'Sweep', startup: 0.12, active: 0.11, recovery: 0.28,
    damage: 40, reach: 92, hitW: 84, hitY: -44, hitH: 44,
    hitstun: 0.34, blockstun: 0.14, kb: 180, kbY: 120,
    pose: 'sweep', sfx: 'heavy', tag: 'physical', meter: 7, low: true, knockdown: true
  }
};

function makeBasics(overrides) {
  const out = {};
  for (const key of Object.keys(BASIC_TEMPLATE)) {
    out[key] = Object.assign({}, BASIC_TEMPLATE[key], (overrides && overrides[key]) || {});
    out[key].id = key;
  }
  return out;
}

/* ---------- Arenas ---------- */
const ARENAS = [
  {
    id: 'olympus', name: 'MOUNT OLYMPUS', sub: 'The summit of the gods',
    sky: ['#0d1230', '#3c2a63', '#c9776b'], accent: '#ffd873',
    ambient: 'spark', chars: ['athena', 'hera', 'apollo', 'zeus'],
    blurb: 'Marble pillars above the clouds. The thrones of the twelve.'
  },
  {
    id: 'sea', name: "POSEIDON'S KINGDOM", sub: 'Beneath the wine-dark sea',
    sky: ['#02131f', '#04445c', '#0f7f8f'], accent: '#6fe6ff',
    ambient: 'bubble', chars: ['poseidon'],
    blurb: 'A drowned temple. Light bends through a thousand fathoms.'
  },
  {
    id: 'forge', name: 'THE GREAT FORGE', sub: 'Where mountains are melted',
    sky: ['#170b0b', '#4a1a0d', '#c24d12'], accent: '#ff9b3d',
    ambient: 'ember', chars: ['hephaestus', 'ares'],
    blurb: 'Anvils the size of houses. Rivers of molten iron.'
  },
  {
    id: 'underworld', name: 'THE UNDERWORLD', sub: 'The house of no return',
    sky: ['#08060f', '#1b1230', '#4a1f45'], accent: '#b678ff',
    ambient: 'soul', chars: ['furies'],
    blurb: 'Asphodel fields and the slow rivers of the dead.'
  },
  {
    id: 'garden', name: 'GARDEN OF LOVE', sub: 'Where desire takes root',
    sky: ['#2a0e2b', '#7b2450', '#e8798f'], accent: '#ffb3c8',
    ambient: 'petal', chars: ['aphrodite'],
    blurb: 'Roses grow over old promises. Nothing here is only beautiful.'
  },
  {
    id: 'forest', name: 'THE SACRED FOREST', sub: 'Under the hunter\'s moon',
    sky: ['#050d16', '#0d2b33', '#2f5d54'], accent: '#a8ffcf',
    ambient: 'firefly', chars: ['artemis'],
    blurb: 'Silver moonlight. Pines older than the gods themselves.'
  }
];

/* ---------- Roster ---------- */
const ROSTER = [
  {
    id: 'athena',
    name: 'ATHENA',
    epithet: 'Goddess of Wisdom, War Strategy and Crafts',
    role: 'STRATEGIST',
    style: 'Balanced speed · High defence · High skill',
    blurb: 'A tactical fighter who uses shield, spear and intelligence to outsmart opponents.',
    stats: { speed: 6, power: 5, defense: 8, range: 6 },
    palette: {
      primary: '#e7eef7', secondary: '#2f6fb5', accent: '#ffd873',
      skin: '#e3b18c', hair: '#5a3a21', metal: '#cfe4f5', glow: '#9fe6ff'
    },
    arena: 'olympus',
    basics: makeBasics({
      punch: { name: 'Shield Bash', damage: 36, pose: 'punch' },
      kick: { name: 'Spartan Kick', damage: 46 },
      forward: { name: 'Spear Thrust', damage: 66, reach: 116, pose: 'thrust' },
      back: { name: 'Shield Strike', damage: 54, pose: 'back' },
      air: { name: 'Aerial Spear Stab', damage: 56, pose: 'airthrust' }
    }),
    specials: [
      {
        id: 'divine_shield', name: 'Divine Shield', trigger: 's1', cd: 10, cast: 0.3,
        kind: 'buff', duration: 5, fx: 'aegis',
        self: { barrier: 160, reflect: 0.35 },
        desc: 'Raise the Aegis. Absorbs 160 damage and reflects 35% back at the attacker.'
      },
      {
        id: 'spear_of_wisdom', name: 'Spear of Wisdom', trigger: 's2', cd: 4.5, cast: 0.26,
        kind: 'projectile', fx: 'cast',
        proj: {
          shape: 'spear', speed: 780, damage: 68, w: 60, h: 16, y: -108,
          color: '#9fe6ff', glow: '#e2f8ff', life: 1.8, tag: 'divine',
          kb: 260, trail: 'spark', spin: 0
        },
        desc: 'Hurl a magical spear that crosses the arena.'
      },
      {
        id: 'strategic_counter', name: 'Strategic Counter', trigger: 'combo', cd: 8, cast: 0.15,
        kind: 'counter', duration: 1.0, damage: 92, stun: 0.7, fx: 'counter',
        desc: 'Read the next attack. Negate it and punish with a perfect counter.'
      }
    ],
    ultimate: {
      name: "ZEUS'S FAVOURITE", damage: 300, kind: 'athena',
      desc: "Athena calls her father. Zeus appears behind her and hurls a lightning bolt from the heavens."
    },
    combo: { name: 'WISDOM\'S EDGE', desc: 'Shield check, spear flurry, then a thunderous overhead strike.' },
    passive: {
      name: 'Divine Intelligence',
      desc: 'Three consecutive blocks grant Foresight: the enemy slows and Athena\'s next strike is empowered.'
    }
  },
  {
    id: 'hera',
    name: 'HERA',
    epithet: 'Queen of Olympus, Goddess of Marriage and Childbirth',
    role: 'CONTROLLER',
    style: 'Medium speed · Medium defence · High control',
    blurb: 'Elegant, intimidating and manipulative. She makes enemies fight against themselves.',
    stats: { speed: 5, power: 5, defense: 7, range: 6 },
    palette: {
      primary: '#f7f0e6', secondary: '#1c8f8a', accent: '#ffd873',
      skin: '#e9c09c', hair: '#2a1b22', metal: '#ffe6a3', glow: '#ffe28a'
    },
    arena: 'olympus',
    basics: makeBasics({
      punch: { name: 'Divine Slap', damage: 32, pose: 'slap' },
      kick: { name: 'Royal Sweep', damage: 42 },
      forward: { name: 'Sceptre Strike', damage: 60, pose: 'thrust' },
      back: { name: 'Peacock Feather', damage: 46, pose: 'back' },
      air: { name: 'Descending Knee', damage: 54, pose: 'airkick' }
    }),
    specials: [
      {
        id: 'queens_command', name: "Queen's Command", trigger: 's1', cd: 8, cast: 0.32,
        kind: 'projectile', fx: 'cast',
        proj: {
          shape: 'orb', speed: 430, damage: 34, w: 34, h: 34, y: -118,
          color: '#ffd873', glow: '#fff3c4', life: 2.6, tag: 'divine', kb: 90,
          trail: 'gold', status: { confuse: 3.0 }, homing: 40
        },
        desc: 'A golden command that reverses the enemy\'s movement controls for 3s.'
      },
      {
        id: 'jealous_wrath', name: 'Jealous Wrath', trigger: 's2', cd: 7, cast: 0.34,
        kind: 'projectile', fx: 'cast',
        proj: {
          shape: 'wave', speed: 400, damage: 48, w: 54, h: 96, y: -70,
          color: '#5fe0d0', glow: '#c8fff8', life: 2.4, tag: 'divine', kb: 150,
          trail: 'teal', status: { slow: 3.2 }, wave: true
        },
        desc: 'A wave of jealous divine energy that slows the enemy to a crawl.'
      },
      {
        id: 'royal_decree', name: 'Royal Decree', trigger: 'combo', cd: 9, cast: 0.3,
        kind: 'buff', duration: 4.5, fx: 'aegis',
        self: { barrier: 210, reflect: 0.12, armor: 0.25 },
        desc: 'A golden barrier absorbs 210 damage and steadies the Queen against harm.'
      }
    ],
    ultimate: {
      name: 'DIVINE POSSESSION', damage: 250, kind: 'hera',
      desc: 'Hera seizes the enemy\'s will. They strike themselves in a frenzy before her golden blast.'
    },
    combo: { name: 'QUEEN\'S JUDGEMENT', desc: 'A sceptre blow, a command, and a burst of royal light.' },
    passive: {
      name: 'Queen of Olympus',
      desc: 'Below 30% health, Hera gains a defensive aura and slowly mends her wounds.'
    }
  },
  {
    id: 'poseidon',
    name: 'POSEIDON',
    epithet: 'God of the Sea, Earthquakes and Horses',
    role: 'HEAVYWEIGHT',
    style: 'Low speed · Very high damage · High range',
    blurb: 'Powerful and intimidating. He controls the battlefield with water, waves and earthquakes.',
    stats: { speed: 4, power: 9, defense: 8, range: 8 },
    palette: {
      primary: '#0e5f6d', secondary: '#0a2c44', accent: '#7ff0e2',
      skin: '#d4a57e', hair: '#e8e2d0', metal: '#b8d8d2', glow: '#6fe6ff'
    },
    arena: 'sea',
    basics: makeBasics({
      punch: { name: 'Trident Handle', damage: 44, pose: 'punch' },
      kick: { name: 'Tidal Sweep', damage: 56, reach: 96 },
      forward: { name: 'Trident Thrust', damage: 78, reach: 124, pose: 'thrust' },
      back: { name: 'Trident Spin', damage: 64, pose: 'spin' },
      air: { name: 'Trident Slam', damage: 66, pose: 'slam' }
    }),
    specials: [
      {
        id: 'water_blast', name: 'Water Blast', trigger: 's1', cd: 5, cast: 0.3,
        kind: 'projectile', fx: 'cast',
        proj: {
          shape: 'water', speed: 860, damage: 64, w: 46, h: 30, y: -104,
          color: '#5fdcff', glow: '#d8fbff', life: 1.6, tag: 'water', kb: 280,
          trail: 'water', count: 1
        },
        desc: 'A high-pressure jet of seawater that blasts the enemy backwards.'
      },
      {
        id: 'earthquake', name: 'Earthquake', trigger: 's2', cd: 8, cast: 0.45,
        kind: 'quake', radius: 460, damage: 58, stun: 0.75, shake: 18,
        color: '#7ff0e2', fx: 'quake',
        desc: 'Drive the trident into the earth. The whole arena stumbles.'
      },
      {
        id: 'tidal_wave', name: 'Tidal Wave', trigger: 'combo', cd: 10, cast: 0.5,
        kind: 'projectile', fx: 'cast',
        proj: {
          shape: 'wave', speed: 330, damage: 82, w: 120, h: 150, y: -100,
          color: '#2ec4e6', glow: '#bdf7ff', life: 4.2, tag: 'water', kb: 420, kbY: 140,
          trail: 'water', wave: true, pierce: false, big: true
        },
        desc: 'Summon a wall of ocean that sweeps the opponent off their feet.'
      }
    ],
    ultimate: {
      name: 'TRIDENT TSUNAMI THROW', damage: 320, kind: 'poseidon',
      desc: 'An ocean rises, a giant water hand seizes the enemy, and the depths slam them down.'
    },
    combo: { name: 'ABYSSAL HUNT', desc: 'Trident sweeps, a crushing wave, and a geyser eruption.' },
    passive: {
      name: 'Lord of the Ocean',
      desc: 'Takes 30% less damage from water attacks and moves 12% faster in his own kingdom.'
    }
  },
  {
    id: 'hephaestus',
    name: 'HEPHAESTUS',
    epithet: 'God of Fire, Metalworking and Blacksmiths',
    role: 'TRAPPER',
    style: 'Low speed · High damage · Strong area attacks',
    blurb: 'Fights with an enormous hammer, molten metal, and weapons forged mid-battle.',
    stats: { speed: 3, power: 9, defense: 9, range: 5 },
    palette: {
      primary: '#7a3f26', secondary: '#241a18', accent: '#ff9b3d',
      skin: '#c98a5c', hair: '#2b211c', metal: '#b9a48d', glow: '#ffb347'
    },
    arena: 'forge',
    basics: makeBasics({
      punch: { name: 'Blacksmith Fist', damage: 46 },
      kick: { name: 'Hammer Kick', damage: 58, reach: 92 },
      forward: { name: 'Hammer Swing', damage: 82, reach: 118, pose: 'heavy' },
      back: { name: 'Hammer Uppercut', damage: 68, pose: 'uppercut' },
      air: { name: 'Aerial Hammer Slam', damage: 70, pose: 'slam' }
    }),
    specials: [
      {
        id: 'molten_fist', name: 'Molten Fist', trigger: 's1', cd: 7, cast: 0.3,
        kind: 'buff', duration: 5, fx: 'flame',
        self: { molten: 5, damageUp: 0.15 },
        desc: 'Coat both fists in molten iron. Attacks burn for 5s and hit 15% harder.'
      },
      {
        id: 'forge_trap', name: 'Forge Trap', trigger: 's2', cd: 6, cast: 0.35,
        kind: 'trap', fx: 'flame',
        trap: { type: 'lava', duration: 6.5, radius: 66, dps: 34, color: '#ff8a2b' },
        desc: 'Spill a pool of molten metal that burns anyone who steps in it.'
      },
      {
        id: 'iron_armour', name: 'Iron Armour', trigger: 'combo', cd: 10, cast: 0.35,
        kind: 'buff', duration: 4, fx: 'aegis',
        self: { armor: 0.5, reflect: 0.15 },
        desc: 'Forge a shell of iron. Halves incoming damage and returns a little of it.'
      }
    ],
    ultimate: {
      name: 'WRATH OF THE FORGE', damage: 310, kind: 'hephaestus',
      desc: 'The ground splits. The sky turns red. Burning meteors fall from the heavens.'
    },
    combo: { name: 'ANVIL OF THE GODS', desc: 'Hammer blows, a molten eruption, and a meteoric finish.' },
    passive: {
      name: 'Master Blacksmith',
      desc: 'Hammer attacks deal 35% bonus damage to blocking enemies and crush guards.'
    }
  },
  {
    id: 'furies',
    name: 'THE FURIES',
    epithet: 'Goddesses of Vengeance and Retribution',
    role: 'DISRUPTOR',
    style: 'High speed · Low defence · High disruption',
    blurb: 'Three sisters in one body — Alecto, Megaera and Tisiphone. They attack the mind first.',
    stats: { speed: 9, power: 6, defense: 3, range: 6 },
    palette: {
      primary: '#4a1526', secondary: '#1a0d16', accent: '#d64b7a',
      skin: '#c9b2c7', hair: '#120a12', metal: '#7c5a76', glow: '#ff5f8f'
    },
    arena: 'underworld',
    basics: makeBasics({
      punch: { name: 'Claw Rake', damage: 36, reach: 72 },
      kick: { name: 'Wing Spin Kick', damage: 50, pose: 'spin' },
      forward: { name: 'Snake Whip', damage: 62, reach: 120, pose: 'thrust' },
      back: { name: 'Alecto\'s Claws', damage: 52, pose: 'back' },
      air: { name: 'Dive Bomb', damage: 58, pose: 'air' }
    }),
    specials: [
      {
        id: 'guilt_trip', name: 'Guilt Trip', trigger: 's1', cd: 7, cast: 0.3,
        kind: 'projectile', fx: 'cast',
        proj: {
          shape: 'orb', speed: 420, damage: 26, w: 38, h: 38, y: -116,
          color: '#9f6bff', glow: '#e2d4ff', life: 2.5, tag: 'psychic', kb: 60,
          trail: 'void', status: { slow: 2.8 }, homing: 55, ghost: true
        },
        desc: 'An illusion of past failures. The enemy\'s reactions slow to a crawl.'
      },
      {
        id: 'venomous_wrath', name: 'Venomous Wrath', trigger: 's2', cd: 6, cast: 0.28,
        kind: 'projectile', fx: 'cast',
        proj: {
          shape: 'snake', speed: 620, damage: 32, w: 52, h: 26, y: -96,
          color: '#79ff7a', glow: '#d6ffd0', life: 2.2, tag: 'poison', kb: 90,
          trail: 'poison', status: { poison: 4.5 }, wiggle: true
        },
        desc: 'A venomous serpent that leaves the enemy poisoned for 4.5s.'
      },
      {
        id: 'madness', name: 'Madness', trigger: 'combo', cd: 10, cast: 0.45,
        kind: 'flash', radius: 640, damage: 24, fx: 'madness',
        status: { confuse: 3.2, blind: 2.6 },
        desc: 'Tear at the enemy\'s mind: reverse their controls, then blind them.'
      }
    ],
    ultimate: {
      name: 'ETERNAL PUNISHMENT', damage: 290, kind: 'furies',
      desc: 'The three sisters surround their prey. Reality folds. They strike from every side at once.'
    },
    combo: { name: 'TRIAL OF THE DAMNED', desc: 'Claws, serpents and a shriek that unmakes the mind.' },
    passive: {
      name: 'Vengeance',
      desc: 'The Furies grow faster and hit harder as their health falls — up to +35%.'
    }
  },
  {
    id: 'aphrodite',
    name: 'APHRODITE',
    epithet: 'Goddess of Love, Beauty and Desire',
    role: 'ASSASSIN',
    style: 'High speed · Low defence · High combo potential',
    blurb: 'Deceptively dangerous. Charm, illusions, and sudden bursts of lethal violence.',
    stats: { speed: 8, power: 7, defense: 4, range: 5 },
    palette: {
      primary: '#ffd9e6', secondary: '#c2477d', accent: '#ff88ae',
      skin: '#f2cfb4', hair: '#e8c27a', metal: '#ffe6a3', glow: '#ff9fc4'
    },
    arena: 'garden',
    basics: makeBasics({
      punch: { name: 'Palm Strike', damage: 36, pose: 'slap' },
      kick: { name: 'High-Heel Kick', damage: 48 },
      forward: { name: 'Rose Thorn', damage: 60, reach: 112, pose: 'thrust' },
      back: { name: 'Mirror Strike', damage: 50, pose: 'back' },
      air: { name: 'Petal Flying Kick', damage: 58, pose: 'airkick' }
    }),
    specials: [
      {
        id: 'love_spell', name: 'Love Spell', trigger: 's1', cd: 7, cast: 0.3,
        kind: 'projectile', fx: 'cast',
        proj: {
          shape: 'heart', speed: 420, damage: 22, w: 42, h: 40, y: -112,
          color: '#ff6f9f', glow: '#ffd3e2', life: 2.6, tag: 'divine', kb: 60,
          trail: 'heart', status: { freeze: 1.5 }, homing: 60
        },
        desc: 'Blow a heart at the enemy. On contact they freeze, infatuated.'
      },
      {
        id: 'thorned_roses', name: 'Thorned Roses', trigger: 's2', cd: 8, cast: 0.35,
        kind: 'trap', fx: 'petal',
        trap: { type: 'snare', duration: 1.6, radius: 62, damage: 42, root: 1.5, color: '#ff5f8f' },
        desc: 'Thorned vines erupt beneath the enemy, rooting them and drawing blood.'
      },
      {
        id: 'beautys_illusion', name: "Beauty's Illusion", trigger: 'combo', cd: 9, cast: 0.3,
        kind: 'buff', duration: 4.5, fx: 'heart',
        self: { illusion: 4.5, speedUp: 0.2 },
        desc: 'Split into mirror images. The next attack against Aphrodite misses entirely.'
      }
    ],
    ultimate: {
      name: 'LOVE HURTS', damage: 330, kind: 'aphrodite',
      desc: 'A blown kiss. Total infatuation. Then the goddess reaches in and takes what she wants.'
    },
    combo: { name: 'KISS OF RUIN', desc: 'A charming caress, a storm of thorns, and a stolen heartbeat.' },
    passive: {
      name: 'Irresistible Beauty',
      desc: 'Enemies who land five quick hits become charmed and vulnerable to Aphrodite\'s arts.'
    }
  },
  {
    id: 'apollo',
    name: 'APOLLO',
    epithet: 'God of the Sun, Music, Prophecy and Healing',
    role: 'RANGED',
    style: 'High speed · Medium defence · High range',
    blurb: 'Fast and graceful. He fights with light, archery, and the power to mend himself.',
    stats: { speed: 8, power: 6, defense: 6, range: 9 },
    palette: {
      primary: '#fff6d8', secondary: '#e0a52e', accent: '#ffe27a',
      skin: '#f0c79f', hair: '#f2d27a', metal: '#ffe6a3', glow: '#fff1a8'
    },
    arena: 'olympus',
    basics: makeBasics({
      punch: { name: 'Solar Palm', damage: 32, pose: 'punch' },
      kick: { name: 'Spinning Kick', damage: 44, pose: 'spin' },
      forward: { name: 'Golden Arrow', damage: 58, reach: 116, pose: 'thrust' },
      back: { name: 'Bow Strike', damage: 46, pose: 'back' },
      air: { name: 'Aerial Arrow', damage: 54, pose: 'air' }
    }),
    specials: [
      {
        id: 'solar_arrow', name: 'Solar Arrow', trigger: 's1', cd: 4, cast: 0.24,
        kind: 'projectile', fx: 'shoot',
        proj: {
          shape: 'arrow', speed: 980, damage: 72, w: 58, h: 14, y: -112,
          color: '#ffe27a', glow: '#fffbe0', life: 1.8, tag: 'light', kb: 220,
          trail: 'sun', pierce: false
        },
        desc: 'Loose a burning arrow of concentrated sunlight.'
      },
      {
        id: 'divine_healing', name: 'Divine Healing', trigger: 's2', cd: 12, cast: 0.4,
        kind: 'buff', duration: 4, fx: 'heal',
        self: { regen: 26 },
        desc: 'Bathe in sunlight, restoring 104 health over four seconds.'
      },
      {
        id: 'blinding_light', name: 'Blinding Light', trigger: 'combo', cd: 11, cast: 0.4,
        kind: 'flash', radius: 560, damage: 26, fx: 'sunburst',
        status: { blind: 2.6, stun: 0.42 },
        desc: 'Release a burst of pure sunlight that blinds and stuns everyone near.'
      }
    ],
    ultimate: {
      name: 'WRATH OF THE SUN', damage: 300, kind: 'apollo',
      desc: 'Apollo rises, becomes the sun, and fires a beam of divine light across the arena.'
    },
    combo: { name: 'HELIOS DESCENDING', desc: 'A solar arrow, a burst of light, and a falling sunlance.' },
    passive: {
      name: 'Solar Regeneration',
      desc: 'Apollo slowly regenerates health, faster under the open sky of Mount Olympus.'
    }
  },
  {
    id: 'ares',
    name: 'ARES',
    epithet: 'God of War, Violence and Bloodshed',
    role: 'BERSERKER',
    style: 'Medium speed · Very high damage · Low technique',
    blurb: 'The choice for players who want to smash through everything. Not clever. Devastating.',
    stats: { speed: 5, power: 10, defense: 7, range: 5 },
    palette: {
      primary: '#8f1f1f', secondary: '#2b2320', accent: '#ff5b3d',
      skin: '#c98d63', hair: '#241713', metal: '#8a8378', glow: '#ff6b4a'
    },
    arena: 'forge',
    basics: makeBasics({
      punch: { name: 'Skull Punch', damage: 48, pose: 'punch' },
      kick: { name: 'Knee Strike', damage: 58, pose: 'kick' },
      forward: { name: 'Sword Slash', damage: 84, reach: 120, pose: 'heavy' },
      back: { name: 'Shield Bash', damage: 66, pose: 'back' },
      air: { name: 'Falling Axe Kick', damage: 72, pose: 'airkick' }
    }),
    specials: [
      {
        id: 'bloodlust', name: 'Bloodlust', trigger: 's1', cd: 9, cast: 0.25,
        kind: 'buff', duration: 5, fx: 'rage',
        self: { attackSpeed: 0.4, damageUp: 0.15 },
        desc: 'A rush of slaughter-lust: 40% faster attacks and 15% more damage.'
      },
      {
        id: 'war_cry', name: 'War Cry', trigger: 's2', cd: 6, cast: 0.35,
        kind: 'burst', radius: 280, damage: 34, stun: 0.3, kb: 460, kbY: 160,
        color: '#ff5b3d', fx: 'rage',
        desc: 'A roar of pure violence that hurls nearby enemies across the arena.'
      },
      {
        id: 'ground_breaker', name: 'Ground Breaker', trigger: 'combo', cd: 9, cast: 0.5,
        kind: 'quake', radius: 500, damage: 76, stun: 0.55, knockdown: true, shake: 22,
        color: '#ff7a4a', fx: 'quake',
        desc: 'Smash the earth. A shockwave cracks the ground and knocks the enemy down.'
      }
    ],
    ultimate: {
      name: 'GOD OF WAR', damage: 320, kind: 'ares',
      desc: 'Ares descends into unstoppable rage — a brutal flurry ending in a world-breaking blow.'
    },
    combo: { name: 'SPOILS OF WAR', desc: 'Blade, shield, and a skull-shattering hammer of fists.' },
    passive: {
      name: 'Blood Rage',
      desc: 'Ares gains up to +35% attack damage as his health drops.'
    }
  },
  {
    id: 'artemis',
    name: 'ARTEMIS',
    epithet: 'Goddess of the Hunt, Wilderness and Moon',
    role: 'HUNTER',
    style: 'Very high speed · Medium defence · High range',
    blurb: 'An agile hunter who keeps opponents at a distance with arrows, traps and wild beasts.',
    stats: { speed: 9, power: 6, defense: 5, range: 9 },
    palette: {
      primary: '#dff2e4', secondary: '#1f5a3f', accent: '#bfffd4',
      skin: '#e3b98f', hair: '#2a1f1a', metal: '#cfe4d8', glow: '#a8ffcf'
    },
    arena: 'forest',
    basics: makeBasics({
      punch: { name: 'Elbow Strike', damage: 32, pose: 'punch' },
      kick: { name: 'Hunting Kick', damage: 44, pose: 'spin' },
      forward: { name: 'Bow Strike', damage: 56, reach: 118, pose: 'thrust' },
      back: { name: 'Arrow Jab', damage: 44, pose: 'back' },
      air: { name: 'Aerial Shot', damage: 52, pose: 'air' }
    }),
    specials: [
      {
        id: 'hunting_arrow', name: 'Hunting Arrow', trigger: 's1', cd: 3.2, cast: 0.2,
        kind: 'projectile', fx: 'shoot',
        proj: {
          shape: 'arrow', speed: 1080, damage: 54, w: 54, h: 12, y: -106,
          color: '#d8ffe6', glow: '#f0fff6', life: 1.6, tag: 'physical', kb: 150,
          trail: 'silver'
        },
        desc: 'A swift silver arrow. Fast, precise, and hard to block on reaction.'
      },
      {
        id: 'wild_hounds', name: 'Wild Hounds', trigger: 's2', cd: 9, cast: 0.4,
        kind: 'summon', fx: 'summon',
        summon: { type: 'hound', count: 2, speed: 420, damage: 36, life: 3.5, color: '#a8ffcf' },
        desc: 'Two hunting hounds charge the enemy and tear at them.'
      },
      {
        id: 'moon_trap', name: 'Moon Trap', trigger: 'combo', cd: 8, cast: 0.3,
        kind: 'trap', fx: 'moon',
        trap: { type: 'snare', duration: 2.2, radius: 58, damage: 34, root: 1.7, color: '#a8ffcf' },
        desc: 'Place a moonlight snare. Whoever steps in it is caught fast.'
      }
    ],
    ultimate: {
      name: 'HUNT OF THE MOON', damage: 300, kind: 'artemis',
      desc: 'The moon rises over a darkened arena. The hunt begins. The pack always finds its prey.'
    },
    combo: { name: 'MOONLIT QUARRY', desc: 'Arrows, hounds, and a silver moonlance through the heart.' },
    passive: {
      name: 'Predator Instinct',
      desc: 'Deals 25% bonus damage to enemies more than 350 pixels away.'
    }
  },
  {
    id: 'zeus',
    name: 'ZEUS',
    epithet: 'King of the Gods, God of Thunder and Lightning',
    role: 'LEGENDARY',
    style: 'Very high damage · High speed · Very high power',
    blurb: 'The ultimate fighter. Melee mastery fused with the raw authority of the heavens.',
    stats: { speed: 8, power: 10, defense: 8, range: 9 },
    palette: {
      primary: '#f4f1e6', secondary: '#2b4a8f', accent: '#ffe066',
      skin: '#e3b98f', hair: '#f2ead8', metal: '#ffe27a', glow: '#9fdcff'
    },
    arena: 'olympus',
    locked: true,
    basics: makeBasics({
      punch: { name: 'Storm Fist', damage: 42, pose: 'punch' },
      kick: { name: 'Thunder Kick', damage: 54 },
      forward: { name: 'Thunderbolt Strike', damage: 78, reach: 122, pose: 'heavy' },
      back: { name: 'Lightning Shockwave', damage: 62, pose: 'back' },
      air: { name: 'Aerial Lightning Slam', damage: 68, pose: 'slam' }
    }),
    specials: [
      {
        id: 'lightning_bolt', name: 'Lightning Bolt', trigger: 's1', cd: 4.5, cast: 0.24,
        kind: 'projectile', fx: 'cast',
        proj: {
          shape: 'bolt', speed: 1250, damage: 84, w: 36, h: 44, y: -112,
          color: '#9fdcff', glow: '#ffffff', life: 1.4, tag: 'lightning', kb: 260,
          trail: 'lightning', pierce: true, maxHits: 1
        },
        desc: 'Hurl a spear of lightning across the arena.'
      },
      {
        id: 'thunder_clap', name: 'Thunder Clap', trigger: 's2', cd: 8, cast: 0.38,
        kind: 'burst', radius: 360, damage: 52, stun: 0.9, kb: 200, kbY: 40,
        color: '#bfe9ff', fx: 'thunder',
        desc: 'Clap thunder into being. Everything nearby is stunned by the shock.'
      },
      {
        id: 'divine_teleport', name: 'Divine Teleport', trigger: 'combo', cd: 10, cast: 0.2,
        kind: 'teleport', damage: 62, stun: 0.5, fx: 'teleport',
        desc: 'Vanish in a flash of lightning and reappear behind the enemy with a strike.'
      }
    ],
    ultimate: {
      name: 'WRATH OF OLYMPUS', damage: 380, kind: 'zeus',
      desc: 'The sky breaks. A storm of spears falls. Then one thunderbolt large enough to end a pantheon.'
    },
    combo: { name: 'JUDGEMENT OF THE SKY', desc: 'Storms gather, the arena cracks, and Olympus passes sentence.' },
    passive: {
      name: 'King of Olympus',
      desc: 'Takes 25% less elemental damage. When struck by a special, may answer with a lightning counter.'
    }
  }
];

const CHAR_BY_ID = {};
for (const c of ROSTER) CHAR_BY_ID[c.id] = c;

const ARENA_BY_ID = {};
for (const a of ARENAS) ARENA_BY_ID[a.id] = a;

/* ---------- Controls ---------- */
const ACTIONS = [
  { id: 'left', label: 'Move left' },
  { id: 'right', label: 'Move right' },
  { id: 'up', label: 'Jump' },
  { id: 'down', label: 'Crouch' },
  { id: 'punch', label: 'Punch' },
  { id: 'kick', label: 'Kick' },
  { id: 's1', label: 'Special 1' },
  { id: 's2', label: 'Special 2' },
  { id: 'block', label: 'Block' },
  { id: 'super', label: 'Superpower' }
];

const DEFAULT_BINDINGS = {
  p1: {
    left: 'KeyA', right: 'KeyD', up: 'KeyW', down: 'KeyS',
    punch: 'KeyF', kick: 'KeyG', s1: 'KeyH', s2: 'KeyR',
    block: 'KeyT', super: 'KeyY'
  },
  p2: {
    left: 'ArrowLeft', right: 'ArrowRight', up: 'ArrowUp', down: 'ArrowDown',
    punch: 'KeyJ', kick: 'KeyK', s1: 'KeyL', s2: 'KeyU',
    block: 'KeyI', super: 'KeyO'
  }
};

const KEY_LABELS = {
  ArrowLeft: '←', ArrowRight: '→', ArrowUp: '↑', ArrowDown: '↓',
  Space: 'SPACE', Escape: 'ESC', Enter: 'ENTER', ShiftLeft: 'L-SHIFT', ShiftRight: 'R-SHIFT',
  ControlLeft: 'L-CTRL', ControlRight: 'R-CTRL', AltLeft: 'L-ALT', AltRight: 'R-ALT',
  Backspace: 'BACKSPACE', Tab: 'TAB', CapsLock: 'CAPS', Semicolon: ';', Quote: "'",
  Comma: ',', Period: '.', Slash: '/', Backslash: '\\', BracketLeft: '[', BracketRight: ']',
  Minus: '-', Equal: '=', Backquote: '`'
};

function keyLabel(code) {
  if (!code) return '—';
  if (KEY_LABELS[code]) return KEY_LABELS[code];
  if (code.startsWith('Key')) return code.slice(3);
  if (code.startsWith('Digit')) return code.slice(5);
  if (code.startsWith('Numpad')) return 'NUM ' + code.slice(6);
  return code.toUpperCase();
}

const ARCADE_LADDER = [
  'hera', 'poseidon', 'hephaestus', 'furies', 'aphrodite', 'apollo', 'ares', 'artemis', 'zeus'
];

const VICTORY_LINES = {
  athena: 'A war is won before the first spear is thrown.',
  hera: 'You will remember your place, little god.',
  poseidon: 'The sea does not forgive. Neither do I.',
  hephaestus: 'Every ruin can be remade. Every enemy, broken.',
  furies: 'There is no forgetting. There is only punishment.',
  aphrodite: 'You wanted me. Now look what that cost you.',
  apollo: 'The sun sees everything. It forgives nothing.',
  ares: 'Peace was never an option.',
  artemis: 'The hunt ends as all hunts end.',
  zeus: 'Olympus has one king. It always will.'
};

const STORY_TEXT = 'The foundations of Olympus are cracking. An ancient force stirs beneath the mountain, and the gods have begun to blame one another. Defeat five of them, then face the King himself. Survival may mean destroying your own family.';

