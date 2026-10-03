import { LocalGameEngine } from '../client/engine/LocalGameEngine';
import { EntityItem, PlayerState } from '../shared/types';
import { ROGUELITE_LEVELS } from '../shared/constants';

function assert(condition: boolean, msg: string) {
  if (!condition) {
    console.error(`❌ FAILED: ${msg}`);
    process.exit(1);
  } else {
    console.log(`  ✅ ${msg}`);
  }
}

console.log('🧪 ========================================================');
console.log('🧪 RUNNING ENDGAME TALLY & STATION INTERACTION AUDIT TESTS');
console.log('🧪 ========================================================\n');

// GROUP 1: COOLER BANKING & MATHEMATICAL TALLY INTEGRITY
console.log('📦 TEST GROUP 1: Cooler Box Banking & Tally Quota Integrity');
const engine = new LocalGameEngine();
const p1 = engine.state.players[0];
const p2 = engine.state.players[1];

assert(p1.totalLegalQuotaContributed === 0, 'P1 starts with $0 legal quota');
assert(p2.totalLegalQuotaContributed === 0, 'P2 starts with $0 legal quota');
assert(engine.levelTeamCashEarned === 0, 'Team starts with $0 earned in level');

// Create test fish
const testFish1: EntityItem = {
  id: 'fish_cod_1',
  type: 'fish',
  speciesId: 'cod',
  name: 'Cod',
  emoji: '🐟',
  x: 480,
  y: 260,
  vx: 0,
  vy: 0,
  mass: 4,
  isHeld: true,
  heldByPlayerId: p1.id,
  value: 35
};
engine.state.items.push(testFish1);
p1.holdingItemId = testFish1.id;

// P1 banks fish directly into Cooler
engine.depositItemIntoCooler(testFish1, p1);

assert(engine.state.teamCash === 35, 'Team cash updated to $35');
assert(engine.levelTeamCashEarned === 35, 'Level team cash updated to $35');
assert(p1.totalLegalQuotaContributed === 35, 'P1 legal quota contributed updated to $35');
assert(p1.totalFishBanked === 1, 'P1 fish banked count updated to 1');
assert(p1.holdingItemId === null, 'P1 hands are now empty after banking');
assert(!engine.state.items.some(i => i.id === 'fish_cod_1'), 'Fish removed from boat items');

// P2 banks a cooked dish worth $101
const testDish2: EntityItem = {
  id: 'dish_fish_chips',
  type: 'fried_dish',
  name: 'Golden Cod Fish & Chips',
  emoji: '🍟',
  x: 480,
  y: 260,
  vx: 0,
  vy: 0,
  mass: 4,
  isHeld: true,
  heldByPlayerId: p2.id,
  value: 101
};
engine.state.items.push(testDish2);
p2.holdingItemId = testDish2.id;

engine.depositItemIntoCooler(testDish2, p2);

assert(engine.state.teamCash === 136, 'Team cash updated to $136 ($35 + $101)');
assert(engine.levelTeamCashEarned === 136, 'Level team cash earned is $136');
assert(p2.totalLegalQuotaContributed === 101, 'P2 legal quota contributed updated to $101');
assert(p1.totalLegalQuotaContributed + p2.totalLegalQuotaContributed === engine.levelTeamCashEarned, 'Mathematical identity: Sum of players quota equals levelTeamCashEarned');
console.log('✅ TEST GROUP 1 PASSED!\n');

// GROUP 2: TRASH CHUTE DISPOSAL & BOOT CONTRACT
console.log('🗑️ TEST GROUP 2: Trash Chute Disposal');
const testBoot: EntityItem = {
  id: 'item_boot_1',
  type: 'trash',
  speciesId: 'boot',
  name: 'Old Boot',
  emoji: '👢',
  x: 480,
  y: 450,
  vx: 0,
  vy: 0,
  mass: 2,
  isHeld: true,
  heldByPlayerId: p1.id,
  value: 0
};
engine.state.items.push(testBoot);
p1.holdingItemId = testBoot.id;

engine.discardItemIntoTrashChute(testBoot, p1);
assert(p1.holdingItemId === null, 'P1 hands empty after discarding boot');
assert(!engine.state.items.some(i => i.id === 'item_boot_1'), 'Boot removed from boat items');
console.log('✅ TEST GROUP 2 PASSED!\n');

