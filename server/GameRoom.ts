// Dedicated Game Room Instance & Authoritative Loop

import { Server, Socket } from 'socket.io';
import { 
  GameRoomState, 
  PlayerState, 
  EntityItem, 
  WorkStation, 
  PlayerInput, 
  FishSpeciesId, 
  ClientRole,
  SecretBounty
} from '../shared/types';
import { 
  TICK_INTERVAL, 
  CANVAS_WIDTH, 
  CANVAS_HEIGHT, 
  PLAYER_PROFILES, 
  GAME_AREAS 
} from '../shared/constants';
import { FISH_REGISTRY } from '../shared/fishDatabase';
import { PhysicsEngine } from './PhysicsEngine';
import { BountyManager } from './BountyManager';

export class GameRoom {
  public roomCode: string;
  public state: GameRoomState;
  private io: Server;
  private intervalId: NodeJS.Timeout | null = null;
  private playerInputs: Map<string, PlayerInput> = new Map();
  private displaySockets: Set<string> = new Set();
  private spawnCooldown: number = 0;

  constructor(roomCode: string, io: Server) {
    this.roomCode = roomCode;
    this.io = io;

    const initialArea = GAME_AREAS[0];

    this.state = {
      roomCode,
      area: initialArea,
      state: 'lobby',
      timeLeft: initialArea.timeLimitSeconds,
      teamCash: 0,
      quotaTarget: initialArea.targetQuota,
      boatAngle: 0,
      boatTiltSpeed: 0,
      boatCenterOfMassX: CANVAS_WIDTH / 2,
      players: [],
      items: [],
      stations: this.buildStationsForArea(initialArea.id),
      feedMessages: [
        { id: 'msg_0', text: `⚓ Crew docked at ${initialArea.name}. Ready up to cast off!`, type: 'info', time: Date.now() }
      ]
    };
  }

  public addClient(socket: Socket, role: ClientRole, name?: string): { success: boolean; playerIndex?: number; error?: string } {
    socket.join(this.roomCode);

    if (role === 'display') {
      this.displaySockets.add(socket.id);
      socket.emit('gameStateSync', this.state);
      return { success: true };
    }

    // Role: Controller / Player
    if (this.state.players.length >= 4) {
      return { success: false, error: 'Room is already full (max 4 players)!' };
    }

    const playerIndex = this.state.players.length;
    const profile = PLAYER_PROFILES[playerIndex];

    const newPlayer: PlayerState = {
      id: socket.id,
      playerIndex,
      name: name || profile.name,
      color: profile.color,
      colorHex: profile.colorHex,
      x: 280 + playerIndex * 120,
      y: 280,
      vx: 0,
      vy: 0,
      facing: 'down',
      isStunned: false,
      stunTimer: 0,
      isSlipping: false,
      isReady: false,
      holdingItemId: null,
      score: 0,
      privateCash: 100,
      activeBounty: null
    };

    BountyManager.assignInitialBounty(newPlayer);
    this.state.players.push(newPlayer);

    this.playerInputs.set(socket.id, {
      dx: 0,
      dy: 0,
      actionGrab: false,
      actionThrow: false,
      actionInteract: false,
      actionSlap: false
    });

    this.addFeedMessage(`👋 ${newPlayer.name} boarded the vessel!`, 'info');

    // Send private bounty directly to this player's socket
    if (newPlayer.activeBounty) {
      socket.emit('privateBountyUpdate', newPlayer.activeBounty);
      socket.emit('privateCashUpdate', newPlayer.privateCash);
    }

    this.broadcastState();
    return { success: true, playerIndex };
  }

  public removeClient(socketId: string): void {
    this.displaySockets.delete(socketId);
    const pIndex = this.state.players.findIndex(p => p.id === socketId);
    if (pIndex !== -1) {
      const p = this.state.players[pIndex];
      this.addFeedMessage(`🚪 ${p.name} disembarked.`, 'info');
      this.state.players.splice(pIndex, 1);
      this.playerInputs.delete(socketId);
      this.broadcastState();
    }
  }

  public setPlayerInput(socketId: string, input: PlayerInput): void {
    this.playerInputs.set(socketId, input);
  }

  public setPlayerReady(socketId: string, isReady: boolean): void {
    const p = this.state.players.find(pl => pl.id === socketId);
    if (p) {
      p.isReady = isReady;
      this.broadcastState();
    }
  }

  public startRound(): void {
    if (this.state.state !== 'lobby' && this.state.state !== 'round_over') return;

    this.state.state = 'playing';
    this.state.timeLeft = this.state.area.timeLimitSeconds;
    this.state.items = [];
    this.spawnCooldown = 1.0;

    // Spawn 2 starting fish
    this.spawnFish('guppy');
    this.spawnFish('guppy');

    this.addFeedMessage(`🚨 CAST OFF! Target quota: $${this.state.quotaTarget}`, 'info');
    this.io.to(this.roomCode).emit('soundTrigger', 'bell');

    if (!this.intervalId) {
      this.intervalId = setInterval(() => this.tick(), TICK_INTERVAL);
    }
  }

