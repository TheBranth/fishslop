import { LocalGameEngine } from './engine/LocalGameEngine';
import { GameRenderer } from './engine/GameRenderer';
import { SoundSystem } from './engine/SoundSystem';
import { MinigameController } from './engine/MinigameController';
import { NetworkManager } from './engine/NetworkManager';
import { FISH_REGISTRY } from '../shared/fishDatabase';
import { DredgedDraftState, EndgameAuditRecord, SecretBounty, PlayerInput } from '../shared/types';

export class GameApp {
  public engine: LocalGameEngine;
  public renderer: GameRenderer;
  public soundSystem: SoundSystem;
  public minigameController: MinigameController;
  public networkManager: NetworkManager = new NetworkManager();

  public playMode: 'local' | 'remote_host' | 'remote_viewer' = 'local';
  public roomCode: string | null = null;
  public roomPassword?: string;
  public remoteState: any = null;

  private canvas: HTMLCanvasElement;
  private isAudioEnabled: boolean = true;
  private keysDown: Set<string> = new Set();
  private lastTime: number = performance.now();
  private channel: BroadcastChannel | null = null;

  constructor() {
    this.canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
    this.renderer = new GameRenderer(this.canvas);
    this.soundSystem = new SoundSystem();
    this.engine = new LocalGameEngine();
    this.minigameController = new MinigameController(this.canvas, this.soundSystem);

    this.setupEventListeners();
    this.setupBroadcastBus();
    this.setupNetworkManager();
    this.setupEngineCallbacks();
    this.populateFishopedia();
    this.initTitleScreen();
    this.checkInitialURLParams();
    this.initLoop();
  }

  private setupNetworkManager(): void {
    // When remote player inputs arrive (on Host)
    this.networkManager.onRemoteInput = (data) => {
      if (this.playMode === 'remote_host' || this.playMode === 'local') {
        const input = data.input;
        if (data.playerIndex === 0) this.engine.p1Input = { ...input };
        else if (data.playerIndex === 1) this.engine.p2Input = { ...input };
        else if (data.playerIndex === 2) {
          if (this.engine.botP3Active) this.engine.botP3Active = false;
          (this.engine as any).p3Input = { ...input };
        }
      }
    };

    // When remote draft votes arrive (on Host)
    this.networkManager.onRemoteDraftVote = (data) => {
      if (this.playMode === 'remote_host' || this.playMode === 'local') {
        this.engine.voteForDraftCrate(`p${data.playerIndex + 1}`, data.crateId);
      }
    };

    // When remote viewer receives host state updates
    this.networkManager.onStateUpdate = (state) => {
      if (this.playMode === 'remote_viewer') {
        this.remoteState = state;
      }
    };

    this.networkManager.onRemotePlayerJoined = (data) => {
      this.soundSystem.play('bell');
      this.engine.addFeedMessage(`👋 Sailor joined virtual room (${data.name || 'P' + ((data.playerIndex || 0) + 1)})!`, 'info');
      this.updateTitleLobbyCrew();
    };

    // VIP Player 1 casts off from phone controller!
    this.networkManager.onStartRoundFromPhone = () => {
      this.startRoundFromPhoneVIP();
    };
  }

  private checkInitialURLParams(): void {
    const params = new URLSearchParams(window.location.search);
    const room = params.get('room');
    const pwd = params.get('pwd') || undefined;

    if (room) {
      this.joinRemoteRoomDirect(room, pwd);
      this.hideTitleScreen();
    } else {
      this.showTitleScreen();
    }
  }

  private setupBroadcastBus(): void {
    try {
      this.channel = new BroadcastChannel('friendslop_game_bus');
      this.channel.onmessage = (event) => {
        const { type, playerId, input, crateId } = event.data;

        if (type === 'PLAYER_INPUT') {
          if (playerId === 'p1') {
            this.engine.p1Input = { ...input };
          } else if (playerId === 'p2') {
            this.engine.p2Input = { ...input };
          }
        } else if (type === 'VOTE_DRAFT_CRATE') {
          this.engine.voteForDraftCrate(playerId, crateId);
        } else if (type === 'START_ROUND_FROM_PHONE') {
          this.startRoundFromPhoneVIP();
        }
      };
    } catch (e) {
      console.warn('BroadcastChannel error:', e);
    }
  }

  private setupEventListeners(): void {
    window.addEventListener('keydown', (e) => {
      this.keysDown.add(e.code);

      // Number key voting for 30s Crate Draft
      if (this.engine.state.gameState === 'draft_phase' && this.engine.state.draftState) {
        if (e.code === 'Digit1') this.voteCrate(0);
        if (e.code === 'Digit2') this.voteCrate(1);
        if (e.code === 'Digit3') this.voteCrate(2);
      }

      this.updatePlayerInputs();
    });

    window.addEventListener('keyup', (e) => {
      this.keysDown.delete(e.code);
      this.updatePlayerInputs();
    });

    // Mouse controls on Canvas (Left Click = Action/Work, Right Click = Chaos/Slap/Throw)
    this.canvas.addEventListener('mousedown', (e) => {
      if (e.button === 0) {
        this.engine.p1Input.actionPrimary = true;
        this.engine.p1Input.isActionPrimaryHeld = true;
      } else if (e.button === 2) {
        this.engine.p1Input.actionSecondary = true;
      }
    });

    this.canvas.addEventListener('contextmenu', (e) => e.preventDefault());

    window.addEventListener('mouseup', (e) => {
      if (e.button === 0) {
        this.engine.p1Input.isActionPrimaryHeld = false;
      }
    });

    // Orientation detector
    const checkOrientation = () => {
      const overlay = document.getElementById('mobile-rotate-overlay');
      if (window.innerWidth < 768 && window.innerHeight > window.innerWidth) {
        overlay?.classList.remove('hidden');
        overlay?.classList.add('flex');
      } else {
        overlay?.classList.add('hidden');
        overlay?.classList.remove('flex');
      }
    };
    window.addEventListener('resize', checkOrientation);
    checkOrientation();
  }

