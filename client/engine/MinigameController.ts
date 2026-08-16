// Tactile Minigames Engine for Friendslop Fishing Co. (9 Minigames: 100% Touch & Mouse Parity)

import { SoundSystem } from './SoundSystem';

export type MinigameType = 
  | 'reel' 
  | 'fillet' 
  | 'fryer' 
  | 'soup' 
  | 'sushi' 
  | 'squeegee' 
  | 'sonar' 
  | 'harpoon' 
  | 'rinse';

export interface MinigameResult {
  type: MinigameType;
  success: boolean;
  quality: 'perfect' | 'good' | 'mangled' | 'burned' | 'failed';
  scoreMultiplier: number;
  sabotaged?: boolean;
  damageBoss?: number;
}

export class MinigameController {
  public activeGame: MinigameType | null = null;
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private soundSystem: SoundSystem;
  private onCompleteCallback?: (result: MinigameResult) => void;

  // 1. Reel State
  private reelNeedle: number = 0.5;
  private reelSweetSpot: number = 0.2;
  private reelProgress: number = 0.2;
  private reelTensionLossTimer: number = 0;
  private isHoldingReel: boolean = false;

  // 2. Fillet 3-Chop State
  private filletBladeX: number = 0;
  private filletBladeDir: number = 1;
  private filletNotches: { x: number; hit: boolean; perfect: boolean }[] = [];
  private filletChopCount: number = 0;
  private filletPerfectCount: number = 0;

  // 3. Deep Fryer State
  private fryerState: 'ready' | 'frying' | 'done' = 'ready';
  private fryHeat: number = 0;

  // 4. Soup Swirl State
  private soupAnglePrev: number = 0;
  private soupRotations: number = 0;
  private soupSpeedExceeded: boolean = false;

  // 5. Sushi 3-Step State
  private sushiStep: number = 0; // 0: Nori, 1: Rice, 2: Fish, 3: Swipe Up to Roll
  private sushiTouchStartY: number = 0;

  // 6. Squeegee / Grime Wiper State
  public grimeMaskCanvas: HTMLCanvasElement;
  private grimeCtx: CanvasRenderingContext2D;
  public grimeActive: boolean = false;
  private grimeClearedRatio: number = 0;

  // 7. Sonar Radar State
  private sonarAngle: number = 0;
  private sonarTargets: { angle: number; speciesId: string; emoji: string }[] = [];

  // 8. Rocket Harpoon State
  private harpoonAimAngle: number = 0;
  private isAimingHarpoon: boolean = false;

  // 9. Rinse Dunk State
  private rinseProgress: number = 0;
  private isHoldingRinse: boolean = false;

  constructor(canvas: HTMLCanvasElement, soundSystem: SoundSystem) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.soundSystem = soundSystem;

    // Off-screen grime mask canvas for Squeegee minigame
    this.grimeMaskCanvas = document.createElement('canvas');
    this.grimeMaskCanvas.width = canvas.width;
    this.grimeMaskCanvas.height = canvas.height;
    this.grimeCtx = this.grimeMaskCanvas.getContext('2d')!;

