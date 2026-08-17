import { LocalGameEngine } from './engine/LocalGameEngine';
import { GameRenderer } from './engine/GameRenderer';
import { SoundSystem } from './engine/SoundSystem';
import { MinigameController } from './engine/MinigameController';
import { FISH_REGISTRY } from '../shared/fishDatabase';
import { DredgedDraftState, EndgameAuditRecord, SecretBounty } from '../shared/types';

export class GameApp {
  public engine: LocalGameEngine;
  public renderer: GameRenderer;
  public soundSystem: SoundSystem;
  public minigameController: MinigameController;
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
    this.setupEngineCallbacks();
    this.populateFishopedia();
    this.initLoop();
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

      this.engine.tick();
      this.minigameController.updateReel(dt);
      this.minigameController.updateFillet(dt);
      this.minigameController.updateFryer(dt);
      this.minigameController.updateSonar(dt);
      this.minigameController.updateRinse(dt);

      this.renderer.render(this.engine.state, this.engine.oceanShadows);
      this.minigameController.renderOverlay();

      // Dynamic Sea Shanty Background Music Tempo Transition
      if (this.isAudioEnabled) {
        if (this.engine.state.gameState === 'playing') {
          if (this.engine.levelTimeLeft <= 18) {
            this.soundSystem.setMusicIntensity('panic');
          } else if (this.engine.state.level.isBossLevel) {
            this.soundSystem.setMusicIntensity('boss');
          } else {
            this.soundSystem.setMusicIntensity('normal');
          }
        }
      }

      if (this.channel) {
        this.channel.postMessage({
          type: 'HOST_STATE_UPDATE',
          data: {
            boatAngle: this.engine.state.boatAngle,
            gameState: this.engine.state.gameState,
            draftState: this.engine.state.draftState,
            teamCash: this.engine.state.teamCash,
            isCapsizedScramble: this.engine.state.isCapsizedScramble,
            capsizeScrambleTimer: this.engine.state.capsizeScrambleTimer,
            players: this.engine.state.players
          }
        });
      }

      this.updateHUD();
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }

  private updateHUD(): void {
    const { state } = this.engine;
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
    if (feed) {
      feed.innerHTML = state.feedMessages.map(msg => {
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
