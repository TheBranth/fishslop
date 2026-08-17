import { 
  GameRoomState, 
  PlayerState, 
  EntityItem, 
  WorkStation, 
  PlayerInput, 
  FishSpeciesId, 
  SecretBounty,
  OceanFishShadow,
  StationType,
  RogueliteLevel,
  DredgedDraftState,
  KrakenBossState,
  EndgameAuditRecord,
  ContextualAction
} from '../../shared/types';
import { 
  CANVAS_WIDTH, 
  CANVAS_HEIGHT, 
  BOAT_BOUNDS, 
  DECK_BOUNDS, 
  PHYSICS, 
  PLAYER_PROFILES, 
  ROGUELITE_LEVELS,
  MAX_SOLO_LIFT_WEIGHT
} from '../../shared/constants';
import { FISH_REGISTRY } from '../../shared/fishDatabase';
import { validateStationInteraction } from '../../shared/recipes';
import { generateGatedSecretBounty } from '../../shared/bounties';
import { DredgedCrate, generateDredgedDraft, SKIP_DRAFT_CRATE } from '../../shared/upgrades';
import { generateCorporateContract, ActiveContractState } from '../../shared/contracts';

export class LocalGameEngine {
  public state: GameRoomState;
  public oceanShadows: OceanFishShadow[] = [];
  public p1Input: PlayerInput = { dx: 0, dy: 0, actionPrimary: false, actionSecondary: false, isActionPrimaryHeld: false };
  public p2Input: PlayerInput = { dx: 0, dy: 0, actionPrimary: false, actionSecondary: false, isActionPrimaryHeld: false };
  public botP3Active: boolean = false;

  // Roguelite 5-Level Campaign Progression
  public currentLevelIndex: number = 0;
  public levelTimeLeft: number = 90;
  public levelTeamCashEarned: number = 0;
  public unlockedStations: Set<StationType> = new Set(['cooler', 'trash_chute']);
  public activePerks: Set<string> = new Set();
  public readyPlayers: Set<string> = new Set();
  public recentlyPurchasedStation: StationType | string | null = null;
  public activeCorporateContract: ActiveContractState | null = null;

  // Capsizing & Boss State
  public capsizingTimer: number = 0;
  public capsizeScrambleTimer: number = 0;

  // Physics Tuning
  public tiltSensitivity: number = 0.5;
  public deckFriction: number = 0.90;
  public slideMultiplier: number = 0.22;

  public onEvent?: (type: string, data: any, extra?: any) => void;
  public onBountyUpdate?: (bounty: SecretBounty) => void;
  public onContractUpdate?: (contract: ActiveContractState) => void;
  public onDraftStart?: (draft: DredgedDraftState) => void;
  public onDraftUpdate?: (draft: DredgedDraftState) => void;
  public onLevelComplete?: (summary: any) => void;
  public onGameOver?: (reason: string, audit: EndgameAuditRecord[]) => void;
  public onVictory?: (audit: EndgameAuditRecord[]) => void;

  constructor() {
    const firstLevel = ROGUELITE_LEVELS[0];

    this.state = {
      roomCode: 'LOCAL',
      level: firstLevel,
      currentLevelIndex: 0,
      gameState: 'playing',
      timeLeft: firstLevel.timeLimitSeconds,
      teamCash: 0,
      quotaTarget: firstLevel.targetQuota,
      boatAngle: 0,
      boatTiltSpeed: 0,
      boatCenterOfMassX: CANVAS_WIDTH / 2,
      players: [
        {
          id: 'p1',
          playerIndex: 0,
          name: 'Player 1 (Blue)',
          color: 'blue',
          colorHex: '#38bdf8',
          x: 320,
          y: 270,
          vx: 0,
          vy: 0,
          facing: 'left',
          isStunned: false,
          stunTimer: 0,
          isSlipping: false,
          isReady: true,
          holdingItemId: null,
          score: 0,
          privateCash: 0,
          activeBounty: null,
          contextualAction: null,
          isFishing: false,
          congaLeaderId: null,
          congaFollowerIds: [],
          totalFishBanked: 0,
          totalDishesCooked: 0,
          totalLegalQuotaContributed: 0,
          totalSecretMeritPoints: 0
        },
        {
          id: 'p2',
          playerIndex: 1,
          name: 'Player 2 (Gold)',
          color: 'yellow',
          colorHex: '#facc15',
          x: 640,
          y: 270,
          vx: 0,
          vy: 0,
          facing: 'right',
          isStunned: false,
          stunTimer: 0,
          isSlipping: false,
          isReady: true,
          holdingItemId: null,
          score: 0,
          privateCash: 0,
          activeBounty: null,
          contextualAction: null,
          isFishing: false,
          congaLeaderId: null,
          congaFollowerIds: [],
          totalFishBanked: 0,
          totalDishesCooked: 0,
          totalLegalQuotaContributed: 0,
          totalSecretMeritPoints: 0
        }
      ],
      items: [],
      stations: this.buildCurrentStations(),
      feedMessages: [
        { id: 'msg_0', text: `🏁 LEVEL 1: Sweetwater Shallows — Bank $${firstLevel.targetQuota} in 90s!`, type: 'info', time: Date.now() },
        { id: 'msg_1', text: '🎣 Cast from railings (Space / J / Enter) & sort into Cooler!', type: 'info', time: Date.now() }
      ],
      draftState: null,
      krakenBoss: null,
      activePerks: this.activePerks,
      capsizingTimer: 0,
      isCapsizedScramble: false,
      capsizeScrambleTimer: 0,
      deckPuddles: [],
      screenShaders: {
        greenCrtGlow: false,
        solarEclipseDarkness: 0,
        geigerSoundActive: false,
        inkSplatters: []
      },
      endgameAudit: null,
      activeContract: null
    };

    this.refreshCorporateContract();
    this.refreshAllBounties();
    this.initOceanShadows();
  }

  public refreshCorporateContract(): void {
    const tier = this.currentLevelIndex + 1;
    this.activeCorporateContract = generateCorporateContract({
      levelTier: tier,
      unlockedStations: this.unlockedStations,
      activePerks: this.activePerks,
      recentlyPurchasedStation: this.recentlyPurchasedStation,
      hasChronometer: this.activePerks.has('tampered_chronometer')
    });
    this.state.activeContract = this.activeCorporateContract;
    if (this.activeCorporateContract) {
      this.onContractUpdate?.(this.activeCorporateContract);
      this.addFeedMessage(`📋 CONTRACT: ${this.activeCorporateContract.name} (${this.activeCorporateContract.targetCount} ${this.activeCorporateContract.targetUnit})`, 'info');
    }
  }

  private initOceanShadows(): void {
    const speciesList: FishSpeciesId[] = ['guppy', 'guppy', 'tuna', 'turtle', 'eel', 'boot', 'bombfish', 'ray'];
    this.oceanShadows = speciesList.map((sp, i) => {
      const angle = (i / speciesList.length) * Math.PI * 2;
      const dist = 320 + Math.random() * 80;
      return {
        id: `shadow_${i}`,
        speciesId: sp,
        x: CANVAS_WIDTH / 2 + Math.cos(angle) * dist,
        y: CANVAS_HEIGHT / 2 + Math.sin(angle) * dist,
        vx: (Math.random() - 0.5) * 1.5,
        vy: (Math.random() - 0.5) * 1.5,
        size: 14 + Math.random() * 8
      };
    });
  }