  private updatePlayerInputs(): void {
    // Player 1 (Blue): WASD + Space/J (Button 1: Action/Work/Drop), K (Button 2: Chaos/Slap/Throw)
    let p1dx = 0, p1dy = 0;
    if (this.keysDown.has('KeyA')) p1dx -= 1;
    if (this.keysDown.has('KeyD')) p1dx += 1;
    if (this.keysDown.has('KeyW')) p1dy -= 1;
    if (this.keysDown.has('KeyS')) p1dy += 1;

    const p1ActionHeld = this.keysDown.has('Space') || this.keysDown.has('KeyJ');

    this.engine.p1Input = {
      dx: p1dx,
      dy: p1dy,
      actionPrimary: this.keysDown.has('Space') || this.keysDown.has('KeyJ'),
      actionSecondary: this.keysDown.has('KeyK'),
      isActionPrimaryHeld: p1ActionHeld
    };

    // Player 2 (Gold): Arrows + Enter/N (Button 1: Action/Work/Drop), M (Button 2: Chaos/Slap/Throw)
    let p2dx = 0, p2dy = 0;
    if (this.keysDown.has('ArrowLeft')) p2dx -= 1;
    if (this.keysDown.has('ArrowRight')) p2dx += 1;
    if (this.keysDown.has('ArrowUp')) p2dy -= 1;
    if (this.keysDown.has('ArrowDown')) p2dy += 1;

    const p2ActionHeld = this.keysDown.has('Enter') || this.keysDown.has('KeyN');

    this.engine.p2Input = {
      dx: p2dx,
      dy: p2dy,
      actionPrimary: this.keysDown.has('Enter') || this.keysDown.has('KeyN'),
      actionSecondary: this.keysDown.has('KeyM'),
      isActionPrimaryHeld: p2ActionHeld
    };

    // If playing as remote viewer, send player inputs to the virtual room host
    if (this.playMode === 'remote_viewer') {
      const viewerInput: PlayerInput = {
        dx: p1dx !== 0 ? p1dx : p2dx,
        dy: p1dy !== 0 ? p1dy : p2dy,
        actionPrimary: (this.keysDown.has('Space') || this.keysDown.has('KeyJ') || this.keysDown.has('Enter') || this.keysDown.has('KeyN')),
        actionSecondary: (this.keysDown.has('KeyK') || this.keysDown.has('KeyM')),
        isActionPrimaryHeld: p1ActionHeld || p2ActionHeld
      };
      this.networkManager.sendInput(viewerInput);
    }
  }

  private setupEngineCallbacks(): void {
    this.engine.onEvent = (type, soundName, extra) => {
      if (type === 'sfx' && this.isAudioEnabled) {
        this.soundSystem.play(soundName);
      } else if (type === 'popup' && extra) {
        this.renderer.addPopup(extra.text, extra.color, extra.x, extra.y);
      }
    };

    this.engine.onBountyUpdate = (bounty: SecretBounty) => {
      const title = document.getElementById('bounty-title');
      const desc = document.getElementById('bounty-desc');
      const excuse = document.getElementById('bounty-excuse');
      const progress = document.getElementById('bounty-progress');
      const reward = document.getElementById('bounty-reward');
      const levelTag = document.getElementById('phone-level-tag');

      if (title) title.textContent = bounty.title;
      if (desc) desc.textContent = bounty.description;
      if (excuse) excuse.textContent = `"${(bounty as any).plausibleExcuse || 'The boat tilted so fast I lost my grip!'}"`;
      if (progress) progress.textContent = `Progress: ${bounty.currentCount} / ${bounty.targetCount}`;
      if (reward) reward.textContent = `+${bounty.baseRewardPoints * bounty.assignedLevelTier} Merit Points`;
      if (levelTag) levelTag.textContent = `LEVEL ${bounty.assignedLevelTier} TIER (${bounty.assignedLevelTier}x PTS)`;
    };

    this.engine.onContractUpdate = (contract) => {
      const name = document.getElementById('hud-contract-name');
      const badge = document.getElementById('hud-contract-badge');
      const penalty = document.getElementById('hud-contract-penalty');

      if (name) name.textContent = contract.name;
      if (badge) {
        if (contract.isCompleted) {
          badge.textContent = 'COMPLETED ✅';
          badge.className = 'text-[9px] font-mono px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 font-bold';
        } else if (contract.isFailed) {
          badge.textContent = 'FAILED ❌';
          badge.className = 'text-[9px] font-mono px-1.5 py-0.2 rounded bg-rose-500/20 text-rose-300 font-bold';
        } else {
          badge.textContent = `${contract.currentCount} / ${contract.targetCount} ${contract.targetUnit}`;
          badge.className = 'text-[9px] font-mono px-1.5 py-0.2 rounded bg-teal-500/20 text-teal-300';
        }
      }
      if (penalty) penalty.textContent = contract.instantPenaltyRule;
    };

    // 30s Dredged Crate Draft Phase Open
    this.engine.onDraftStart = (draft: DredgedDraftState) => {
      this.renderDraftModal(draft);
      document.getElementById('modal-dredged-draft')?.classList.remove('hidden');
    };

    this.engine.onDraftUpdate = (draft: DredgedDraftState) => {
      this.renderDraftModal(draft);
    };

    // Grand Endgame Audit (Victory or Game Over)
    this.engine.onGameOver = (reason: string, audit: EndgameAuditRecord[]) => {
      this.renderAuditModal('💀 RUN OVER!', reason, audit, false);
    };

    this.engine.onVictory = (audit: EndgameAuditRecord[]) => {
      this.renderAuditModal('🏆 ALL 5 LEVELS CLEARED!', 'The Eldritch Kraken was vanquished and the boat returned triumphant!', audit, true);
    };
  }