    this.setupInputs();
  }

  private setupInputs(): void {
    // Single Pointer Down (Mouse Left-Click or Mobile Touch)
    const handlePointerDown = (clientX: number, clientY: number) => {
      const rect = this.canvas.getBoundingClientRect();
      const scaleX = this.canvas.width / rect.width;
      const scaleY = this.canvas.height / rect.height;
      const x = (clientX - rect.left) * scaleX;
      const y = (clientY - rect.top) * scaleY;

      this.onPointerDown(x, y);
    };

    const handlePointerMove = (clientX: number, clientY: number) => {
      const rect = this.canvas.getBoundingClientRect();
      const scaleX = this.canvas.width / rect.width;
      const scaleY = this.canvas.height / rect.height;
      const x = (clientX - rect.left) * scaleX;
      const y = (clientY - rect.top) * scaleY;

      this.onPointerMove(x, y);
    };

    const handlePointerUp = () => {
      this.onPointerUp();
    };

    // Mouse Listeners
    this.canvas.addEventListener('mousedown', (e) => {
      if (e.button === 0) handlePointerDown(e.clientX, e.clientY);
    });
    window.addEventListener('mousemove', (e) => {
      handlePointerMove(e.clientX, e.clientY);
    });
    window.addEventListener('mouseup', () => {
      handlePointerUp();
    });

    // Touch Listeners
    this.canvas.addEventListener('touchstart', (e) => {
      if (e.touches.length > 0) {
        handlePointerDown(e.touches[0].clientX, e.touches[0].clientY);
      }
    }, { passive: true });

    window.addEventListener('touchmove', (e) => {
      if (e.touches.length > 0) {
        handlePointerMove(e.touches[0].clientX, e.touches[0].clientY);
      }
    }, { passive: true });

    window.addEventListener('touchend', () => {
      handlePointerUp();
    });
  }

  // --- Start Minigames ---

  public startReelMinigame(onComplete: (res: MinigameResult) => void): void {
    this.activeGame = 'reel';
    this.onCompleteCallback = onComplete;
    this.reelProgress = 0.2;
    this.reelSweetSpot = 0.2;
    this.reelNeedle = 0.5;
    this.reelTensionLossTimer = 0;
    this.isHoldingReel = false;
  }

  public startFilletMinigame(onComplete: (res: MinigameResult) => void): void {
    this.activeGame = 'fillet';
    this.onCompleteCallback = onComplete;
    this.filletBladeX = 0.1;
    this.filletBladeDir = 1;
    this.filletChopCount = 0;
    this.filletPerfectCount = 0;
    this.filletNotches = [
      { x: 0.28, hit: false, perfect: false },
      { x: 0.52, hit: false, perfect: false },
      { x: 0.76, hit: false, perfect: false }
    ];
  }

  public startFryerMinigame(onComplete: (res: MinigameResult) => void): void {
    this.activeGame = 'fryer';
    this.onCompleteCallback = onComplete;
    this.fryerState = 'ready';
    this.fryHeat = 0;
  }

  public startSoupMinigame(onComplete: (res: MinigameResult) => void): void {
    this.activeGame = 'soup';
    this.onCompleteCallback = onComplete;
    this.soupRotations = 0;
    this.soupAnglePrev = 0;
    this.soupSpeedExceeded = false;
  }

  public startSushiMinigame(onComplete: (res: MinigameResult) => void): void {
    this.activeGame = 'sushi';
    this.onCompleteCallback = onComplete;
    this.sushiStep = 0;
  }

  public startSqueegeeMinigame(onComplete: (res: MinigameResult) => void): void {
    this.activeGame = 'squeegee';
    this.onCompleteCallback = onComplete;
    this.grimeActive = true;
    this.initGrimeMask();
  }

  public startSonarMinigame(onComplete: (res: MinigameResult) => void): void {
    this.activeGame = 'sonar';
    this.onCompleteCallback = onComplete;
    this.sonarAngle = 0;
    this.sonarTargets = [
      { angle: 0.8, speciesId: 'tuna', emoji: '🧈' },
      { angle: 2.2, speciesId: 'turtle', emoji: '🐢' },
      { angle: 3.8, speciesId: 'eel', emoji: '🐍' },
      { angle: 5.2, speciesId: 'ray', emoji: '⚡' }
    ];
  }

  public startHarpoonMinigame(onComplete: (res: MinigameResult) => void): void {
    this.activeGame = 'harpoon';
    this.onCompleteCallback = onComplete;
    this.harpoonAimAngle = -Math.PI / 4;
    this.isAimingHarpoon = false;
  }

  public startRinseMinigame(onComplete: (res: MinigameResult) => void): void {
    this.activeGame = 'rinse';
    this.onCompleteCallback = onComplete;
    this.rinseProgress = 0;
    this.isHoldingRinse = false;
  }

  // --- Input Handlers ---

  private onPointerDown(x: number, y: number): void {
    if (!this.activeGame) return;

    if (this.activeGame === 'reel') {
      this.isHoldingReel = true;
    } else if (this.activeGame === 'fillet') {
      this.handleFilletChop();
    } else if (this.activeGame === 'fryer') {
      this.handleFryerClick();
    } else if (this.activeGame === 'sushi') {
      this.handleSushiStepClick(x, y);
    } else if (this.activeGame === 'squeegee') {
      this.scrubGrime(x, y);
    } else if (this.activeGame === 'sonar') {
      this.handleSonarClick(x, y);
    } else if (this.activeGame === 'harpoon') {
      this.isAimingHarpoon = true;
    } else if (this.activeGame === 'rinse') {
      this.isHoldingRinse = true;
    }
  }

  private onPointerMove(x: number, y: number): void {
    if (!this.activeGame) return;

    if (this.activeGame === 'soup') {
      this.handleSoupDrag(x, y);
    } else if (this.activeGame === 'squeegee') {
      this.scrubGrime(x, y);
    } else if (this.activeGame === 'harpoon' && this.isAimingHarpoon) {
      const centerX = this.canvas.width / 2;
      const centerY = this.canvas.height / 2;
      this.harpoonAimAngle = Math.atan2(y - centerY, x - centerX);
    }
  }

  private onPointerUp(): void {
    if (!this.activeGame) return;

    if (this.activeGame === 'reel') {
      this.isHoldingReel = false;
    } else if (this.activeGame === 'harpoon' && this.isAimingHarpoon) {
      this.isAimingHarpoon = false;
      this.fireHarpoon();
    } else if (this.activeGame === 'rinse') {
      this.isHoldingRinse = false;
    }
  }

  // --- 1. Reel Update ---
  public updateReel(dt: number): void {
    if (this.activeGame !== 'reel') return;

    const t = Date.now() * 0.002;
    this.reelNeedle = 0.5 + Math.sin(t * 2.2) * 0.36 + Math.cos(t * 1.1) * 0.08;

    if (this.isHoldingReel) {
      this.reelSweetSpot = Math.min(0.85, this.reelSweetSpot + 0.018);
    } else {
      this.reelSweetSpot = Math.max(0.05, this.reelSweetSpot - 0.014);
    }

    const barW = 0.28;
    const isCatching = this.reelNeedle >= this.reelSweetSpot && this.reelNeedle <= (this.reelSweetSpot + barW);

    if (isCatching) {
      this.reelProgress += dt * 0.35;
      this.reelTensionLossTimer = Math.max(0, this.reelTensionLossTimer - dt * 0.5);
      if (this.reelProgress >= 1.0) {
        this.finishMinigame({ type: 'reel', success: true, quality: 'perfect', scoreMultiplier: 1.0 });
      }
    } else {
      this.reelProgress = Math.max(0, this.reelProgress - dt * 0.15);
      this.reelTensionLossTimer += dt;
      if (this.reelTensionLossTimer >= 2.0) {
        this.soundSystem.play('slap');
        this.finishMinigame({ type: 'reel', success: false, quality: 'failed', scoreMultiplier: 0 });
      }
    }
  }

  // --- 2. Fillet 3-Chop Logic ---
  public updateFillet(dt: number): void {
    if (this.activeGame !== 'fillet') return;

    this.filletBladeX += this.filletBladeDir * dt * 0.7;
    if (this.filletBladeX >= 0.9) {
      this.filletBladeX = 0.9;
      this.filletBladeDir = -1;
    } else if (this.filletBladeX <= 0.1) {
      this.filletBladeX = 0.1;
      this.filletBladeDir = 1;
    }
  }

  private handleFilletChop(): void {
    if (this.activeGame !== 'fillet') return;

    this.filletChopCount++;
    this.soundSystem.play('chop');

    // Check closest notch
    const blade = this.filletBladeX;
    let hitNotch = false;

    this.filletNotches.forEach(n => {
      if (!n.hit) {
        const dist = Math.abs(blade - n.x);
        if (dist < 0.08) {
          n.hit = true;
          n.perfect = dist < 0.035;
          if (n.perfect) this.filletPerfectCount++;
          hitNotch = true;
        }
      }
    });

    if (this.filletChopCount >= 3) {
      const isLuxury = this.filletPerfectCount >= 2;
      this.finishMinigame({
        type: 'fillet',
        success: true,
        quality: isLuxury ? 'perfect' : 'mangled',
        scoreMultiplier: isLuxury ? 2.2 : 1.2
      });
    }
  }

  // --- 3. Deep Fryer Logic ---
  public updateFryer(dt: number): void {
    if (this.activeGame !== 'fryer' || this.fryerState !== 'frying') return;

    this.fryHeat += dt * 0.32;
    if (this.fryHeat >= 1.0) {
      this.fryerState = 'done';
      this.soundSystem.play('explosion');
      this.finishMinigame({
        type: 'fryer',
        success: false,
        quality: 'burned',
        scoreMultiplier: 0
      });
    }
  }

  private handleFryerClick(): void {
    if (this.activeGame !== 'fryer') return;

    if (this.fryerState === 'ready') {
      this.fryerState = 'frying';
      this.soundSystem.play('sizzle');
    } else if (this.fryerState === 'frying') {
      this.fryerState = 'done';
      if (this.fryHeat >= 0.55 && this.fryHeat <= 0.85) {
        this.soundSystem.play('ding');
        this.finishMinigame({
          type: 'fryer',
          success: true,
          quality: 'perfect',
          scoreMultiplier: 2.5
        });
      } else if (this.fryHeat < 0.55) {
        this.soundSystem.play('slap');
        this.finishMinigame({
          type: 'fryer',
          success: true,
          quality: 'mangled',
          scoreMultiplier: 0.5
        });
      }
    }
  }

  // --- 4. Soup Swirl Logic ---
  private handleSoupDrag(x: number, y: number): void {
    const centerX = this.canvas.width / 2;
    const centerY = this.canvas.height / 2;
    const currentAngle = Math.atan2(y - centerY, x - centerX);

    let deltaAngle = currentAngle - this.soupAnglePrev;
    if (deltaAngle < -Math.PI) deltaAngle += Math.PI * 2;
    if (deltaAngle > Math.PI) deltaAngle -= Math.PI * 2;

    this.soupAnglePrev = currentAngle;

    // Clockwise swirl progress
    if (deltaAngle > 0) {
      this.soupRotations += deltaAngle / (Math.PI * 2);
      this.soundSystem.play('bubble');

      if (this.soupRotations >= 3.0) {
        this.finishMinigame({
          type: 'soup',
          success: true,
          quality: 'perfect',
          scoreMultiplier: 3.0
        });
      }
    } else if (deltaAngle < -0.2) {
      // Counter-clockwise backwards un-mix sabotage!
      this.soupRotations = Math.max(0, this.soupRotations - 0.2);
    }
  }

  // --- 5. Sushi 3-Step Logic ---
  private handleSushiStepClick(x: number, y: number): void {
    const w = this.canvas.width;
    const h = this.canvas.height;

    // Step sequence: 0: Nori, 1: Rice, 2: Fish, 3: Swipe Up
    if (this.sushiStep === 0 && x > w * 0.2 && x < w * 0.4) {
      this.sushiStep = 1;
      this.soundSystem.play('pickup');
    } else if (this.sushiStep === 1 && x > w * 0.4 && x < w * 0.6) {
      this.sushiStep = 2;
      this.soundSystem.play('pickup');
    } else if (this.sushiStep === 2 && x > w * 0.6 && x < w * 0.8) {
      this.sushiStep = 3;
      this.soundSystem.play('pickup');
    } else if (this.sushiStep === 3) {
      this.soundSystem.play('ding');
      this.finishMinigame({
        type: 'sushi',
        success: true,
        quality: 'perfect',
        scoreMultiplier: 4.0
      });
    } else {
      // Out of order penalty!
      this.soundSystem.play('slap');
      this.sushiStep = 0;
    }
  }

  // --- 6. Squeegee / Grime Wiper Logic ---
  private initGrimeMask(): void {
    const ctx = this.grimeCtx;
    ctx.fillStyle = 'rgba(15, 23, 42, 0.95)';
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // Draw ink splatters & vomit blobs
    ctx.fillStyle = '#0f172a';
    for (let i = 0; i < 8; i++) {
      ctx.beginPath();
      ctx.arc(200 + i * 80, 150 + (i % 3) * 100, 50, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  private scrubGrime(x: number, y: number): void {
    const ctx = this.grimeCtx;
    ctx.globalCompositeOperation = 'destination-out';
    ctx.beginPath();
    ctx.arc(x, y, 45, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalCompositeOperation = 'source-over';

    this.grimeClearedRatio += 0.04;
    if (this.grimeClearedRatio >= 1.0) {
      this.grimeActive = false;
      this.finishMinigame({
        type: 'squeegee',
        success: true,
        quality: 'perfect',
        scoreMultiplier: 1.0
      });
    }
  }

  // --- 7. Sonar Radar Logic ---
  public updateSonar(dt: number): void {
    if (this.activeGame !== 'sonar') return;
    this.sonarAngle = (this.sonarAngle + dt * 2.5) % (Math.PI * 2);
  }

  private handleSonarClick(x: number, y: number): void {
    const centerX = this.canvas.width / 2;
    const centerY = this.canvas.height / 2;
    const clickAngle = Math.atan2(y - centerY, x - centerX);
    const normalizedClick = (clickAngle + Math.PI * 2) % (Math.PI * 2);

    const diff = Math.abs(normalizedClick - this.sonarAngle);
    if (diff < 0.4 || diff > Math.PI * 2 - 0.4) {
      this.soundSystem.play('ding');
      this.finishMinigame({
        type: 'sonar',
        success: true,
        quality: 'perfect',
        scoreMultiplier: 1.5
      });
    }
  }

  // --- 8. Rocket Harpoon Logic ---
  private fireHarpoon(): void {
    this.soundSystem.play('throw');
    this.finishMinigame({
      type: 'harpoon',
      success: true,
      quality: 'perfect',
      scoreMultiplier: 2.0,
      damageBoss: 250
    });
  }

  // --- 9. Rinse Dunk Logic ---
  public updateRinse(dt: number): void {
    if (this.activeGame !== 'rinse') return;

    if (this.isHoldingRinse) {
      this.rinseProgress += dt / 1.2;
      this.soundSystem.play('bubble');
      if (this.rinseProgress >= 1.0) {
        this.finishMinigame({
          type: 'rinse',
          success: true,
          quality: 'perfect',
          scoreMultiplier: 1.0
        });
      }
    } else {
      this.rinseProgress = Math.max(0, this.rinseProgress - dt * 0.5);
    }
  }

  private finishMinigame(result: MinigameResult): void {
    const cb = this.onCompleteCallback;
    this.activeGame = null;
    this.onCompleteCallback = undefined;
    if (cb) cb(result);
  }

  // --- Render Active Minigame Overlay ---
  public renderOverlay(): void {
    if (!this.activeGame && !this.grimeActive) return;
    const ctx = this.ctx;

    // Draw Grime Wiper layer on top if active
    if (this.grimeActive) {
      ctx.drawImage(this.grimeMaskCanvas, 0, 0);
    }
  }
}
