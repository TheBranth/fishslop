// Master Shared Types for Friendslop Fishing Co. (5-Level Roguelite & Multiplayer)

import { DredgedCrate } from './upgrades';

export type PlayerColor = 'blue' | 'yellow' | 'red' | 'green';
export type StationType = 'cooler' | 'cutting_board' | 'deep_fryer' | 'soup_pot' | 'rod_rack' | 'trash_chute' | 'sushi_station' | 'rinse_station';
export type FishTier = 'T1' | 'T2' | 'T3' | 'T4' | 'Common' | 'Uncommon' | 'Hazard' | 'Boss' | 'Trash';
export type ItemModifier = 'raw' | 'sliced' | 'fried' | 'boiled' | 'rolled' | 'soiled' | 'electrified' | 'burned';

export interface ContextualAction {
  label: string;
  colorHex: string;
}

export interface PlayerInput {
  dx: number;
  dy: number;
  actionPrimary: boolean;      // Button 1: Action / Work / Drop / Cast / Reel / Heave
  actionSecondary: boolean;    // Button 2: Chaos / Slap / Throw / Cut
  isActionPrimaryHeld?: boolean;
}

export interface PlayerState {
  id: string;
  playerIndex: number;
  name: string;
  color: PlayerColor;
  colorHex: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  facing: 'left' | 'right' | 'up' | 'down';
  isStunned: boolean;
  stunTimer: number;
  isSlipping: boolean;
  isReady: boolean;
  holdingItemId: string | null;
  score: number;
  privateCash: number;
  activeBounty: SecretBounty | null;
  contextualAction: ContextualAction | null;
  hasRodEquipped: boolean; // Must grab rod from Rod Rack to cast at railings!
  // Fishing State
  isFishing: boolean;
  fishingState?: 'waiting_bite' | 'biting' | 'reeling';
  fishingTimer?: number;
  reelProgress?: number;
  reelSweetSpot?: number;
  reelNeedle?: number;
  fishingTargetSpecies?: FishSpeciesId;
  castTargetX?: number;
  castTargetY?: number;
  // Conga Line Co-op Lifting (Individual Strength & Conga Chains)
  congaLeaderId: string | null;
  congaFollowerIds: string[];
  // Contribution stats for Endgame Audit
  totalFishBanked: number;
  totalDishesCooked: number;
  totalLegalQuotaContributed: number;
  totalSecretMeritPoints: number;
}

export interface OceanFishShadow {
  id: string;
  speciesId: FishSpeciesId;
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
}

export type FishSpeciesId = 
  | 'guppy'
  | 'cod'
  | 'sunfish'
  | 'salmon'
  | 'boot'
  | 'turtle'
  | 'tuna'
  | 'eel'
  | 'squid'
  | 'ray'
  | 'radioactive_bass'
  | 'moonfish'
  | 'bombfish'
  | 'kraken';

export interface DeckPuddle {
  id: string;
  type: 'butter' | 'slime' | 'grease' | 'water';
  x: number;
  y: number;
  radius: number;
  duration: number; // in seconds
}

export interface InkSplatter {
  x: number;
  y: number;
  radius: number;
  fadeTimer: number;
}

export interface DeckScreenShaderState {
  greenCrtGlow: boolean;
  solarEclipseDarkness: number; // 0.0 to 0.60
  geigerSoundActive: boolean;
  inkSplatters: InkSplatter[];
}

export type ItemType = 
  | 'fish' 
  | 'cooked_food' 
  | 'hazard' 
  | 'tool' 
  | 'trash' 
  | 'fillet' 
  | 'sushi' 
  | 'fried_dish' 
  | 'soup';

export interface EntityItem {
  id: string;
  type: ItemType;
  speciesId?: FishSpeciesId;
  name: string;
  emoji: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  mass: number;
  isHeld: boolean;
  heldByPlayerId: string | null;
  value: number;
  basePrice?: number;
  baseSpeciesId?: FishSpeciesId;
  modifiers?: ItemModifier[];
  stateTimer?: number;
  isCooked?: boolean;
  isSoiled?: boolean;
}