  public tick(): void {
    const { state } = this;
    const boatCenterX = CANVAS_WIDTH / 2;

    // 1. Post-Round 30-Second Dredged Crate Draft Phase Tick
    if (state.gameState === 'draft_phase' && state.draftState) {
      this.updateDraftPhase();
      this.updateOceanShadows();
      return;
    }

    if (state.gameState !== 'playing') {
      this.updateOceanShadows();
      return;
    }

    // 2. Level Countdown Timer
    this.levelTimeLeft -= 1 / 60;
    state.timeLeft = Math.max(0, this.levelTimeLeft);

    if (this.levelTimeLeft <= 0) {
      this.levelTimeLeft = 0;
      this.finishLevelShift();
      return;
    }

    // 3. Capsizing Detection -> 6-Second Righting Scramble + Deck Purge
    if (Math.abs(state.boatAngle) >= PHYSICS.capsizingAngleThreshold && !state.isCapsizedScramble) {
      this.capsizingTimer += 1 / 60;
      state.capsizingTimer = this.capsizingTimer;
      if (this.capsizingTimer >= 1.5) {
        // Trigger 1. THE DECK PURGE (All loose catches slide into sea!)
        state.items = [];
        this.onEvent?.('sfx', 'splash');
        this.onEvent?.('sfx', 'bell');
        this.onEvent?.('popup', '', { text: '🌊 DECK PURGE! Loose Catches Lost!', color: '#ef4444', x: boatCenterX, y: 160 });
        this.addFeedMessage('🌊 BOAT OVERTURNED! All loose items washed into the sea!', 'hazard');

        // Trigger 2. THE 6-SECOND RIGHTING SCRAMBLE
        state.isCapsizedScramble = true;
        this.capsizeScrambleTimer = 6.0;
        state.capsizeScrambleTimer = 6.0;
        this.capsizingTimer = 0;
        this.addFeedMessage('🚨 6s RIGHTING SCRAMBLE: SPRINT TO HIGH SIDE & SPAM HEAVE!', 'hazard');
      }
    } else if (!state.isCapsizedScramble) {
      this.capsizingTimer = Math.max(0, this.capsizingTimer - 2 / 60);
      state.capsizingTimer = this.capsizingTimer;
    }

    // Process Active Righting Scramble Countdown
    if (state.isCapsizedScramble) {
      this.capsizeScrambleTimer -= 1 / 60;
      state.capsizeScrambleTimer = Math.max(0, this.capsizeScrambleTimer);

      if (this.capsizeScrambleTimer <= 0) {
        // 3. UNCLE GARY'S SALVAGE TAX ($75)
        state.teamCash = Math.max(0, state.teamCash - 75);
        state.isCapsizedScramble = false;
        state.boatAngle = 0;
        this.capsizingTimer = 0;
        this.onEvent?.('sfx', 'slap');
        this.onEvent?.('popup', '', { text: '💸 -$75 SALVAGE TAX!', color: '#f87171', x: boatCenterX, y: 160 });
        this.addFeedMessage("💸 Uncle Gary's salvage tugboat righted the ship (-$75 Tax)!", 'hazard');
      } else if (Math.abs(state.boatAngle) <= 8) {
        // Successful High-Side Heave!
        state.isCapsizedScramble = false;
        state.boatAngle = 0;
        this.capsizingTimer = 0;
        this.onEvent?.('sfx', 'victory');
        this.onEvent?.('popup', '', { text: '🚢 SHIP RIGHTED!', color: '#22c55e', x: boatCenterX, y: 150 });
        this.addFeedMessage('🎉 SHIP RIGHTED! Crew teamwork heaved the boat upright!', 'score');
      }
    }

    // 4. Update Swimming Fish Shadows
    this.updateOceanShadows();

    // 5. Level 5 Kraken Boss Mechanics
    if (state.level.isBossLevel && state.krakenBoss) {
      this.updateKrakenBoss();
    }

    // 6. Process Players (Movement, Fishing, Kitchen Interactions)
    state.players.forEach(p => {
      let input: PlayerInput = p.id === 'p1' ? this.p1Input : p.id === 'p2' ? this.p2Input : { dx: 0, dy: 0, actionPrimary: false, actionSecondary: false, isActionPrimaryHeld: false };

      if (p.id === 'p3') {
        input = this.getBotInput(p);
      }

      if (p.isStunned) {
        p.stunTimer -= 1 / 60;
        if (p.stunTimer <= 0) p.isStunned = false;
      }

      // Check Deck Puddles for Slipping
      let standingInPuddle = false;
      state.deckPuddles.forEach(puddle => {
        if (Math.hypot(p.x - puddle.x, p.y - puddle.y) < puddle.radius + 8) {
          standingInPuddle = true;
          p.isSlipping = true;
        }
      });
      if (!standingInPuddle) {
        p.isSlipping = false;
      }

      if (p.isFishing) {
        this.updatePlayerFishing(p, input);
        p.vx *= 0.8;
        p.vy *= 0.8;
      } else if (!p.isStunned) {
        const hasMagneticBoots = this.activePerks.has('anti_slip');
        
        // Conga Line & Heavy Item Strength Speed Calculation
        let weightSpeedMod = 1.0;
        if (p.holdingItemId) {
          const held = state.items.find(i => i.id === p.holdingItemId);
          if (held && held.mass > MAX_SOLO_LIFT_WEIGHT) {
            const hasCongaHelp = p.congaFollowerIds.length > 0;
            weightSpeedMod = hasCongaHelp ? 1.15 : 0.35; // Solo dragging is 65% slower!
          }
        }

        const baseSpeed = (p.isSlipping && !hasMagneticBoots) ? PHYSICS.playerSpeed * 0.4 : PHYSICS.playerSpeed;
        const speed = baseSpeed * weightSpeedMod;
        
        p.vx += input.dx * speed * 0.3;
        p.vy += input.dy * speed * 0.3;

        if (Math.abs(input.dx) > Math.abs(input.dy)) {
          if (input.dx > 0.1) p.facing = 'right';
          else if (input.dx < -0.1) p.facing = 'left';
        } else {
          if (input.dy > 0.1) p.facing = 'down';
          else if (input.dy < -0.1) p.facing = 'up';
        }

        const tiltSlide = (state.boatAngle / 15) * ((p.isSlipping && !hasMagneticBoots) ? 0.35 : 0.08);
        p.vx += tiltSlide;

        const friction = (p.isSlipping && !hasMagneticBoots) ? 0.96 : this.deckFriction;
        p.vx *= friction;
        p.vy *= friction;

        p.x += p.vx;
        p.y += p.vy;

        p.x = Math.max(DECK_BOUNDS.minX, Math.min(DECK_BOUNDS.maxX, p.x));
        p.y = Math.max(DECK_BOUNDS.minY, Math.min(DECK_BOUNDS.maxY, p.y));

        if (p.holdingItemId) {
          const held = state.items.find(i => i.id === p.holdingItemId);
          if (held) {
            held.x = p.x;
            held.y = p.y - 22;
            held.vx = p.vx;
            held.vy = p.vy;

            // Slime Eel wriggle out of hands after 2.5s
            if (held.speciesId === 'eel') {
              held.stateTimer = (held.stateTimer || 2.5) - (1 / 60);
              if (held.stateTimer <= 0) {
                p.holdingItemId = null;
                held.isHeld = false;
                held.heldByPlayerId = null;
                held.vx = (Math.random() - 0.5) * 6;
                held.vy = (Math.random() - 0.5) * 6;
                this.onEvent?.('sfx', 'slap');
                this.addFeedMessage(`🐍 SLIPPERY! Slime Eel wriggled out of ${p.name}'s hands!`, 'hazard');
                state.deckPuddles.push({
                  id: 'slime_' + Date.now(),
                  type: 'slime',
                  x: p.x,
                  y: p.y,
                  radius: 16,
                  duration: 8.0
                });
              }
            }

            // Bombfish hot potato fuse check
            if (held.speciesId === 'bombfish') {
              held.stateTimer = (held.stateTimer || PHYSICS.bombfishFuseSeconds) - (1 / 60);
              if (held.stateTimer <= 0) {
                this.triggerExplosion(p.x, p.y);
                p.holdingItemId = null;
              }
            }
          } else {
            p.holdingItemId = null;
          }
        }

        // Conga Line follower movement
        if (p.congaLeaderId) {
          const leader = state.players.find(l => l.id === p.congaLeaderId);
          if (leader) {
            const dx = leader.x - p.x;
            const dy = leader.y - p.y;
            const dist = Math.hypot(dx, dy);
            if (dist > 32) {
              p.x += (dx / dist) * (dist - 32) * 0.4;
              p.y += (dy / dist) * (dist - 32) * 0.4;
            }
          } else {
            p.congaLeaderId = null;
          }
        }

        // Compute live contextual affordance pill for TV & Controller
        p.contextualAction = this.computeContextualAction(p);

        // Unified 2-Button Action Dispatch
        if (input.actionPrimary) {
          this.handlePrimaryAction(p);
        }
        if (input.actionSecondary) {
          this.handleSecondaryAction(p);
        }
      }
    });

    // Reset single-frame inputs
    this.p1Input.actionPrimary = false;
    this.p1Input.actionSecondary = false;
    this.p2Input.actionPrimary = false;
    this.p2Input.actionSecondary = false;

    // 7. Update Deck Puddles & Screen Shaders
    for (let i = state.deckPuddles.length - 1; i >= 0; i--) {
      state.deckPuddles[i].duration -= 1 / 60;
      if (state.deckPuddles[i].duration <= 0) {
        state.deckPuddles.splice(i, 1);
      }
    }

    state.screenShaders.greenCrtGlow = false;
    state.screenShaders.solarEclipseDarkness = 0;
    state.screenShaders.geigerSoundActive = false;

    for (let i = state.screenShaders.inkSplatters.length - 1; i >= 0; i--) {
      state.screenShaders.inkSplatters[i].fadeTimer -= 1 / 60;
      if (state.screenShaders.inkSplatters[i].fadeTimer <= 0) {
        state.screenShaders.inkSplatters.splice(i, 1);
      }
    }

    state.items.forEach(item => {
      if (item.speciesId === 'radioactive_bass') {
        state.screenShaders.greenCrtGlow = true;
        state.screenShaders.geigerSoundActive = true;
      } else if (item.speciesId === 'moonfish') {
        state.screenShaders.solarEclipseDarkness = Math.max(state.screenShaders.solarEclipseDarkness, 0.60);
      } else if (item.speciesId === 'tuna' && !item.isHeld) {
        item.stateTimer = (item.stateTimer || 1.0) - (1 / 60);
        if (item.stateTimer <= 0) {
          item.stateTimer = 1.0;
          if (Math.random() < 0.50 && state.deckPuddles.length < 20) {
            state.deckPuddles.push({
              id: 'butter_' + Date.now() + '_' + Math.random(),
              type: 'butter',
              x: item.x,
              y: item.y,
              radius: 20,
              duration: 12.0
            });
          }
        }
      } else if (item.speciesId === 'ray') {
        item.stateTimer = (item.stateTimer || 3.0) - (1 / 60);
        if (item.stateTimer <= 0) {
          item.stateTimer = 3.0;
          this.triggerElectricShock(item.x, item.y);
        }
      }
    });

    // 7. Center of Mass & Boat Tilt Physics
    let portMass = 0;
    let starboardMass = 0;

    // Ballast perk reduction
    const ballastMod = this.activePerks.has('ballast_tilt_reduction') ? 0.6 : 1.0;

    state.players.forEach(p => {
      const distFromCenter = p.x - boatCenterX;
      if (distFromCenter < 0) portMass += 4.5 * (Math.abs(distFromCenter) / 200);
      else starboardMass += 4.5 * (distFromCenter / 200);
    });

    state.items.forEach(i => {
      const distFromCenter = i.x - boatCenterX;
      if (distFromCenter < 0) portMass += i.mass * (Math.abs(distFromCenter) / 200);
      else starboardMass += i.mass * (distFromCenter / 200);
    });

    // Kraken Tentacle grappling mass pull
    if (state.krakenBoss) {
      if (state.krakenBoss.portTentacleGrappling) portMass += 15.0;
      if (state.krakenBoss.starboardTentacleGrappling) starboardMass += 15.0;
    }

    const massDiff = starboardMass - portMass;
    const targetAngle = Math.max(-PHYSICS.maxBoatAngle, Math.min(PHYSICS.maxBoatAngle, massDiff * this.tiltSensitivity * 2.5 * ballastMod));
    state.boatAngle += (targetAngle - state.boatAngle) * 0.08;

    // 8. Loose Items Slide Physics with Gunwale Railing Lip
    const itemTiltForce = (state.boatAngle / 10) * this.slideMultiplier;
    const isSevereTilt = Math.abs(state.boatAngle) > 20;

    for (let i = state.items.length - 1; i >= 0; i--) {
      const item = state.items[i];
      if (item.isHeld) continue;

      item.vx += itemTiltForce;
      item.vx *= this.deckFriction;
      item.vy *= this.deckFriction;

      item.x += item.vx;
      item.y += item.vy;

      if (!isSevereTilt) {
        if (item.x < DECK_BOUNDS.minX + 8) {
          item.x = DECK_BOUNDS.minX + 8;
          item.vx = Math.abs(item.vx) * 0.4;
        } else if (item.x > DECK_BOUNDS.maxX - 8) {
          item.x = DECK_BOUNDS.maxX - 8;
          item.vx = -Math.abs(item.vx) * 0.4;
        }
        if (item.y < DECK_BOUNDS.minY + 8) {
          item.y = DECK_BOUNDS.minY + 8;
          item.vy = Math.abs(item.vy) * 0.4;
        } else if (item.y > DECK_BOUNDS.maxY - 8) {
          item.y = DECK_BOUNDS.maxY - 8;
          item.vy = -Math.abs(item.vy) * 0.4;
        }
      }

      if (item.speciesId === 'bombfish') {
        item.stateTimer = (item.stateTimer ?? PHYSICS.bombfishFuseSeconds) - (1 / 60);
        if (item.stateTimer <= 0) {
          this.triggerExplosion(item.x, item.y);
          state.items.splice(i, 1);
          continue;
        }
      }

      // Cooler deposit, Trash Chute & Quota Tracking
      const cooler = state.stations.find(s => s.type === 'cooler');
      const chute = state.stations.find(s => s.type === 'trash_chute');

      // Trash Chute Deposit (for Harbor Cleanup contract and disposing hazardous waste)
      if (chute && this.isItemInStation(item, chute)) {
        this.onEvent?.('sfx', 'drop');
        this.addFeedMessage(`🗑️ Discarded ${item.name} into Overboard Chute!`, 'info');

        if (this.activeCorporateContract && this.activeCorporateContract.id === 'contract_harbor_cleanup' && item.speciesId === 'boot') {
          this.advanceContract(1, 'Boot Discarded');
        }

        state.items.splice(i, 1);
        continue;
      }

      // Cooler Box Deposit
      if (cooler && this.isItemInStation(item, cooler)) {
        state.teamCash += item.value;
        this.levelTeamCashEarned += item.value;
        this.onEvent?.('sfx', 'ding');
        this.onEvent?.('popup', '', { text: `+$${item.value}!`, color: '#22c55e', x: cooler.x + cooler.w / 2, y: cooler.y - 10 });
        this.addFeedMessage(`💵 Banked ${item.name} for +$${item.value}!`, 'score');

        // Evaluate Corporate Contract Rules & Penalties
        if (this.activeCorporateContract && !this.activeCorporateContract.isCompleted && !this.activeCorporateContract.isFailed) {
          const c = this.activeCorporateContract;

          if (c.id === 'contract_fresh_batch') {
            if (!item.isSoiled) {
              this.advanceContract(item.mass, `${item.mass}kg Clean Fish`);
            } else {
              this.addFeedMessage(`⚠️ Soiled fish yielded 0kg contract credit! Rinse first.`, 'hazard');
            }
          } else if (c.id === 'contract_sanitary_specimen') {
            if (item.isSoiled) {
              c.currentCount = Math.max(0, c.currentCount - 2);
              this.onEvent?.('sfx', 'slap');
              this.addFeedMessage(`⚠️ Soiled fish docked contract progress by -2! (${c.currentCount}/${c.targetCount})`, 'hazard');
              this.onContractUpdate?.(c);
            } else {
              this.advanceContract(1, 'Clean Fish');
            }
          } else if (c.id === 'contract_selective_sorting') {
            if (item.speciesId === 'guppy' || item.speciesId === 'tuna' || item.speciesId === 'ray') {
              this.advanceContract(1, 'Scaled Fish');
            } else if (item.speciesId === 'boot' || item.speciesId === 'turtle' || item.speciesId === 'bombfish') {
              c.currentCount = Math.max(0, c.currentCount - 1);
              this.onEvent?.('sfx', 'slap');
              this.addFeedMessage(`⚠️ Non-scaled catch docked contract by -1! (${c.currentCount}/${c.targetCount})`, 'hazard');
              this.onContractUpdate?.(c);
            }
          } else if (c.id === 'contract_harbor_cleanup') {
            if (item.speciesId === 'boot') {
              state.teamCash = Math.max(0, state.teamCash - 25);
              this.onEvent?.('sfx', 'slap');
              this.addFeedMessage(`⚠️ Boot in Cooler! -$25 penalty! Use Trash Chute.`, 'hazard');
            }
          } else if (c.id === 'contract_sashimi_express' || c.id === 'contract_surgical_slices') {
            if (item.type === 'fillet') {
              this.advanceContract(1, 'Sashimi Fillet');
            }
          } else if (c.id === 'contract_crispy_platter' || c.id === 'contract_gary_snack') {
            if (item.type === 'fried_dish') {
              this.advanceContract(1, 'Fried Dish');
            }
          } else if (c.id === 'contract_billionaire_chowder' || c.id === 'contract_seafood_gumbo') {
            if (item.type === 'soup') {
              this.advanceContract(1, 'Seafood Soup');
            }
          }
        }

        // Credit thief bounty check in final 5 seconds
        if (this.levelTimeLeft <= 5.0) {
          this.checkBounties('credit_thief', {});
        }

        state.items.splice(i, 1);
        continue;
      }

      // Overboard check
      if (
        item.x < BOAT_BOUNDS.x - 20 ||
        item.x > BOAT_BOUNDS.x + BOAT_BOUNDS.width + 20 ||
        item.y < BOAT_BOUNDS.y - 20 ||
        item.y > BOAT_BOUNDS.y + BOAT_BOUNDS.height + 20
      ) {
        this.onEvent?.('sfx', 'splash');
        this.addFeedMessage(`🌊 ${item.name} washed overboard!`, 'hazard');
        this.checkBounties('drop_overboard', { item });
        state.items.splice(i, 1);
        continue;
      }
    }

    // 9. Station Mismatch & Cooking Timers
    state.stations.forEach(station => {
      // Cooldown if station is broken (e.g. knife broken)
      if (station.isBroken && station.brokenTimer) {
        station.brokenTimer -= 1 / 60;
        if (station.brokenTimer <= 0) {
          station.isBroken = false;
          station.brokenReason = undefined;
          this.onEvent?.('sfx', 'ding');
          this.addFeedMessage(`✨ ${station.name} repaired & ready!`, 'info');
        }
      }

      // Deep Fryer heat rise
      if (station.type === 'deep_fryer' && station.heldItem && station.minigameState === 'frying') {
        station.fryHeat = (station.fryHeat || 0) + (1 / 180);
        if (station.fryHeat >= 1.0) {
          station.minigameState = 'burned';
          station.heldItem.name = 'Charred Charcoal Soot';
          station.heldItem.emoji = '🔥';
          station.heldItem.value = 1;
          this.onEvent?.('sfx', 'explosion');
          this.addFeedMessage(`🔥 DEEP FRYER OVERHEATED! Food burned to a crisp!`, 'hazard');
          this.checkBounties('burn_dish', {});
        }
      }
    });
  }

