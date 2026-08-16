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

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
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
  }

  private drawItem(item: EntityItem): void {
    const { ctx } = this;
    ctx.save();
    ctx.translate(item.x, item.y);

    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.beginPath();
    ctx.ellipse(0, 10, 14, 6, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.font = '22px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(item.emoji, 0, 0);

    if (item.speciesId === 'bombfish' && item.stateTimer !== undefined) {
      ctx.fillStyle = '#ef4444';
      ctx.font = 'bold 10px Plus Jakarta Sans';
      ctx.fillText(`💣 ${Math.ceil(item.stateTimer)}s`, 0, -18);
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

    // 2. Slipping / Stunned Slapstick Animation (Flipped onto back with dizzy stars!)
    if (player.isSlipping || player.isStunned) {
      ctx.rotate(1.3);

      // Dizzy spinning stars
      const starT = Date.now() * 0.006;
      for (let s = 0; s < 3; s++) {
        const starAngle = starT + (s * (Math.PI * 2 / 3));
        const starX = Math.cos(starAngle) * 22;
        const starY = -28 + Math.sin(starAngle) * 8;
        ctx.fillStyle = '#facc15';
        ctx.font = '10px Arial';
        ctx.fillText('⭐', starX, starY);
      }
    }

    // 3. Animated Sailor Legs (Swinging with walk cycle)
    if (isMoving && !player.isSlipping && !player.isStunned) {
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.ellipse(-7 + walkPhase * 4, 14, 4, 3, 0, 0, Math.PI * 2);
      ctx.ellipse(7 - walkPhase * 4, 14, 4, 3, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    // 4. Sailor Torso / Head
    ctx.fillStyle = player.colorHex;
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(0, -bobY, 16, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // 5. Sailor Hat / Party Hat
    const isConga = player.congaLeaderId || player.congaFollowerIds.length > 0;
    if (isConga) {
      // Festive Conga Party Cone Hat
      ctx.fillStyle = '#ec4899';
      ctx.beginPath();
      ctx.moveTo(0, -32 - bobY);
      ctx.lineTo(-8, -16 - bobY);
      ctx.lineTo(8, -16 - bobY);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#facc15';
      ctx.beginPath();
      ctx.arc(0, -33 - bobY, 3, 0, Math.PI * 2);
      ctx.fill();
    } else {
      // Classic Sailor Beanie / Cap
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(-10, -18 - bobY, 20, 6);
      ctx.fillStyle = '#0284c7';
      ctx.fillRect(-12, -13 - bobY, 24, 3);
    }

    // 6. Directional Eyes & Pupils
    ctx.fillStyle = '#ffffff';
    let eyeOffsetX = 0;
    let eyeOffsetY = 0;
    if (player.facing === 'left') eyeOffsetX = -5;
    if (player.facing === 'right') eyeOffsetX = 5;
    if (player.facing === 'up') eyeOffsetY = -5;
    if (player.facing === 'down') eyeOffsetY = 5;

    ctx.beginPath();
    ctx.arc(-4 + eyeOffsetX, -2 + eyeOffsetY - bobY, 3, 0, Math.PI * 2);
    ctx.arc(4 + eyeOffsetX, -2 + eyeOffsetY - bobY, 3, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.arc(-4 + eyeOffsetX * 1.3, -2 + eyeOffsetY * 1.3 - bobY, 1.5, 0, Math.PI * 2);
    ctx.arc(4 + eyeOffsetX * 1.3, -2 + eyeOffsetY * 1.3 - bobY, 1.5, 0, Math.PI * 2);
    ctx.fill();

    // 7. Player Name Tag
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 10px Plus Jakarta Sans';
    ctx.textAlign = 'center';
    ctx.fillText(player.name.substring(0, 8), 0, -22 - bobY);

    // 8. Held Item Visual
    if (player.holdingItemId) {
      const held = state.items.find(i => i.id === player.holdingItemId);
      if (held) {
        ctx.font = '20px Arial';
        ctx.fillText(held.emoji, 0, -36 - bobY);
      }
    }

    if (player.isFishing) {
      this.drawPlayerFishingRod(player);
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
