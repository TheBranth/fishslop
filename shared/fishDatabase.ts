// Fishopedia & Species Characteristics Registry (Expanded 14-Species Standard vs. Effect Ecosystem)

import { FishSpeciesId, FishTier } from './types';

export interface FishDefinition {
  id: FishSpeciesId;
  name: string;
  tier: FishTier;
  category: 'Standard' | 'Effect' | 'Hazard' | 'Junk' | 'Boss';
  emoji: string;
  mass: number;
  basePrice: number;
  colorHex: string;
  reelDifficulty: 'Easy' | 'Medium' | 'Hard' | 'Heavy' | 'Very Heavy' | 'Erratic' | 'Boss';
  behavior: string;
  uniqueEffect: string;
  processingPipeline: string;
  description: string;
}

export const FISH_REGISTRY: Record<FishSpeciesId, FishDefinition> = {
  // --- 1. STANDARD COMMERCIAL FISH (CLEAN ECONOMY) ---
  guppy: {
    id: 'guppy',
    name: 'Pixel Guppy',
    tier: 'T1',
    category: 'Standard',
    emoji: '🐟',
    mass: 1.0,
    basePrice: 15,
    colorHex: '#38bdf8',
    reelDifficulty: 'Easy',
    behavior: 'Standard flopper. Harmless deck flailer.',
    uniqueEffect: 'None (Pure clean commercial meat).',
    processingPipeline: 'Fillet Board ($33 Sashimi) ➔ Deep Fryer ($38 Fried Guppy)',
    description: 'The humble starter of sweetwater ponds. Clean single-chop slice.'
  },
  cod: {
    id: 'cod',
    name: 'Atlantic Cod',
    tier: 'T1',
    category: 'Standard',
    emoji: '🐟',
    mass: 2.5,
    basePrice: 35,
    colorHex: '#60a5fa',
    reelDifficulty: 'Medium',
    behavior: 'Solid mid-tier workhorse fish with heavy meat yield.',
    uniqueEffect: 'None (Pure commercial volume).',
    processingPipeline: 'Deep Fryer ($88 Fish & Chips Platter)',
    description: 'Solid, reliable economy workhorse fish. Big meat yield, zero mess.'
  },
  sunfish: {
    id: 'sunfish',
    name: 'Ocean Sunfish',
    tier: 'T3',
    category: 'Standard',
    emoji: '🐟',
    mass: 8.0,
    basePrice: 90,
    colorHex: '#94a3b8',
    reelDifficulty: 'Very Heavy',
    behavior: 'Massive deadweight (>4.0kg). Heavy boat tilt upon landing. Requires Conga Line lift!',
    uniqueEffect: 'Heavy Deadweight: 1 player drags slowly; 2+ player conga line required to carry.',
    processingPipeline: 'Sushi Station ($360 VIP Platter) ➔ Soup Pot ($270 Mega Chowder)',
    description: 'A colossal slab of pure commercial profit. Needs multi-player teamwork to hoist.'
  },
  salmon: {
    id: 'salmon',
    name: 'Golden Salmon',
    tier: 'T4',
    category: 'Standard',
    emoji: '🐟',
    mass: 2.0,
    basePrice: 110,
    colorHex: '#f59e0b',
    reelDifficulty: 'Hard',
    behavior: 'Fast agile darts. High reel needle oscillation.',
    uniqueEffect: 'Nimble Prize: High value, zero negative deck hazards.',
    processingPipeline: 'Sushi Mat ($440 VIP Luxury Maki)',
    description: 'Rare, shimmering prize salmon. Demands quick reel reflexes and clean slicing.'
  },

  // --- 2. EFFECT & HAZARD FISH (SLAPSTICK MINEFIELD) ---
  tuna: {
    id: 'tuna',
    name: 'Butter Tuna',
    tier: 'T2',
    category: 'Effect',
    emoji: '🧈',
    mass: 3.0,
    basePrice: 60,
    colorHex: '#facc15',
    reelDifficulty: 'Medium',
    behavior: 'Zero friction when sliding. Spawns slippery butter puddles on deck every 1.0s (50% tick).',
    uniqueEffect: 'Grease Spawner: Drops yellow butter puddles. Fryer without filleting splatters grease (1.5s stun).',
    processingPipeline: 'Fillet Board ($132) ➔ Sushi Mat ($240)',
    description: '100% pure omega grease. Turns the wooden deck into an uncontrollable slip-and-slide.'
  },
  eel: {
    id: 'eel',
    name: 'Slime Eel',
    tier: 'T2',
    category: 'Effect',
    emoji: '🐍',
    mass: 2.2,
    basePrice: 45,
    colorHex: '#10b981',
    reelDifficulty: 'Erratic',
    behavior: 'Writhing and squirming. Wriggles out of player hands after 2.5s and leaves slime trail.',
    uniqueEffect: 'Slippery Grip: Drops after 2.5s. Dropping whole into soup pot causes instant boil over!',
    processingPipeline: 'Deep Fryer ($112 Crispy Slime Roll)',
    description: 'Cannot be held for long. Must be passed rapidly or chopped immediately.'
  },
  squid: {
    id: 'squid',
    name: 'Ink Squid',
    tier: 'T2',
    category: 'Effect',
    emoji: '🦑',
    mass: 2.8,
    basePrice: 50,
    colorHex: '#64748b',
    reelDifficulty: 'Hard',
    behavior: 'Blinds crew upon landing by squirting 3 large ink splatters on the TV screen camera.',
    uniqueEffect: 'Camera Blinder: TV screen covered in ink blobs. Cleared via Squeegee or 5s fade.',
    processingPipeline: 'Fillet Board ($110 Squid Rings) ➔ Deep Fryer ($165 Calamari)',
    description: 'Squirts thick black ink that completely blocks the crew\'s view of the deck.'
  },
  ray: {
    id: 'ray',
    name: 'Electric Ray',
    tier: 'T3',
    category: 'Effect',
    emoji: '⚡',
    mass: 4.5,
    basePrice: 80,
    colorHex: '#eab308',
    reelDifficulty: 'Heavy',
    behavior: 'Emits a shock pulse every 3.0s, shocking and stunning anyone standing in water within 100px.',
    uniqueEffect: 'Deck Zap: Stuns nearby crew in puddles. Shocks cutting board if not rinsed first.',
    processingPipeline: 'Rinse Dunk ➔ Fillet Board ($176 Conductive Filet)',
    description: 'Dangerously high voltage. Must be rinsed or moved away from deck puddles.'
  },
  radioactive_bass: {
    id: 'radioactive_bass',
    name: 'Radioactive Bass',
    tier: 'T3',
    category: 'Effect',
    emoji: '☢️',
    mass: 3.2,
    basePrice: 100,
    colorHex: '#22c55e',
    reelDifficulty: 'Medium',
    behavior: 'Tints the entire shared TV screen with a sickly green CRT glow and Geiger clicks while on deck.',
    uniqueEffect: 'Neon Green Tint & Geiger Audio. Explodes into toxic green smoke if dropped in fryer!',
    processingPipeline: 'Rinse Dunk ➔ Cutting Board ($220 Isotope Steak)',
    description: 'Glows in the dark and crackles with gamma rays. Changes the whole room ambiance.'
  },
  moonfish: {
    id: 'moonfish',
    name: 'Abyssal Moonfish',
    tier: 'T3',
    category: 'Effect',
    emoji: '🌙',
    mass: 4.0,
    basePrice: 130,
    colorHex: '#c084fc',
    reelDifficulty: 'Erratic',
    behavior: 'Solar Eclipse: Darkens global screen lighting by 60%, leaving only deck lanterns visible.',
    uniqueEffect: 'Room Blackout: Drops ship visibility by 60%. Illuminates radar when brewed in soup.',
    processingPipeline: 'Soup Pot ($390 Bioluminescent Broth)',
    description: 'Absorbs ambient light into its ethereal scales, plunging the shift into darkness.'
  },
  bombfish: {
    id: 'bombfish',
    name: 'Volcanic Bombfish',
    tier: 'T4',
    category: 'Hazard',
    emoji: '💣',
    mass: 5.0,
    basePrice: 120,
    colorHex: '#ef4444',
    reelDifficulty: 'Hard',
    behavior: '5-second ticking fuse. Explodes in a blast wave launching players and items overboard.',
    uniqueEffect: 'Ticking Detonation: Explodes in 5s. Immediate detonation if dropped in Fryer or Soup Pot!',
    processingPipeline: 'Rinse Dunk (Defuse) ➔ Cutting Board ($264)',
    description: 'A ticking volatile aquatic bomb. Throw at Kraken tentacles or defuse in the wash bucket!'
  },
  turtle: {
    id: 'turtle',
    name: 'Snapping Turtle',
    tier: 'T1',
    category: 'Hazard',
    emoji: '🐢',
    mass: 4.0,
    basePrice: 40,
    colorHex: '#15803d',
    reelDifficulty: 'Medium',
    behavior: 'Ankle Biter: Snaps and slows down anyone who steps on it. Heavy shell.',
    uniqueEffect: 'Knife Breaker: Slicing on Fillet Board shatters knife (5s lockout). Ideal for Soup!',
    processingPipeline: 'Soup Pot ($120 Turtle Chowder)',
    description: 'Armored and aggressive. Will bite shins until boiled into hearty soup.'
  },
  boot: {
    id: 'boot',
    name: 'Old Rubber Boot',
    tier: 'T1',
    category: 'Junk',
    emoji: '🥾',
    mass: 3.5,
    basePrice: 5,
    colorHex: '#78350f',
    reelDifficulty: 'Easy',
    behavior: 'Non-fish clutter. Heavy deadweight and trip hazard.',
    uniqueEffect: 'Trip Hazard: -$25 penalty if banked in Cooler during Harbor Cleanup.',
    processingPipeline: 'Trash Chute ($0) ➔ Deep Fryer ($35 Crispy Leather)',
    description: 'Lost nautical footwear. Trash or fry into a crisp novelty.'
  },
  kraken: {
    id: 'kraken',
    name: 'Kraken Tentacle',
    tier: 'Boss',
    category: 'Boss',
    emoji: '🐙',
    mass: 20.0,
    basePrice: 250,
    colorHex: '#a855f7',
    reelDifficulty: 'Boss',
    behavior: 'Grapples ship gunwales (+25kg tilt pull). Needs 3+ player conga line to hoist severed tentacle!',
    uniqueEffect: 'Boss Grapple & 300 DMG Calamari: Slicing on board deals 300 Boss HP.',
    processingPipeline: 'Cutting Board ($300 Boss DMG + $550 Calamari)',
    description: 'A massive pulsating tentacle from the Abyssal deep. Slices into weaponized Calamari!'
  }
};
