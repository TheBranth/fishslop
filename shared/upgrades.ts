// Dredged Crates Upgrade Catalog for Friendslop Fishing Co.

import { StationType } from './types';

export type UpgradeCategory = 'station' | 'perk' | 'tool' | 'utility';

export interface DredgedCrate {
  id: string;
  name: string;
  emoji: string;
  category: UpgradeCategory;
  cost: number;
  description: string;
  stationType?: StationType;
  perkEffect?: string;
}

export const DREDGED_CRATES_POOL: DredgedCrate[] = [
  // Physical Kitchen Stations
  {
    id: 'crate_fillet_board',
    name: 'Fillet Cutting Board',
    emoji: '🔪',
    category: 'station',
    cost: 150,
    description: '3-Chop Slicing minigame. Turns whole fish into 2.2x value Sashimi Fillets.',
    stationType: 'cutting_board'
  },
  {
    id: 'crate_deep_fryer',
    name: 'Deep Fryer Station',
    emoji: '🍳',
    category: 'station',
    cost: 250,
    description: 'Heat Sweet-Spot minigame. Sizzles fish and boots into 2.5x Crispy dishes.',
    stationType: 'deep_fryer'
  },
  {
    id: 'crate_soup_kettle',
    name: 'Broth Soup Kettle',
    emoji: '🍲',
    category: 'station',
    cost: 350,
    description: 'Stirring Swirl minigame. Boils hard-shell turtles into 3.0x Seafood Chowder.',
    stationType: 'soup_pot'
  },

  // Passive Deck Equipment & Player Perks
  {
    id: 'crate_industrial_squeegee',
    name: 'Industrial Squeegee',
    emoji: '🪣',
    category: 'perk',
    cost: 120,
    description: 'Automatically dissolves slippery eel slime and tuna grease within 160px.',
    perkEffect: 'auto_squeegee'
  },
  {
    id: 'crate_magnetic_boots',
    name: 'Magnetic Deck Boots',
    emoji: '🧲',
    category: 'perk',
    cost: 180,
    description: 'Crew members gain high traction and cannot be slipped by oil or eel grease.',
    perkEffect: 'anti_slip'
  },
  {
    id: 'crate_hull_ballast',
    name: 'Heavy Hull Ballast',
    emoji: '🚢',
    category: 'perk',
    cost: 200,
    description: 'Stabilizes the vessel, reducing maximum boat tilt angles by 40%.',
    perkEffect: 'ballast_tilt_reduction'
  },
  {
    id: 'crate_turbo_reel',
    name: 'Turbo-Crank Reel',
    emoji: '⚡',
    category: 'perk',
    cost: 160,
    description: 'Expands the green catcher bar sweet-spot by 50% for all crew rods.',
    perkEffect: 'wide_sweet_spot'
  },
  {
    id: 'crate_cryo_cooler',
    name: 'Cryo Flash Freezer',
    emoji: '🧊',
    category: 'perk',
    cost: 220,
    description: 'Doubles the payout of the next 5 fish deposited into the Cooler Box.',
    perkEffect: 'cooler_bonus'
  },
  {
    id: 'crate_harpoon_winch',
    name: 'Rocket Harpoon Winch',
    emoji: '🚀',
    category: 'perk',
    cost: 300,
    description: 'Spawns an automatic line that periodically yanks heavy offshore catches onto deck.',
    perkEffect: 'auto_harpoon'
  },
  {
    id: 'crate_reinforce_planks',
    name: 'Reinforced Oak Gunwales',
    emoji: '🪵',
    category: 'perk',
    cost: 140,
    description: 'Adds raised deck lip barriers that prevent fish from washing overboard unless capsizing.',
    perkEffect: 'high_rails'
  }
];

// Default $0 Fallback when team is broke or chooses to bank funds
export const SKIP_DRAFT_CRATE: DredgedCrate = {
  id: 'crate_skip_save',
  name: 'Save Team Funds ($0)',
  emoji: '💰',
  category: 'utility',
  cost: 0,
  description: 'Skip this draft and bank all funds for subsequent high-tier levels.',
  perkEffect: 'save_funds'
};

/**
 * Returns 3 randomized unpurchased Dredged Crates for the post-round draft
 */
export function generateDredgedDraft(unlockedStationIds: Set<string>, activePerkIds: Set<string>): DredgedCrate[] {
  const available = DREDGED_CRATES_POOL.filter(c => {
    if (c.stationType && unlockedStationIds.has(c.stationType)) return false;
    if (c.perkEffect && activePerkIds.has(c.perkEffect)) return false;
    return true;
  });

  // Shuffle available pool
  const shuffled = [...available].sort(() => Math.random() - 0.5);
  const picked = shuffled.slice(0, 3);

  // If fewer than 3 available, fill with skip or top tier
  while (picked.length < 3) {
    picked.push(SKIP_DRAFT_CRATE);
  }

  return picked;
}
