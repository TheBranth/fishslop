// Gated Secret Sabotage & Glory Grab Bounties for Friendslop Fishing Co.

import { SecretBounty, BountyType, StationType } from './types';

export interface GatedBountyDefinition {
  id: string;
  title: string;
  stationPrerequisite?: StationType | 'base';
  perkPrerequisite?: string;
  description: string;
  plausibleExcuse: string;
  type: BountyType;
  targetCount: number;
  baseRewardPoints: number;
}

export const GATED_BOUNTIES_POOL: GatedBountyDefinition[] = [
  // --- BASE DECK (ALWAYS ACTIVE) ---
  {
    id: 'bounty_buzz_beater',
    title: 'The Buzz Beater',
    stationPrerequisite: 'base',
    description: 'Bank the final catch into the Delivery Cooler in the last 5 seconds of the shift.',
    plausibleExcuse: 'Just clutching it out for the team!',
    type: 'credit_thief',
    targetCount: 1,
    baseRewardPoints: 150
  },
  {
    id: 'bounty_trash_magnate',
    title: 'Trash Magnate',
    stationPrerequisite: 'base',
    description: 'Throw 2 old Rubber Boots directly down the Overboard Trash Chute.',
    plausibleExcuse: 'Just keeping the deck clean and sanitary!',
    type: 'drop_overboard',
    targetCount: 2,
    baseRewardPoints: 140
  },
  {
    id: 'bounty_slip_hazard',
    title: 'Slip Hazard',
    stationPrerequisite: 'base',
    description: 'Let a Butter Tuna slide all the way from Port to Starboard to grease the floor.',
    plausibleExcuse: 'The boat tilted so fast I lost my grip!',
    type: 'slip_crew',
    targetCount: 1,
    baseRewardPoints: 160
  },
  {
    id: 'bounty_muddy_catch',
    title: 'Muddy Catch',
    stationPrerequisite: 'base',
    description: 'Bank 1 soiled, unwashed fish into the Delivery Cooler unnoticed.',
    plausibleExcuse: 'I thought the rain rinsed it off!',
    type: 'steal_fish',
    targetCount: 1,
    baseRewardPoints: 150
  },
  {
    id: 'bounty_deck_bowling',
    title: 'Deck Bowling',
    stationPrerequisite: 'base',
    description: 'Slap a crewmate across a grease puddle to slide them across the ship.',
    plausibleExcuse: 'I was trying to catch a flying fish and bumped them!',
    type: 'slap_player',
    targetCount: 2,
    baseRewardPoints: 160
  },

  // --- 🔪 FILLET CUTTING BOARD ---
  {
    id: 'bounty_michelin_slices',
    title: 'Michelin Slices',
    stationPrerequisite: 'cutting_board',
    description: 'Perform 2 Perfect 3-Chop Slices on the cutting board to create Luxury Fillets.',
    plausibleExcuse: 'Culinary perfection in action.',
    type: 'credit_thief',
    targetCount: 2,
    baseRewardPoints: 180
  },
  {
    id: 'bounty_dull_blades',
    title: 'Dull Blades',
    stationPrerequisite: 'cutting_board',
    description: 'Try to slice a Hard-Shell Turtle on the cutting board to trigger a 5s broken knife lockout.',
    plausibleExcuse: 'I thought it was a flat flounder in the dim light!',
    type: 'break_knife',
    targetCount: 1,
    baseRewardPoints: 160
  },
  {
    id: 'bounty_mangled_meat',
    title: 'Mangled Meat',
    stationPrerequisite: 'cutting_board',
    description: 'Deliver 2 Mangled Fillets (1.2x value) by missing the chop rhythm markers.',
    plausibleExcuse: 'The rolling waves threw off my timing!',
    type: 'burn_dish',
    targetCount: 2,
    baseRewardPoints: 140
  },

  // --- 🍳 DEEP FRYER ---
  {
    id: 'bounty_golden_chef',
    title: 'Golden Chef',
    stationPrerequisite: 'deep_fryer',
    description: 'Deliver 2 Golden-Zone fried dishes by pulling the basket at 0.55-0.85 heat.',
    plausibleExcuse: 'Crispy perfection every time.',
    type: 'credit_thief',
    targetCount: 2,
    baseRewardPoints: 180
  },
  {
    id: 'bounty_deep_fried_leather',
    title: 'Deep Fried Leather',
    stationPrerequisite: 'deep_fryer',
    description: 'Deep-fry an old Rubber Boot into Crispy Leather ($35) and bank it.',
    plausibleExcuse: 'Uncle Gary said old leather boots are a nautical delicacy!',
    type: 'cook_boot',
    targetCount: 1,
    baseRewardPoints: 150
  },
  {
    id: 'bounty_burnt_to_crisp',
    title: 'Burnt to a Crisp',
    stationPrerequisite: 'deep_fryer',
    description: 'Overcook and burn a dish to black soot in the Deep Fryer.',
    plausibleExcuse: 'The oil temperature spiked way too fast!',
    type: 'burn_dish',
    targetCount: 1,
    baseRewardPoints: 140
  },
  {
    id: 'bounty_flashbang_cook',
    title: 'Flashbang Cook',
    stationPrerequisite: 'deep_fryer',
    description: 'Drop a live Volcanic Bombfish into boiling oil to trigger a flash explosion.',
    plausibleExcuse: 'It looked identical to a giant pufferfish!',
    type: 'hold_bombfish',
    targetCount: 1,
    baseRewardPoints: 200
  },

  // --- 🍲 BROTH SOUP KETTLE ---
  {
    id: 'bounty_chowder_master',
    title: 'Chowder Master',
    stationPrerequisite: 'soup_pot',
    description: 'Brew 2 perfect bowls of Seafood Chowder by completing steady clockwise swirls.',
    plausibleExcuse: 'Smooth and creamy broth.',
    type: 'credit_thief',
    targetCount: 2,
    baseRewardPoints: 190
  },
  {
    id: 'bounty_boil_over',
    title: 'Boil Over',
    stationPrerequisite: 'soup_pot',
    description: 'Stir too fast (>200% speed) to splash boiling broth on yourself and create a puddle.',
    plausibleExcuse: 'I was trying to brew it extra fast for quota!',
    type: 'slip_crew',
    targetCount: 1,
    baseRewardPoints: 150
  },
  {
    id: 'bounty_un_mixer',
    title: 'Un-Mixer',
    stationPrerequisite: 'soup_pot',
    description: 'Stir backward (counter-clockwise) to un-mix the soup and reset the brew timer.',
    plausibleExcuse: 'My finger slipped on the touch circle!',
    type: 'burn_dish',
    targetCount: 1,
    baseRewardPoints: 160
  },

  // --- 🪣 INDUSTRIAL SQUEEGEE ---
  {
    id: 'bounty_smudged_glass',
    title: 'Smudged Glass',
    perkPrerequisite: 'auto_squeegee',
    description: 'Keep the shared screen ink-blinded for >= 4 seconds before clearing it.',
    plausibleExcuse: 'I couldn\'t find where the mop was stored!',
    type: 'slip_crew',
    targetCount: 1,
    baseRewardPoints: 170
  },
  {
    id: 'bounty_window_washer',
    title: 'Window Washer',
    perkPrerequisite: 'auto_squeegee',
    description: 'Clean 3 ink splatters off the glass within 1.5 seconds each.',
    plausibleExcuse: 'Crystal clear visibility restored.',
    type: 'credit_thief',
    targetCount: 3,
    baseRewardPoints: 160
  },

  // --- 🚀 ROCKET HARPOON WINCH ---
  {
    id: 'bounty_big_game_sniper',
    title: 'Big Game Sniper',
    perkPrerequisite: 'auto_harpoon',
    description: 'Harpoon and land 2 heavy sea beasts (>4.0kg) onto deck.',
    plausibleExcuse: 'Direct hit on offshore mega-fauna.',
    type: 'credit_thief',
    targetCount: 2,
    baseRewardPoints: 210
  },
  {
    id: 'bounty_friendly_fire',
    title: 'Friendly Fire',
    perkPrerequisite: 'auto_harpoon',
    description: 'Harpoon a crewmate across the deck and knock them down for 2s.',
    plausibleExcuse: 'You walked right into my trajectory arc!',
    type: 'slap_player',
    targetCount: 1,
    baseRewardPoints: 180
  }
];

