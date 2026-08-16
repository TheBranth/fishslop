// Constants & 5-Level Roguelite Escalation Curve for Friendslop Fishing Co.

import { RogueliteLevel } from './types';

export const TICK_RATE = 60;
export const TICK_INTERVAL = 1000 / TICK_RATE;

export const CANVAS_WIDTH = 960;
export const CANVAS_HEIGHT = 540;

// Boat Dimensions on Canvas
export const BOAT_BOUNDS = {
  x: 140,
  y: 90,
  width: 680,
  height: 360,
  plankMargin: 30,
  radius: 36
};

// Playable Deck Area
export const DECK_BOUNDS = {
  minX: BOAT_BOUNDS.x + 38,
  maxX: BOAT_BOUNDS.x + BOAT_BOUNDS.width - 38,
  minY: BOAT_BOUNDS.y + 32,
  maxY: BOAT_BOUNDS.y + BOAT_BOUNDS.height - 32
};

// Physics Tuning
export const PHYSICS = {
  playerSpeed: 3.6,
  playerFriction: 0.88,
  itemFriction: 0.90,
  tiltGravityMultiplier: 0.16,
  maxBoatAngle: 35, // degrees
  capsizingAngleThreshold: 30, // degrees
  capsizingMaxSeconds: 2.5, // seconds before capsizing game over
  tiltSensitivity: 0.5,
  throwPower: 7.5,
  slapPower: 8.5,
  slapStunDurationSeconds: 1.5,
  eelSlipDurationSeconds: 2.0,
  bombfishFuseSeconds: 5.0,
  mismatchCooldownSeconds: 5.0, // 5s knife sharpening / fryer cooldown
  krakenMaxHP: 1200,
  calamariDamage: 250,
  bombfishKrakenDamage: 400,
  slapKrakenDamage: 50
};

// Player Visual Profiles
export const PLAYER_PROFILES = [
  { color: 'blue', colorHex: '#38bdf8', name: 'Deckhand Blue', borderHex: '#0284c7' },
  { color: 'yellow', colorHex: '#facc15', name: 'Swabber Gold', borderHex: '#ca8a04' },
  { color: 'red', colorHex: '#f87171', name: 'Chef Crimson', borderHex: '#dc2626' },
  { color: 'green', colorHex: '#4ade80', name: 'Captain Emerald', borderHex: '#16a34a' }
] as const;

export const MAX_SOLO_LIFT_WEIGHT = 4.0; // Items > 4.0kg require Conga Line co-op lift

// The 5-Level Escalation Curve (Exact Spawn Gatekeeping Matrix)
export const ROGUELITE_LEVELS: RogueliteLevel[] = [
  {
    levelNumber: 1,
    id: 'lvl_1_sweetwater',
    name: 'Sweetwater Shallows',
    subtitle: 'Wooden Rowboat — Guppy & Cod Commercial Fishing & Cooler Sorting',
    targetQuota: 250,
    timeLimitSeconds: 90,
    environmentalHazard: 'calm',
    spawnRates: {
      guppy: 0.45,
      cod: 0.15,
      sunfish: 0.05,
      salmon: 0.00,
      boot: 0.20,
      turtle: 0.15,
      tuna: 0.00,
      eel: 0.00,
      squid: 0.00,
      ray: 0.00,
      radioactive_bass: 0.00,
      moonfish: 0.00,
      bombfish: 0.00,
      kraken: 0.00
    },
    unlockedStations: ['cooler']
  },
  {
    levelNumber: 2,
    id: 'lvl_2_industrial',
    name: 'Industrial Smog Coast',
    subtitle: 'Diesel Trawler — Butter Tuna Grease, Slime Eels & Deep Fryers',
    targetQuota: 550,
    timeLimitSeconds: 90,
    environmentalHazard: 'smog_waves',
    spawnRates: {
      guppy: 0.15,
      cod: 0.20,
      sunfish: 0.10,
      salmon: 0.05,
      boot: 0.15,
      turtle: 0.10,
      tuna: 0.15,
      eel: 0.10,
      squid: 0.00,
      ray: 0.00,
      radioactive_bass: 0.00,
      moonfish: 0.00,
      bombfish: 0.00,
      kraken: 0.00
    },
    unlockedStations: ['cooler']
  },
  {
    levelNumber: 3,
    id: 'lvl_3_abyss',
    name: 'Abyssal Trench',
    subtitle: 'Deep Sea Hull — Ink Squids, Electric Rays, Radioactive Bass & Moonfish Shaders',
    targetQuota: 900,
    timeLimitSeconds: 90,
    environmentalHazard: 'abyss_storm',
    spawnRates: {
      guppy: 0.00,
      cod: 0.10,
      sunfish: 0.10,
      salmon: 0.10,
      boot: 0.10,
      turtle: 0.05,
      tuna: 0.10,
      eel: 0.10,
      squid: 0.15,
      ray: 0.10,
      radioactive_bass: 0.05,
      moonfish: 0.05,
      bombfish: 0.00,
      kraken: 0.00
    },
    unlockedStations: ['cooler']
  },
  {
    levelNumber: 4,
    id: 'lvl_4_maelstrom',
    name: 'The Maelstrom',
    subtitle: 'Centrifugal Whirlpool — Volcanic Bombfish, Multi-Hazard Minefield & 360° Tilt',
    targetQuota: 1350,
    timeLimitSeconds: 90,
    environmentalHazard: 'whirlpool',
    spawnRates: {
      guppy: 0.00,
      cod: 0.05,
      sunfish: 0.05,
      salmon: 0.05,
      boot: 0.05,
      turtle: 0.00,
      tuna: 0.10,
      eel: 0.10,
      squid: 0.15,
      ray: 0.10,
      radioactive_bass: 0.10,
      moonfish: 0.10,
      bombfish: 0.15,
      kraken: 0.00
    },
    unlockedStations: ['cooler']
  },
  {
    levelNumber: 5,
    id: 'lvl_5_kraken',
    name: 'The Eldritch Kraken',
    subtitle: 'Thunderstorm Abyss — Tentacle Gunwale Grappling Boss Battle (1200 HP)',
    targetQuota: 0, // Direct Boss HP Battle!
    timeLimitSeconds: 100,
    environmentalHazard: 'kraken_boss',
    isBossLevel: true,
    bossMaxHP: 1200,
    spawnRates: {
      guppy: 0.00,
      cod: 0.00,
      sunfish: 0.00,
      salmon: 0.05,
      boot: 0.05,
      turtle: 0.00,
      tuna: 0.05,
      eel: 0.05,
      squid: 0.10,
      ray: 0.05,
      radioactive_bass: 0.05,
      moonfish: 0.05,
      bombfish: 0.10,
      kraken: 0.35
    },
    unlockedStations: ['cooler']
  }
];