  // --- Kraken Boss Fight Engine ---

  private updateKrakenBoss(): void {
    const boss = this.state.krakenBoss!;
    if (boss.currentHP <= 0) {
      this.triggerRunVictory();
      return;
    }

    // Periodic tentacle grappling
    const t = Date.now() * 0.001;
    if (Math.sin(t * 0.5) > 0.6) {
      boss.portTentacleGrappling = true;
    } else if (Math.sin(t * 0.5) < -0.6) {
      boss.starboardTentacleGrappling = true;
    }
  }

  public damageKraken(amount: number, sourceName: string): void {
    if (!this.state.krakenBoss) return;
    this.state.krakenBoss.currentHP = Math.max(0, this.state.krakenBoss.currentHP - amount);
    this.onEvent?.('sfx', 'explosion');
    this.onEvent?.('popup', '', { text: `🐙 -${amount} HP!`, color: '#c084fc', x: CANVAS_WIDTH / 2, y: 130 });
    this.addFeedMessage(`💥 ${sourceName} hit Kraken for -${amount} HP! (${this.state.krakenBoss.currentHP}/1200)`, 'score');

    if (this.state.krakenBoss.currentHP <= 0) {
      this.triggerRunVictory();
    }
  }

  // --- Contextual Affordance Resolver & 2-Button Action Handlers ---

