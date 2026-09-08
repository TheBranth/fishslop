// Constants & 5-Level Roguelite Escalation Curve for Friendslop Fishing Co.

import { RogueliteLevel, StationType } from './types';

export const TICK_RATE = 60;
export const TICK_INTERVAL = 1000 / TICK_RATE;

export const CANVAS_WIDTH = 960;
export const CANVAS_HEIGHT = 540;

// Boat Dimensions on Canvas (Expanded to fill canvas with minimalist trawler architecture)
export const BOAT_BOUNDS = {
  x: 70,
  y: 50,
  width: 820,
  height: 440,
  plankMargin: 30,
  radius: 40
};

// North Cabin / Wheelhouse Bounds (Solid unpassable structure; blocks North wall)
export const CABIN_BOUNDS = {
  x: 100,
  y: 52,
  width: 760,
  height: 68
};

// Center Fish Hold / Cargo Double Doors (Unpassable selling & stowage structure)
export const CARGO_HOLD_BOUNDS = {
  x: 420,
  y: 260,
  width: 120,
  height: 80
};

// Playable Deck Area (South of Cabin, within perimeter gunwales)
export const DECK_BOUNDS = {
  minX: BOAT_BOUNDS.x + 36,
  maxX: BOAT_BOUNDS.x + BOAT_BOUNDS.width - 36,
  minY: CABIN_BOUNDS.y + CABIN_BOUNDS.height + 12,
  maxY: BOAT_BOUNDS.y + BOAT_BOUNDS.height - 34
};

// Physics Tuning
export const PHYSICS = {
  playerSpeed: 2.3,
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

// Fixed Starter Stations (Central Hold + Deck Utility)
export const FIXED_STARTER_STATIONS = [
  { type: 'rod_rack' as StationType, name: 'Tool Rack (Rods & Mops)', x: 135, y: 155, w: 54, h: 70 },
  { type: 'cooler' as StationType, name: 'Fish Hold (Cargo Hatch)', x: CARGO_HOLD_BOUNDS.x, y: CARGO_HOLD_BOUNDS.y, w: CARGO_HOLD_BOUNDS.width, h: CARGO_HOLD_BOUNDS.height },
  { type: 'trash_chute' as StationType, name: 'Overboard Trash Chute', x: 440, y: 445, w: 80, h: 36 }
];

// 4 Modular Corner Sockets (Arranged in the 4 corners flanking the central cargo hold)
export const MODULAR_SOCKET_LAYOUTS = [
  { socketIndex: 0, name: 'Socket #1 (Port Bow Corner)', x: 280, y: 170, w: 70, h: 55 },
  { socketIndex: 1, name: 'Socket #2 (Starboard Bow Corner)', x: 610, y: 170, w: 70, h: 55 },
  { socketIndex: 2, name: 'Socket #3 (Port Stern Corner)', x: 280, y: 360, w: 70, h: 55 },
  { socketIndex: 3, name: 'Socket #4 (Starboard Stern Corner)', x: 610, y: 360, w: 70, h: 55 }
];