  // --- 30s Dredged Crate Draft UI Rendering ---

  private voteCrate(crateIndex: number): void {
    const draft = this.engine.state.draftState;
    if (!draft || !draft.crates[crateIndex]) return;
    this.engine.voteForDraftCrate('p1', draft.crates[crateIndex].id);
  }

  public voteCrateById(crateId: string): void {
    this.engine.voteForDraftCrate('p1', crateId);
  }

  private renderDraftModal(draft: DredgedDraftState): void {
    const container = document.getElementById('draft-crates-container');
    const timer = document.getElementById('draft-countdown-timer');
    const teamBank = document.getElementById('draft-team-bank');

    if (timer) timer.textContent = `${Math.ceil(draft.timeLeftSeconds)}s`;
    if (teamBank) teamBank.textContent = `$${this.engine.state.teamCash}`;

    if (!container) return;

    container.innerHTML = draft.crates.map((crate, idx) => {
      const isSelected = draft.selectedCrateId === crate.id;
      const voters = draft.votes[crate.id] || [];
      const voterBadges = voters.map(id => {
        const color = id === 'p1' ? 'bg-sky-400 text-slate-950' : 'bg-yellow-400 text-slate-950';
        const label = id === 'p1' ? 'P1' : 'P2';
        return `<span class="w-6 h-6 rounded-full ${color} font-black text-[10px] flex items-center justify-center shadow-md">${label}</span>`;
      }).join('');

      const canAfford = this.engine.state.teamCash >= crate.cost;
      const borderStyle = isSelected 
        ? 'border-2 border-emerald-400 bg-emerald-950/60 shadow-xl' 
        : voters.length > 0 
        ? 'border border-teal-500 bg-slate-900' 
        : 'border border-slate-800 bg-slate-950';

      return `
        <div onclick="window.gameApp.voteCrateById('${crate.id}')" class="${borderStyle} p-4 rounded-2xl flex flex-col justify-between space-y-3 cursor-pointer hover:border-teal-400 transition select-none">
          <div>
            <div class="flex items-center justify-between">
              <span class="text-2xl">${crate.emoji}</span>
              <span class="font-mono font-bold text-xs ${canAfford ? 'text-teal-400' : 'text-rose-400'}">$${crate.cost}</span>
            </div>
            <h4 class="font-bold text-white text-sm mt-1.5">${crate.name}</h4>
            <p class="text-[11px] text-slate-400 mt-1 leading-relaxed">${crate.description}</p>
          </div>

          <div class="pt-2 border-t border-slate-800 flex items-center justify-between">
            <span class="text-[10px] text-slate-500 font-mono">Press ${idx + 1} or Click</span>
            <div class="flex items-center space-x-1">
              ${voterBadges || `<span class="text-[10px] text-slate-500 font-mono">0 Votes</span>`}
            </div>
          </div>
        </div>
      `;
    }).join('');
  }

  public proceedNextLevel(): void {
    document.getElementById('modal-dredged-draft')?.classList.add('hidden');
    this.engine.proceedToNextLevel();
  }

  // --- Grand Endgame Audit Modal ---

