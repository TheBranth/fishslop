// Dedicated Second-Screen Mobile Phone Controller Client for Friendslop Fishing Co.

import { SoundSystem } from './engine/SoundSystem';
import { MinigameController } from './engine/MinigameController';
import { NetworkManager } from './engine/NetworkManager';
import { PlayerInput, SecretBounty, DredgedDraftState } from '../shared/types';
import { PLAYER_PROFILES } from '../shared/constants';

export class PhoneControllerApp {
  public soundSystem: SoundSystem;
  public minigameController: MinigameController;
  public networkManager: NetworkManager = new NetworkManager();
  private minigameCanvas: HTMLCanvasElement;

  public playerId: string = 'p1';
  public roomCode: string = 'FISH1';
  private playerIndex: number = 0;

  // Joystick & 2-Button Input State
  private joystickZone: HTMLElement;
  private joystickKnob: HTMLElement;
  private joystickActive: boolean = false;
  private joystickOrigin: { x: number; y: number } = { x: 0, y: 0 };
  private currentInput: PlayerInput = {
    dx: 0,
    dy: 0,
    actionPrimary: false,
    actionSecondary: false,
    isActionPrimaryHeld: false
  };

  private activeBounty: SecretBounty | null = null;
  private sendInterval: any = null;

  constructor() {
    this.soundSystem = new SoundSystem();
    this.minigameCanvas = document.getElementById('controller-minigame-canvas') as HTMLCanvasElement;
    this.minigameController = new MinigameController(this.minigameCanvas, this.soundSystem);

    this.joystickZone = document.getElementById('joystick-zone')!;
    this.joystickKnob = document.getElementById('joystick-knob')!;

    this.setupJoystick();
    this.setupActionButtons();
    this.setupBroadcastChannel();
    this.setupNetworkBridge();
    this.parseURLParams();
    this.startInputLoop();
  }

  private setupNetworkBridge(): void {
    this.networkManager.onStateUpdate = (state: any) => {
      this.handleHostState(state);
    };

    this.networkManager.onMinigameTrigger = (data: { stationType: string }) => {
      this.openStationMinigame(data.stationType);
    };

    this.networkManager.onLobbyGameStarted = () => {
      document.getElementById('ctrl-lobby-overlay')?.classList.add('hidden');
    };
  }

  private parseURLParams(): void {
    const params = new URLSearchParams(window.location.search);
    const roomParam = params.get('room');
    const pwdParam = params.get('pwd') || undefined;

    if (params.has('player')) {
      this.playerId = params.get('player')!;
      this.playerIndex = this.playerId === 'p2' ? 1 : this.playerId === 'p3' ? 2 : this.playerId === 'p4' ? 3 : 0;
    }

    if (roomParam) {
      this.roomCode = roomParam.toUpperCase();
      this.connectToVirtualRoom(this.roomCode, pwdParam);
    } else if (!params.has('player')) {
      // Prompt user to enter 4-letter room code
      document.getElementById('modal-ctrl-join-room')?.classList.remove('hidden');
    }

    this.updatePlayerBadge();
  }

  public async connectToVirtualRoom(roomCode: string, password?: string): Promise<void> {
    const errElem = document.getElementById('ctrl-join-error-text');
    if (errElem) errElem.classList.add('hidden');

    try {
      const res = await this.networkManager.joinRoom(roomCode, 'controller', undefined, password);
      if (res.success) {
        this.roomCode = res.roomCode || roomCode;
        if (res.playerIndex !== undefined) {
          this.playerIndex = res.playerIndex;
          this.playerId = `p${this.playerIndex + 1}`;
        }
        document.getElementById('modal-ctrl-join-room')?.classList.add('hidden');
        this.updatePlayerBadge();
        this.soundSystem.play('bell');
      } else {
        if (errElem) {
          errElem.textContent = res.error || 'Failed to join room';
          errElem.classList.remove('hidden');
        }
        document.getElementById('modal-ctrl-join-room')?.classList.remove('hidden');
      }
    } catch (err: any) {
      if (errElem) {
        errElem.textContent = err.message || 'Connection error';
        errElem.classList.remove('hidden');
      }
      document.getElementById('modal-ctrl-join-room')?.classList.remove('hidden');
    }
  }