  public rerollPlayerBounty(socketId: string): void {
    const player = this.state.players.find(p => p.id === socketId);
    if (!player) return;

    const newBounty = BountyManager.rerollBounty(player);
    this.io.to(socketId).emit('privateBountyUpdate', newBounty);
    this.io.to(socketId).emit('soundTrigger', 'phone_vibrate');
  }

  private tick(): void {
    if (this.state.state === 'playing') {
      // 1. Time Countdown
      this.state.timeLeft -= 1 / 60;
      if (this.state.timeLeft <= 0) {
        this.state.timeLeft = 0;
        this.endRound();
      }

      // 2. Fish Spawning Loop
      this.spawnCooldown -= 1 / 60;
      if (this.spawnCooldown <= 0 && this.state.items.length < 12) {
        this.spawnRandomFishForArea();
        this.spawnCooldown = 3.5 + Math.random() * 2.5;
      }

      // 3. Physics & Tilt Engine Step
      PhysicsEngine.update(this.state, this.playerInputs, (eventType, data) => {
        this.handleGameEvent(eventType, data);
      });

      // Clear instantaneous action triggers in inputs
      this.playerInputs.forEach(inp => {
        inp.actionGrab = false;
        inp.actionThrow = false;
        inp.actionInteract = false;
        inp.actionSlap = false;
      });
    }

    // Broadcast state to all connected clients
    this.broadcastState();
  }

  private handleGameEvent(type: string, data: any): void {
    if (type === 'sfx') {
      this.io.to(this.roomCode).emit('soundTrigger', data);
    } else if (type === 'feed') {
      this.addFeedMessage(data.text, data.type);
    }

    // Evaluate Uncle Gary secret bounties
    BountyManager.onGameEvent(type, data, this.state.players, (player, bounty) => {
      this.io.to(player.id).emit('privateBountyUpdate', bounty);
      this.io.to(player.id).emit('privateCashUpdate', player.privateCash);
      this.io.to(player.id).emit('soundTrigger', 'bounty_complete');
      this.io.to(player.id).emit('vibrateController', [100, 50, 100]);
    });
  }

  public spawnFish(speciesId: FishSpeciesId): void {
    const def = FISH_REGISTRY[speciesId] || FISH_REGISTRY.guppy;
    const item: EntityItem = {
      id: `item_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      type: 'fish',
      speciesId,
      name: def.name,
      emoji: def.emoji,
      x: 360 + (Math.random() * 240 - 120),
      y: 240 + (Math.random() * 140 - 70),
      vx: (Math.random() - 0.5) * 5,
      vy: (Math.random() - 0.5) * 5,
      mass: def.mass,
      isHeld: false,
      heldByPlayerId: null,
      value: def.basePrice
    };

    this.state.items.push(item);
  }

  private spawnRandomFishForArea(): void {
    const rates = this.state.area.spawnRates;
    const rand = Math.random();
    let cumulative = 0;
    let chosenSpecies: FishSpeciesId = 'guppy';

    for (const [sp, prob] of Object.entries(rates)) {
      cumulative += prob;
      if (rand <= cumulative) {
        chosenSpecies = sp as FishSpeciesId;
        break;
      }
    }

    this.spawnFish(chosenSpecies);
  }

  private endRound(): void {
    this.state.state = 'round_over';
    const quotaMet = this.state.teamCash >= this.state.quotaTarget;

    if (quotaMet) {
      this.addFeedMessage(`🏆 QUOTA ACHIEVED! Earned $${this.state.teamCash}!`, 'score');
      this.io.to(this.roomCode).emit('soundTrigger', 'victory');
    } else {
      this.addFeedMessage(`💀 QUOTA FAILED! Required $${this.state.quotaTarget}, only made $${this.state.teamCash}.`, 'hazard');
      this.io.to(this.roomCode).emit('soundTrigger', 'game_over');
    }
  }

  private buildStationsForArea(areaId: string): WorkStation[] {
    const stations: WorkStation[] = [
      {
        id: 'st_cooler',
        type: 'cooler',
        name: 'Cooler Box',
        x: 420,
        y: 130,
        w: 120,
        h: 70,
        progress: 0,
        isProcessing: false,
        heldItem: null
      },
      {
        id: 'st_cutting',
        type: 'cutting_board',
        name: 'Fillet Board',
        x: 210,
        y: 130,
        w: 90,
        h: 60,
        progress: 0,
        isProcessing: false,
        heldItem: null
      },
      {
        id: 'st_fryer',
        type: 'deep_fryer',
        name: 'Deep Fryer',
        x: 660,
        y: 130,
        w: 90,
        h: 60,
        progress: 0,
        isProcessing: false,
        heldItem: null
      },
      {
        id: 'st_soup',
        type: 'soup_pot',
        name: 'Soup Kettle',
        x: 210,
        y: 350,
        w: 90,
        h: 60,
        progress: 0,
        isProcessing: false,
        heldItem: null
      }
    ];

    return stations;
  }

  private addFeedMessage(text: string, type: 'info' | 'bounty' | 'hazard' | 'score'): void {
    this.state.feedMessages.push({
      id: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
      text,
      type,
      time: Date.now()
    });
    if (this.state.feedMessages.length > 8) {
      this.state.feedMessages.shift();
    }
  }

  private broadcastState(): void {
    this.io.to(this.roomCode).emit('gameStateSync', this.state);
  }

  public destroy(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }
}
