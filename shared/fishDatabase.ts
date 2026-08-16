// Fishopedia & Species Characteristics Registry

import { FishSpeciesId, FishTier } from './types';

export interface FishDefinition {
  id: FishSpeciesId;
  name: string;
  tier: FishTier;
  emoji: string;
  mass: number;
  basePrice: number;
  colorHex: string;
  behavior: string;
  minigame: string;
  processingPipeline: string;
  description: string;
}

export const FISH_REGISTRY: Record<FishSpeciesId, FishDefinition> = {
  guppy: {
    id: 'guppy',
    name: 'Pixel Guppy',
    tier: 'T1',
    emoji: '🐟',
    mass: 1.0,
    basePrice: 15,
    colorHex: '#38bdf8',
    behavior: 'Standard flopper. Harmless deck flailer.',
    minigame: 'Green Zone Precision Catch',
    processingPipeline: 'Direct Sale ($15) ➔ Fillet Board ($35)',
    description: 'The humble workhorse of freshwater ponds. Easy to fillet, light on deck.'
  },
  boot: {
    id: 'boot',
    name: 'Old Rubber Boot',
    tier: 'T1',
    emoji: '🥾',
    mass: 3.5,
    basePrice: 5,
    colorHex: '#78350f',
    behavior: 'Heavy deadweight block. Trips sprinting crewmates.',
    minigame: 'Instant Reel / Trash Catch',
    processingPipeline: 'Trash Chute ($0) ➔ Deep Fryer ($10 Cursed Sole)',
    description: 'Someone lost their shoe in 1984. It is heavy, damp, and smells like motor oil.'
  },
  turtle: {
    id: 'turtle',
    name: 'Grumpy Turtle',
    tier: 'T1',
    emoji: '🐢',
    mass: 4.0,
    basePrice: 40,
    colorHex: '#16a34a',
    behavior: 'Snaps at nearby ankles. Bites knock players down.',
    minigame: 'Dual-Anchor Button Mashing',
    processingPipeline: 'Soup Pot ($95 Turtle Broth)',
    description: 'Extremely offended to be on your boat. Will headbutt shins until boiled.'
  },
  tuna: {
    id: 'tuna',
    name: 'Butter Tuna',
    tier: 'T2',
    emoji: '🧈',
    mass: 3.0,
    basePrice: 85,
    colorHex: '#f59e0b',
    behavior: 'Leaves slick yellow grease trails when sliding across wood planks.',
    minigame: 'Directional Thrash Struggle',
    processingPipeline: 'Fillet Board ($180) ➔ Sushi Rice Station ($320)',
    description: '100% pure omega grease. Makes the whole deck feel like an ice skating rink.'
  },
  eel: {
    id: 'eel',
    name: 'Slime Eel',
    tier: 'T2',
    emoji: '🐍',
    mass: 2.2,
    basePrice: 120,
    colorHex: '#10b981',
    behavior: 'Writhing and squirming. Slips out of player hands every 2.5 seconds.',
    minigame: 'Rhythm / Calming Stroking',
    processingPipeline: 'Deep Fryer ($260 Crispy Eel Roll)',
    description: 'Cannot be held for long. Requires passing between players or quick fryer drops.'
  },
  ray: {
    id: 'ray',
    name: 'Electric Ray',
    tier: 'T3',
    emoji: '⚡',
    mass: 4.5,
    basePrice: 280,
    colorHex: '#eab308',
    behavior: 'Periodically shocks wet deck tiles, paralyzing all standing players for 2s.',
    minigame: 'Precision Timing Disarm',
    processingPipeline: 'Cutting Board ($450 Conductive Filet)',
    description: 'Dangerously high voltage. Must be kept off wet patches or handled rapidly.'
  },
  bombfish: {
    id: 'bombfish',
    name: 'Volcanic Bombfish',
    tier: 'T4',
    emoji: '💣',
    mass: 5.0,
    basePrice: 500,
    colorHex: '#f43f5e',
    behavior: 'Ticks down a 5-second explosion timer. Blasts all crewmates and crates into the water.',
    minigame: 'High-Tension Rapid Reel',
    processingPipeline: 'Throw into Deep Fryer before 0:00 ($900) or Throw Overboard ($0)',
    description: 'Living incendiary ordinance from deep magma trenches. Handle with extreme haste!'
  },
  kraken: {
    id: 'kraken',
    name: 'Eldritch Kraken',
    tier: 'T4',
    emoji: '🐙',
    mass: 20.0,
    basePrice: 2500,
    colorHex: '#a855f7',
    behavior: 'Multi-stage Boss. Tentacles smash deck, steals coolers, tilts boat 30 degrees.',
    minigame: 'Synchronized Quad-Hook QTE',
    processingPipeline: 'Tentacle Chop ➔ Eye Fry ➔ Brain Core Steam ➔ Delivery Cannon ($5000)',
    description: 'The legendary Gorgonzola of the Abyss. Requires 4-player team coordination to slay.'
  }
};