  public submitJoinRoom(): void {
    const codeInput = document.getElementById('ctrl-join-code-input') as HTMLInputElement;
    const pwdInput = document.getElementById('ctrl-join-pwd-input') as HTMLInputElement;
    const code = codeInput?.value?.trim()?.toUpperCase();
    const pwd = pwdInput?.value?.trim() || undefined;

    if (!code || code.length < 3) {
      const errElem = document.getElementById('ctrl-join-error-text');
      if (errElem) {
        errElem.textContent = 'Please enter a valid room code';
        errElem.classList.remove('hidden');
      }
      return;
    }

    this.connectToVirtualRoom(code, pwd);
  }

  private updatePlayerBadge(): void {
    const prof = PLAYER_PROFILES[this.playerIndex] || PLAYER_PROFILES[0];
    const nameElem = document.getElementById('ctrl-player-name');
    const dotElem = document.getElementById('ctrl-player-dot');
    const roomElem = document.getElementById('ctrl-room-code');

    if (nameElem) nameElem.textContent = `${prof.name} (${this.playerId.toUpperCase()})`;
    if (dotElem) {
      dotElem.style.backgroundColor = prof.colorHex;
      dotElem.style.boxShadow = `0 0 10px ${prof.colorHex}`;
    }
    if (roomElem) roomElem.textContent = `ROOM: ${this.roomCode}`;
  }

  // --- Dual-Thumb Touch Joystick ---

  private setupJoystick(): void {
    const zone = this.joystickZone;
    const knob = this.joystickKnob;
    const maxRadius = 45;

    const handleStart = (clientX: number, clientY: number) => {
      const rect = zone.getBoundingClientRect();
      this.joystickOrigin = {
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2
      };
      this.joystickActive = true;
      this.triggerHaptic(10);
      handleMove(clientX, clientY);
    };

    const handleMove = (clientX: number, clientY: number) => {
      if (!this.joystickActive) return;

      const deltaX = clientX - this.joystickOrigin.x;
      const deltaY = clientY - this.joystickOrigin.y;
      const dist = Math.hypot(deltaX, deltaY);
      const angle = Math.atan2(deltaY, deltaX);

      const clampedDist = Math.min(maxRadius, dist);
      const knobX = Math.cos(angle) * clampedDist;
      const knobY = Math.sin(angle) * clampedDist;

      knob.style.transform = `translate(${knobX}px, ${knobY}px)`;

      // Normalized -1.0 to 1.0
      this.currentInput.dx = (knobX / maxRadius);
      this.currentInput.dy = (knobY / maxRadius);
    };

    const handleEnd = () => {
      this.joystickActive = false;
      knob.style.transform = `translate(0px, 0px)`;
      this.currentInput.dx = 0;
      this.currentInput.dy = 0;
    };

    // Touch Listeners
    zone.addEventListener('touchstart', (e) => {
      e.preventDefault();
      if (e.touches.length > 0) {
        handleStart(e.touches[0].clientX, e.touches[0].clientY);
      }
    }, { passive: false });

    window.addEventListener('touchmove', (e) => {
      if (this.joystickActive && e.touches.length > 0) {
        handleMove(e.touches[0].clientX, e.touches[0].clientY);
      }
    }, { passive: true });

    window.addEventListener('touchend', () => {
      if (this.joystickActive) handleEnd();
    });

    // Mouse Listeners for PC Testing
    zone.addEventListener('mousedown', (e) => {
      if (e.button === 0) handleStart(e.clientX, e.clientY);
    });

    window.addEventListener('mousemove', (e) => {
      if (this.joystickActive) handleMove(e.clientX, e.clientY);
    });

    window.addEventListener('mouseup', () => {
      if (this.joystickActive) handleEnd();
    });
  }

  // --- Right Thumb 2-Button Arcade Cluster (Action + Chaos) ---

  private setupActionButtons(): void {
    const btnPrimary = document.getElementById('btn-primary')!;
    const btnSecondary = document.getElementById('btn-secondary')!;

    // Button 1: Primary Action (Grab / Cook / Drop / Cast / Reel / Heave)
    const onPrimaryDown = () => {
      this.currentInput.actionPrimary = true;
      this.currentInput.isActionPrimaryHeld = true;
      this.triggerHaptic(20);
      this.soundSystem.play('pickup');
    };

    const onPrimaryUp = () => {
      this.currentInput.isActionPrimaryHeld = false;
    };

    btnPrimary.addEventListener('touchstart', (e) => { e.preventDefault(); onPrimaryDown(); }, { passive: false });
    btnPrimary.addEventListener('touchend', onPrimaryUp);
    btnPrimary.addEventListener('mousedown', onPrimaryDown);
    btnPrimary.addEventListener('mouseup', onPrimaryUp);

    // Button 2: Secondary / Chaos (Slap / Throw / Cut Line)
    const onSecondaryDown = () => {
      this.currentInput.actionSecondary = true;
      this.triggerHaptic(35);
      this.soundSystem.play('slap');
    };

    btnSecondary.addEventListener('touchstart', (e) => { e.preventDefault(); onSecondaryDown(); }, { passive: false });
    btnSecondary.addEventListener('mousedown', onSecondaryDown);
  }