  public computeContextualAction(p: PlayerState): ContextualAction | null {
    if (p.isStunned) return null;

    // 1. Boat Capsizing Scramble (6s Emergency)
    if (this.state.isCapsizedScramble) {
      return { label: 'HEAVE', colorHex: '#ef4444' };
    }

    // 2. Actively Fishing at Railing
    if (p.isFishing) {
      return { label: 'REEL', colorHex: '#22c55e' };
    }

    // 3. Hands Empty: Proximity Affordances
    if (!p.holdingItemId) {
      // Priority A: Floor item in range
      let nearestItem: EntityItem | null = null;
      let minItemDist = 50;
      this.state.items.forEach(item => {
        if (item.isHeld) return;
        const dist = Math.hypot(item.x - p.x, item.y - p.y);
        if (dist < minItemDist) {
          minItemDist = dist;
          nearestItem = item;
        }
      });
      if (nearestItem) {
        return { label: 'GRAB', colorHex: '#f59e0b' };
      }

      // Priority B: Kitchen Station with completed cooked food
      const finishedStation = this.state.stations.find(s => {
        if (!s.heldItem || s.isProcessing || s.type === 'cooler') return false;
        const dist = Math.hypot(s.x + s.w / 2 - p.x, s.y + s.h / 2 - p.y);
        return dist < 65;
      });
      if (finishedStation) {
        return { label: 'TAKE', colorHex: '#2dd4bf' };
      }

      // Priority C: Railing Hotspot for Casting
      const isNearRailing =
        p.x < DECK_BOUNDS.minX + 35 ||
        p.x > DECK_BOUNDS.maxX - 35 ||
        p.y < DECK_BOUNDS.minY + 35 ||
        p.y > DECK_BOUNDS.maxY - 35;
      if (isNearRailing) {
        return { label: 'CAST', colorHex: '#38bdf8' };
      }

      // Priority D: Heavy Teammate for Conga Line
      const heavyCarrier = this.state.players.find(other => {
        if (other.id === p.id || !other.holdingItemId) return false;
        const dist = Math.hypot(other.x - p.x, other.y - p.y);
        if (dist > 55) return false;
        const item = this.state.items.find(i => i.id === other.holdingItemId);
        return item && item.mass > MAX_SOLO_LIFT_WEIGHT;
      });
      if (heavyCarrier) {
        return { label: 'CONGA', colorHex: '#facc15' };
      }

      return null;
    }

    // 4. Holding an Item: Station Work or Gentle Drop
    const nearStation = this.state.stations.find(s =>
      Math.hypot(s.x + s.w / 2 - p.x, s.y + s.h / 2 - p.y) < 65
    );

    if (nearStation) {
      if (nearStation.type === 'cooler') {
        return { label: 'BANK', colorHex: '#4ade80' };
      }
      if (nearStation.type === 'trash_chute') {
        return { label: 'TRASH', colorHex: '#f43f5e' };
      }
      if (nearStation.type === 'cutting_board') {
        return { label: 'FILLET', colorHex: '#2dd4bf' };
      }
      if (nearStation.type === 'deep_fryer') {
        return { label: 'FRY', colorHex: '#fb923c' };
      }
      if (nearStation.type === 'soup_pot') {
        return { label: 'SOUP', colorHex: '#34d399' };
      }
    }

    // Open deck space -> Gentle Drop
    return { label: 'DROP', colorHex: '#94a3b8' };
  }

