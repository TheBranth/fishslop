// Comprehensive Test Suite for Modular Sockets, Composable Multi-Modifier Kitchen, and Slapstick Hazards

import { computeProcessedItemOutcome, validateStationInteraction, MODIFIER_MULTIPLIERS } from '../shared/recipes';
import { FIXED_STARTER_STATIONS, MODULAR_SOCKET_LAYOUTS } from '../shared/constants';
import { LocalGameEngine } from '../client/engine/LocalGameEngine';
import { EntityItem, PlayerState } from '../shared/types';

function assert(condition: boolean, message: string): void {
  if (!condition) {
    console.error(`❌ ASSERTION FAILED: ${message}`);
    throw new Error(`Assertion failed: ${message}`);
  }
  console.log(`  ✅ ${message}`);
}

console.log('🧪 ========================================================');
console.log('🧪 RUNNING COMPREHENSIVE MODULAR KITCHEN & HAZARD TEST SUITE');
console.log('🧪 ========================================================\n');

// ---------------------------------------------------------
// TEST GROUP 1: Composable Multi-Modifier Pipeline
// ---------------------------------------------------------
console.log('📦 TEST GROUP 1: Composable Multi-Modifier Pipeline & Compounding Values');

// 1.1 Single-Step Direct Processing (Self-Sufficient Single Station!)
const rawCodPrice = 35;

// Direct Slicing
const slicedCod = computeProcessedItemOutcome('cod', rawCodPrice, ['raw'], 'sliced');
assert(slicedCod.name === 'Fresh Cod Fillet', 'Direct Slicing produces Fresh Cod Fillet');
assert(slicedCod.emoji === '🍢', 'Direct Slicing emoji is 🍢');
assert(slicedCod.value === Math.round(35 * 1.6), `Sliced value is $${slicedCod.value} (Expected: $56)`);
assert(slicedCod.modifiers.includes('sliced') && !slicedCod.modifiers.includes('raw'), 'Modifiers updated from raw to sliced');

// Direct Frying (Whole Fish without slicing)
const wholeFriedCod = computeProcessedItemOutcome('cod', rawCodPrice, ['raw'], 'fried');
assert(wholeFriedCod.name === 'Whole Crispy Cod', 'Direct Frying produces Whole Crispy Cod');
assert(wholeFriedCod.value === Math.round(35 * 1.8), `Whole Fried value is $${wholeFriedCod.value} (Expected: $63)`);

// Direct Stewing
const wholeStewCod = computeProcessedItemOutcome('cod', rawCodPrice, ['raw'], 'boiled');
assert(wholeStewCod.name === "Fisherman's Cod Chowder", 'Direct Stewing produces Fisherman\'s Cod Chowder');
assert(wholeStewCod.value === Math.round(35 * 2.0), `Whole Boiled value is $${wholeStewCod.value} (Expected: $70)`);

// Direct Rolling
const wholeRollCod = computeProcessedItemOutcome('cod', rawCodPrice, ['raw'], 'rolled');
assert(wholeRollCod.name === 'Whole Cod Temaki', 'Direct Rolling produces Whole Cod Temaki');
assert(wholeRollCod.value === Math.round(35 * 2.2), `Whole Rolled value is $${wholeRollCod.value} (Expected: $77)`);

// 1.2 2-Step Chained Stations (Compounding Multipliers)
const fishAndChips = computeProcessedItemOutcome('cod', rawCodPrice, ['sliced'], 'fried');
assert(fishAndChips.name === 'Golden Cod Fish & Chips', '2-Step Sliced+Fried produces Golden Cod Fish & Chips');
assert(fishAndChips.emoji === '🍟', 'Fish & Chips emoji is 🍟');
const expectedFishChips = Math.round(35 * 1.6 * 1.8); // 35 * 2.88 = 101
assert(fishAndChips.value === expectedFishChips, `Fish & Chips value compounds to $${fishAndChips.value}`);

const codNigiri = computeProcessedItemOutcome('cod', rawCodPrice, ['sliced'], 'rolled');
assert(codNigiri.name === 'Cod Nigiri Sushi', '2-Step Sliced+Rolled produces Cod Nigiri Sushi');
const expectedNigiri = Math.round(35 * 1.6 * 2.2); // 35 * 3.52 = 123
assert(codNigiri.value === expectedNigiri, `Cod Nigiri value compounds to $${codNigiri.value}`);