  // --- Broadcast Channel / WebSocket Bridge ---

  private channel: BroadcastChannel | null = null;

  private setupBroadcastChannel(): void {
    try {
      this.channel = new BroadcastChannel('friendslop_game_bus');
      this.channel.onmessage = (event) => {
        const { type, data } = event.data;

        if (type === 'HOST_STATE_UPDATE') {
          this.handleHostState(data);
        } else if (type === 'TRIGGER_MINIGAME' && data.playerId === this.playerId) {
          this.openStationMinigame(data.stationType);
        } else if (type === 'BOUNTY_ASSIGNED' && data.playerIndex === this.playerIndex) {
          this.setBounty(data.bounty);
        }
      };
    } catch (e) {
      console.log('BroadcastChannel not supported, using fallback');
    }
  }

  private handleHostState(state: any): void {
    // Lobby Phase Overlay Check
    const lobbyOverlay = document.getElementById('ctrl-lobby-overlay');
    if (state.gameState === 'lobby' || state.inTitleLobby) {
      if (lobbyOverlay) {
        lobbyOverlay.classList.remove('hidden');
        const roleBadge = document.getElementById('ctrl-lobby-role-badge');
        const btnCastOff = document.getElementById('btn-ctrl-cast-off');
        const waitingText = document.getElementById('ctrl-lobby-waiting-text');
        const roomNameElem = document.getElementById('ctrl-lobby-room-name');
        const subtitleElem = document.getElementById('ctrl-lobby-subtitle');

        if (roomNameElem) roomNameElem.textContent = this.roomCode || 'LOCAL';

        if (this.playerIndex === 0) {
          if (roleBadge) {
            roleBadge.textContent = '👑 LOBBY LEADER (PLAYER 1)';
            roleBadge.className = 'inline-block px-3.5 py-1 rounded-full text-xs font-black font-mono uppercase bg-amber-500/20 text-amber-300 border border-amber-500/40';
          }
          if (btnCastOff) btnCastOff.classList.remove('hidden');
          if (waitingText) waitingText.classList.add('hidden');
          if (subtitleElem) subtitleElem.textContent = 'You are the leader! Tap Cast Off below when everyone is ready to start the game on the TV.';
        } else {
          if (roleBadge) {
            roleBadge.textContent = `⚓ CREWMATE (PLAYER ${this.playerIndex + 1})`;
            roleBadge.className = 'inline-block px-3.5 py-1 rounded-full text-xs font-black font-mono uppercase bg-teal-500/20 text-teal-300 border border-teal-500/40';
          }
          if (btnCastOff) btnCastOff.classList.add('hidden');
          if (waitingText) waitingText.classList.remove('hidden');
          if (subtitleElem) subtitleElem.textContent = 'Waiting for the lobby leader (Player 1) to tap Cast Off and start the run...';
        }

        // Render roster if state has players
        const rosterElem = document.getElementById('ctrl-lobby-crew-list');
        if (rosterElem && state.players) {
          rosterElem.innerHTML = state.players.map((p: any, idx: number) => {
            const isMe = idx === this.playerIndex;
            const isLeader = idx === 0;
            return `
              <div class="p-2 rounded-xl bg-slate-950 border ${isMe ? 'border-teal-500/50' : 'border-slate-800'} flex items-center justify-between">
                <span class="font-bold ${isMe ? 'text-teal-300' : 'text-slate-300'}">
                  ${isLeader ? '👑' : '⚓'} ${p.name || `Player ${idx + 1}`} ${isMe ? '(You)' : ''}
                </span>
                <span class="text-[10px] ${isLeader ? 'text-amber-400' : 'text-emerald-400'} font-mono font-bold">
                  ${isLeader ? 'LEADER' : 'READY'}
                </span>
              </div>
            `;
          }).join('');
        }
      }
    } else {
      if (lobbyOverlay) lobbyOverlay.classList.add('hidden');
    }

    // Update boat balance tilt gauge
    const tiltBar = document.getElementById('ctrl-tilt-bar');
    const tiltLabel = document.getElementById('ctrl-tilt-label');

    if (tiltBar && state.boatAngle !== undefined) {
      const angle = state.boatAngle;
      const pct = Math.max(0, Math.min(100, 50 + (angle / 32) * 50));
      tiltBar.style.width = `${pct}%`;
      if (tiltLabel) tiltLabel.textContent = `${angle.toFixed(1)}°`;
    }

    // Dredged draft popup
    if (state.gameState === 'draft_phase' && state.draftState) {
      this.renderDraftModal(state.draftState);
    } else {
      document.getElementById('modal-ctrl-draft')?.classList.add('hidden');
    }

    // Dynamic 2-Button Label & Color Morphing
    const primaryLabel = document.getElementById('btn-primary-label');
    const secondaryLabel = document.getElementById('btn-secondary-label');
    const secondaryIcon = document.getElementById('btn-secondary-icon');
    const statusText = document.getElementById('ctrl-status-text');
    const btnPrimary = document.getElementById('btn-primary');

    const me = state.players?.find((p: any) => p.id === this.playerId);

    if (state.isCapsizedScramble) {
      if (primaryLabel) primaryLabel.textContent = 'HEAVE';
      if (btnPrimary) {
        btnPrimary.style.borderColor = '#ef4444';
        btnPrimary.style.boxShadow = '0 0 15px rgba(239, 68, 68, 0.6)';
      }
      if (statusText) statusText.textContent = '🚨 SPRINT TO HIGH SIDE & SPAM HEAVE!';
    } else if (me) {
      // Button 1: Contextual Action Sync
      if (me.contextualAction) {
        if (primaryLabel) primaryLabel.textContent = me.contextualAction.label;
        if (btnPrimary) {
          btnPrimary.style.borderColor = me.contextualAction.colorHex;
          btnPrimary.style.boxShadow = `0 0 15px ${me.contextualAction.colorHex}66`;
        }
        if (statusText) statusText.textContent = `🔘 ${me.contextualAction.label}`;
      } else {
        if (primaryLabel) primaryLabel.textContent = 'ACTION';
        if (btnPrimary) {
          btnPrimary.style.borderColor = '#2dd4bf';
          btnPrimary.style.boxShadow = 'none';
        }
        if (statusText) statusText.textContent = 'WALK TO STATIONS OR RAILING';
      }

      // Button 2: Chaos Mode Sync (Slap vs Throw)
      if (me.holdingItemId) {
        if (secondaryLabel) secondaryLabel.textContent = 'THROW';
        if (secondaryIcon) secondaryIcon.className = 'fa-solid fa-hand-holding text-lg';
      } else {
        if (secondaryLabel) secondaryLabel.textContent = 'SLAP';
        if (secondaryIcon) secondaryIcon.className = 'fa-solid fa-hand-back-fist text-lg';
      }
    }
  }