  private handlePrimaryAction(p: PlayerState): void {
    // 1. High-Side Heave during 6-Second Capsized Scramble!
    if (this.state.isCapsizedScramble) {
      const boatCenterX = CANVAS_WIDTH / 2;
      const isBoatTiltedRight = this.state.boatAngle > 0;
      const isPlayerOnHighSide = isBoatTiltedRight ? p.x < boatCenterX : p.x > boatCenterX;

      if (isPlayerOnHighSide) {
        const heaveReduction = 6.0;
        if (this.state.boatAngle > 0) {
          this.state.boatAngle = Math.max(0, this.state.boatAngle - heaveReduction);
        } else {
          this.state.boatAngle = Math.min(0, this.state.boatAngle + heaveReduction);
        }
        this.onEvent?.('sfx', 'throw');
        this.onEvent?.('popup', '', { text: '💪 HEAVE! (-6°)', color: '#facc15', x: p.x, y: p.y - 25 });
        this.addFeedMessage(`💪 ${p.name} HEAVED the high side! (${this.state.boatAngle.toFixed(1)}° left)`, 'info');
      } else {
        this.onEvent?.('popup', '', { text: '⚠️ SPRINT TO HIGH SIDE!', color: '#f87171', x: p.x, y: p.y - 25 });
        this.addFeedMessage(`⚠️ ${p.name} is on the low side! Sprint to the opposite high side!`, 'hazard');
      }
      return;
    }

    // 2. Active Minigame Progression on Stations
    const nearStation = this.state.stations.find(s => 
      Math.hypot(s.x + s.w/2 - p.x, s.y + s.h/2 - p.y) < 65
    );

    if (nearStation) {
      if (nearStation.isBroken) {
        this.onEvent?.('sfx', 'slap');
        this.addFeedMessage(`⚠️ ${nearStation.name} is broken! ${nearStation.brokenReason}`, 'hazard');
        return;
      }

      // Pick up completed cooked food
      if (nearStation.heldItem && !nearStation.isProcessing && (nearStation.minigameState === 'idle' || nearStation.minigameState === 'burned')) {
        if (!p.holdingItemId) {
          const item = nearStation.heldItem;
          nearStation.heldItem = null;
          nearStation.minigameState = 'idle';
          item.isHeld = true;
          item.heldByPlayerId = p.id;
          p.holdingItemId = item.id;
          this.onEvent?.('sfx', 'pickup');

          // Kraken Calamari Boss Strike!
          if (item.name.includes('Kraken Calamari') && this.state.krakenBoss) {
            this.damageKraken(PHYSICS.calamariDamage, 'Kraken Calamari Strike');
          }
          return;
        }
      }

      // Fillet 3-Chop Minigame
      if (nearStation.type === 'cutting_board' && nearStation.heldItem && nearStation.minigameState === 'chopping') {
        nearStation.chopCount = (nearStation.chopCount || 0) + 1;
        this.onEvent?.('sfx', 'chop');
        this.addFeedMessage(`🔪 CHOP! (${nearStation.chopCount}/3)`, 'info');

        if (nearStation.chopCount >= 3) {
          this.completeStation(nearStation, p);
        }
        return;
      }

      // Deep Fryer Pull
      if (nearStation.type === 'deep_fryer' && nearStation.heldItem && nearStation.minigameState === 'frying') {
        const heat = nearStation.fryHeat || 0;
        if (heat >= 0.55 && heat <= 0.90) {
          this.completeStation(nearStation, p);
          this.addFeedMessage(`🍟 PERFECT GOLDEN CRUNCH! ($${nearStation.heldItem.value})`, 'score');
          if (nearStation.heldItem.name.includes('Leather')) {
            this.checkBounties('cook_boot', { player: p });
          }
        } else if (heat < 0.55) {
          this.addFeedMessage(`⏳ Too soggy! Let it sizzle longer.`, 'hazard');
        }
        return;
      }

      // Soup Kettle Stir
      if (nearStation.type === 'soup_pot' && nearStation.heldItem && nearStation.minigameState === 'stirring') {
        nearStation.stirSwirls = (nearStation.stirSwirls || 0) + 1;
        this.onEvent?.('sfx', 'bubble');
        this.addFeedMessage(`🍲 STIRRING BROTH! (${nearStation.stirSwirls}/3)`, 'info');

        if (nearStation.stirSwirls >= 3) {
          this.completeStation(nearStation, p);
        }
        return;
      }

      // Load fish into station (Validates against Mismatch Rules!)
      if (p.holdingItemId && !nearStation.heldItem && nearStation.type !== 'cooler') {
        const held = this.state.items.find(i => i.id === p.holdingItemId);
        if (held) {
          const validation = validateStationInteraction(nearStation.type, held);

          // ⚠️ THE MISMATCH PENALTY TRIGGER!
          if (validation.isMismatch) {
            this.onEvent?.('sfx', 'slap');
            this.addFeedMessage(validation.reason || '⚠️ Cooking Mismatch Penalty!', 'hazard');

            if (validation.penaltyType === 'broken_tool') {
              nearStation.isBroken = true;
              nearStation.brokenTimer = validation.penaltyDurationSeconds || 5.0;
              nearStation.brokenReason = validation.reason;
              this.checkBounties('break_knife', { player: p });
            } else if (validation.penaltyType === 'flash_explosion') {
              this.triggerExplosion(nearStation.x, nearStation.y);
              this.state.items = this.state.items.filter(i => i.id !== held.id);
              p.holdingItemId = null;
            }
            return;
          }

          // Valid station loading
          if (validation.recipe) {
            nearStation.heldItem = held;
            nearStation.isProcessing = true;
            held.isHeld = false;
            held.heldByPlayerId = null;
            p.holdingItemId = null;

            if (nearStation.type === 'cutting_board') {
              nearStation.minigameState = 'chopping';
              nearStation.chopCount = 0;
              this.onEvent?.('sfx', 'pickup');
              this.addFeedMessage(`🔪 Press ACTION 3 times to chop ${held.name}!`, 'info');
            } else if (nearStation.type === 'deep_fryer') {
              nearStation.minigameState = 'frying';
              nearStation.fryHeat = 0;
              this.onEvent?.('sfx', 'sizzle');
              this.addFeedMessage(`🍳 Sizzling! Pull when the heat gauge hits the GOLDEN SWEET SPOT!`, 'info');
            } else if (nearStation.type === 'soup_pot') {
              nearStation.minigameState = 'stirring';
              nearStation.stirSwirls = 0;
              this.onEvent?.('sfx', 'bubble');
              this.addFeedMessage(`🍲 Press ACTION 3 times to swirl the broth!`, 'info');
            }
            return;
          }
        }
      }
    }

    // 3. If Holding an Item in Open Space -> Gentle Drop!
    if (p.holdingItemId) {
      const held = this.state.items.find(i => i.id === p.holdingItemId);
      if (held) {
        held.isHeld = false;
        held.heldByPlayerId = null;
        held.vx = 0;
        held.vy = 0;
        p.holdingItemId = null;
        this.onEvent?.('sfx', 'drop');
        this.onEvent?.('popup', '', { text: 'DROP', color: '#94a3b8', x: p.x, y: p.y - 20 });
      }
      return;
    }

    // 4. If Hands Empty: Grab Floor Item Priority
    let nearest: EntityItem | null = null;
    let minDist = 50;
    this.state.items.forEach(item => {
      if (item.isHeld) return;
      const dist = Math.hypot(item.x - p.x, item.y - p.y);
      if (dist < minDist) {
        minDist = dist;
        nearest = item;
      }
    });

    if (nearest) {
      const item = nearest as EntityItem;
      item.isHeld = true;
      item.heldByPlayerId = p.id;
      p.holdingItemId = item.id;
      this.onEvent?.('sfx', 'pickup');

      if (item.mass > MAX_SOLO_LIFT_WEIGHT) {
        this.addFeedMessage(`⚠️ HEAVY CATCH (${item.mass}kg)! Dragging is slow — Form a CONGA LINE to carry!`, 'info');
      }
      return;
    }

    // 5. If near Railing -> Cast Fishing Rod
    const isNearRailing = 
      p.x < DECK_BOUNDS.minX + 35 ||
      p.x > DECK_BOUNDS.maxX - 35 ||
      p.y < DECK_BOUNDS.minY + 35 ||
      p.y > DECK_BOUNDS.maxY - 35;

    if (isNearRailing && !p.isFishing) {
      this.startFishing(p);
      return;
    }

    // 6. Join Conga Line if near Heavy Carrier
    const heavyCarrier = this.state.players.find(other => {
      if (other.id === p.id || !other.holdingItemId) return false;
      const dist = Math.hypot(other.x - p.x, other.y - p.y);
      if (dist > 55) return false;
      const item = this.state.items.find(i => i.id === other.holdingItemId);
      return item && item.mass > MAX_SOLO_LIFT_WEIGHT;
    });

    if (heavyCarrier) {
      p.congaLeaderId = heavyCarrier.id;
      if (!heavyCarrier.congaFollowerIds.includes(p.id)) {
        heavyCarrier.congaFollowerIds.push(p.id);
      }
      this.onEvent?.('sfx', 'pickup');
      this.onEvent?.('popup', '', { text: '🤝 CONGA!', color: '#facc15', x: p.x, y: p.y - 25 });
      this.addFeedMessage(`🎉 CONGA HOIST! ${p.name} linked up with ${heavyCarrier.name} to carry the heavy catch! (+Speed Bonus)`, 'score');
      return;
    }

    // 7. Disconnect from Conga if already in one
    if (p.congaLeaderId) {
      const leader = this.state.players.find(l => l.id === p.congaLeaderId);
      if (leader) {
        leader.congaFollowerIds = leader.congaFollowerIds.filter(id => id !== p.id);
      }
      p.congaLeaderId = null;
      this.addFeedMessage(`💨 ${p.name} stepped out of the Conga Line.`, 'info');
      return;
    }
  }

  private handleSecondaryAction(p: PlayerState): void {
    // 1. Cut Line if Fishing
    if (p.isFishing) {
      p.isFishing = false;
      p.fishingState = undefined;
      p.reelProgress = 0;
      this.onEvent?.('sfx', 'slap');
      this.onEvent?.('popup', '', { text: 'LINE CUT!', color: '#94a3b8', x: p.x, y: p.y - 20 });
      this.addFeedMessage(`✂️ ${p.name} released the line.`, 'info');
      return;
    }

    // 2. Throw / Yeet if Holding an Item
    if (p.holdingItemId) {
      this.handleThrow(p);
      return;
    }

    // 3. Slap nearby players if Hands Empty
    this.handleSlap(p);
  }

  private triggerElectricShock(x: number, y: number): void {
    this.onEvent?.('sfx', 'slap');
    this.onEvent?.('popup', '', { text: `⚡ ZAP!`, color: '#fde047', x, y: y - 20 });
    this.addFeedMessage(`⚡ ZAP! Electric Ray emitted a deck shock pulse!`, 'hazard');
    this.state.players.forEach(p => {
      const dist = Math.hypot(p.x - x, p.y - y);
      if (dist < 115) {
        p.isStunned = true;
        p.stunTimer = 1.5;
        p.vx = (Math.random() - 0.5) * 8;
        p.vy = (Math.random() - 0.5) * 8;
        this.onEvent?.('popup', '', { text: `💥 STUNNED!`, color: '#ef4444', x: p.x, y: p.y - 25 });
      }
    });
  }

