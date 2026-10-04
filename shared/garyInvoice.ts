// Uncle Gary-OS Operating Invoice & Day Rent Cash Sink Generator
// Friendslop Fishing Co.

export interface GaryInvoiceLineItem {
  reason: string;
  amount: number;
  emoji: string;
}

export interface GaryInvoice {
  levelNumber: number;
  levelName: string;
  grossEarned: number;
  dayRent: number;
  items: GaryInvoiceLineItem[];
  totalDeduction: number;
  netSurplus: number;
  timestamp: number;
}

export const GARY_FEE_CATALOG: { reason: string; emoji: string }[] = [
  { reason: 'Unlicensed Saltwater Displacement Tariff', emoji: '🌊' },
  { reason: 'Seagull Droppings Hazard Cleanup Surcharge', emoji: '💩' },
  { reason: 'Defective Lifevest Monthly Rental Fee', emoji: '🦺' },
  { reason: 'Smug Lobster Emotional Distress Settlement', emoji: '🦞' },
  { reason: 'Uncle Gary Executive Mentorship Retainer', emoji: '💼' },
  { reason: 'Emergency Bait Restocking & Worm Leasing', emoji: '🪱' },
  { reason: 'Rusty Winch Gear Depreciation Surcharge', emoji: '⚙️' },
  { reason: 'Pier Parking Meter Overstay Penalty', emoji: '🅿️' },
  { reason: 'Plausible Excuse Insurance Premium', emoji: '📜' },
  { reason: 'Syndicate Coffee & Donut Administrative Fee', emoji: '☕' },
  { reason: 'Uncertified Ocean Breeze Inhalation Tax', emoji: '💨' },
  { reason: 'Harbor Fish Smell Containment Fine', emoji: '🐟' },
  { reason: 'Barnacle Scraper Wear-and-Tear Levy', emoji: '🪚' },
  { reason: 'Excessive Screaming & Flailing Noise Fine', emoji: '📢' }
];

/**
 * Generates an itemized Gary-OS Operating Invoice for the completed shift,
 * splitting the day rent into 3-4 hilarious corporate deduction lines that
 * tally up exactly to the quota target / day rent.
 */
export function generateGaryInvoice(
  levelNumber: number,
  levelName: string,
  grossEarned: number,
  dayRent: number
): GaryInvoice {
  const count = Math.min(4, Math.max(3, Math.floor(Math.random() * 2) + 3));
  
  // Shuffle catalog
  const shuffled = [...GARY_FEE_CATALOG].sort(() => Math.random() - 0.5);
  const picked = shuffled.slice(0, count);

  // Distribute dayRent into discrete amounts summing exactly to dayRent
  const weights = picked.map(() => 0.6 + Math.random() * 0.8);
  const totalWeight = weights.reduce((a, b) => a + b, 0);

  const rawShares = weights.map(w => Math.floor((w / totalWeight) * dayRent));
  let allocated = rawShares.reduce((a, b) => a + b, 0);
  let remainder = dayRent - allocated;

  // Distribute any remainder to ensure exact sum
  let idx = 0;
  while (remainder > 0) {
    rawShares[idx % rawShares.length] += 1;
    remainder--;
    idx++;
  }

  const items: GaryInvoiceLineItem[] = picked.map((fee, i) => ({
    reason: fee.reason,
    amount: rawShares[i],
    emoji: fee.emoji
  }));

  const totalDeduction = dayRent;
  const netSurplus = Math.max(0, grossEarned - totalDeduction);

  return {
    levelNumber,
    levelName,
    grossEarned,
    dayRent,
    items,
    totalDeduction,
    netSurplus,
    timestamp: Date.now()
  };
}