  private startInputLoop(): void {
    this.sendInterval = setInterval(() => {
      // Send through NetworkManager (Virtual Room WebSockets + Local Bus)
      this.networkManager.sendInput(this.currentInput, this.playerIndex);

      // Reset single-frame flags
      this.currentInput.actionPrimary = false;
      this.currentInput.actionSecondary = false;
    }, 1000 / 60);
  }

  // --- Fullscreen Station Minigame Viewport (2-3s Morph) ---

  public openStationMinigame(stationType: string): void {
    const modal = document.getElementById('modal-station-minigame');
    const emoji = document.getElementById('minigame-title-emoji');
    const title = document.getElementById('minigame-title-text');
    const instruct = document.getElementById('minigame-instruct-text');

    if (stationType === 'soup_pot') {
      if (emoji) emoji.textContent = '🍲';
      if (title) title.textContent = 'Broth Soup Kettle';
      if (instruct) instruct.textContent = 'Swirl your thumb clockwise in 3 full rotations!';
      this.minigameController.startSoupMinigame((res) => this.finishMinigame(res));
    } else if (stationType === 'cutting_board') {
      if (emoji) emoji.textContent = '🔪';
      if (title) title.textContent = 'Fillet Cutting Board';
      if (instruct) instruct.textContent = 'Tap to time 3 clean chops as the blade sweeps!';
      this.minigameController.startFilletMinigame((res) => this.finishMinigame(res));
    } else if (stationType === 'deep_fryer') {
      if (emoji) emoji.textContent = '🍳';
      if (title) title.textContent = 'Deep Fryer Station';
      if (instruct) instruct.textContent = 'Tap DROP, then PULL in the Golden Zone!';
      this.minigameController.startFryerMinigame((res) => this.finishMinigame(res));
    }

    modal?.classList.remove('hidden');
  }