const codStewGourmet = computeProcessedItemOutcome('cod', rawCodPrice, ['sliced'], 'boiled');
assert(codStewGourmet.name === 'Gourmet Cod Bouillabaisse', '2-Step Sliced+Boiled produces Gourmet Cod Bouillabaisse');

// 1.3 3-Step Masterpiece (Sliced + Fried + Rolled)
const dragonRoll = computeProcessedItemOutcome('cod', rawCodPrice, ['sliced', 'fried'], 'rolled');
assert(dragonRoll.name === 'Crispy Cod Tempura Dragon Roll', '3-Step produces Crispy Cod Tempura Dragon Roll');
const expectedDragon = Math.round(35 * 1.6 * 1.8 * 2.2); // 35 * 6.336 = 222
assert(dragonRoll.value === expectedDragon, `Dragon Roll value compounds to $${dragonRoll.value} ($35 -> $222!)`);

// 1.4 Special Species Recipes
const friedBoot = computeProcessedItemOutcome('boot', 5, ['raw'], 'fried');
assert(friedBoot.name === 'Crispy Deep-Fried Leather', 'Boot fried produces Crispy Deep-Fried Leather');
assert(friedBoot.value === 40, 'Fried Boot has fixed joke value of $40');

const krakenCalamari = computeProcessedItemOutcome('kraken', 100, ['raw'], 'sliced');
assert(krakenCalamari.name === 'Kraken Calamari Strike', 'Kraken sliced produces Kraken Calamari Strike');

console.log('✅ TEST GROUP 1 PASSED!\n');

// ---------------------------------------------------------
// TEST GROUP 2: Slapstick Hazards & Mismatch Penalties
// ---------------------------------------------------------
console.log('💥 TEST GROUP 2: Slapstick Hazards & Mismatch Penalties');

// 2.1 Turtle + Cutting Board -> Broken Knife
const turtleItem: EntityItem = {
  id: 'i1', type: 'fish', speciesId: 'turtle', baseSpeciesId: 'turtle', name: 'Snapping Turtle',
  emoji: '🐢', x: 0, y: 0, vx: 0, vy: 0, mass: 6.0, isHeld: true, heldByPlayerId: 'p1', value: 80
};
const turtleMismatch = validateStationInteraction('cutting_board', turtleItem);
assert(turtleMismatch.isMismatch === true, 'Turtle on cutting board is marked mismatch');
assert(turtleMismatch.penaltyType === 'broken_knife', 'Penalty type is broken_knife');
assert(turtleMismatch.penaltyDurationSeconds === 5.0, 'Penalty duration is 5.0s');

// 2.2 Electric Ray + Deep Fryer -> 100,000V Oil Shockwave
const rayItem: EntityItem = {
  id: 'i2', type: 'fish', speciesId: 'ray', baseSpeciesId: 'ray', name: 'Electric Ray',
  emoji: '⚡', x: 0, y: 0, vx: 0, vy: 0, mass: 3.5, isHeld: true, heldByPlayerId: 'p1', value: 50
};
const rayFryerMismatch = validateStationInteraction('deep_fryer', rayItem);
assert(rayFryerMismatch.isMismatch === true, 'Ray in fryer is marked mismatch');
assert(rayFryerMismatch.penaltyType === 'oil_shockwave', 'Penalty type is oil_shockwave');

// 2.3 Electric Ray + Rinse Basin -> Electrified Basin
const rayRinseMismatch = validateStationInteraction('rinse_station', rayItem);
assert(rayRinseMismatch.isMismatch === true, 'Ray in rinse basin is marked mismatch');
assert(rayRinseMismatch.penaltyType === 'electrified_basin', 'Penalty type is electrified_basin');

// 2.4 Bombfish + Fryer/Pot -> Flash Explosion
const bombItem: EntityItem = {
  id: 'i3', type: 'fish', speciesId: 'bombfish', baseSpeciesId: 'bombfish', name: 'Volcanic Bombfish',
  emoji: '💣', x: 0, y: 0, vx: 0, vy: 0, mass: 2.5, isHeld: true, heldByPlayerId: 'p1', value: 65
};
const bombFryerMismatch = validateStationInteraction('deep_fryer', bombItem);
assert(bombFryerMismatch.isMismatch === true, 'Bombfish in fryer is marked mismatch');
assert(bombFryerMismatch.penaltyType === 'flash_explosion', 'Penalty type is flash_explosion');

