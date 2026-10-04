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

export interface FeeItem {
  reason: string;
  emoji: string;
  tag?: string;
}

// 1. General Corporate Syndicate & Harbor Tariffs
export const GARY_BASE_FEES: FeeItem[] = [
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
  { reason: 'Excessive Screaming & Flailing Noise Fine', emoji: '📢' },
  { reason: 'Uncle Gary Weekend Casino Subsidy', emoji: '🎰' },
  { reason: 'Unauthorized Seal High-Fiving Citation', emoji: '🦭' },
  { reason: 'Substandard Deck Splinter Extraction Tariff', emoji: '🪵' },
  { reason: 'Discarded Boot Municipal Recycling Levy', emoji: '🥾' },
  { reason: 'Inclement Sea Weather Mood Tax', emoji: '🌧️' },
  { reason: 'Dockside Pothole Avoidance Permit', emoji: '⚓' }
];

// 2. Kitchen Station Specific Surcharges (Triggered when stations are unlocked)
export const GARY_STATION_FEES: Record<string, FeeItem[]> = {
  deep_fryer: [
    { reason: 'Used Fryer Grease Environmental Disposal Fee', emoji: '🍳' },
    { reason: 'Burnt Batter Flake Scraper Depreciation', emoji: '🔥' },
    { reason: 'Deep-Fried Leather Boot Specialty Tax', emoji: '🍟' },
    { reason: 'Excess Cooking Oil Mist Inhalation Surcharge', emoji: '💨' }
  ],
  cutting_board: [
    { reason: 'Fillet Knife Sharpening Stone Depreciation', emoji: '🔪' },
    { reason: 'Wooden Cutting Board Bloodstain Scrubbing Tax', emoji: '🪵' },
    { reason: 'Chop Rhythm Inconsistency Fine', emoji: '⏱️' },
    { reason: 'Accidental Finger Nick First-Aid Surcharge', emoji: '🩹' }
  ],
  soup_pot: [
    { reason: 'Seafood Broth Steam Cloud Condensation Tariff', emoji: '🍲' },
    { reason: 'Snapping Turtle Shell Anti-Boilover Permit', emoji: '🐢' },
    { reason: 'Ladle Swirl Velocity Licensing Fee', emoji: '🥄' },
    { reason: 'Unauthorized Kitchen Aroma Dispersal Levy', emoji: '🍜' }
  ],
  rinse_station: [
    { reason: 'Industrial Wash Basin Soap Bubble Royalty', emoji: '🧼' },
    { reason: 'Municipal Bilge Graywater Drainage Fee', emoji: '💧' },
    { reason: 'Camera Squeegee Sponge Friction Surcharge', emoji: '🧽' },
    { reason: 'Sanitary Fish Polish Certification Stamp', emoji: '✨' }
  ],
  sushi_station: [
    { reason: 'Bamboo Rolling Mat Splinter Inspection Levy', emoji: '🍣' },
    { reason: 'Nori Seaweed Wrinkle Straightening Fee', emoji: '🍱' },
    { reason: 'Master Chef Pretentious Attitude Surcharge', emoji: '🥢' },
    { reason: 'Dragon Roll Aesthetic Presentation Tax', emoji: '🐉' }
  ]
};

// 3. Perk & Equipment Specific Surcharges (Triggered when perks are acquired)
export const GARY_PERK_FEES: Record<string, FeeItem[]> = {
  anti_slip: [
    { reason: 'Magnetic Boot Deck Demagnetization Surcharge', emoji: '🧲' },
    { reason: 'Loud Heavy Magnetic Clanking Noise Fine', emoji: '🥾' }
  ],
  auto_squeegee: [
    { reason: 'Industrial Squeegee Rubber Blade Squeak Tariff', emoji: '🪣' },
    { reason: 'Eel Slime Neutralizing Chemical Fee', emoji: '🧪' }
  ],
  ballast_tilt_reduction: [
    { reason: 'Lead Keel Ballast Displacement Surcharge', emoji: '🚢' },
    { reason: 'Vessel Anti-Capsizing Stability Certification', emoji: '⚖️' }
  ],
  wide_sweet_spot: [
    { reason: 'Turbo-Crank Gearbox Overclocking Fine', emoji: '⚡' },
    { reason: 'Braided Fishing Line Friction Spark Tax', emoji: '🧵' }
  ],
  cooler_bonus: [
    { reason: 'Cryo Flash Freezer Freon Leakage Indemnity', emoji: '🧊' },
    { reason: 'Subzero Fish Frostbite Prevention Levy', emoji: '🥶' }
  ],
  auto_harpoon: [
    { reason: 'Ballistic Harpoon Launch Trajectory Permit', emoji: '🚀' },
    { reason: 'Offshore Winch Cable Whiplash Insurance', emoji: '🪢' }
  ],
  high_rails: [
    { reason: 'Excessive Oak Gunwale Elevation Surcharge', emoji: '🪵' }
  ]
};