  private finishMinigame(res: any): void {
    this.triggerHaptic(50);
    this.soundSystem.play('ding');
    document.getElementById('modal-station-minigame')?.classList.add('hidden');

    if (this.channel) {
      this.channel.postMessage({
        type: 'MINIGAME_COMPLETE',
        playerId: this.playerId,
        result: res
      });
    }
  }

  public cancelMinigame(): void {
    document.getElementById('modal-station-minigame')?.classList.add('hidden');
    this.minigameController.activeGame = null;
  }

  // --- Gary-OS Secret Mission Flip Phone Drawer ---

  public toggleGaryPhone(): void {
    const modal = document.getElementById('modal-ctrl-phone');
    modal?.classList.toggle('hidden');
    if (!modal?.classList.contains('hidden')) {
      this.soundSystem.play('bounty_ring');
      this.triggerHaptic([30, 50, 30]);
    }
  }

  public setBounty(bounty: SecretBounty): void {
    this.activeBounty = bounty;
    const title = document.getElementById('ctrl-bounty-title');
    const desc = document.getElementById('ctrl-bounty-desc');
    const excuse = document.getElementById('ctrl-bounty-excuse');
    const prog = document.getElementById('ctrl-bounty-prog');
    const pts = document.getElementById('ctrl-bounty-pts');
    const tier = document.getElementById('ctrl-bounty-tier');

    if (title) title.textContent = bounty.title;
    if (desc) desc.textContent = bounty.description;
    if (excuse) excuse.textContent = `"${(bounty as any).plausibleExcuse || 'The boat tilted so fast I lost my grip!'}"`;
    if (prog) prog.textContent = `Progress: ${bounty.currentCount} / ${bounty.targetCount}`;
    if (pts) pts.textContent = `+${bounty.baseRewardPoints * bounty.assignedLevelTier} Merit Pts`;
    if (tier) tier.textContent = `LEVEL ${bounty.assignedLevelTier} TIER (${bounty.assignedLevelTier}x PTS)`;

    // Ring Nokia chime
    this.soundSystem.play('bounty_ring');
    this.triggerHaptic([40, 60, 40]);
  }

  // --- 30s Dredged Crate Draft ---

  private renderDraftModal(draft: DredgedDraftState): void {
    const modal = document.getElementById('modal-ctrl-draft');
    const timer = document.getElementById('ctrl-draft-timer');
    const container = document.getElementById('ctrl-draft-crates-container');

    if (timer) timer.textContent = `${Math.ceil(draft.timeLeftSeconds)}s`;
    if (container) {
      container.innerHTML = draft.crates.map((crate, idx) => {
        const isSelected = draft.votes[crate.id]?.includes(this.playerId);
        const bg = isSelected ? 'bg-amber-950/80 border-amber-400' : 'bg-slate-950 border-slate-800';

        return `
          <div onclick="window.phoneController.voteCrate('${crate.id}')" class="p-3 rounded-2xl border ${bg} flex items-center justify-between active:scale-95 transition cursor-pointer">
            <div>
              <div class="text-xs font-bold text-white flex items-center space-x-1">
                <span>${crate.name}</span>
                <span class="text-[10px] text-amber-400 font-mono font-bold">$${crate.cost}</span>
              </div>
              <p class="text-[10px] text-slate-400 mt-0.5">${crate.description}</p>
            </div>
            <div class="w-6 h-6 rounded-full border border-slate-700 flex items-center justify-center text-[10px] font-bold ${isSelected ? 'bg-amber-500 text-slate-950' : 'text-slate-500'}">
              ${isSelected ? '✓' : idx + 1}
            </div>
          </div>
        `;
      }).join('');
    }

    modal?.classList.remove('hidden');
  }

  public voteCrate(crateId: string): void {
    this.triggerHaptic(25);
    this.soundSystem.play('pickup');
    this.networkManager.voteDraftCrate(crateId);
  }

  public castOffFromPhone(): void {
    this.soundSystem.play('bell');
    this.triggerHaptic([30, 40, 30]);
    this.networkManager.startRoundFromController();
    if (this.channel) {
      this.channel.postMessage({ type: 'START_ROUND_FROM_PHONE' });
    }
    document.getElementById('ctrl-lobby-overlay')?.classList.add('hidden');
  }

  private triggerHaptic(pattern: number | number[]): void {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      try {
        navigator.vibrate(pattern);
      } catch (e) {}
    }
  }
}

// Instantiate global controller app
(window as any).phoneController = new PhoneControllerApp();
