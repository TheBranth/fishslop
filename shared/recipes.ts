// Composable Multi-Modifier Culinary Pipeline & Slapstick Hazard Engine

import { StationType, EntityItem, ItemModifier, ItemType } from './types';

export const MODIFIER_MULTIPLIERS: Record<ItemModifier, number> = {
  raw: 1.0,
  sliced: 1.6,       // Fillet Cutting Board (+60%)
  fried: 1.8,        // Deep Fryer (+80%)
  boiled: 2.0,       // Soup Kettle (+100%)
  rolled: 2.2,       // Sushi Rolling Mat (+120%)
  soiled: 0.5,       // Dropped in slime/water (-50%)
  electrified: 1.0,  // Charged
  burned: 0.2        // Burned to crisp (-80%)
};

export interface ProcessedItemOutcome {
  name: string;
  emoji: string;
  itemType: ItemType;
  value: number;
  modifiers: ItemModifier[];
}

/**
 * Calculates dynamic dish name, emoji, itemType and compounding value based on species and active modifiers
 */
export function computeProcessedItemOutcome(
  speciesId: string,
  basePrice: number,
  currentModifiers: ItemModifier[],
  newModifier: ItemModifier
): ProcessedItemOutcome {
  // Merge and deduplicate modifiers
  const modSet = new Set<ItemModifier>(currentModifiers);
  modSet.delete('raw');
  modSet.add(newModifier);
  const updatedModifiers = Array.from(modSet);

  // Compute compounding value multiplier
  let totalMultiplier = 1.0;
  updatedModifiers.forEach(mod => {
    totalMultiplier *= (MODIFIER_MULTIPLIERS[mod] || 1.0);
  });

  const hasSliced = modSet.has('sliced');
  const hasFried = modSet.has('fried');
  const hasBoiled = modSet.has('boiled');
  const hasRolled = modSet.has('rolled');

  let name = `Cooked Catch`;
  let emoji = '🍱';
  let itemType: ItemType = 'cooked_food';

  const speciesBaseName = speciesId.charAt(0).toUpperCase() + speciesId.slice(1);

  // 👞 Special Boot Recipe
  if (speciesId === 'boot') {
    if (hasFried) {
      name = 'Crispy Deep-Fried Leather';
      emoji = '👞';
      itemType = 'fried_dish';
      return { name, emoji, itemType, value: 40, modifiers: updatedModifiers };
    }
  }

  // 🦑 Kraken Calamari Strike
  if (speciesId === 'kraken') {
    name = hasFried ? 'Golden Kraken Calamari Platter' : 'Kraken Calamari Strike';
    emoji = '🦑';
    itemType = 'fillet';
    return { name, emoji, itemType, value: Math.round(basePrice * totalMultiplier), modifiers: updatedModifiers };
  }

  // 3-Step Masterpiece (Sliced + Fried + Rolled)
  if (hasSliced && hasFried && hasRolled) {
    name = `Crispy ${speciesBaseName} Tempura Dragon Roll`;
    emoji = '🍱';
    itemType = 'cooked_food';
  }
  // 2-Step Combinations
  else if (hasSliced && hasFried) {
    name = `Golden ${speciesBaseName} Fish & Chips`;
    emoji = '🍟';
    itemType = 'fried_dish';
  }
  else if (hasSliced && hasRolled) {
    name = `${speciesBaseName} Nigiri Sushi`;
    emoji = '🍣';
    itemType = 'fillet';
  }
  else if (hasSliced && hasBoiled) {
    name = `Gourmet ${speciesBaseName} Bouillabaisse`;
    emoji = '🍲';
    itemType = 'soup';
  }
  else if (hasFried && hasRolled) {
    name = `Crunchy ${speciesBaseName} Katsu Roll`;
    emoji = '🍱';
    itemType = 'cooked_food';
  }
  // 1-Step Direct Processing (Self-Sufficient Single Station!)
  else if (hasSliced) {
    name = `Fresh ${speciesBaseName} Fillet`;
    emoji = '🍢';
    itemType = 'fillet';
  }
  else if (hasFried) {
    name = `Whole Crispy ${speciesBaseName}`;
    emoji = '🐟';
    itemType = 'fried_dish';
  }
  else if (hasBoiled) {
    name = `Fisherman's ${speciesBaseName} Chowder`;
    emoji = '🍲';
    itemType = 'soup';
  }
  else if (hasRolled) {
    name = `Whole ${speciesBaseName} Temaki`;
    emoji = '🍙';
    itemType = 'cooked_food';
  }

  const finalValue = Math.round(basePrice * totalMultiplier);

  return {
    name,
    emoji,
    itemType,
    value: finalValue,
    modifiers: updatedModifiers
  };
}