const bombPotMismatch = validateStationInteraction('soup_pot', bombItem);
assert(bombPotMismatch.isMismatch === true, 'Bombfish in soup kettle is marked mismatch');
assert(bombPotMismatch.penaltyType === 'flash_explosion', 'Penalty type is flash_explosion');

// 2.5 Slime Eel + Soup Pot -> Toxic Slime Boilover
const eelItem: EntityItem = {
  id: 'i4', type: 'fish', speciesId: 'eel', baseSpeciesId: 'eel', name: 'Slime Eel',
  emoji: '🐍', x: 0, y: 0, vx: 0, vy: 0, mass: 1.8, isHeld: true, heldByPlayerId: 'p1', value: 45
};
const eelPotMismatch = validateStationInteraction('soup_pot', eelItem);
assert(eelPotMismatch.isMismatch === true, 'Slime Eel in soup pot is marked mismatch');
assert(eelPotMismatch.penaltyType === 'slime_boilover', 'Penalty type is slime_boilover');

console.log('✅ TEST GROUP 2 PASSED!\n');

// ---------------------------------------------------------
// TEST GROUP 3: Game Engine Integration & Modular Sockets
// ---------------------------------------------------------
console.log('⛵ TEST GROUP 3: Game Engine Integration, Rod Rack & Sockets');

const engine = new LocalGameEngine();

// 3.1 Initial Level 1 Stations (3 Fixed Starter Stations)
const initialStations = engine.state.stations;
assert(initialStations.length === 3, 'Level 1 initializes with exactly 3 starter stations');
assert(initialStations.some(s => s.type === 'rod_rack'), 'Includes Rod Storage Rack');
assert(initialStations.some(s => s.type === 'cooler'), 'Includes Delivery Cooler');
assert(initialStations.some(s => s.type === 'trash_chute'), 'Includes Trash Chute');

// 3.2 Rod Storage Rack Equip / Return Flow
const p1 = engine.state.players[0];
const rodRack = initialStations.find(s => s.type === 'rod_rack')!;

// Player stands near rod rack with empty hands
p1.x = rodRack.x + rodRack.w / 2;
p1.y = rodRack.y + rodRack.h / 2;
p1.hasRodEquipped = false;

let pill = engine.computeContextualAction(p1);
assert(pill?.label === 'ROD', 'Shows [ROD] action pill when standing near Rod Rack without rod');

// Press primary action to equip
engine.p1Input.actionPrimary = true;
engine.tick();
assert(p1.hasRodEquipped === true, 'Pressing Action equips fishing rod');

pill = engine.computeContextualAction(p1);
assert(pill?.label === 'RETURN', 'Shows [RETURN] action pill when standing near Rod Rack with rod equipped');

// 3.3 Railing Casting Gated by hasRodEquipped
// Walk to railing
p1.x = 210; // near left railing (< DECK_BOUNDS.minX + 35)
p1.y = 270;

pill = engine.computeContextualAction(p1);
assert(pill?.label === 'CAST', 'Shows [CAST] pill when near railing with rod equipped');

p1.hasRodEquipped = false;
pill = engine.computeContextualAction(p1);
assert(pill?.label === 'NO ROD', 'Shows [NO ROD] pill when near railing without rod equipped');

// 3.4 Modular Socket Auto-Balancing
// Unlock 2 stations: Cutting Board and Deep Fryer
engine.unlockedStations.add('cutting_board');
engine.unlockedStations.add('deep_fryer');
(engine as any).state.stations = (engine as any).buildCurrentStations();

const updatedStations = engine.state.stations;
assert(updatedStations.length === 5, 'Stations count is now 5 (3 starter + 2 modular)');

const socket0Station = updatedStations.find(s => s.socketIndex === 0);
const socket1Station = updatedStations.find(s => s.socketIndex === 1);
assert(socket0Station?.type === 'cutting_board', 'Socket #0 has Fillet Board on Port Bow');
assert(socket1Station?.type === 'deep_fryer', 'Socket #1 has Deep Fryer on Starboard Bow');
assert(socket0Station?.x === MODULAR_SOCKET_LAYOUTS[0].x, 'Socket #0 coordinates match layout');
assert(socket1Station?.x === MODULAR_SOCKET_LAYOUTS[1].x, 'Socket #1 coordinates match layout');

console.log('✅ TEST GROUP 3 PASSED!\n');

console.log('🎉 ========================================================');
console.log('🎉 ALL 24 TESTS PASSED PERFECTLY WITH ZERO ERRORS!');
console.log('🎉 ========================================================\n');