/**
 * Generates an eligible Secret Bounty gated strictly to current deck stations/perks
 */
export function generateGatedSecretBounty(
  playerIndex: number, 
  levelTier: number = 1, 
  unlockedStations: Set<StationType> = new Set(['cooler', 'trash_chute']), 
  activePerks: Set<string> = new Set()
): SecretBounty {
  const eligible = GATED_BOUNTIES_POOL.filter(b => {
    if (b.stationPrerequisite && b.stationPrerequisite !== 'base') {
      if (!unlockedStations.has(b.stationPrerequisite)) return false;
    }
    if (b.perkPrerequisite) {
      if (!activePerks.has(b.perkPrerequisite)) return false;
    }
    return true;
  });

  const pool = eligible.length > 0 ? eligible : GATED_BOUNTIES_POOL.filter(b => b.stationPrerequisite === 'base');
  const chosen = pool[Math.floor(Math.random() * pool.length)];

  return {
    id: `bounty_${Date.now()}_${playerIndex}_${Math.random().toString(36).substring(2, 5)}`,
    title: chosen.title,
    description: chosen.description,
    type: chosen.type,
    targetCount: chosen.targetCount,
    currentCount: 0,
    baseRewardPoints: chosen.baseRewardPoints,
    isCompleted: false,
    assignedLevelTier: levelTier,
    assignedPlayerIndex: playerIndex
  };
}
