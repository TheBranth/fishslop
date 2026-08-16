// Master Corporate Contracts Registry & Generator Engine for Friendslop Fishing Co.

import { StationType } from './types';

export interface ContractDefinition {
  id: string;
  name: string;
  stationPrerequisite?: StationType | 'base';
  perkPrerequisite?: string;
  description: string;
  targetUnit: 'kg' | 'fish' | 'boots' | 'fillets' | 'fried' | 'soups' | 'rolls' | 'heavy_beasts' | 'frozen';
  levelTargets: {
    1: number;
    2: number;
    3: number;
    4: number;
  };
  baseRewardPoints: number;
  instantPenaltyRule: string;
  penaltyType: 'none' | 'soiled_dock' | 'wrong_species_dock' | 'boot_cash_penalty' | 'knife_break_fail';
}

export const MASTER_CONTRACTS_REGISTRY: ContractDefinition[] = [
  // --- BASE DECK CONTRACTS ($0 Default, Always Eligible in L1-L4) ---
  {
    id: 'contract_fresh_batch',
    name: 'The Fresh Batch',
    stationPrerequisite: 'base',
    description: 'Deliver clean fish into the Cooler. Soiled fish must be rinsed in the bucket first.',
    targetUnit: 'kg',
    levelTargets: { 1: 25, 2: 35, 3: 45, 4: 55 },
    baseRewardPoints: 150,
    instantPenaltyRule: 'Soiled fish deposited → 0 kg credit added.',
    penaltyType: 'soiled_dock'
  },
  {
    id: 'contract_sanitary_specimen',
    name: 'Sanitary Specimen Run',
    stationPrerequisite: 'base',
    description: 'Deliver clean fish. Deck must be kept hygienic.',
    targetUnit: 'fish',
    levelTargets: { 1: 6, 2: 8, 3: 10, 4: 12 },
    baseRewardPoints: 160,
    instantPenaltyRule: 'Depositing any soiled fish instantly docks contract progress by -2.',
    penaltyType: 'soiled_dock'
  },
  {
    id: 'contract_selective_sorting',
    name: 'Selective Sorting',
    stationPrerequisite: 'base',
    description: 'Deliver Scaled Fish (Guppies, Tuna, Rays) into the Delivery Cooler.',
    targetUnit: 'fish',
    levelTargets: { 1: 6, 2: 8, 3: 10, 4: 12 },
    baseRewardPoints: 150,
    instantPenaltyRule: 'Depositing a Boot, Turtle, or Bombfish docks contract counter by -1.',
    penaltyType: 'wrong_species_dock'
  },
  {
    id: 'contract_harbor_cleanup',
    name: 'Harbor Cleanup',
    stationPrerequisite: 'base',
    description: 'Fish out and discard Rubber Boots directly into the Overboard Trash Chute.',
    targetUnit: 'boots',
    levelTargets: { 1: 3, 2: 4, 3: 5, 4: 6 },
    baseRewardPoints: 140,
    instantPenaltyRule: 'Depositing a boot into the Delivery Cooler docks team cash by -$25.',
    penaltyType: 'boot_cash_penalty'
  },

  // --- 🔪 FILLET BOARD CONTRACTS ($150 Upgrade) ---
  {
    id: 'contract_sashimi_express',
    name: 'Sashimi Express',
    stationPrerequisite: 'cutting_board',
    description: 'Deliver Raw Fillets prepared at the cutting board (2.2x value).',
    targetUnit: 'fillets',
    levelTargets: { 1: 0, 2: 6, 3: 8, 4: 11 },
    baseRewardPoints: 180,
    instantPenaltyRule: 'Slicing a Snapping Turtle → 5s Broken Knife penalty.',
    penaltyType: 'knife_break_fail'
  },
  {
    id: 'contract_surgical_slices',
    name: 'Surgical Slices',
    stationPrerequisite: 'cutting_board',
    description: 'Deliver Fillets with zero knife-break mismatches during the shift.',
    targetUnit: 'fillets',
    levelTargets: { 1: 0, 2: 5, 3: 7, 4: 9 },
    baseRewardPoints: 200,
    instantPenaltyRule: 'Any station lockout / broken knife fails the contract bonus instantly.',
    penaltyType: 'knife_break_fail'
  },

  // --- 🍳 DEEP FRYER CONTRACTS ($250 Upgrade) ---
  {
    id: 'contract_crispy_platter',
    name: 'Crispy Platter Rush',
    stationPrerequisite: 'deep_fryer',
    description: 'Deliver Golden Fried Fish (2.5x value) by hitting the frying sweet-spot.',
    targetUnit: 'fried',
    levelTargets: { 1: 0, 2: 5, 3: 7, 4: 10 },
    baseRewardPoints: 180,
    instantPenaltyRule: 'Dropping Bombfish into fryer → 3s flash explosion + destroys dish.',
    penaltyType: 'none'
  },
  {
    id: 'contract_gary_snack',
    name: 'Uncle Gary\'s Snack',
    stationPrerequisite: 'deep_fryer',
    description: 'Deliver Fried Dishes, including at least 1 "Crispy Leather Boot" ($35).',
    targetUnit: 'fried',
    levelTargets: { 1: 0, 2: 4, 3: 6, 4: 8 },
    baseRewardPoints: 220,
    instantPenaltyRule: 'Discarding the boot into the trash chute fails the secondary requirement.',
    penaltyType: 'none'
  },

  // --- 🍲 BROTH KETTLE CONTRACTS ($350 Upgrade) ---
  {
    id: 'contract_billionaire_chowder',
    name: 'Billionaire Chowder',
    stationPrerequisite: 'soup_pot',
    description: 'Brew and deliver Bowls of Turtle Soup (3.0x value).',
    targetUnit: 'soups',
    levelTargets: { 1: 0, 2: 3, 3: 5, 4: 7 },
    baseRewardPoints: 200,
    instantPenaltyRule: 'Raw whole fish deposited without brewing grant $0 toward contract.',
    penaltyType: 'none'
  },
  {
    id: 'contract_seafood_gumbo',
    name: 'Seafood Gumbo',
    stationPrerequisite: 'soup_pot',
    description: 'Deliver Soups made from mixed catches (Tuna + Guppy combos).',
    targetUnit: 'soups',
    levelTargets: { 1: 0, 2: 4, 3: 6, 4: 8 },
    baseRewardPoints: 190,
    instantPenaltyRule: 'Overcooking/burning pot locks station for 3s.',
    penaltyType: 'none'
  },

  // --- PERKS & UTILITY CONTRACTS ---
  {
    id: 'contract_white_glove_audit',
    name: 'White-Glove Audit',
    perkPrerequisite: 'auto_squeegee',
    description: 'Deliver target kg of fish with <= 2 grease/slime puddles on deck at 00:00.',
    targetUnit: 'kg',
    levelTargets: { 1: 0, 2: 30, 3: 40, 4: 50 },
    baseRewardPoints: 180,
    instantPenaltyRule: '>=3 active puddles remaining on deck at 00:00 voids payout.',
    penaltyType: 'none'
  },
  {
    id: 'contract_big_game_season',
    name: 'Big Game Season',
    perkPrerequisite: 'auto_harpoon',
    description: 'Haul and deliver Heavy Beasts (>4.0 kg) in the first 45 seconds.',
    targetUnit: 'heavy_beasts',
    levelTargets: { 1: 0, 2: 2, 3: 4, 4: 5 },
    baseRewardPoints: 210,
    instantPenaltyRule: 'Delivering beasts after 45s mark counts for cash, but not contract progress.',
    penaltyType: 'none'
  },
  {
    id: 'contract_flash_freeze_rush',
    name: 'Flash Freeze Rush',
    perkPrerequisite: 'cooler_bonus',
    description: 'Freeze and deliver pristine fish without touching deck grease.',
    targetUnit: 'frozen',
    levelTargets: { 1: 0, 2: 4, 3: 6, 4: 8 },
    baseRewardPoints: 190,
    instantPenaltyRule: 'Soiled fish entering the freezer freeze into unusable Dirty Ice Blocks.',
    penaltyType: 'none'
  }
];

