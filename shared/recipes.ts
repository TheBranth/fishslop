// WorkStation Recipes & Slapstick Mismatch Penalty Engine

import { StationType, EntityItem, ItemType } from './types';

export interface StationRecipe {
  stationType: StationType;
  inputSpeciesId?: string;
  outputName: string;
  outputEmoji: string;
  outputItemType: ItemType;
  valueMultiplier: number;
  processTimeSeconds: number;
  dealBossDamage?: number;
}

export interface MismatchPenalty {
  isMismatch: boolean;
  reason?: string;
  penaltyType?: 'broken_tool' | 'flash_explosion' | 'grease_spill';
  penaltyDurationSeconds?: number;
  recipe?: StationRecipe;
}

export const STATION_RECIPES: StationRecipe[] = [
  // 1. Fillet Cutting Board Recipes (2.2x Multiplier)
  {
    stationType: 'cutting_board',
    inputSpeciesId: 'guppy',
    outputName: 'Guppy Sashimi Fillet',
    outputEmoji: '🍣',
    outputItemType: 'fillet',
    valueMultiplier: 2.2,
    processTimeSeconds: 2.0
  },
  {
    stationType: 'cutting_board',
    inputSpeciesId: 'tuna',
    outputName: 'Prime Butter Tuna Sashimi',
    outputEmoji: '🍣',
    outputItemType: 'fillet',
    valueMultiplier: 2.2,
    processTimeSeconds: 2.5
  },
  {
    stationType: 'cutting_board',
    inputSpeciesId: 'eel',
    outputName: 'Sliced Eel Unagi',
    outputEmoji: '🍣',
    outputItemType: 'fillet',
    valueMultiplier: 2.2,
    processTimeSeconds: 2.0
  },
  {
    stationType: 'cutting_board',
    inputSpeciesId: 'ray',
    outputName: 'Electric Ray Slices',
    outputEmoji: '🍣',
    outputItemType: 'fillet',
    valueMultiplier: 2.2,
    processTimeSeconds: 2.5
  },
  {
    stationType: 'cutting_board',
    inputSpeciesId: 'kraken',
    outputName: 'Kraken Calamari Strike',
    outputEmoji: '🦑',
    outputItemType: 'fillet',
    valueMultiplier: 2.5,
    processTimeSeconds: 3.0,
    dealBossDamage: 250 // Deals direct damage to Kraken Boss!
  },

  // 2. Deep Fryer Recipes (2.5x Multiplier)
  {
    stationType: 'deep_fryer',
    inputSpeciesId: 'guppy',
    outputName: 'Crispy Fried Fish & Chips',
    outputEmoji: '🍟',
    outputItemType: 'fried_dish',
    valueMultiplier: 2.5,
    processTimeSeconds: 3.0
  },
  {
    stationType: 'deep_fryer',
    inputSpeciesId: 'eel',
    outputName: 'Crispy Tempura Eel',
    outputEmoji: '🍤',
    outputItemType: 'fried_dish',
    valueMultiplier: 2.5,
    processTimeSeconds: 3.0
  },
  {
    stationType: 'deep_fryer',
    inputSpeciesId: 'tuna',
    outputName: 'Crispy Seared Tuna Steak',
    outputEmoji: '🥩',
    outputItemType: 'fried_dish',
    valueMultiplier: 2.5,
    processTimeSeconds: 3.0
  },
  {
    stationType: 'deep_fryer',
    inputSpeciesId: 'boot',
    outputName: 'Crispy Deep-Fried Leather',
    outputEmoji: '🥾',
    outputItemType: 'fried_dish',
    valueMultiplier: 7.0, // $5 -> $35 surprise value!
    processTimeSeconds: 3.0
  },

  // 3. Soup Kettle Recipes (3.0x Multiplier)
  {
    stationType: 'soup_pot',
    inputSpeciesId: 'turtle',
    outputName: 'Rich Turtle Chowder',
    outputEmoji: '🍲',
    outputItemType: 'soup',
    valueMultiplier: 3.0,
    processTimeSeconds: 3.0
  },
  {
    stationType: 'soup_pot',
    inputSpeciesId: 'guppy',
    outputName: 'Sweetwater Fish Stew',
    outputEmoji: '🍲',
    outputItemType: 'soup',
    valueMultiplier: 3.0,
    processTimeSeconds: 3.0
  },
  {
    stationType: 'soup_pot',
    inputSpeciesId: 'ray',
    outputName: 'Electric Seafood Gumbo',
    outputEmoji: '🍲',
    outputItemType: 'soup',
    valueMultiplier: 3.0,
    processTimeSeconds: 3.0
  }
];

/**
 * Validates whether an item can be cooked at a station, or triggers a slapstick mismatch penalty
 */
export function validateStationInteraction(stationType: StationType, item: EntityItem): MismatchPenalty {
  // 1. Mismatch Penalty: Hard-shell turtle on cutting board breaks the knife!
  if (stationType === 'cutting_board' && item.speciesId === 'turtle') {
    return {
      isMismatch: true,
      reason: '🔪 CRACK! Hard turtle shell broke the cleaver! Resharpening knife for 5s...',
      penaltyType: 'broken_tool',
      penaltyDurationSeconds: 5.0
    };
  }

  // 2. Mismatch Penalty: Volcanic Bombfish in hot fryer or soup pot triggers flash explosion!
  if ((stationType === 'deep_fryer' || stationType === 'soup_pot') && item.speciesId === 'bombfish') {
    return {
      isMismatch: true,
      reason: '💥 BOOM! Tossing live bombfish into boiling oil triggered an explosion!',
      penaltyType: 'flash_explosion',
      penaltyDurationSeconds: 3.0
    };
  }

  // 3. Match checking against recipe catalog
  const match = STATION_RECIPES.find(r => r.stationType === stationType && (!r.inputSpeciesId || r.inputSpeciesId === item.speciesId));
  if (match) {
    return {
      isMismatch: false,
      recipe: match
    };
  }

  // Fallback generic recipe
  return {
    isMismatch: false,
    recipe: {
      stationType,
      outputName: `Cooked ${item.name}`,
      outputEmoji: '🍱',
      outputItemType: 'cooked_food',
      valueMultiplier: 2.0,
      processTimeSeconds: 2.5
    }
  };
}

export function getRecipeForStation(stationType: StationType, item: EntityItem): StationRecipe | undefined {
  const result = validateStationInteraction(stationType, item);
  return result.isMismatch ? undefined : result.recipe;
}
