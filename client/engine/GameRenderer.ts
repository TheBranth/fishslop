// 60 FPS HTML5 Canvas 2D/2.5D Renderer with Level Atmospheric Shaders & Kraken Boss Visuals

import { GameRoomState, PlayerState, EntityItem, WorkStation, OceanFishShadow } from '../../shared/types';
import { CANVAS_WIDTH, CANVAS_HEIGHT, BOAT_BOUNDS, DECK_BOUNDS } from '../../shared/constants';

export interface FloatingComicPopup {
  id: string;
  text: string;
  color: string;
  x: number;
  y: number;
  vy: number;
  scale: number;
  opacity: number;
  life: number;
  maxLife: number;
}

export class GameRenderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private waveOffset: number = 0;
  public showDebugMass: boolean = true;
  public floatingPopups: FloatingComicPopup[] = [];
  private fishermanSprites: Record<string, {
    idle: HTMLImageElement;
    runSide: HTMLImageElement[];
    runDown: HTMLImageElement[];
    runUp: HTMLImageElement[];
    carryDown: HTMLImageElement;
    carrySide: HTMLImageElement;
    carryUp: HTMLImageElement;
    carryRunSide: HTMLImageElement[];
    slip: HTMLImageElement;
    conga: HTMLImageElement;
  }> = {};
  private butterImg: HTMLImageElement | null = null;
  private itemSprites: Record<string, HTMLImageElement> = {};

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.initSprites();
  }

  private initSprites(): void {
    this.butterImg = new Image();
    this.butterImg.src = '/assets/sprites/hazard_butter_slab.png';

    // Initialize Item & Food Sprites
    const itemMap: Record<string, string> = {
      cod: '/assets/sprites/fish/cod.png',
      guppy: '/assets/sprites/fish/guppy.png',
      boot: '/assets/sprites/fish/boot.png',
      salmon: '/assets/sprites/fish/salmon.png',
      eel: '/assets/sprites/fish/eel.png',
      fillet: '/assets/sprites/food/fillet.png',
      fried_dish: '/assets/sprites/food/fried_dish.png',
      sushi: '/assets/sprites/food/sushi.png',
      soup: '/assets/sprites/food/soup.png',
      butter: '/assets/sprites/hazard_butter_slab.png',
    };
    Object.entries(itemMap).forEach(([key, src]) => {
      const img = new Image();
      img.src = src;
      this.itemSprites[key] = img;
    });

    const colors = ['blue', 'yellow', 'red', 'green'];
    colors.forEach(c => {
      const idle = new Image();
      idle.src = `/assets/sprites/fisherman/${c}/idle.png`;
      const carryDown = new Image();
      carryDown.src = `/assets/sprites/fisherman/${c}/carry_down.png`;
      const carrySide = new Image();
      carrySide.src = `/assets/sprites/fisherman/${c}/carry_side.png`;
      const carryUp = new Image();
      carryUp.src = `/assets/sprites/fisherman/${c}/carry_up.png`;
      const slip = new Image();
      slip.src = `/assets/sprites/fisherman/${c}/slip.png`;
      const conga = new Image();
      conga.src = `/assets/sprites/fisherman/${c}/conga.png`;

      const runSide: HTMLImageElement[] = [];
      const runDown: HTMLImageElement[] = [];
      const runUp: HTMLImageElement[] = [];
      const carryRunSide: HTMLImageElement[] = [];
      for (let i = 0; i < 4; i++) {
        const imgSide = new Image();
        imgSide.src = `/assets/sprites/fisherman/${c}/run_${i}.png`;
        runSide.push(imgSide);

        const imgDown = new Image();
        imgDown.src = `/assets/sprites/fisherman/${c}/run_down_${i}.png`;
        runDown.push(imgDown);

        const imgUp = new Image();
        imgUp.src = `/assets/sprites/fisherman/${c}/run_up_${i}.png`;
        runUp.push(imgUp);

        const imgCarry = new Image();
        imgCarry.src = `/assets/sprites/fisherman/${c}/carry_run_${i}.png`;
        carryRunSide.push(imgCarry);
      }
      this.fishermanSprites[c] = { idle, runSide, runDown, runUp, carryDown, carrySide, carryUp, carryRunSide, slip, conga };
    });
  }

  public getItemSprite(item: EntityItem): HTMLImageElement | null {
    if (item.speciesId && this.itemSprites[item.speciesId]) {
      return this.itemSprites[item.speciesId];
    }
    if (this.itemSprites[item.type]) {
      return this.itemSprites[item.type];
    }
    if (item.name && this.itemSprites[item.name.toLowerCase()]) {
      return this.itemSprites[item.name.toLowerCase()];
    }
    return null;
  }

  public addPopup(text: string, color: string, x: number, y: number): void {
    this.floatingPopups.push({
      id: 'pop_' + Date.now() + '_' + Math.random(),
      text,
      color,
      x,
      y,
      vy: -1.4,
      scale: 0.5,
      opacity: 1.0,
      life: 0,
      maxLife: 1.5
    });
  }

  public render(state: GameRoomState, oceanShadows?: OceanFishShadow[]): void {
    const { ctx, canvas } = this;
    this.waveOffset += 0.03;

    // 1. Clear & Ocean Background with Level Atmospheric Shaders
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    this.drawLevelAtmosphere(state);

    // 2. Swimming Fish Shadows in Ocean
    if (oceanShadows) {
      this.drawOceanFishShadows(oceanShadows, state);
    }

    // 3. Level 5 Kraken Boss Ocean Tentacles (behind boat)
    if (state.level.isBossLevel && state.krakenBoss) {
      this.drawKrakenBossBehind(state);
    }

    // 4. Center & Apply Boat Tilt Transform
    ctx.save();
    const centerX = CANVAS_WIDTH / 2;
    const centerY = CANVAS_HEIGHT / 2;

    ctx.translate(centerX, centerY);
    ctx.rotate((state.boatAngle * Math.PI) / 180);
    ctx.translate(-centerX, -centerY);

    // 5. Draw Boat Shadow on Water
    ctx.fillStyle = 'rgba(2, 6, 23, 0.55)';
    ctx.beginPath();
    ctx.roundRect(BOAT_BOUNDS.x + 12, BOAT_BOUNDS.y + 22, BOAT_BOUNDS.width, BOAT_BOUNDS.height, BOAT_BOUNDS.radius);
    ctx.fill();

    // 6. Draw Boat Hull & Deck Planks
    this.drawBoatHull(state);

    // 7. Draw Deck Puddles (Butter, Slime, Grease)
    this.drawDeckPuddles(state);

    // 8. Draw Railing Cast Hotspot Prompts
    this.drawRailingPrompts(state);

    // 9. Draw Work Stations & Kitchen Minigames
    state.stations.forEach(station => {
      this.drawStation(station);
    });

    // 10. Draw Loose Items on Deck
    state.items.forEach(item => {
      if (!item.isHeld) {
        this.drawItem(item);
      }
    });

    // 11. Draw Conga Line Connection Chains
    this.drawCongaConnections(state);

    // 12. Draw Players (with Fishing Rods & Reel Minigames)
    state.players.forEach(player => {
      this.drawPlayer(player, state);
    });

    // 13. Level 5 Kraken Grappling Tentacles (on top of gunwales)
    if (state.level.isBossLevel && state.krakenBoss) {
      this.drawKrakenGrapplingTentacles(state);
    }

    // 14. Mass Balance Debug Overlays
    if (this.showDebugMass) {
      this.drawMassBalanceOverlay(state);
    }

    ctx.restore();

    // 15. Dynamic Screen Shaders (Green CRT, Solar Eclipse, Ink Splatters)
    this.drawScreenShaders(state);

    // 16. Top HUD Boss Bar for Level 5 Kraken
    if (state.level.isBossLevel && state.krakenBoss) {
      this.drawKrakenBossHUD(state);
    }

    // 17. Floating Comic Popups (+$120 CHOWDER!, 💥 STUNNED!, 🤝 CONGA!)
    this.drawFloatingComicPopups();
  }

  private drawLevelAtmosphere(state: GameRoomState): void {
    const { ctx } = this;
    const lvl = state.level.levelNumber;

    if (lvl === 1) {
      // Level 1: Sunlit Sweetwater Pond
      const grad = ctx.createLinearGradient(0, 0, 0, CANVAS_HEIGHT);
      grad.addColorStop(0, '#042f2e');
      grad.addColorStop(0.5, '#0d9488');
      grad.addColorStop(1, '#115e59');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

      ctx.strokeStyle = 'rgba(204, 251, 241, 0.15)';
      ctx.lineWidth = 2;
    } else if (lvl === 2) {
      // Level 2: Industrial Smog Coast
      const grad = ctx.createLinearGradient(0, 0, 0, CANVAS_HEIGHT);
      grad.addColorStop(0, '#1c1917');
      grad.addColorStop(0.5, '#292524');
      grad.addColorStop(1, '#064e3b');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

      ctx.strokeStyle = 'rgba(234, 179, 8, 0.12)';
      ctx.lineWidth = 2;
    } else if (lvl === 3) {
      // Level 3: Abyssal Trench (Pitch Black + Bioluminescence)
      const grad = ctx.createLinearGradient(0, 0, 0, CANVAS_HEIGHT);
      grad.addColorStop(0, '#020617');
      grad.addColorStop(0.5, '#030712');
      grad.addColorStop(1, '#082f49');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

      // Bioluminescent underwater dots
      ctx.fillStyle = 'rgba(56, 189, 248, 0.4)';
      for (let i = 0; i < 12; i++) {
        const bx = (i * 80 + Math.sin(this.waveOffset + i) * 30) % CANVAS_WIDTH;
        const by = (i * 50 + Math.cos(this.waveOffset + i) * 20) % CANVAS_HEIGHT;
        ctx.beginPath();
        ctx.arc(bx, by, 3, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.strokeStyle = 'rgba(56, 189, 248, 0.2)';
      ctx.lineWidth = 1.5;
    } else if (lvl === 4) {
      // Level 4: The Maelstrom (Whirlpool Vortex)
      const grad = ctx.createRadialGradient(CANVAS_WIDTH/2, CANVAS_HEIGHT/2, 50, CANVAS_WIDTH/2, CANVAS_HEIGHT/2, 450);
      grad.addColorStop(0, '#0c4a6e');
      grad.addColorStop(0.7, '#082f49');
      grad.addColorStop(1, '#020617');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

      // Rotating whirlpool spiral lines
      ctx.save();
      ctx.translate(CANVAS_WIDTH/2, CANVAS_HEIGHT/2);
      ctx.rotate(this.waveOffset * 1.5);
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.18)';
      ctx.lineWidth = 2;
      for (let r = 80; r < 400; r += 40) {
        ctx.beginPath();
        ctx.arc(0, 0, r, 0, Math.PI * 1.5);
        ctx.stroke();
      }
      ctx.restore();

      ctx.strokeStyle = 'rgba(125, 211, 252, 0.15)';
      ctx.lineWidth = 1.5;
    } else {
      // Level 5: The Eldritch Kraken Thunderstorm
      const grad = ctx.createLinearGradient(0, 0, 0, CANVAS_HEIGHT);
      grad.addColorStop(0, '#1e1b4b');
      grad.addColorStop(0.5, '#0f172a');
      grad.addColorStop(1, '#581c87');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

      // Lightning flash occasionally
      if (Math.sin(this.waveOffset * 3) > 0.96) {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
        ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
      }

      ctx.strokeStyle = 'rgba(192, 132, 252, 0.25)';
      ctx.lineWidth = 2;
    }

    // Dynamic wave ripples
    for (let y = 30; y < CANVAS_HEIGHT; y += 45) {
      ctx.beginPath();
      for (let x = 0; x < CANVAS_WIDTH; x += 10) {
        const waveY = y + Math.sin(x * 0.02 + this.waveOffset + y) * 4;
        if (x === 0) ctx.moveTo(x, waveY);
        else ctx.lineTo(x, waveY);
      }
      ctx.stroke();
    }
  }

  private drawOceanFishShadows(shadows: OceanFishShadow[], state: GameRoomState): void {
    const { ctx } = this;
    shadows.forEach(s => {
      ctx.save();
      ctx.translate(s.x, s.y);
      const angle = Math.atan2(s.vy, s.vx);
      ctx.rotate(angle);

      ctx.fillStyle = state.level.levelNumber === 3 ? 'rgba(56, 189, 248, 0.7)' : 'rgba(15, 23, 42, 0.65)';
      ctx.beginPath();
      ctx.ellipse(0, 0, s.size, s.size * 0.45, 0, 0, Math.PI * 2);
      ctx.fill();

      const wag = Math.sin(Date.now() * 0.01 + s.size) * 4;
      ctx.beginPath();
      ctx.moveTo(-s.size, 0);
      ctx.lineTo(-s.size - 8, -6 + wag);
      ctx.lineTo(-s.size - 8, 6 + wag);
      ctx.closePath();
      ctx.fill();

      ctx.restore();
    });
  }

  private drawKrakenBossBehind(state: GameRoomState): void {
    const { ctx } = this;
    const t = Date.now() * 0.0015;

    // Giant underwater kraken head shadow
    ctx.fillStyle = 'rgba(88, 28, 135, 0.45)';
    ctx.beginPath();
    ctx.arc(CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + Math.sin(t) * 10, 180, 0, Math.PI * 2);
    ctx.fill();

    // Giant glowing yellow eyes
    ctx.fillStyle = 'rgba(250, 204, 21, 0.85)';
    ctx.beginPath();
    ctx.arc(CANVAS_WIDTH / 2 - 60, CANVAS_HEIGHT / 2 - 140, 14, 0, Math.PI * 2);
    ctx.arc(CANVAS_WIDTH / 2 + 60, CANVAS_HEIGHT / 2 - 140, 14, 0, Math.PI * 2);
    ctx.fill();
  }

  private drawKrakenGrapplingTentacles(state: GameRoomState): void {
    const { ctx } = this;
    const boss = state.krakenBoss!;
    const t = Date.now() * 0.003;

    // Port Tentacle
    if (boss.portTentacleGrappling) {
      ctx.fillStyle = '#9333ea';
      ctx.strokeStyle = '#c084fc';
      ctx.lineWidth = 4;
      ctx.beginPath();
      const waveX = Math.sin(t) * 12;
      ctx.arc(BOAT_BOUNDS.x + 10 + waveX, CANVAS_HEIGHT / 2, 28, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 10px Plus Jakarta Sans';
      ctx.textAlign = 'center';
      ctx.fillText('SLAP TO REPEL!', BOAT_BOUNDS.x + 10, CANVAS_HEIGHT / 2 - 34);
    }

    // Starboard Tentacle
    if (boss.starboardTentacleGrappling) {
      ctx.fillStyle = '#9333ea';
      ctx.strokeStyle = '#c084fc';
      ctx.lineWidth = 4;
      ctx.beginPath();
      const waveX = Math.sin(t + 1) * 12;
      ctx.arc(BOAT_BOUNDS.x + BOAT_BOUNDS.width - 10 + waveX, CANVAS_HEIGHT / 2, 28, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 10px Plus Jakarta Sans';
      ctx.textAlign = 'center';
      ctx.fillText('SLAP TO REPEL!', BOAT_BOUNDS.x + BOAT_BOUNDS.width - 10, CANVAS_HEIGHT / 2 - 34);
    }
  }

  private drawKrakenBossHUD(state: GameRoomState): void {
    const { ctx } = this;
    const boss = state.krakenBoss!;
    const barW = 320;
    const barH = 14;
    const barX = CANVAS_WIDTH / 2 - barW / 2;
    const barY = 48;

    // Container
    ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
    ctx.beginPath();
    ctx.roundRect(barX - 10, barY - 20, barW + 20, barH + 30, 10);
    ctx.fill();

    // Title
    ctx.fillStyle = '#c084fc';
    ctx.font = 'bold 11px Plus Jakarta Sans';
    ctx.textAlign = 'center';
    ctx.fillText(`🦑 THE ELDRITCH KRAKEN — ${boss.currentHP} / ${boss.maxHP} HP`, CANVAS_WIDTH / 2, barY - 6);

    // HP Bar Bg
    ctx.fillStyle = '#3b0764';
    ctx.fillRect(barX, barY, barW, barH);

    // HP Fill
    const pct = Math.max(0, boss.currentHP / boss.maxHP);
    ctx.fillStyle = '#a855f7';
    ctx.fillRect(barX, barY, barW * pct, barH);

    ctx.strokeStyle = '#c084fc';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(barX, barY, barW, barH);
  }

  private drawBoatHull(state: GameRoomState): void {
    const { ctx } = this;

    ctx.fillStyle = '#0f172a';
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.roundRect(BOAT_BOUNDS.x, BOAT_BOUNDS.y, BOAT_BOUNDS.width, BOAT_BOUNDS.height, BOAT_BOUNDS.radius);
    ctx.fill();
    ctx.stroke();

    const deckX = BOAT_BOUNDS.x + 14;
    const deckY = BOAT_BOUNDS.y + 14;
    const deckW = BOAT_BOUNDS.width - 28;
    const deckH = BOAT_BOUNDS.height - 28;

    ctx.fillStyle = '#1e293b';
    ctx.beginPath();
    ctx.roundRect(deckX, deckY, deckW, deckH, BOAT_BOUNDS.radius - 8);
    ctx.fill();

    ctx.strokeStyle = 'rgba(15, 23, 42, 0.65)';
    ctx.lineWidth = 2;
    for (let y = deckY + 25; y < deckY + deckH; y += 28) {
      ctx.beginPath();
      ctx.moveTo(deckX + 10, y);
      ctx.lineTo(deckX + deckW - 10, y);
      ctx.stroke();
    }

    ctx.strokeStyle = 'rgba(45, 212, 191, 0.18)';
    ctx.setLineDash([6, 6]);
    ctx.beginPath();
    ctx.moveTo(CANVAS_WIDTH / 2, deckY + 10);
    ctx.lineTo(CANVAS_WIDTH / 2, deckY + deckH - 10);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  private drawRailingPrompts(state: GameRoomState): void {
    const { ctx } = this;
    state.players.forEach(p => {
      if (p.isFishing || p.holdingItemId) return;
      const isNearRailing = 
        p.x < DECK_BOUNDS.minX + 35 ||
        p.x > DECK_BOUNDS.maxX - 35 ||
        p.y < DECK_BOUNDS.minY + 35 ||
        p.y > DECK_BOUNDS.maxY - 35;

      if (isNearRailing) {
        ctx.fillStyle = 'rgba(45, 212, 191, 0.9)';
        ctx.font = 'bold 10px Plus Jakarta Sans';
        ctx.textAlign = 'center';
        ctx.fillText('🎣 CAST (Space / J / Enter)', p.x, p.y - 34);
      }
    });
  }

  private drawStation(station: WorkStation): void {
    const { ctx } = this;

    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.beginPath();
    ctx.roundRect(station.x + 3, station.y + 5, station.w, station.h, 10);
    ctx.fill();

    // Broken / Mismatch penalty overlay
    if (station.isBroken) {
      ctx.fillStyle = '#451a03';
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.roundRect(station.x, station.y, station.w, station.h, 10);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#f59e0b';
      ctx.font = 'bold 11px Plus Jakarta Sans';
      ctx.textAlign = 'center';
      ctx.fillText('⚠️ BROKEN KNIFE', station.x + station.w / 2, station.y + station.h / 2 - 4);
      ctx.font = '10px Plus Jakarta Sans';
      ctx.fillText(`Repairing: ${Math.ceil(station.brokenTimer || 5)}s`, station.x + station.w / 2, station.y + station.h / 2 + 12);
      return;
    }

    if (station.type === 'cooler') {
      ctx.fillStyle = '#0284c7';
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.roundRect(station.x, station.y, station.w, station.h, 12);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 12px Plus Jakarta Sans';
      ctx.textAlign = 'center';
      ctx.fillText('COOLER 🧊', station.x + station.w / 2, station.y + station.h / 2 - 4);
      ctx.font = '10px Plus Jakarta Sans';
      ctx.fillStyle = '#bae6fd';
      ctx.fillText('Deposit Fish', station.x + station.w / 2, station.y + station.h / 2 + 14);

    } else if (station.type === 'cutting_board') {
      ctx.fillStyle = '#d97706';
      ctx.strokeStyle = '#fde047';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(station.x, station.y, station.w, station.h, 8);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 11px Plus Jakarta Sans';
      ctx.textAlign = 'center';
      ctx.fillText('FILLET 🔪', station.x + station.w / 2, station.y + station.h / 2 - 2);

      if (station.heldItem && station.minigameState === 'chopping') {
        const count = station.chopCount || 0;
        ctx.fillStyle = '#fef08a';
        ctx.font = 'bold 10px Plus Jakarta Sans';
        ctx.fillText(`CHOP: ${count}/3 (Press Action!)`, station.x + station.w / 2, station.y - 12);

        for (let i = 0; i < 3; i++) {
          ctx.fillStyle = i < count ? '#22c55e' : '#475569';
          ctx.beginPath();
          ctx.arc(station.x + 25 + i * 20, station.y + station.h - 10, 4, 0, Math.PI * 2);
          ctx.fill();
        }
      }

    } else if (station.type === 'deep_fryer') {
      ctx.fillStyle = '#dc2626';
      ctx.strokeStyle = '#f87171';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(station.x, station.y, station.w, station.h, 8);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 11px Plus Jakarta Sans';
      ctx.textAlign = 'center';
      ctx.fillText('FRYER 🍳', station.x + station.w / 2, station.y + station.h / 2 - 2);

      if (station.heldItem && station.minigameState === 'frying') {
        const heat = station.fryHeat || 0;
        const barW = station.w - 16;
        const barH = 6;
        const barX = station.x + 8;
        const barY = station.y + station.h - 12;

        ctx.fillStyle = '#0f172a';
        ctx.fillRect(barX, barY, barW, barH);

        ctx.fillStyle = '#22c55e';
        ctx.fillRect(barX + barW * 0.55, barY, barW * 0.35, barH);

        ctx.fillStyle = heat > 0.90 ? '#ef4444' : heat > 0.55 ? '#facc15' : '#38bdf8';
        ctx.fillRect(barX, barY, barW * Math.min(1, heat), barH);

        ctx.font = 'bold 9px Plus Jakarta Sans';
        ctx.fillStyle = heat > 0.55 && heat < 0.90 ? '#facc15' : '#f87171';
        ctx.fillText(heat > 0.55 && heat < 0.90 ? '✨ PULL NOW! ✨' : heat > 0.90 ? '🔥 BURNING!' : 'Sizzling...', station.x + station.w / 2, station.y - 12);
      }

    } else if (station.type === 'soup_pot') {
      ctx.fillStyle = '#16a34a';
      ctx.strokeStyle = '#86efac';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(station.x, station.y, station.w, station.h, 8);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 11px Plus Jakarta Sans';
      ctx.textAlign = 'center';
      ctx.fillText('SOUP 🍲', station.x + station.w / 2, station.y + station.h / 2 - 2);

      if (station.heldItem && station.minigameState === 'stirring') {
        const swirls = station.stirSwirls || 0;
        ctx.fillStyle = '#86efac';
        ctx.font = 'bold 10px Plus Jakarta Sans';
        ctx.fillText(`STIR: ${swirls}/3 (Press Action!)`, station.x + station.w / 2, station.y - 12);

        for (let i = 0; i < 3; i++) {
          ctx.fillStyle = i < swirls ? '#22c55e' : '#475569';
          ctx.beginPath();
          ctx.arc(station.x + 25 + i * 20, station.y + station.h - 10, 4, 0, Math.PI * 2);
          ctx.fill();
        }
      }

    } else if (station.type === 'rod_rack') {
      // 🎣 Rod Storage Rack
      ctx.fillStyle = '#78350f';
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(station.x, station.y, station.w, station.h, 6);
      ctx.fill();
      ctx.stroke();

      // Fishing rods resting on rack
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(station.x + 12, station.y + station.h - 8);
      ctx.lineTo(station.x + 12, station.y + 8);
      ctx.moveTo(station.x + 28, station.y + station.h - 8);
      ctx.lineTo(station.x + 28, station.y + 8);
      ctx.stroke();

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 10px Plus Jakarta Sans';
      ctx.textAlign = 'center';
      ctx.fillText('RODS 🎣', station.x + station.w / 2, station.y + station.h / 2 - 2);

    } else if (station.type === 'sushi_station') {
      ctx.fillStyle = '#581c87';
      ctx.strokeStyle = '#c084fc';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(station.x, station.y, station.w, station.h, 8);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 11px Plus Jakarta Sans';
      ctx.textAlign = 'center';
      ctx.fillText('SUSHI 🍣', station.x + station.w / 2, station.y + station.h / 2 - 2);

    } else if (station.type === 'trash_chute') {
      ctx.fillStyle = '#334155';
      ctx.strokeStyle = '#64748b';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(station.x, station.y, station.w, station.h, 8);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 11px Plus Jakarta Sans';
      ctx.textAlign = 'center';
      ctx.fillText('TRASH 🗑️', station.x + station.w / 2, station.y + station.h / 2 - 2);
      ctx.font = '9px Plus Jakarta Sans';
      ctx.fillStyle = '#94a3b8';
      ctx.fillText('Discard Boots', station.x + station.w / 2, station.y + station.h / 2 + 12);
    }

    // Render item being processed on the station
    if (station.heldItem) {
      const itemSprite = this.getItemSprite(station.heldItem);
      const ix = station.x + station.w / 2;
      const iy = station.y + station.h / 2 - 2;
      if (itemSprite && itemSprite.complete && itemSprite.naturalWidth > 0) {
        const isz = 30;
        ctx.drawImage(itemSprite, ix - isz / 2, iy - isz / 2, isz, isz);
      } else {
        ctx.font = '20px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(station.heldItem.emoji, ix, iy);
      }
    }

    // Slapstick Penalty Overlays (Broken Knife & Electrified Basin)
    if (station.isBroken) {
      ctx.fillStyle = 'rgba(239, 68, 68, 0.4)';
      ctx.fillRect(station.x, station.y, station.w, station.h);
      ctx.font = '20px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('🔪⚠️', station.x + station.w / 2, station.y + station.h / 2 + 6);
    }

    if (station.isElectrified) {
      ctx.strokeStyle = '#fde047';
      ctx.lineWidth = 3;
      ctx.strokeRect(station.x - 2, station.y - 2, station.w + 4, station.h + 4);
      ctx.font = '18px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('⚡', station.x + station.w / 2, station.y - 8);
    }
  }

  private drawItem(item: EntityItem): void {
    const { ctx } = this;
    ctx.save();
    ctx.translate(item.x, item.y);

    // Floor shadow
    ctx.fillStyle = 'rgba(2, 6, 23, 0.3)';
    ctx.beginPath();
    ctx.ellipse(0, 10, 16, 7, 0, 0, Math.PI * 2);
    ctx.fill();

    const sprite = this.getItemSprite(item);
    if (sprite && sprite.complete && sprite.naturalWidth > 0) {
      const size = 36;
      ctx.drawImage(sprite, -size / 2, -size / 2 - 2, size, size);
    } else {
      ctx.font = '22px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(item.emoji, 0, 0);
    }

    if (item.speciesId === 'bombfish' && item.stateTimer !== undefined) {
      ctx.fillStyle = '#ef4444';
      ctx.font = 'bold 10px Plus Jakarta Sans';
      ctx.textAlign = 'center';
      ctx.fillText(`💣 ${Math.ceil(item.stateTimer)}s`, 0, -20);
    }

    ctx.restore();
  }

  private drawPlayer(player: PlayerState, state: GameRoomState): void {
    const { ctx } = this;
    const isMoving = Math.hypot(player.vx, player.vy) > 0.1;
    const walkPhase = isMoving ? Math.sin(Date.now() * 0.018 + player.playerIndex) : 0;
    const bobY = isMoving ? Math.abs(Math.sin(Date.now() * 0.018 + player.playerIndex)) * 2.5 : 0;

    ctx.save();
    ctx.translate(player.x, player.y);

    // 1. Draw Player Shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
    ctx.beginPath();
    ctx.ellipse(0, 14, 16, 7, 0, 0, Math.PI * 2);
    ctx.fill();

    const isSlipped = player.isSlipping || player.isStunned;
    const isConga = (player.congaLeaderId || player.congaFollowerIds.length > 0) ? true : false;

    // 2. Spinning Dizzy Stars if Stunned/Slipping
    if (isSlipped) {
      const starT = Date.now() * 0.006;
      for (let s = 0; s < 3; s++) {
        const starAngle = starT + (s * (Math.PI * 2 / 3));
        const starX = Math.cos(starAngle) * 26;
        const starY = -34 + Math.sin(starAngle) * 9;
        ctx.fillStyle = '#facc15';
        ctx.font = '12px Arial';
        ctx.fillText('⭐', starX, starY);
      }
    }

    // 3. Render Pixel-Art Sailor Sprite
    const sprites = this.fishermanSprites[player.color] || this.fishermanSprites['yellow'];
    if (sprites && sprites.idle.complete) {
      ctx.save();
      const frameIdx = Math.floor((Date.now() / 125 + player.playerIndex) % 4);
      let spriteImg: HTMLImageElement = sprites.idle;

      if (isSlipped && sprites.slip) {
        // Slapstick butter slip wipeout sprite!
        if (player.facing === 'left') {
          ctx.scale(-1, 1);
        }
        spriteImg = sprites.slip;
      } else if (isConga && sprites.conga) {
        // Conga tug-of-war pulling pose!
        if (player.facing === 'left') {
          ctx.scale(-1, 1);
        }
        spriteImg = sprites.conga;
      } else if (player.holdingItemId) {
        // Carrying pose with arms raised overhead: animated run when moving sideways!
        if (isMoving && sprites.carryRunSide.length === 4 && (player.facing === 'left' || player.facing === 'right')) {
          if (player.facing === 'left') {
            ctx.scale(-1, 1);
          }
          spriteImg = sprites.carryRunSide[frameIdx];
        } else if (player.facing === 'up' && sprites.carryUp) {
          spriteImg = sprites.carryUp;
        } else if (player.facing === 'down' && sprites.carryDown) {
          spriteImg = sprites.carryDown;
        } else if (sprites.carrySide) {
          if (player.facing === 'left') {
            ctx.scale(-1, 1);
          }
          spriteImg = sprites.carrySide;
        }
      } else if (isMoving) {
        if (player.facing === 'up' && sprites.runUp.length === 4) {
          spriteImg = sprites.runUp[frameIdx];
        } else if (player.facing === 'down' && sprites.runDown.length === 4) {
          spriteImg = sprites.runDown[frameIdx];
        } else if (sprites.runSide.length === 4) {
          if (player.facing === 'left') {
            ctx.scale(-1, 1);
          }
          spriteImg = sprites.runSide[frameIdx];
        }
      } else {
        // Idle stances
        if (player.facing === 'up' && sprites.runUp.length >= 2) {
          spriteImg = sprites.runUp[1];
        } else if (player.facing === 'down' && sprites.runDown.length >= 2) {
          spriteImg = sprites.runDown[1];
        } else {
          if (player.facing === 'left') {
            ctx.scale(-1, 1);
          }
          spriteImg = sprites.idle;
        }
      }

      // Draw sprite centered at player position
      const sprW = 46;
      const sprH = 46;
      ctx.drawImage(spriteImg, -sprW / 2, -sprH + 14 - bobY, sprW, sprH);
      ctx.restore();
    } else {
      // Fallback vector drawing if sprites not loaded yet
      if (isMoving && !player.isSlipping && !player.isStunned) {
        ctx.fillStyle = '#0f172a';
        ctx.beginPath();
        ctx.ellipse(-7 + walkPhase * 4, 14, 4, 3, 0, 0, Math.PI * 2);
        ctx.ellipse(7 - walkPhase * 4, 14, 4, 3, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = player.colorHex;
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(0, -bobY, 16, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }

    // 7. Player Name Tag
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 10px Plus Jakarta Sans';
    ctx.textAlign = 'center';
    ctx.fillText(player.name.substring(0, 8), 0, -36 - bobY);

    // 8. Held Item Visual (overhead carry between palms)
    if (player.holdingItemId) {
      const held = state.items.find(i => i.id === player.holdingItemId);
      if (held) {
        const sprite = this.getItemSprite(held);
        if (sprite && sprite.complete && sprite.naturalWidth > 0) {
          const sz = 34;
          // Overhead hands position
          ctx.drawImage(sprite, -sz / 2, -48 - bobY - sz / 2, sz, sz);
        } else {
          ctx.font = '22px Arial';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(held.emoji, 0, -48 - bobY);
        }
      }
    }

    // 8.5 Slung Fishing Rod on Back (when hasRodEquipped)
    if (player.hasRodEquipped && !player.isFishing) {
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(-10, 8 - bobY);
      ctx.lineTo(14, -28 - bobY);
      ctx.stroke();
      ctx.fillStyle = '#f59e0b';
      ctx.beginPath();
      ctx.arc(-8, 6 - bobY, 2.5, 0, Math.PI * 2);
      ctx.fill();
    }

    if (player.isFishing) {
      this.drawPlayerFishingRod(player);
    }

    // 9. Overhead Color-Coded Contextual Action Pill (Single-word, clean capsule)
    if (player.contextualAction) {
      const act = player.contextualAction;
      const pillY = player.holdingItemId ? -56 - bobY : -36 - bobY;

      ctx.save();
      ctx.font = '900 9px "Plus Jakarta Sans", sans-serif';
      const textMetrics = ctx.measureText(act.label);
      const pillW = textMetrics.width + 14;
      const pillH = 15;

      // Dark slate background with color-coded border
      ctx.fillStyle = 'rgba(15, 23, 42, 0.94)';
      ctx.strokeStyle = act.colorHex;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.roundRect(-pillW / 2, pillY - pillH / 2, pillW, pillH, 8);
      ctx.fill();
      ctx.stroke();

      // Bold color-coded text fill
      ctx.fillStyle = act.colorHex;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(act.label, 0, pillY + 0.5);
      ctx.restore();
    }

    ctx.restore();
  }

  private drawPlayerFishingRod(p: PlayerState): void {
    const { ctx } = this;
    const targetX = (p.castTargetX ?? p.x) - p.x;
    const targetY = (p.castTargetY ?? p.y) - p.y;

    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(0, -6);
    ctx.quadraticCurveTo(targetX * 0.5, targetY * 0.3 - 20, targetX, targetY);
    ctx.stroke();

    ctx.fillStyle = '#ef4444';
    ctx.beginPath();
    ctx.arc(targetX, targetY, 4, 0, Math.PI * 2);
    ctx.fill();

    // Reeling Minigame Overlay (Green Catcher Bar + Fish Icon)
    if (p.fishingState === 'biting' || p.fishingState === 'reeling') {
      const gaugeW = 80;
      const gaugeH = 14;
      const gaugeX = -gaugeW / 2;
      const gaugeY = -60;

      ctx.fillStyle = 'rgba(15, 23, 42, 0.92)';
      ctx.beginPath();
      ctx.roundRect(gaugeX - 4, gaugeY - 4, gaugeW + 8, gaugeH + 8, 8);
      ctx.fill();

      // Tube track
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(gaugeX, gaugeY, gaugeW, gaugeH);

      // Player Green Catcher Bar
      const greenPos = p.reelSweetSpot || 0.2;
      const greenW = gaugeW * 0.28;
      ctx.fillStyle = 'rgba(34, 197, 94, 0.85)';
      ctx.fillRect(gaugeX + gaugeW * greenPos, gaugeY, greenW, gaugeH);

      // Swimming Fish
      const fishPos = p.reelNeedle || 0.5;
      const fishX = gaugeX + gaugeW * fishPos;
      ctx.font = '12px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('🐟', fishX, gaugeY + 11);

      // Progress Arc
      const prog = p.reelProgress || 0.2;
      ctx.strokeStyle = '#22c55e';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(0, gaugeY - 14, 10, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * prog);
      ctx.stroke();
    }
  }

  private drawDeckPuddles(state: GameRoomState): void {
    const { ctx } = this;
    state.deckPuddles.forEach(p => {
      ctx.save();
      ctx.translate(p.x, p.y);

      if (p.type === 'butter') {
        if (this.butterImg && this.butterImg.complete && this.butterImg.naturalWidth > 0) {
          const bw = p.radius * 2.4;
          const bh = bw * (this.butterImg.naturalHeight / this.butterImg.naturalWidth);
          ctx.drawImage(this.butterImg, -bw / 2, -bh / 2, bw, bh);
        } else {
          ctx.fillStyle = 'rgba(250, 204, 21, 0.45)';
          ctx.strokeStyle = 'rgba(254, 240, 138, 0.7)';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.ellipse(0, 0, p.radius, p.radius * 0.65, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();

          ctx.fillStyle = '#ffffff';
          ctx.font = '10px Arial';
          ctx.fillText('🧈', -5, 3);
        }
      } else if (p.type === 'slime') {
        ctx.fillStyle = 'rgba(16, 185, 129, 0.45)';
        ctx.strokeStyle = 'rgba(110, 231, 183, 0.7)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.ellipse(0, 0, p.radius, p.radius * 0.6, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }

      ctx.restore();
    });
  }

  private drawCongaConnections(state: GameRoomState): void {
    const { ctx } = this;
    state.players.forEach(p => {
      if (p.congaLeaderId) {
        const leader = state.players.find(l => l.id === p.congaLeaderId);
        if (leader) {
          ctx.strokeStyle = '#facc15';
          ctx.lineWidth = 3;
          ctx.setLineDash([4, 4]);
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(leader.x, leader.y);
          ctx.stroke();
          ctx.setLineDash([]);

          ctx.fillStyle = '#facc15';
          ctx.font = 'bold 9px Plus Jakarta Sans';
          ctx.textAlign = 'center';
          ctx.fillText('🤝 CONGA', (p.x + leader.x) / 2, (p.y + leader.y) / 2 - 8);
        }
      }
    });
  }

  private drawScreenShaders(state: GameRoomState): void {
    const { ctx } = this;
    const shaders = state.screenShaders;
    if (!shaders) return;

    // 1. Solar Eclipse (Moonfish Darkness 60%)
    if (shaders.solarEclipseDarkness > 0) {
      ctx.fillStyle = `rgba(2, 6, 23, ${shaders.solarEclipseDarkness})`;
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

      // Lantern glow around players
      ctx.save();
      ctx.globalCompositeOperation = 'destination-out';
      state.players.forEach(p => {
        const grad = ctx.createRadialGradient(p.x, p.y, 10, p.x, p.y, 90);
        grad.addColorStop(0, 'rgba(0,0,0,1)');
        grad.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 90, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.restore();
    }

    // 2. Radioactive Bass Neon Green CRT Glow
    if (shaders.greenCrtGlow) {
      ctx.fillStyle = 'rgba(34, 197, 94, 0.12)';
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

      // Scanline effect
      ctx.fillStyle = 'rgba(0, 0, 0, 0.08)';
      for (let y = 0; y < CANVAS_HEIGHT; y += 4) {
        ctx.fillRect(0, y, CANVAS_WIDTH, 2);
      }

      ctx.fillStyle = '#4ade80';
      ctx.font = 'bold 10px monospace';
      ctx.fillText('☢️ GEIGER: 140 mR/h (RADIOACTIVE BASS ON DECK)', 20, CANVAS_HEIGHT - 20);
    }

    // 3. Ink Squid Camera Splatters
    if (shaders.inkSplatters && shaders.inkSplatters.length > 0) {
      shaders.inkSplatters.forEach(sp => {
        const alpha = Math.min(1, sp.fadeTimer / 1.5);
        ctx.fillStyle = `rgba(15, 23, 42, ${0.95 * alpha})`;
        ctx.beginPath();
        ctx.arc(sp.x, sp.y, sp.radius, 0, Math.PI * 2);
        ctx.fill();

        // Ink tendrils
        ctx.beginPath();
        ctx.arc(sp.x - sp.radius * 0.4, sp.y + sp.radius * 0.5, sp.radius * 0.4, 0, Math.PI * 2);
        ctx.arc(sp.x + sp.radius * 0.4, sp.y + sp.radius * 0.6, sp.radius * 0.35, 0, Math.PI * 2);
        ctx.fill();
      });
    }

    // 4. 🚨 6-Second Righting Scramble Emergency Siren Overlay
    if (state.isCapsizedScramble) {
      const pulse = Math.sin(Date.now() * 0.015);
      const alpha = 0.25 + pulse * 0.15;
      ctx.fillStyle = `rgba(239, 68, 68, ${alpha})`;
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

      // Top Emergency Scramble Banner
      ctx.fillStyle = '#020617';
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.roundRect(CANVAS_WIDTH / 2 - 200, 20, 400, 50, 16);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#f87171';
      ctx.font = '900 15px "Plus Jakarta Sans", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`🚨 6s SCRAMBLE: SPRINT TO HIGH SIDE & SPAM HEAVE!`, CANVAS_WIDTH / 2, 42);

      const timeLeft = Math.max(0, state.capsizeScrambleTimer || 0).toFixed(1);
      ctx.font = 'bold 12px monospace';
      ctx.fillStyle = '#facc15';
      ctx.fillText(`⏰ ${timeLeft}s UNTIL UNCLE GARY SALVAGE TAX (-$75)`, CANVAS_WIDTH / 2, 60);

      // High-Side Arrow Indicator
      const isTiltRight = state.boatAngle > 0;
      const targetSideX = isTiltRight ? CANVAS_WIDTH / 2 - 180 : CANVAS_WIDTH / 2 + 180;
      const arrowEmoji = isTiltRight ? '👈 SPRINT HERE & HEAVE!' : '👉 SPRINT HERE & HEAVE!';
      ctx.fillStyle = '#facc15';
      ctx.font = '900 16px "Plus Jakarta Sans", sans-serif';
      ctx.fillText(arrowEmoji, targetSideX, CANVAS_HEIGHT / 2);
    }
  }

  private drawMassBalanceOverlay(state: GameRoomState): void {
    const { ctx } = this;
    const centerX = CANVAS_WIDTH / 2;
    const boatY = BOAT_BOUNDS.y + 18;

    ctx.strokeStyle = 'rgba(250, 204, 21, 0.4)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(centerX, boatY, 6, 0, Math.PI * 2);
    ctx.stroke();
  }

  private drawFloatingComicPopups(): void {
    const { ctx } = this;
    for (let i = this.floatingPopups.length - 1; i >= 0; i--) {
      const p = this.floatingPopups[i];
      p.life += 1 / 60;
      p.y += p.vy;
      p.vy *= 0.94;

      // Pop-in bounce scale
      if (p.life < 0.25) {
        p.scale = 0.5 + (p.life / 0.25) * 0.7; // scales up to 1.2
      } else {
        p.scale = Math.max(0.9, 1.2 - (p.life - 0.25) * 0.3);
      }

      p.opacity = Math.max(0, 1 - (p.life / p.maxLife));

      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.scale(p.scale, p.scale);
      ctx.globalAlpha = p.opacity;

      ctx.font = '900 16px "Plus Jakarta Sans", sans-serif';
      ctx.textAlign = 'center';

      // Thick black comic outline
      ctx.strokeStyle = '#020617';
      ctx.lineWidth = 4;
      ctx.strokeText(p.text, 0, 0);

      // Bright fill text
      ctx.fillStyle = p.color;
      ctx.fillText(p.text, 0, 0);

      ctx.restore();

      if (p.life >= p.maxLife) {
        this.floatingPopups.splice(i, 1);
      }
    }
  }
}