  private completeStation(station: WorkStation, player: PlayerState): void {
    if (!station.heldItem) return;
    const item = station.heldItem;
    const validation = validateStationInteraction(station.type, item);
    const recipe = validation.recipe;

    if (recipe) {
      item.name = recipe.outputName;
      item.emoji = recipe.outputEmoji;
      item.type = recipe.outputItemType;
      item.value = Math.round(item.value * recipe.valueMultiplier);
      item.isCooked = true;
      station.isProcessing = false;
      station.progress = 1.0;
      station.minigameState = 'idle';

      player.totalDishesCooked++;
      player.totalLegalQuotaContributed += item.value;

      this.onEvent?.('sfx', 'ding');
      this.onEvent?.('popup', '', { text: `✨ +$${item.value} ${item.name}!`, color: '#facc15', x: station.x + station.w / 2, y: station.y - 15 });
      this.addFeedMessage(`✨ Prepared ${item.name} ($${item.value})! Grab & bank into Cooler.`, 'score');
    }
  }

  // --- Railing Fishing & Reel Minigames ---

  private startFishing(p: PlayerState): void {
    p.isFishing = true;
    p.fishingState = 'waiting_bite';
    p.fishingTimer = 1.2 + Math.random() * 1.5;
    p.reelProgress = 0.2;
    p.reelSweetSpot = 0.2;
    p.reelNeedle = 0.5;

    let castX = p.x;
    let castY = p.y;
    if (p.facing === 'left') castX = BOAT_BOUNDS.x - 45;
    else if (p.facing === 'right') castX = BOAT_BOUNDS.x + BOAT_BOUNDS.width + 45;
    else if (p.facing === 'up') castY = BOAT_BOUNDS.y - 45;
    else if (p.facing === 'down') castY = BOAT_BOUNDS.y + BOAT_BOUNDS.height + 45;

    p.castTargetX = castX;
    p.castTargetY = castY;

    const rates = this.state.level.spawnRates;
    const rand = Math.random();
    let cumulative = 0;
    let chosen: FishSpeciesId = 'guppy';
    for (const [sp, prob] of Object.entries(rates)) {
      cumulative += prob;
      if (rand <= cumulative) {
        chosen = sp as FishSpeciesId;
        break;
      }
    }
    p.fishingTargetSpecies = chosen;

    this.onEvent?.('sfx', 'throw');
    this.addFeedMessage(`🎣 ${p.name} cast a line into the water...`, 'info');
  }

  private updatePlayerFishing(p: PlayerState, input: PlayerInput): void {
    if (p.fishingState === 'waiting_bite') {
      p.fishingTimer! -= 1 / 60;
      if (p.fishingTimer! <= 0) {
        p.fishingState = 'biting';
        this.onEvent?.('sfx', 'bell');
        this.addFeedMessage(`🚨 FISH ON! Hold SPACE / J to move Green Bar over the Fish!`, 'hazard');
      }
    } else if (p.fishingState === 'biting' || p.fishingState === 'reeling') {
      p.fishingState = 'reeling';

      const speciesId = p.fishingTargetSpecies || 'guppy';
      const speedMod = speciesId === 'kraken' ? 1.8 : speciesId === 'bombfish' ? 1.5 : speciesId === 'turtle' ? 1.2 : 0.9;
      const t = Date.now() * 0.0015 * speedMod;
      p.reelNeedle = 0.5 + Math.sin(t * 2.2) * 0.38 + Math.cos(t * 1.1) * 0.08;

      const isPushing = input.isActionPrimaryHeld || input.actionPrimary || input.dx > 0.1 || input.dy < -0.1;

      if (isPushing) {
        p.reelSweetSpot = Math.min(0.85, (p.reelSweetSpot || 0.2) + 0.018);
      } else {
        p.reelSweetSpot = Math.max(0.05, (p.reelSweetSpot || 0.2) - 0.014);
      }

      // Turbo reel perk expands bar width
      const barWidth = this.activePerks.has('wide_sweet_spot') ? 0.38 : 0.25;
      const barLeft = p.reelSweetSpot;
      const barRight = p.reelSweetSpot + barWidth;
      const fishPos = p.reelNeedle || 0.5;

      const isCatching = fishPos >= barLeft && fishPos <= barRight;

      if (isCatching) {
        p.reelProgress = (p.reelProgress || 0.2) + (1 / 75);
        if (p.reelProgress >= 1.0) {
          this.catchFish(p);
        }
      } else {
        p.reelProgress = Math.max(0, (p.reelProgress || 0.2) - (1 / 180));
      }
    }
  }

  private catchFish(p: PlayerState): void {
    p.isFishing = false;
    p.fishingState = undefined;
    p.reelProgress = 0;
    p.totalFishBanked++;

    const speciesId = p.fishingTargetSpecies || 'guppy';
    const def = FISH_REGISTRY[speciesId];

    const boatCenterX = CANVAS_WIDTH / 2;
    const boatCenterY = CANVAS_HEIGHT / 2;
    const targetX = p.x + (boatCenterX - p.x) * 0.65 + (Math.random() - 0.5) * 40;
    const targetY = p.y + (boatCenterY - p.y) * 0.65 + (Math.random() - 0.5) * 30;

    const safeLandX = Math.max(DECK_BOUNDS.minX + 70, Math.min(DECK_BOUNDS.maxX - 70, targetX));
    const safeLandY = Math.max(DECK_BOUNDS.minY + 50, Math.min(DECK_BOUNDS.maxY - 50, targetY));

    const inwardVx = (boatCenterX - safeLandX) * 0.02;
    const inwardVy = (boatCenterY - safeLandY) * 0.02;

    const item: EntityItem = {
      id: `item_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      type: 'fish',
      speciesId,
      name: def.name,
      emoji: def.emoji,
      x: safeLandX,
      y: safeLandY,
      vx: inwardVx,
      vy: inwardVy,
      mass: def.mass,
      isHeld: false,
      heldByPlayerId: null,
      value: def.basePrice
    };

    this.state.items.push(item);
    this.onEvent?.('sfx', 'splash');
    this.addFeedMessage(`🐟 ${p.name} hauled ${def.name} (${def.mass}kg) onto center deck!`, 'score');
  }

  private handleThrow(p: PlayerState): void {
    if (!p.holdingItemId) return;
    const item = this.state.items.find(i => i.id === p.holdingItemId);
    if (!item) return;

    item.isHeld = false;
    item.heldByPlayerId = null;
    p.holdingItemId = null;

    let throwX = 0, throwY = 0;
    if (p.facing === 'right') throwX = PHYSICS.throwPower;
    else if (p.facing === 'left') throwX = -PHYSICS.throwPower;
    else if (p.facing === 'down') throwY = PHYSICS.throwPower;
    else if (p.facing === 'up') throwY = -PHYSICS.throwPower;

    item.vx = p.vx + throwX;
    item.vy = p.vy + throwY;

    // Bombfish thrown at Kraken Boss!
    if (item.speciesId === 'bombfish' && this.state.krakenBoss) {
      if (item.x < BOAT_BOUNDS.x + 80 || item.x > BOAT_BOUNDS.x + BOAT_BOUNDS.width - 80) {
        this.damageKraken(PHYSICS.bombfishKrakenDamage, 'Bombfish Artillery Strike');
      }
    }

    this.onEvent?.('sfx', 'throw');
    this.addFeedMessage(`🎯 ${p.name} threw ${item.name}!`, 'info');
  }

  private handleSlap(p: PlayerState): void {
    this.state.players.forEach(other => {
      if (other.id === p.id) return;
      const dist = Math.hypot(other.x - p.x, other.y - p.y);
      if (dist < 55) {
        const dx = other.x - p.x;
        const dy = other.y - p.y;
        const len = Math.hypot(dx, dy) || 1;
        other.vx += (dx / len) * PHYSICS.slapPower;
        other.vy += (dy / len) * PHYSICS.slapPower;
        other.isStunned = true;
        other.stunTimer = PHYSICS.slapStunDurationSeconds;

        if (other.holdingItemId) {
          const dropped = this.state.items.find(i => i.id === other.holdingItemId);
          if (dropped) {
            dropped.isHeld = false;
            dropped.heldByPlayerId = null;
            dropped.vx = other.vx * 1.5;
            dropped.vy = other.vy * 1.5;
          }
          other.holdingItemId = null;
          this.checkBounties('steal_fish', { attacker: p, victim: other });
        }

        this.onEvent?.('sfx', 'slap');
        this.addFeedMessage(`💥 ${p.name} SLAPPED ${other.name}!`, 'hazard');
        this.checkBounties('slap_player', { attacker: p, victim: other });
      }
    });

    // Slap Kraken Tentacle directly
    if (this.state.krakenBoss) {
      if (p.x < DECK_BOUNDS.minX + 30 && this.state.krakenBoss.portTentacleGrappling) {
        this.state.krakenBoss.portTentacleGrappling = false;
        this.damageKraken(PHYSICS.slapKrakenDamage, 'Slap Repel');
      } else if (p.x > DECK_BOUNDS.maxX - 30 && this.state.krakenBoss.starboardTentacleGrappling) {
        this.state.krakenBoss.starboardTentacleGrappling = false;
        this.damageKraken(PHYSICS.slapKrakenDamage, 'Slap Repel');
      }
    }
  }

  // --- 30-Second Dredged Crate Post-Round Draft Phase ---

  private finishLevelShift(): void {
    const isBoss = this.state.level.isBossLevel;

    // Check Quota condition (or boss HP for L5)
    if (!isBoss && this.levelTeamCashEarned < this.state.level.targetQuota) {
      this.triggerRunGameOver(`💀 FAILED QUOTA! Team only banked $${this.levelTeamCashEarned} of $${this.state.level.targetQuota}!`);
      return;
    }

    if (isBoss && this.state.krakenBoss && this.state.krakenBoss.currentHP > 0) {
      this.triggerRunGameOver(`💀 THE KRAKEN DRAGGED THE BOAT INTO THE ABYSS!`);
      return;
    }

    // Level Completed! If it was Level 4 (before boss), or earlier, launch 30s Crate Draft!
    if (this.currentLevelIndex < 4) {
      this.startDraftPhase();
    } else {
      this.triggerRunVictory();
    }
  }

  private startDraftPhase(): void {
    this.state.gameState = 'draft_phase';
    const draftCrates = generateDredgedDraft(this.unlockedStations, this.activePerks);

    const initialVotes: Record<string, string[]> = {};
    draftCrates.forEach(c => initialVotes[c.id] = []);

    this.state.draftState = {
      crates: draftCrates,
      timeLeftSeconds: 30,
      votes: initialVotes,
      isDecided: false,
      selectedCrateId: null,
      isCoinFlip: false
    };

    this.onEvent?.('sfx', 'victory');
    this.addFeedMessage(`📦 DREDGED CRATES AVAILABLE! 30s to vote on 1 boat upgrade!`, 'info');
    this.onDraftStart?.(this.state.draftState);
  }

  private updateDraftPhase(): void {
    const draft = this.state.draftState;
    if (!draft || draft.isDecided) return;

    draft.timeLeftSeconds -= 1 / 60;

    // Timer Expired -> Force Resolution!
    if (draft.timeLeftSeconds <= 0) {
      draft.timeLeftSeconds = 0;
      this.resolveDraftSelection();
    }
  }

  public voteForDraftCrate(playerId: string, crateId: string): void {
    const draft = this.state.draftState;
    if (!draft || draft.isDecided) return;

    // Remove player's previous vote from other crates
    Object.keys(draft.votes).forEach(id => {
      draft.votes[id] = draft.votes[id].filter(pId => pId !== playerId);
    });

    // Add new vote
    draft.votes[crateId].push(playerId);
    this.onEvent?.('sfx', 'pickup');

    // Check if absolute majority reached early
    const needed = Math.ceil(this.state.players.length / 2);
    if (draft.votes[crateId].length >= needed) {
      this.resolveDraftSelection(crateId);
      return;
    }

    this.onDraftUpdate?.(draft);
  }

  private resolveDraftSelection(forcedCrateId?: string): void {
    const draft = this.state.draftState;
    if (!draft || draft.isDecided) return;

    let winningCrateId = forcedCrateId;

    if (!winningCrateId) {
      // Find crate with highest votes
      let highestVotes = 0;
      let topCrates: string[] = [];

      Object.entries(draft.votes).forEach(([id, voters]) => {
        if (voters.length > highestVotes) {
          highestVotes = voters.length;
          topCrates = [id];
        } else if (voters.length === highestVotes && highestVotes > 0) {
          topCrates.push(id);
        }
      });

      if (topCrates.length === 1) {
        winningCrateId = topCrates[0];
      } else if (topCrates.length > 1) {
        // Tie-Breaker: Gary Coin Flip!
        draft.isCoinFlip = true;
        const randomPick = topCrates[Math.floor(Math.random() * topCrates.length)];
        winningCrateId = randomPick;
        this.addFeedMessage(`🎲 TIE-BREAKER! Uncle Gary's Coin Flip selected ${winningCrateId}!`, 'hazard');
      } else {
        // No votes cast -> Default to Skip / Save Funds ($0)
        winningCrateId = draft.crates[0]?.id || SKIP_DRAFT_CRATE.id;
      }
    }