// GROUP 3: ENDGAME AUDIT - MVP, GOLDEN RAT & HONEST CREW
console.log('🏆 TEST GROUP 3: Endgame Audit Calculations');
// Currently P1 contributed $35, P2 contributed $101, zero merit points scored
let audit = (engine as any).computeEndgameAudit();

assert(audit.length === 2, 'Audit contains records for both players');
const p1Rec = audit.find((r: any) => r.playerIndex === 0);
const p2Rec = audit.find((r: any) => r.playerIndex === 1);

assert(p2Rec.isEmployeeOfTheRun === true, 'P2 is Employee of the Run (MVP) with $101 banked');
assert(p1Rec.isEmployeeOfTheRun === false, 'P1 is not MVP');
assert(p1Rec.isUncleGaryGoldenRat === false, 'P1 is NOT Golden Rat (0 merit points scored)');
assert(p2Rec.isUncleGaryGoldenRat === false, 'P2 is NOT Golden Rat (0 merit points scored)');

// Now give P1 secret sabotage merit points
p1.activeBounty = {
  id: 'bounty_test_1',
  title: 'Drop Catch Overboard',
  description: 'Drop 1 item into the sea',
  type: 'drop_overboard',
  targetCount: 1,
  currentCount: 0,
  baseRewardPoints: 150,
  isCompleted: false,
  assignedLevelTier: 1
};

(engine as any).checkBounties('drop_overboard', {});
assert(p1.totalSecretMeritPoints === 150, 'P1 earned 150 secret merit points');
assert(p1.completedBountiesList?.length === 1, 'P1 completedBountiesList has 1 entry');
assert(p1.completedBountiesList[0].title === 'Drop Catch Overboard', 'Bounty title matches');

// Recompute audit with sabotage active
audit = (engine as any).computeEndgameAudit();
const p1Audited = audit.find((r: any) => r.playerIndex === 0);
const p2Audited = audit.find((r: any) => r.playerIndex === 1);

assert(p1Audited.isUncleGaryGoldenRat === true, 'P1 is Uncle Gary Golden Rat with 150 merit points');
assert(p2Audited.isUncleGaryGoldenRat === false, 'P2 is NOT Golden Rat');
assert(p2Audited.isEmployeeOfTheRun === true, 'P2 remains Employee of the Run');
assert(p1Audited.completedBounties.length === 1, 'P1 audit record contains 1 completed bounty');
assert(p1Audited.completedBounties[0].points === 150, 'Bounty record contains 150 points');
console.log('✅ TEST GROUP 3 PASSED!\n');

// GROUP 4: LEVEL QUOTA & RUN PROGRESSION / GAME OVER
console.log('🚨 TEST GROUP 4: Level Quota Checks & Transitions');
engine.levelTeamCashEarned = 100;
engine.state.level.targetQuota = 250;

let gameOverCalled = false;
let gameOverReason = '';
engine.onGameOver = (reason, aud) => {
  gameOverCalled = true;
  gameOverReason = reason;
};

// Finish level shift with insufficient quota
(engine as any).finishLevelShift();
assert(gameOverCalled === true, 'Game over triggered when quota not met');
assert(gameOverReason.includes('FAILED QUOTA'), 'Game over reason reports failed quota');
assert(engine.state.gameState === 'game_over', 'Engine game state is game_over');

// Test Reset
engine.reset();
assert(engine.state.gameState === 'playing', 'Engine state reset to playing');
assert(engine.state.currentLevelIndex === 0, 'Current level index reset to 0');
assert(engine.state.teamCash === 0, 'Team cash reset to $0');
assert(engine.levelTeamCashEarned === 0, 'Level team cash reset to $0');
assert(p1.totalLegalQuotaContributed === 0, 'P1 quota reset to 0');
assert(p1.totalSecretMeritPoints === 0, 'P1 merit points reset to 0');
assert(p1.completedBountiesList?.length === 0, 'P1 completed bounties reset');

console.log('✅ TEST GROUP 4 PASSED!\n');

console.log('🎉 ========================================================');
console.log('🎉 ALL ENDGAME TALLY & STATION AUDIT TESTS PASSED 100%!');
console.log('🎉 ========================================================\n');