export interface WorkStation {
  id: string;
  type: StationType;
  name: string;
  x: number;
  y: number;
  w: number;
  h: number;
  progress: number;
  isProcessing: boolean;
  heldItem: EntityItem | null;
  socketIndex?: number | null; // 0 to 3 for the 4 modular perimeter sockets
  minigameState?: 'idle' | 'chopping' | 'frying' | 'stirring' | 'burned';
  chopCount?: number;
  chopTarget?: number;
  fryHeat?: number;
  stirSwirls?: number;
  isOnFire?: boolean;
  fireTimer?: number;
  // Slapstick & Mismatch Penalty States
  isBroken?: boolean;
  brokenTimer?: number;
  brokenReason?: string;
  isElectrified?: boolean;
  electrifiedTimer?: number;
  isWobbly?: boolean;
  wobblyTimer?: number;
}

export type BountyType = 
  | 'drop_overboard'
  | 'slap_player'
  | 'steal_fish'
  | 'burn_dish'
  | 'slip_crew'
  | 'trigger_fire'
  | 'trip_player'
  | 'break_knife'
  | 'credit_thief'
  | 'hold_bombfish'
  | 'cook_boot';

export interface SecretBounty {
  id: string;
  title: string;
  description: string;
  type: BountyType;
  targetCount: number;
  currentCount: number;
  baseRewardPoints: number;
  isCompleted: boolean;
  assignedLevelTier: number;
  assignedPlayerIndex?: number;
}

export interface RogueliteLevel {
  levelNumber: number; // 1 to 5
  id: string;
  name: string;
  subtitle: string;
  targetQuota: number;
  timeLimitSeconds: number;
  spawnRates: Record<FishSpeciesId, number>;
  unlockedStations: StationType[];
  environmentalHazard: 'calm' | 'smog_waves' | 'abyss_storm' | 'whirlpool' | 'kraken_boss';
  isBossLevel?: boolean;
  bossMaxHP?: number;
}

export interface KrakenBossState {
  currentHP: number;
  maxHP: number;
  portTentacleGrappling: boolean;
  starboardTentacleGrappling: boolean;
  portTentacleHP: number;
  starboardTentacleHP: number;
}

export interface DredgedDraftState {
  crates: DredgedCrate[];
  timeLeftSeconds: number; // 30s countdown
  votes: Record<string, string[]>; // crateId -> array of playerIds
  isDecided: boolean;
  selectedCrateId: string | null;
  isCoinFlip: boolean;
}

export interface EndgameAuditRecord {
  playerIndex: number;
  name: string;
  colorHex: string;
  totalQuotaContributed: number;
  totalMeritPoints: number;
  completedBounties: { title: string; levelTier: number; points: number }[];
  isEmployeeOfTheRun: boolean;
  isUncleGaryGoldenRat: boolean;
}

export interface FeedMessage {
  id: string;
  text: string;
  type: 'info' | 'bounty' | 'hazard' | 'score';
  time: number;
}

export interface GameRoomState {
  roomCode: string;
  level: RogueliteLevel;
  currentLevelIndex: number; // 0 to 4 (5 levels)
  gameState: 'lobby' | 'playing' | 'draft_phase' | 'level_complete' | 'game_over' | 'victory_audit';
  timeLeft: number;
  teamCash: number;
  quotaTarget: number;
  boatAngle: number;
  boatTiltSpeed: number;
  boatCenterOfMassX: number;
  players: PlayerState[];
  items: EntityItem[];
  stations: WorkStation[];
  feedMessages: FeedMessage[];
  draftState: DredgedDraftState | null;
  krakenBoss: KrakenBossState | null;
  activePerks: Set<string>;
  capsizingTimer: number;
  isCapsizedScramble: boolean;
  capsizeScrambleTimer: number;
  deckPuddles: DeckPuddle[];
  screenShaders: DeckScreenShaderState;
  endgameAudit: EndgameAuditRecord[] | null;
  activeContract?: any; // ActiveContractState
}