    const crate = draft.crates.find(c => c.id === winningCrateId) || SKIP_DRAFT_CRATE;

    // Check affordability
    if (this.state.teamCash >= crate.cost) {
      this.state.teamCash -= crate.cost;
      draft.isDecided = true;
      draft.selectedCrateId = crate.id;

      // Apply Upgrade
      if (crate.stationType) {
        this.unlockedStations.add(crate.stationType);
        this.recentlyPurchasedStation = crate.stationType;
        this.state.stations = this.buildCurrentStations();
      }
      if (crate.perkEffect) {
        this.activePerks.add(crate.perkEffect);
        this.recentlyPurchasedStation = crate.perkEffect;
      }

      this.onEvent?.('sfx', 'victory');
      this.addFeedMessage(`🎉 UPGRADE ACQUIRED: ${crate.name}! Installed for next shift.`, 'score');
    } else {
      draft.isDecided = true;
      draft.selectedCrateId = SKIP_DRAFT_CRATE.id;
      this.addFeedMessage(`💰 Insufficient team funds for ${crate.name}. Banked funds saved.`, 'info');
    }

    this.onDraftUpdate?.(draft);
  }

  public proceedToNextLevel(): void {
    this.currentLevelIndex++;
    if (this.currentLevelIndex >= ROGUELITE_LEVELS.length) {
      this.triggerRunVictory();
      return;
    }

    const nextLvl = ROGUELITE_LEVELS[this.currentLevelIndex];
    this.state.level = nextLvl;
    this.state.currentLevelIndex = this.currentLevelIndex;
    this.state.gameState = 'playing';
    this.levelTimeLeft = nextLvl.timeLimitSeconds;
    this.levelTeamCashEarned = 0;
    this.state.quotaTarget = nextLvl.targetQuota;
    this.state.draftState = null;
    this.state.items = [];
    this.state.boatAngle = 0;
    this.readyPlayers.clear();

    // If Level 5 Boss, initialize Kraken HP
    if (nextLvl.isBossLevel) {
      this.state.krakenBoss = {
        currentHP: nextLvl.bossMaxHP || PHYSICS.krakenMaxHP,
        maxHP: nextLvl.bossMaxHP || PHYSICS.krakenMaxHP,
        portTentacleGrappling: false,
        starboardTentacleGrappling: false,
        portTentacleHP: 300,
        starboardTentacleHP: 300
      };
      this.addFeedMessage(`🐙 WARNING: THE ELDRITCH KRAKEN HAS SURFACED! 1200 HP!`, 'hazard');
    }

    this.state.players.forEach((p, i) => {
      p.x = i === 0 ? 320 : 640;
      p.y = 270;
      p.isFishing = false;
      p.holdingItemId = null;
    });

    this.refreshCorporateContract();
    this.refreshAllBounties();
    this.onEvent?.('sfx', 'bell');
    this.addFeedMessage(`🚨 LEVEL ${nextLvl.levelNumber}: ${nextLvl.name} STARTED!`, 'info');
  }

  public advanceContract(amount: number, label: string): void {
    const c = this.activeCorporateContract;
    if (!c || c.isCompleted || c.isFailed) return;

    c.currentCount += amount;
    this.addFeedMessage(`📋 CONTRACT +${amount} (${label}) — ${c.currentCount}/${c.targetCount}`, 'score');

    if (c.currentCount >= c.targetCount) {
      c.isCompleted = true;
      const bonus = c.baseRewardPoints * c.levelTier;
      this.state.teamCash += bonus;
      this.onEvent?.('sfx', 'victory');
      this.addFeedMessage(`🎉 CORPORATE CONTRACT COMPLETED: ${c.name}! +$${bonus} Team Cash Bonus!`, 'score');
    }

    this.onContractUpdate?.(c);
  }

  // --- End of Run Audit & Rewards ---

  private triggerRunGameOver(reason: string): void {
    this.state.gameState = 'game_over';
    const audit = this.computeEndgameAudit();
    this.state.endgameAudit = audit;
    this.onEvent?.('sfx', 'slap');
    this.onGameOver?.(reason, audit);
  }

  private triggerRunVictory(): void {
    this.state.gameState = 'victory_audit';
    const audit = this.computeEndgameAudit();
    this.state.endgameAudit = audit;
    this.onEvent?.('sfx', 'victory');
    this.onVictory?.(audit);
  }

  private computeEndgameAudit(): EndgameAuditRecord[] {
    let topLegal = -1;
    let topSaboteur = -1;
    let mvpIndex = 0;
    let ratIndex = 0;

    const records: EndgameAuditRecord[] = this.state.players.map((p, idx) => {
      if (p.totalLegalQuotaContributed > topLegal) {
        topLegal = p.totalLegalQuotaContributed;
        mvpIndex = idx;
      }
      if (p.totalSecretMeritPoints > topSaboteur) {
        topSaboteur = p.totalSecretMeritPoints;
        ratIndex = idx;
      }

      return {
        playerIndex: idx,
        name: p.name,
        colorHex: p.colorHex,
        totalQuotaContributed: p.totalLegalQuotaContributed,
        totalMeritPoints: p.totalSecretMeritPoints,
        completedBounties: [],
        isEmployeeOfTheRun: false,
        isUncleGaryGoldenRat: false
      };
    });

    if (records[mvpIndex]) records[mvpIndex].isEmployeeOfTheRun = true;
    if (records[ratIndex]) records[ratIndex].isUncleGaryGoldenRat = true;

    return records;
  }

  // --- Helper Methods ---

  public refreshAllBounties(): void {
    const tier = this.currentLevelIndex + 1;
    this.state.players.forEach((p, i) => {
      const b = generateGatedSecretBounty(i, tier, this.unlockedStations, this.activePerks);
      p.activeBounty = b;
      if (i === 0) {
        this.onBountyUpdate?.(b);
        this.onEvent?.('sfx', 'bounty_ring');
      }
    });
  }

  private checkBounties(type: string, data: any): void {
    this.state.players.forEach(p => {
      const b = p.activeBounty;
      if (!b || b.isCompleted) return;

      if (b.type === type) {
        b.currentCount++;
      }

      if (b.currentCount >= b.targetCount) {
        b.isCompleted = true;
        const totalPoints = b.baseRewardPoints * b.assignedLevelTier;
        p.totalSecretMeritPoints += totalPoints;
        this.onEvent?.('sfx', 'bounty_complete');
        this.addFeedMessage(`💰 BOUNTY COMPLETE! ${p.name} earned +${totalPoints} Merit Points!`, 'score');
        if (p.id === 'p1') {
          this.onBountyUpdate?.(b);
        }
      }
    });
  }

  private buildCurrentStations(): WorkStation[] {
    const list: WorkStation[] = [
      { id: 'st_cooler', type: 'cooler', name: 'Cooler Box', x: 420, y: 130, w: 120, h: 70, progress: 0, isProcessing: false, heldItem: null, minigameState: 'idle' },
      { id: 'st_trash', type: 'trash_chute', name: 'Trash Chute', x: 660, y: 350, w: 90, h: 60, progress: 0, isProcessing: false, heldItem: null, minigameState: 'idle' }
    ];

    if (this.unlockedStations.has('cutting_board')) {
      list.push({ id: 'st_cutting', type: 'cutting_board', name: 'Fillet Board', x: 210, y: 130, w: 90, h: 60, progress: 0, isProcessing: false, heldItem: null, minigameState: 'idle' });
    }
    if (this.unlockedStations.has('deep_fryer')) {
      list.push({ id: 'st_fryer', type: 'deep_fryer', name: 'Deep Fryer', x: 660, y: 130, w: 90, h: 60, progress: 0, isProcessing: false, heldItem: null, minigameState: 'idle' });
    }
    if (this.unlockedStations.has('soup_pot')) {
      list.push({ id: 'st_soup', type: 'soup_pot', name: 'Soup Kettle', x: 210, y: 350, w: 90, h: 60, progress: 0, isProcessing: false, heldItem: null, minigameState: 'idle' });
    }

    return list;
  }

  private isItemInStation(item: EntityItem, station: WorkStation): boolean {
    return (
      item.x >= station.x &&
      item.x <= station.x + station.w &&
      item.y >= station.y &&
      item.y <= station.y + station.h
    );
  }

  private triggerExplosion(x: number, y: number): void {
    this.onEvent?.('sfx', 'explosion');
    this.addFeedMessage('💣 BOOM! Volcanic Bombfish exploded!', 'hazard');

    this.state.players.forEach(p => {
      const dist = Math.hypot(p.x - x, p.y - y);
      if (dist < 180) {
        const force = (180 - dist) * 0.15;
        p.vx += ((p.x - x) / (dist || 1)) * force;
        p.vy += ((p.y - y) / (dist || 1)) * force;
        p.isStunned = true;
        p.stunTimer = 2.0;
      }
    });

    this.state.items.forEach(i => {
      const dist = Math.hypot(i.x - x, i.y - y);
      if (dist < 200) {
        const force = (200 - dist) * 0.2;
        i.vx += ((i.x - x) / (dist || 1)) * force;
        i.vy += ((i.y - y) / (dist || 1)) * force;
      }
    });
  }

  private updateOceanShadows(): void {
    this.oceanShadows.forEach(s => {
      s.x += s.vx;
      s.y += s.vy;
      if (s.x < 40) s.vx = Math.abs(s.vx);
      if (s.x > CANVAS_WIDTH - 40) s.vx = -Math.abs(s.vx);
      if (s.y < 30) s.vy = Math.abs(s.vy);
      if (s.y > CANVAS_HEIGHT - 30) s.vy = -Math.abs(s.vy);
    });
  }

  public toggleBot(playerIndex: number): void {
    if (playerIndex === 2) {
      this.botP3Active = !this.botP3Active;
      if (this.botP3Active && !this.state.players.find(p => p.id === 'p3')) {
        const prof = PLAYER_PROFILES[2];
        this.state.players.push({
          id: 'p3',
          playerIndex: 2,
          name: 'Chef Crimson (Bot)',
          color: 'red',
          colorHex: prof.colorHex,
          x: 480,
          y: 280,
          vx: 0,
          vy: 0,
          facing: 'up',
          isStunned: false,
          stunTimer: 0,
          isSlipping: false,
          isReady: true,
          holdingItemId: null,
          score: 0,
          privateCash: 0,
          activeBounty: generateGatedSecretBounty(2, this.currentLevelIndex + 1, this.unlockedStations, this.activePerks),
          contextualAction: null,
          isFishing: false,
          congaLeaderId: null,
          congaFollowerIds: [],
          totalFishBanked: 0,
          totalDishesCooked: 0,
          totalLegalQuotaContributed: 0,
          totalSecretMeritPoints: 0
        });
      } else if (!this.botP3Active) {
        this.state.players = this.state.players.filter(p => p.id !== 'p3');
      }
    }
  }

  private getBotInput(p: PlayerState): PlayerInput {
    const t = Date.now() * 0.002 + p.playerIndex;
    return {
      dx: Math.sin(t) * 0.8,
      dy: Math.cos(t * 1.3) * 0.8,
      actionPrimary: false,
      actionSecondary: Math.random() < 0.005,
      isActionPrimaryHeld: false
    };
  }

  public spawnFish(speciesId: FishSpeciesId, x?: number, y?: number): void {
    const def = FISH_REGISTRY[speciesId] || FISH_REGISTRY.guppy;
    const item: EntityItem = {
      id: `item_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      type: 'fish',
      speciesId,
      name: def.name,
      emoji: def.emoji,
      x: x ?? (360 + (Math.random() * 240 - 120)),
      y: y ?? (240 + (Math.random() * 120 - 60)),
      vx: (Math.random() - 0.5) * 4,
      vy: (Math.random() - 0.5) * 4,
      mass: def.mass,
      isHeld: false,
      heldByPlayerId: null,
      value: def.basePrice
    };

    this.state.items.push(item);
    this.addFeedMessage(`🎣 Spawned ${def.name} (${def.mass}kg)`, 'info');
  }

  public addFeedMessage(text: string, type: 'info' | 'bounty' | 'hazard' | 'score'): void {
    this.state.feedMessages.push({
      id: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
      text,
      type,
      time: Date.now()
    });
    if (this.state.feedMessages.length > 7) {
      this.state.feedMessages.shift();
    }
  }

  public reset(): void {
    this.currentLevelIndex = 0;
    const firstLvl = ROGUELITE_LEVELS[0];
    this.state.level = firstLvl;
    this.state.currentLevelIndex = 0;
    this.state.gameState = 'playing';
    this.levelTimeLeft = firstLvl.timeLimitSeconds;
    this.levelTeamCashEarned = 0;
    this.state.quotaTarget = firstLvl.targetQuota;
    this.state.teamCash = 0;
    this.state.boatAngle = 0;
    this.state.items = [];
    this.state.draftState = null;
    this.state.krakenBoss = null;
    this.unlockedStations = new Set(['cooler']);
    this.activePerks.clear();
    this.state.stations = this.buildCurrentStations();
    this.state.players.forEach((p, i) => {
      p.x = i === 0 ? 320 : 640;
      p.y = 270;
      p.isFishing = false;
      p.holdingItemId = null;
      p.totalFishBanked = 0;
      p.totalDishesCooked = 0;
      p.totalLegalQuotaContributed = 0;
      p.totalSecretMeritPoints = 0;
    });
    this.refreshAllBounties();
    this.addFeedMessage('🔄 15-Minute Roguelite Run Reset! Level 1: Sweetwater Shallows.', 'info');
  }
}