  private renderAuditModal(title: string, subtitle: string, audit: EndgameAuditRecord[], isVictory: boolean): void {
    const modal = document.getElementById('modal-endgame-audit');
    const badge = document.getElementById('audit-banner-badge');
    const bannerTitle = document.getElementById('audit-banner-title');
    const bannerSubtitle = document.getElementById('audit-banner-subtitle');

    if (badge) {
      badge.textContent = isVictory ? 'CAMPAIGN COMPLETED' : 'EXPEDITION FAILED';
      badge.className = `inline-block px-3 py-1 rounded-full text-xs font-black font-mono uppercase ${isVictory ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40' : 'bg-rose-500/20 text-rose-400 border border-rose-500/40'}`;
    }
    if (bannerTitle) bannerTitle.textContent = title;
    if (bannerSubtitle) bannerSubtitle.textContent = subtitle;

    const mvp = audit.find(a => a.isEmployeeOfTheRun) || audit[0];
    const rat = audit.find(a => a.isUncleGaryGoldenRat) || audit[1] || audit[0];

    const mvpName = document.getElementById('audit-mvp-name');
    const mvpStat = document.getElementById('audit-mvp-stat');
    const ratName = document.getElementById('audit-rat-name');
    const ratStat = document.getElementById('audit-rat-stat');

    if (mvpName) mvpName.textContent = mvp?.name || 'Player 1';
    if (mvpStat) mvpStat.textContent = `$${mvp?.totalQuotaContributed || 0} Legal Quota Banked`;
    if (ratName) ratName.textContent = rat?.name || 'Player 2';
    if (ratStat) ratStat.textContent = `${rat?.totalMeritPoints || 0} Gary-OS Merit PTS`;

    const roster = document.getElementById('audit-crew-roster');
    if (roster) {
      roster.innerHTML = audit.map(rec => `
        <div class="bg-slate-950 p-3.5 rounded-2xl border border-slate-800 flex items-center justify-between">
          <div class="flex items-center space-x-3">
            <span class="w-4 h-4 rounded-full" style="background-color: ${rec.colorHex}"></span>
            <div>
              <div class="font-bold text-white text-xs">${rec.name}</div>
              <div class="text-[10px] text-slate-400">Quota: $${rec.totalQuotaContributed} | Merit PTS: ${rec.totalMeritPoints}</div>
            </div>
          </div>
          <div class="flex items-center space-x-2">
            ${rec.isEmployeeOfTheRun ? '<span class="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-mono font-bold text-[10px] border border-emerald-500/40">🏆 MVP</span>' : ''}
            ${rec.isUncleGaryGoldenRat ? '<span class="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 font-mono font-bold text-[10px] border border-amber-500/40">🐀 GOLDEN RAT</span>' : ''}
          </div>
        </div>
      `).join('');
    }

    modal?.classList.remove('hidden');
  }

  // --- Main Animation Loop & HUD Refresh ---