export interface ActiveContractState {
  id: string;
  name: string;
  description: string;
  targetCount: number;
  currentCount: number;
  targetUnit: string;
  baseRewardPoints: number;
  instantPenaltyRule: string;
  isCompleted: boolean;
  isFailed: boolean;
  levelTier: number;
}

export interface ContractGeneratorParams {
  levelTier: number; // 1 to 5
  unlockedStations: Set<StationType>;
  activePerks: Set<string>;
  recentlyPurchasedStation?: StationType | string | null;
  hasChronometer?: boolean;
}

/**
 * Generates an active corporate contract applying:
 * 1. Eligibility Filter (only station/perk on deck)
 * 2. Recency Bias (3x selection weight for newly purchased station)
 * 3. Kraken Override (Level 5 returns dedicated boss objective)
 */
export function generateCorporateContract(params: ContractGeneratorParams): ActiveContractState | null {
  const { levelTier, unlockedStations, activePerks, recentlyPurchasedStation, hasChronometer } = params;

  // 3. KRAKEN OVERRIDE (Level 5)
  if (levelTier === 5) {
    return {
      id: 'contract_kraken_boss',
      name: 'DEFEAT THE ELDRITCH KRAKEN',
      description: 'Slice Calamari on cutting boards (250 DMG), throw Bombfish (400 DMG), or Slap tentacles (50 DMG) to vanquish 1200 Boss HP!',
      targetCount: 1200,
      currentCount: 0,
      targetUnit: 'Boss HP',
      baseRewardPoints: 500,
      instantPenaltyRule: 'Capsizing or running out of time results in immediate expedition loss!',
      isCompleted: false,
      isFailed: false,
      levelTier: 5
    };
  }

  // 1. ELIGIBILITY FILTER
  const eligible = MASTER_CONTRACTS_REGISTRY.filter(c => {
    // Check level targets validity
    const target = c.levelTargets[levelTier as 1 | 2 | 3 | 4];
    if (!target || target <= 0) return false;

    // Check station prerequisite
    if (c.stationPrerequisite && c.stationPrerequisite !== 'base') {
      if (!unlockedStations.has(c.stationPrerequisite)) return false;
    }

    // Check perk prerequisite
    if (c.perkPrerequisite) {
      if (!activePerks.has(c.perkPrerequisite)) return false;
    }

    return true;
  });

  if (eligible.length === 0) {
    // Fallback to starter Fresh Batch
    const fallback = MASTER_CONTRACTS_REGISTRY[0];
    const target = fallback.levelTargets[levelTier as 1 | 2 | 3 | 4] || 25;
    return {
      id: fallback.id,
      name: fallback.name,
      description: fallback.description,
      targetCount: target,
      currentCount: 0,
      targetUnit: fallback.targetUnit,
      baseRewardPoints: fallback.baseRewardPoints,
      instantPenaltyRule: fallback.instantPenaltyRule,
      isCompleted: false,
      isFailed: false,
      levelTier
    };
  }

  // 2. RECENCY BIAS (3x weight for recently purchased station/perk)
  const weightedPool: ContractDefinition[] = [];
  eligible.forEach(c => {
    let weight = 1;
    if (recentlyPurchasedStation && (c.stationPrerequisite === recentlyPurchasedStation || c.perkPrerequisite === recentlyPurchasedStation)) {
      weight = 3;
    }
    for (let i = 0; i < weight; i++) {
      weightedPool.push(c);
    }
  });

  // Pick random from weighted pool
  const chosen = weightedPool[Math.floor(Math.random() * weightedPool.length)];
  let scaledTarget = chosen.levelTargets[levelTier as 1 | 2 | 3 | 4] || 10;

  // Chronometer modifier (+25% target scaling)
  if (hasChronometer) {
    scaledTarget = Math.round(scaledTarget * 1.25);
  }

  return {
    id: chosen.id,
    name: chosen.name,
    description: chosen.description,
    targetCount: scaledTarget,
    currentCount: 0,
    targetUnit: chosen.targetUnit,
    baseRewardPoints: chosen.baseRewardPoints,
    instantPenaltyRule: chosen.instantPenaltyRule,
    isCompleted: false,
    isFailed: false,
    levelTier
  };
}
