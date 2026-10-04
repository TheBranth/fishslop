// Unit Tests for Uncle Gary-OS Invoice & Day Rent Deduction

import assert from 'node:assert';
import { generateGaryInvoice, GARY_FEE_CATALOG } from '../shared/garyInvoice';
import { LocalGameEngine } from '../client/engine/LocalGameEngine';

console.log('🧪 ========================================================');
console.log('🧪 RUNNING UNCLE GARY-OS INVOICE & DAY RENT CASH SINK TESTS');
console.log('🧪 ========================================================');

// TEST 1: Invoice Mathematical Exactness
console.log('\n🧾 TEST GROUP 1: Gary Invoice Tally Exactness');
for (let i = 0; i < 50; i++) {
  const dayRent = 250;
  const grossEarned = 420;
  const invoice = generateGaryInvoice(1, 'Sweetwater Shallows', grossEarned, dayRent);

  assert(invoice.items.length >= 3, 'Invoice has at least 3 itemized lines');
  const sumOfLines = invoice.items.reduce((acc, it) => acc + it.amount, 0);
  assert(sumOfLines === dayRent, `Itemized lines sum ($${sumOfLines}) must exactly equal Day Rent ($${dayRent})`);
  assert(invoice.totalDeduction === dayRent, 'Total deduction equals day rent');
  assert(invoice.netSurplus === grossEarned - dayRent, 'Net surplus equals grossEarned - dayRent');
}
console.log('  ✅ 50 Random Invoices tested: All itemized line items sum exactly to day rent!');
console.log('  ✅ Net surplus correctly equals gross earned minus day rent.');

// TEST 2: Engine Integration & Cash Sink Deductions
console.log('\n💰 TEST GROUP 2: Engine Day Rent Cash Sink Integration');
const engine = new LocalGameEngine();
engine.state.gameState = 'playing';

// Simulate depositing $450 in Level 1 (target quota $250)
engine.state.teamCash = 450;
engine.levelTeamCashEarned = 450;
engine.state.level.targetQuota = 250;

// Call finishLevelShift()
(engine as any).finishLevelShift();

assert(engine.state.gameState === 'invoice_phase', 'Engine transitions to invoice_phase');
assert(engine.state.garyInvoice !== null, 'Gary invoice generated');
assert(engine.state.garyInvoice!.totalDeduction === 250, 'Gary deducted exactly $250 day rent');
assert(engine.state.garyInvoice!.netSurplus === 200, 'Surplus kept is $200 ($450 - $250)');
assert(engine.state.teamCash === 200, `Team cash wallet reduced to net surplus ($200), actual: $${engine.state.teamCash}`);
console.log('  ✅ Team cash wallet correctly sunk by day rent ($450 -> $200)!');
console.log('  ✅ Surplus kept for upgrade draft is exactly $200.');

// TEST 4: Contextual Upgrade and Hazard Fee Matching
console.log('\n🎯 TEST GROUP 4: Contextual Upgrade & Hazard Fees');
let fryerFeeSeen = false;
let eelFeeSeen = false;

for (let i = 0; i < 50; i++) {
  const inv = generateGaryInvoice(
    3, // Level 3 (eels / rays)
    'Abyssal Trench',
    1200,
    900,
    new Set(['cooler', 'deep_fryer']),
    new Set(['anti_slip'])
  );

  inv.items.forEach(it => {
    if (it.reason.toLowerCase().includes('fryer') || it.reason.toLowerCase().includes('grease')) fryerFeeSeen = true;
    if (it.reason.toLowerCase().includes('electric') || it.reason.toLowerCase().includes('grounding') || it.reason.toLowerCase().includes('ink')) eelFeeSeen = true;
  });
}

assert(fryerFeeSeen, 'Deep fryer fees correctly triggered when deep_fryer is unlocked');
assert(eelFeeSeen, 'Electric eel/ray grounding fees correctly triggered in Level 3');
console.log('  ✅ Contextual fees for Deep Fryer and Electric Eels/Rays successfully generated!');

console.log('\n🎉 ========================================================');
console.log('🎉 ALL GARY-OS INVOICE & CASH SINK TESTS PASSED 100%!');
console.log('🎉 ========================================================');