  private initLoop(): void {
    const loop = (currentTime: number) => {
      const dt = Math.min(0.1, (currentTime - this.lastTime) / 1000);
      this.lastTime = currentTime;

      if (this.playMode === 'remote_viewer') {
        // Remote viewer renders synced state from the host
        if (this.remoteState) {
          this.renderer.render(this.remoteState, []);
          this.updateHUD(this.remoteState);
        }
      } else {
        // Local TV or Remote Host runs authoritative simulation
        this.engine.tick();
        this.minigameController.updateReel(dt);
        this.minigameController.updateFillet(dt);
        this.minigameController.updateFryer(dt);
        this.minigameController.updateSonar(dt);
        this.minigameController.updateRinse(dt);

        this.renderer.render(this.engine.state, this.engine.oceanShadows);
        this.minigameController.renderOverlay();

        // Broadcast host state snapshot to remote room & local bus
        this.networkManager.broadcastHostState(this.engine.state);
        this.updateHUD(this.engine.state);
      }

      // Dynamic Sea Shanty Background Music Tempo Transition
      if (this.isAudioEnabled) {
        const activeState = this.playMode === 'remote_viewer' && this.remoteState ? this.remoteState : this.engine.state;
        if (activeState && activeState.gameState === 'playing') {
          if (activeState.timeLeft <= 18) {
            this.soundSystem.setMusicIntensity('panic');
          } else if (activeState.level?.isBossLevel) {
            this.soundSystem.setMusicIntensity('boss');
          } else {
            this.soundSystem.setMusicIntensity('normal');
          }
        }
      }

      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }

  private updateHUD(activeState?: any): void {
    const state = activeState || this.engine.state;
    if (!state || !state.level) return;
    const isBoss = state.level.isBossLevel;

    // Level Badge & Subtitle
    const lvlBadge = document.getElementById('hud-level-badge');
    const lvlSubtitle = document.getElementById('hud-level-subtitle');
    if (lvlBadge) lvlBadge.textContent = `LEVEL ${state.level.levelNumber} / 5`;
    if (lvlSubtitle) lvlSubtitle.textContent = `${state.level.name} — ${state.level.subtitle}`;

    // Timer Clock
    const timer = document.getElementById('hud-timer-clock');
    if (timer) {
      const s = Math.ceil(state.timeLeft);
      const min = Math.floor(s / 60);
      const sec = s % 60;
      timer.textContent = `${min.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
      timer.className = s <= 15 ? 'text-xl font-black font-mono text-rose-500 animate-pulse' : 'text-xl font-black font-mono text-white';
    }

    // Team Cash & Quota
    const cash = document.getElementById('hud-team-cash');
    const quota = document.getElementById('hud-quota-target');
    if (cash) cash.textContent = `$${state.teamCash}`;
    if (quota) quota.textContent = isBoss ? '1200 BOSS HP' : `$${state.quotaTarget}`;

    // Tilt Gauge
    const tiltBar = document.getElementById('tilt-gauge-bar');
    const tiltDeg = document.getElementById('hud-tilt-deg');
    if (tiltBar && tiltDeg) {
      const pct = 50 + (state.boatAngle / 35) * 50;
      tiltBar.style.width = `${Math.max(0, Math.min(100, pct))}%`;

      const deg = Math.abs(state.boatAngle).toFixed(1);
      const dir = state.boatAngle < -1 ? 'Port' : state.boatAngle > 1 ? 'Starboard' : 'Stable';
      tiltDeg.textContent = `${deg}° (${dir})`;

      if (Math.abs(state.boatAngle) >= 30) {
        tiltDeg.className = 'text-[10px] font-mono text-rose-500 font-black animate-pulse';
        tiltDeg.textContent = `🚨 CAPSIZING IN ${Math.max(0, (2.5 - state.capsizingTimer)).toFixed(1)}s!`;
      } else {
        tiltDeg.className = 'text-[10px] font-mono text-amber-300 font-bold';
      }
    }

    // Live Feed
    const feed = document.getElementById('live-feed-container');
    if (feed && state.feedMessages) {
      feed.innerHTML = state.feedMessages.map((msg: any) => {
        const bg = msg.type === 'score' ? 'bg-emerald-950/90 text-emerald-300 border-emerald-500/40' :
                   msg.type === 'hazard' ? 'bg-rose-950/90 text-rose-300 border-rose-500/40' :
                   'bg-slate-900/90 text-slate-200 border-slate-700';
        return `<div class="px-2.5 py-1 rounded-xl text-[11px] border font-medium shadow-lg backdrop-blur ${bg}">${msg.text}</div>`;
      }).join('');
    }
  }

  // --- Modal Helpers & Public Sandbox Controls ---

  public toggleGaryPhone(): void {
    const modal = document.getElementById('modal-gary-phone');
    modal?.classList.toggle('hidden');
  }

  public togglePhoneModal(): void {
    const modal = document.getElementById('modal-phone-connect');
    const qrImg = document.getElementById('qr-code-img') as HTMLImageElement;
    if (qrImg) {
      const url = `${window.location.origin}/controller.html`;
      qrImg.src = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(url)}`;
    }
    modal?.classList.toggle('hidden');
  }

  public toggleFishopedia(): void {
    const modal = document.getElementById('modal-fishopedia');
    modal?.classList.toggle('hidden');
  }

  public toggleAudio(): void {
    this.isAudioEnabled = !this.isAudioEnabled;
    const btn = document.getElementById('btn-audio');
    if (btn) {
      btn.innerHTML = this.isAudioEnabled ? '<i class="fa-solid fa-volume-high text-teal-400"></i>' : '<i class="fa-solid fa-volume-xmark text-slate-500"></i>';
    }
    if (this.isAudioEnabled) {
      this.soundSystem.startSeaShantyMusic();
    } else {
      this.soundSystem.stopMusic();
    }
  }

  public spawn(speciesId: string): void {
    this.soundSystem.play('pickup');
    this.engine.spawnFish(speciesId as any);
  }

  public resetSandbox(): void {
    document.getElementById('modal-endgame-audit')?.classList.add('hidden');
    document.getElementById('modal-dredged-draft')?.classList.add('hidden');
    this.soundSystem.play('bell');
    this.engine.reset();
  }

  public setTiltSensitivity(val: number): void {
    this.engine.tiltSensitivity = val;
    const lbl = document.getElementById('lbl-tilt');
    if (lbl) lbl.textContent = `${val.toFixed(2)}x`;
  }

  public setFriction(val: number): void {
    this.engine.deckFriction = val;
    const lbl = document.getElementById('lbl-friction');
    if (lbl) lbl.textContent = val.toFixed(2);
  }

  public toggleDebugMass(val: boolean): void {
    this.renderer.showDebugMass = val;
  }

  public toggleBot(idx: number): void {
    this.engine.toggleBot(idx);
    const lbl = document.getElementById('lbl-bot3-status');
    if (lbl) lbl.textContent = this.engine.botP3Active ? 'ON' : 'OFF';
  }

  private populateFishopedia(): void {
    const grid = document.getElementById('fishopedia-grid');
    if (!grid) return;

    grid.innerHTML = Object.values(FISH_REGISTRY).map(fish => `
      <div class="bg-slate-950 p-3 rounded-2xl border border-slate-800 flex items-center space-x-3">
        <div class="text-3xl">${fish.emoji}</div>
        <div class="flex-1 text-xs">
          <div class="flex items-center justify-between">
            <strong class="text-white">${fish.name}</strong>
            <span class="text-amber-400 font-mono font-bold">$${fish.basePrice}</span>
          </div>
          <p class="text-[11px] text-slate-400 mt-0.5 leading-snug">${fish.description}</p>
          <div class="text-[10px] text-teal-400 font-mono mt-1">Mass: ${fish.mass}kg | Tier: ${fish.tier}</div>
        </div>
      </div>
    `).join('');
  }

  // =========================================================
  // TITLE SCREEN / FIRST PAGE CONTROLLER & SETTINGS
  // =========================================================

  private debounceTimer: any = null;

  public initTitleScreen(): void {
    const origin = window.location.origin;

    // 1. Smart TV Zero-Remote Quickstart QR Badge
    const quickstartQr = document.getElementById('quickstart-qr-img') as HTMLImageElement;
    if (quickstartQr) {
      const quickstartUrl = `${origin}/controller.html?player=p1`;
      quickstartQr.src = `https://api.qrserver.com/v1/create-qr-code/?size=260x260&data=${encodeURIComponent(quickstartUrl)}`;
    }

    // 2. Local TV Party QR Code & Direct Link
    const localQr = document.getElementById('local-qr-img') as HTMLImageElement;
    const localJoinUrl = document.getElementById('local-join-url');
    const localUrl = `${origin}/controller.html`;
    if (localQr) {
      localQr.src = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(localUrl)}`;
    }
    if (localJoinUrl) {
      localJoinUrl.textContent = localUrl;
    }

    // 3. Online Room Name Debounced Duplicate Check
    const roomInput = document.getElementById('input-title-room-name') as HTMLInputElement;
    if (roomInput) {
      this.randomizeRoomName();
      roomInput.addEventListener('input', () => {
        const val = roomInput.value.trim().toUpperCase();
        clearTimeout(this.debounceTimer);
        this.debounceTimer = setTimeout(() => {
          this.checkTitleRoomName(val);
        }, 300);
      });
    }

    // 4. Load Saved Audio & Display Settings
    this.loadSettingsUI();
  }

  private loadSettingsUI(): void {
    const masterSlider = document.getElementById('slider-vol-master') as HTMLInputElement;
    const sfxSlider = document.getElementById('slider-vol-sfx') as HTMLInputElement;
    const musicSlider = document.getElementById('slider-vol-music') as HTMLInputElement;
    const langSelect = document.getElementById('select-game-language') as HTMLSelectElement;

    if (masterSlider) masterSlider.value = String(Math.round(this.soundSystem.masterVolume * 100));
    if (sfxSlider) sfxSlider.value = String(Math.round(this.soundSystem.sfxVolume * 100));
    if (musicSlider) musicSlider.value = String(Math.round(this.soundSystem.musicVolume * 100));

    const lblMaster = document.getElementById('lbl-vol-master');
    const lblSfx = document.getElementById('lbl-vol-sfx');
    const lblMusic = document.getElementById('lbl-vol-music');
    if (lblMaster) lblMaster.textContent = `${Math.round(this.soundSystem.masterVolume * 100)}%`;
    if (lblSfx) lblSfx.textContent = `${Math.round(this.soundSystem.sfxVolume * 100)}%`;
    if (lblMusic) lblMusic.textContent = `${Math.round(this.soundSystem.musicVolume * 100)}%`;

    const savedLang = localStorage.getItem('friendslop_lang') || 'en';
    if (langSelect) langSelect.value = savedLang;
  }

  public showTitleScreen(): void {
    document.getElementById('title-screen-container')?.classList.remove('hidden');
    this.showTitleView('menu');
  }

  public hideTitleScreen(): void {
    document.getElementById('title-screen-container')?.classList.add('hidden');
  }

  public showTitleView(viewName: string): void {
    const views = ['menu', 'local', 'online-form', 'online-lobby', 'online-join', 'settings'];
    views.forEach(v => {
      document.getElementById(`title-view-${v}`)?.classList.add('hidden');
    });
    document.getElementById(`title-view-${viewName}`)?.classList.remove('hidden');

    if (viewName === 'online-form') {
      const roomInput = document.getElementById('input-title-room-name') as HTMLInputElement;
      if (roomInput && roomInput.value) {
        this.checkTitleRoomName(roomInput.value);
      }
    }
  }

  public async checkTitleRoomName(name: string): Promise<boolean> {
    const statusElem = document.getElementById('room-name-status');
    const clean = name.trim().toUpperCase();
    if (!clean || clean.length < 2) {
      if (statusElem) {
        statusElem.textContent = 'Min 2 chars';
        statusElem.className = 'text-[10px] font-mono text-amber-400 font-bold';
      }
      return false;
    }

    try {
      const res = await this.networkManager.checkRoom(clean);
      if (statusElem) {
        if (res.available) {
          statusElem.textContent = '✓ Available';
          statusElem.className = 'text-[10px] font-mono text-emerald-400 font-bold';
        } else {
          statusElem.textContent = '⚠️ Room name already taken!';
          statusElem.className = 'text-[10px] font-mono text-rose-400 font-bold';
        }
      }
      return res.available;
    } catch (e) {
      return true;
    }
  }

  public randomizeRoomName(): void {
    const letters = 'BCDFGHJKLMNPQRSTVWXYZ';
    let code = '';
    for (let i = 0; i < 4; i++) {
      code += letters.charAt(Math.floor(Math.random() * letters.length));
    }
    const input = document.getElementById('input-title-room-name') as HTMLInputElement;
    if (input) {
      input.value = code;
      this.checkTitleRoomName(code);
    }
  }

  public startLocalGameFromTitle(): void {
    this.playMode = 'local';
    this.hideTitleScreen();
    const modeText = document.getElementById('hud-mode-text');
    if (modeText) modeText.textContent = 'Local TV';
    document.getElementById('hud-room-badge')?.classList.add('hidden');

    const origin = window.location.origin;
    this.updatePhoneModalLinks('LOCAL', `${origin}/controller.html`);
    this.soundSystem.play('bell');

    if (this.isAudioEnabled) {
      this.soundSystem.startSeaShantyMusic();
    }
  }

  public copyLocalControllerUrl(): void {
    const url = `${window.location.origin}/controller.html`;
    navigator.clipboard?.writeText(url).then(() => {
      this.soundSystem.play('pickup');
      this.engine.addFeedMessage('📋 Copied local controller link to clipboard!', 'info');
    });
  }

  public async createOnlineRoomFromTitle(): Promise<void> {
    const nameInput = document.getElementById('input-title-room-name') as HTMLInputElement;
    const pwdInput = document.getElementById('input-title-room-pwd') as HTMLInputElement;
    const errElem = document.getElementById('title-create-error');

    const roomName = nameInput?.value?.trim()?.toUpperCase();
    const password = pwdInput?.value?.trim() || undefined;

    if (!roomName || roomName.length < 2) {
      if (errElem) {
        errElem.textContent = 'Please provide a room name of at least 2 characters.';
        errElem.classList.remove('hidden');
      }
      return;
    }

    if (errElem) errElem.classList.add('hidden');

    try {
      const res = await this.networkManager.createRoom(roomName, password);
      this.playMode = 'remote_host';
      this.roomCode = res.roomCode;
      this.roomPassword = password;

      // Populate online lobby view
      const lobbyCode = document.getElementById('title-lobby-code');
      const lobbyLock = document.getElementById('title-lobby-lock');
      const lobbyQr = document.getElementById('title-lobby-qr-img') as HTMLImageElement;
      const lobbyUrl = document.getElementById('title-lobby-join-url');

      if (lobbyCode) lobbyCode.textContent = res.roomCode;
      if (lobbyLock) {
        if (res.hasPassword) lobbyLock.classList.remove('hidden');
        else lobbyLock.classList.add('hidden');
      }
      if (lobbyQr && res.qrUrl) lobbyQr.src = res.qrUrl;
      if (lobbyUrl) lobbyUrl.textContent = res.joinUrl;

      // Update Top HUD Room Badge
      const roomBadge = document.getElementById('hud-room-badge');
      const roomCodeElem = document.getElementById('hud-room-code');
      const roomLockElem = document.getElementById('hud-room-lock');
      const modeText = document.getElementById('hud-mode-text');

      if (roomBadge) roomBadge.classList.remove('hidden');
      if (roomCodeElem) roomCodeElem.textContent = res.roomCode;
      if (roomLockElem) {
        if (res.hasPassword) roomLockElem.classList.remove('hidden');
        else roomLockElem.classList.add('hidden');
      }
      if (modeText) modeText.textContent = `Host (${res.roomCode})`;

      this.updatePhoneModalLinks(res.roomCode, res.controllerUrl, res.hasPassword);
      this.soundSystem.play('victory');
      this.showTitleView('online-lobby');
    } catch (e: any) {
      if (errElem) {
        errElem.textContent = e.message || 'Failed to create room';
        errElem.classList.remove('hidden');
      }
    }
  }

  public copyOnlineInviteLink(): void {
    if (!this.roomCode) return;
    let url = `${window.location.origin}/?room=${this.roomCode}`;
    if (this.roomPassword) {
      url += `&pwd=${encodeURIComponent(this.roomPassword)}`;
    }

    navigator.clipboard?.writeText(url).then(() => {
      const btn = document.getElementById('btn-copy-invite-text');
      if (btn) {
        btn.innerHTML = '<i class="fa-solid fa-check text-emerald-400"></i> Copied! 🎉';
        setTimeout(() => {
          btn.innerHTML = '<i class="fa-regular fa-copy"></i><span>Copy Link</span>';
        }, 2000);
      }
      this.soundSystem.play('pickup');
    }).catch(() => {
      prompt('Copy this room invite link:', url);
    });
  }

  public launchOnlineGameFromTitle(): void {
    this.hideTitleScreen();
    this.soundSystem.play('bell');
    if (this.isAudioEnabled) {
      this.soundSystem.startSeaShantyMusic();
    }
    this.engine.addFeedMessage(`⚓ Expedition launched in Virtual Room ${this.roomCode}!`, 'info');
  }

  public async joinRemoteRoomDirect(roomCode: string, password?: string): Promise<boolean> {
    const errElem = document.getElementById('title-join-error');
    try {
      const res = await this.networkManager.joinRoom(roomCode, 'viewer', 'Remote Sailor', password);
      if (res.success) {
        this.playMode = 'remote_viewer';
        this.roomCode = res.roomCode || roomCode;
        this.roomPassword = password;

        this.hideTitleScreen();

        const roomBadge = document.getElementById('hud-room-badge');
        const roomCodeElem = document.getElementById('hud-room-code');
        const roomLockElem = document.getElementById('hud-room-lock');
        const modeText = document.getElementById('hud-mode-text');

        if (roomBadge) roomBadge.classList.remove('hidden');
        if (roomCodeElem) roomCodeElem.textContent = this.roomCode;
        if (roomLockElem) {
          if (res.hasPassword) roomLockElem.classList.remove('hidden');
          else roomLockElem.classList.add('hidden');
        }
        if (modeText) modeText.textContent = `Viewing (${this.roomCode})`;

        this.soundSystem.play('bell');
        this.engine.addFeedMessage(`🌐 Joined Virtual Room ${this.roomCode}! Synchronizing stream...`, 'info');
        return true;
      } else {
        if (errElem) {
          errElem.textContent = res.error || 'Failed to join room.';
          errElem.classList.remove('hidden');
        }
        return false;
      }
    } catch (e: any) {
      if (errElem) {
        errElem.textContent = e.message || 'Connection error.';
        errElem.classList.remove('hidden');
      }
      return false;
    }
  }

  public async joinOnlineRoomFromTitle(): Promise<void> {
    const codeInput = document.getElementById('input-title-join-code') as HTMLInputElement;
    const pwdInput = document.getElementById('input-title-join-pwd') as HTMLInputElement;
    const errElem = document.getElementById('title-join-error');

    const code = codeInput?.value?.trim()?.toUpperCase();
    const pwd = pwdInput?.value?.trim() || undefined;

    if (!code || code.length < 2) {
      if (errElem) {
        errElem.textContent = 'Please enter a valid room name.';
        errElem.classList.remove('hidden');
      }
      return;
    }

    if (errElem) errElem.classList.add('hidden');
    await this.joinRemoteRoomDirect(code, pwd);
  }

  public startRoundFromPhoneVIP(): void {
    if (!document.getElementById('title-screen-container')?.classList.contains('hidden')) {
      this.soundSystem.play('bell');
      this.hideTitleScreen();
      if (this.isAudioEnabled) {
        this.soundSystem.startSeaShantyMusic();
      }
      this.engine.addFeedMessage('⚓ Player 1 (Lobby Leader) cast off the ship from phone!', 'info');
    }
  }

  private updateTitleLobbyCrew(): void {
    const onlineList = document.getElementById('title-lobby-crew-list');
    const localList = document.getElementById('local-crew-roster');
    const html = `
      <div class="p-2 rounded-xl bg-slate-950 border border-teal-500/40 flex items-center justify-between">
        <span class="font-bold text-teal-300">👑 Host TV Display</span>
        <span class="text-[10px] text-emerald-400 font-mono">HOST</span>
      </div>
      <div class="p-2 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
        <span class="font-bold text-slate-300">🔵 Sailor Joined</span>
        <span class="text-[10px] text-teal-400 font-mono">CREW</span>
      </div>
    `;
    if (onlineList) onlineList.innerHTML = html;
    if (localList) localList.innerHTML = html;
  }

  // --- Settings Handlers ---

  public onVolumeChange(): void {
    const masterSlider = document.getElementById('slider-vol-master') as HTMLInputElement;
    const sfxSlider = document.getElementById('slider-vol-sfx') as HTMLInputElement;
    const musicSlider = document.getElementById('slider-vol-music') as HTMLInputElement;

    const master = masterSlider ? Number(masterSlider.value) / 100 : 0.8;
    const sfx = sfxSlider ? Number(sfxSlider.value) / 100 : 1.0;
    const music = musicSlider ? Number(musicSlider.value) / 100 : 0.6;

    const lblMaster = document.getElementById('lbl-vol-master');
    const lblSfx = document.getElementById('lbl-vol-sfx');
    const lblMusic = document.getElementById('lbl-vol-music');
    if (lblMaster) lblMaster.textContent = `${Math.round(master * 100)}%`;
    if (lblSfx) lblSfx.textContent = `${Math.round(sfx * 100)}%`;
    if (lblMusic) lblMusic.textContent = `${Math.round(music * 100)}%`;

    this.soundSystem.setVolumes(master, sfx, music);
  }

  public onLanguageChange(lang: string): void {
    localStorage.setItem('friendslop_lang', lang);
    this.soundSystem.play('pickup');
    const subtitle = document.getElementById('hud-level-subtitle');
    if (lang === 'it' && subtitle) {
      subtitle.textContent = 'Secche di Acqua Dolce — Spedizione Roguelite di 15 Minuti';
    } else if (lang === 'de' && subtitle) {
      subtitle.textContent = 'Süßwasser-Untiefen — 15-Minuten Roguelite Expedition';
    } else if (lang === 'es' && subtitle) {
      subtitle.textContent = 'Bajos de Agua Dulce — Expedición Roguelite de 15 Minutos';
    } else if (lang === 'fr' && subtitle) {
      subtitle.textContent = 'Hauts-fonds Doux — Expédition Roguelite de 15 Minutes';
    } else if (lang === 'ja' && subtitle) {
      subtitle.textContent = '淡水の浅瀬 — 15分間のローグライト遠征';
    } else if (subtitle) {
      subtitle.textContent = 'Sweetwater Shallows — 15-Minute Roguelite Run';
    }
  }

  public toggleFullscreen(): void {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  }

  public toggleScanlines(): void {
    document.body.classList.toggle('scanline');
    const isScanline = document.body.classList.contains('scanline');
    const lbl = document.getElementById('lbl-scanlines');
    if (lbl) lbl.textContent = isScanline ? 'CRT: On' : 'CRT: Off';
    this.soundSystem.play('pickup');
  }

  public copyRoomLink(): void {
    this.copyOnlineInviteLink();
  }

  private updatePhoneModalLinks(roomCode: string, controllerUrl: string, hasPassword: boolean = false): void {
    const codeElem = document.getElementById('phone-modal-room-code');
    const lockElem = document.getElementById('phone-modal-lock-tag');
    const qrImg = document.getElementById('qr-code-img') as HTMLImageElement;

    if (codeElem) codeElem.textContent = roomCode;
    if (lockElem) {
      if (hasPassword) lockElem.classList.remove('hidden');
      else lockElem.classList.add('hidden');
    }

    if (qrImg) {
      qrImg.src = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(controllerUrl)}`;
    }

    // Direct player links
    const p1 = document.getElementById('link-ctrl-p1') as HTMLAnchorElement;
    const p2 = document.getElementById('link-ctrl-p2') as HTMLAnchorElement;
    const p3 = document.getElementById('link-ctrl-p3') as HTMLAnchorElement;
    const p4 = document.getElementById('link-ctrl-p4') as HTMLAnchorElement;

    let pwdParam = this.roomPassword ? `&pwd=${encodeURIComponent(this.roomPassword)}` : '';
    if (p1) p1.href = `/controller.html?room=${roomCode}&player=p1${pwdParam}`;
    if (p2) p2.href = `/controller.html?room=${roomCode}&player=p2${pwdParam}`;
    if (p3) p3.href = `/controller.html?room=${roomCode}&player=p3${pwdParam}`;
    if (p4) p4.href = `/controller.html?room=${roomCode}&player=p4${pwdParam}`;
  }
}

// Global bootstrap
declare global {
  interface Window {
    gameApp: GameApp;
  }
}

window.addEventListener('DOMContentLoaded', () => {
  window.gameApp = new GameApp();
});