// 4. Level & Environmental Hazard Surcharges
export const GARY_HAZARD_FEES: Record<number, FeeItem[]> = {
  2: [
    { reason: 'Butter Tuna Deck Slip Liability Insurance', emoji: '🧈' },
    { reason: 'Slime Eel Escapement Search & Rescue Fee', emoji: '🐍' },
    { reason: 'Smog Wave Diesel Exhaust Filtration Tax', emoji: '🌫️' }
  ],
  3: [
    { reason: 'Electric Eel & Ray Surge Protector Grounding Fee', emoji: '⚡' },
    { reason: 'Squid Ink Camera Lens Chemical Laundering Levy', emoji: '🦑' },
    { reason: 'Radioactive Bass Geiger Counter Calibration Tax', emoji: '☢️' },
    { reason: 'Abyssal Moonfish Solar Darkness Surcharge', emoji: '🌙' }
  ],
  4: [
    { reason: 'Volcanic Bombfish Explosive Ordnance Disposal Fee', emoji: '💣' },
    { reason: 'Whirlpool Centrifugal Hull Dizziness Permit', emoji: '🌀' },
    { reason: 'Gunwale Blast Crater Smoothing Service', emoji: '💥' },
    { reason: 'Emergency High-Side Heave Spinal Chiropractic Fee', emoji: '💪' }
  ]
};

/**
 * Generates an itemized Gary-OS Operating Invoice for the completed shift,
 * smartly incorporating fees linked to active kitchen stations, perks,
 * and level hazards, tallying up exactly to the quota target / day rent.
 */
export function generateGaryInvoice(
  levelNumber: number,
  levelName: string,
  grossEarned: number,
  dayRent: number,
  unlockedStations?: Set<string>,
  activePerks?: Set<string>
): GaryInvoice {
  const count = Math.min(4, Math.max(3, Math.floor(Math.random() * 2) + 3));

  // Build contextual priority pool based on team equipment & level hazards
  const priorityPool: FeeItem[] = [];

  // Add station-specific fees if unlocked
  if (unlockedStations) {
    unlockedStations.forEach(st => {
      const fees = GARY_STATION_FEES[st];
      if (fees) priorityPool.push(...fees);
    });
  }

  // Add perk-specific fees if active
  if (activePerks) {
    activePerks.forEach(pk => {
      const fees = GARY_PERK_FEES[pk];
      if (fees) priorityPool.push(...fees);
    });
  }

  // Add level-specific hazard fees
  const hazardFees = GARY_HAZARD_FEES[levelNumber];
  if (hazardFees) {
    priorityPool.push(...hazardFees);
  }

  // Pick 1 to 2 contextual fees if available
  const picked: FeeItem[] = [];
  const shuffledPriority = [...priorityPool].sort(() => Math.random() - 0.5);
  const contextualCount = Math.min(shuffledPriority.length, Math.floor(Math.random() * 2) + 1);

  for (let i = 0; i < contextualCount; i++) {
    picked.push(shuffledPriority[i]);
  }

  // Fill remainder from base general catalog
  const shuffledBase = [...GARY_BASE_FEES].sort(() => Math.random() - 0.5);
  for (const fee of shuffledBase) {
    if (picked.length >= count) break;
    if (!picked.some(p => p.reason === fee.reason)) {
      picked.push(fee);
    }
  }

  // Distribute dayRent into discrete amounts summing exactly to dayRent
  const weights = picked.map(() => 0.6 + Math.random() * 0.8);
  const totalWeight = weights.reduce((a, b) => a + b, 0);

  const rawShares = weights.map(w => Math.floor((w / totalWeight) * dayRent));
  let allocated = rawShares.reduce((a, b) => a + b, 0);
  let remainder = dayRent - allocated;

  // Distribute remainder so the sum is exact
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