export interface MismatchPenalty {
  isMismatch: boolean;
  reason?: string;
  penaltyType?: 'broken_knife' | 'oil_shockwave' | 'electrified_basin' | 'flash_explosion' | 'slime_boilover' | 'wobbly_cleaver';
  penaltyDurationSeconds?: number;
  appliedModifier?: ItemModifier;
  outcome?: ProcessedItemOutcome;
}

/**
 * Validates station interaction, checks for hazardous slapstick mishaps, or returns the new modifier outcome
 */
export function validateStationInteraction(stationType: StationType, item: EntityItem): MismatchPenalty {
  const currentMods = item.modifiers || ['raw'];
  const basePrice = item.basePrice || item.value || 30;
  const speciesId = item.baseSpeciesId || item.speciesId || 'guppy';

  // --- 1. SLAPSTICK HAZARDS & MISMATCH DISASTERS ---

  // 🐢 A. Turtle shell snaps cutting board knife!
  if (stationType === 'cutting_board' && speciesId === 'turtle') {
    return {
      isMismatch: true,
      reason: '🔪 CRACK! Hard turtle shell snapped the cleaver! (Knife broken for 5s)',
      penaltyType: 'broken_knife',
      penaltyDurationSeconds: 5.0
    };
  }

  // ⚡ B. Electric Ray in Deep Fryer -> 100,000V Oil Shockwave!
  if (stationType === 'deep_fryer' && speciesId === 'ray') {
    return {
      isMismatch: true,
      reason: '⚡ ZAP! Boiling oil conducted 100,000V! Electric shockwave blasted the galley!',
      penaltyType: 'oil_shockwave',
      penaltyDurationSeconds: 2.0
    };
  }

  // ⚡ C. Electric Ray in Rinse Basin -> Electrified Water Basin!
  if (stationType === 'rinse_station' && speciesId === 'ray') {
    return {
      isMismatch: true,
      reason: '⚡ SHOCK! Ray charged the rinse water! Basin is electrified and unusable for 5s!',
      penaltyType: 'electrified_basin',
      penaltyDurationSeconds: 5.0
    };
  }

  // 💣 D. Bombfish in hot fryer or soup pot -> Flash Detonation!
  if ((stationType === 'deep_fryer' || stationType === 'soup_pot') && speciesId === 'bombfish') {
    return {
      isMismatch: true,
      reason: '💥 BOOM! Tossing a live bombfish into boiling liquid triggered an explosion!',
      penaltyType: 'flash_explosion',
      penaltyDurationSeconds: 3.0
    };
  }

  // 🧪 E. Slime Eel in Soup Kettle -> Toxic Slime Boil-Over!
  if (stationType === 'soup_pot' && speciesId === 'eel') {
    return {
      isMismatch: true,
      reason: '🧪 BLECH! Slime Eel caused a massive toxic boil-over! Slippery slime flooded the deck!',
      penaltyType: 'slime_boilover',
      penaltyDurationSeconds: 4.0
    };
  }

  // --- 2. VALID STATION PROCESSING & MODIFIER MAPPING ---

  let targetModifier: ItemModifier | null = null;
  if (stationType === 'cutting_board') targetModifier = 'sliced';
  else if (stationType === 'deep_fryer') targetModifier = 'fried';
  else if (stationType === 'soup_pot') targetModifier = 'boiled';
  else if (stationType === 'sushi_station') targetModifier = 'rolled';

  if (!targetModifier) {
    return { isMismatch: true, reason: '⚠️ Cannot process at this station.' };
  }

  // Already has this modifier? (e.g. already sliced, can't slice twice)
  if (currentMods.includes(targetModifier)) {
    return {
      isMismatch: true,
      reason: `⚠️ This dish has already been ${targetModifier}! Take it to another station or the Cooler.`
    };
  }

  const outcome = computeProcessedItemOutcome(speciesId, basePrice, currentMods, targetModifier);

  return {
    isMismatch: false,
    appliedModifier: targetModifier,
    outcome
  };
}
