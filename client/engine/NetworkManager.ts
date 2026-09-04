// Client Network Manager: Socket.IO Virtual Room Client & BroadcastChannel Local Fallback

import { io, Socket } from 'socket.io-client';
import { PlayerInput, GameRoomState } from '../../shared/types';

export interface RoomJoinResult {
  success: boolean;
  roomCode?: string;
  playerIndex?: number;
  hasPassword?: boolean;
  error?: string;
}

export interface RoomCreateResult {
  roomCode: string;
  hasPassword: boolean;
  joinUrl: string;
  controllerUrl: string;
  qrUrl: string;
}

export class NetworkManager {
  private socket: Socket | null = null;
  private localBus: BroadcastChannel | null = null;
  public roomCode: string | null = null;
  public role: 'host' | 'controller' | 'viewer' | 'local' = 'local';
  public playerIndex: number = 0;
  public isConnected: boolean = false;

  // Event Callbacks
  public onStateUpdate?: (state: any) => void;
  public onRemoteInput?: (data: { socketId: string; playerIndex: number; input: PlayerInput }) => void;
  public onRemotePlayerJoined?: (data: { socketId: string; role: string; name?: string; playerIndex?: number }) => void;
  public onRemotePlayerLeft?: (data: { socketId: string }) => void;
  public onMinigameTrigger?: (data: { stationType: string }) => void;
  public onRemoteDraftVote?: (data: { socketId: string; playerIndex: number; crateId: string }) => void;

  constructor() {
    this.initLocalBus();
  }

  private initLocalBus(): void {
    try {
      this.localBus = new BroadcastChannel('friendslop_game_bus');
      this.localBus.onmessage = (event) => {
        const { type, data, playerId, input, crateId } = event.data;

        if (type === 'HOST_STATE_UPDATE') {
          this.onStateUpdate?.(data);
        } else if (type === 'PLAYER_INPUT') {
          const idx = playerId === 'p1' ? 0 : playerId === 'p2' ? 1 : playerId === 'p3' ? 2 : 3;
          this.onRemoteInput?.({ socketId: playerId, playerIndex: idx, input });
        } else if (type === 'VOTE_DRAFT_CRATE') {
          this.onRemoteDraftVote?.({ socketId: playerId, playerIndex: 1, crateId });
        } else if (type === 'TRIGGER_MINIGAME') {
          this.onMinigameTrigger?.({ stationType: data.stationType });
        }
      };
    } catch (e) {
      console.warn('BroadcastChannel not supported in this browser.');
    }
  }

  public connectSocket(): Promise<Socket> {
    if (this.socket && this.socket.connected) {
      return Promise.resolve(this.socket);
    }

    return new Promise((resolve) => {
      // Connect to server origin or current window location
      this.socket = io(window.location.origin, {
        reconnectionAttempts: 5,
        timeout: 5000,
        transports: ['websocket', 'polling']
      });

      this.socket.on('connect', () => {
        this.isConnected = true;
        console.log('[NetworkManager] Connected to Socket.IO server:', this.socket?.id);
        resolve(this.socket!);
      });

      this.socket.on('disconnect', () => {
        this.isConnected = false;
        console.log('[NetworkManager] Disconnected from server.');
      });

      // Register server events
      this.socket.on('gameStateUpdate', (state) => {
        this.onStateUpdate?.(state);
      });

      this.socket.on('remotePlayerInput', (data) => {
        this.onRemoteInput?.(data);
      });

      this.socket.on('remotePlayerJoined', (data) => {
        this.onRemotePlayerJoined?.(data);
      });

      this.socket.on('remotePlayerLeft', (data) => {
        this.onRemotePlayerLeft?.(data);
      });

      this.socket.on('remoteVoteDraftCrate', (data) => {
        this.onRemoteDraftVote?.(data);
      });

      this.socket.on('triggerMinigame', (data) => {
        this.onMinigameTrigger?.(data);
      });

      this.socket.on('startRoundFromPhone', () => {
        this.onStartRoundFromPhone?.();
      });

      this.socket.on('lobbyGameStarted', () => {
        this.onLobbyGameStarted?.();
      });
    });
  }

  public onStartRoundFromPhone?: () => void;
  public onLobbyGameStarted?: () => void;

  /**
   * Checks whether a room name is available
   */
  public async checkRoom(roomName: string): Promise<{ available: boolean; exists: boolean }> {
    const socket = await this.connectSocket();
    return new Promise((resolve) => {
      socket.emit('checkRoom', { roomName }, (res: any) => {
        resolve(res || { available: true, exists: false });
      });
      setTimeout(() => resolve({ available: true, exists: false }), 2000);
    });
  }

  /**
   * Host creates a new Virtual Room with optional custom name and password
   */
  public async createRoom(roomName?: string, password?: string): Promise<RoomCreateResult> {
    const socket = await this.connectSocket();
    this.role = 'host';

    return new Promise((resolve, reject) => {
      socket.emit('createRoom', {
        roomName,
        password,
        hostOrigin: window.location.origin
      });

      socket.once('roomCreated', (res: RoomCreateResult) => {
        this.roomCode = res.roomCode;
        resolve(res);
      });

      socket.once('roomCreateError', (err: { error: string }) => {
        reject(new Error(err.error || 'Failed to create room'));
      });

      setTimeout(() => reject(new Error('Room creation timed out')), 5000);
    });
  }

  /**
   * VIP Player 1 Cast Off from Phone Controller
   */
  public startRoundFromController(): void {
    if (this.socket && this.isConnected) {
      this.socket.emit('startRoundFromController');
    }
  }

  /**
   * Remote Controller or Player joins a room with 4-letter code and optional password
   */
  public async joinRoom(
    roomCode: string,
    role: 'controller' | 'viewer',
    name?: string,
    password?: string
  ): Promise<RoomJoinResult> {
    const socket = await this.connectSocket();
    this.role = role;

    return new Promise((resolve, reject) => {
      socket.emit('joinRoom', {
        roomCode: roomCode.toUpperCase().trim(),
        role,
        name,
        password
      });

      socket.once('roomJoined', (res: RoomJoinResult) => {
        if (res.success) {
          this.roomCode = res.roomCode || roomCode;
          if (res.playerIndex !== undefined) {
            this.playerIndex = res.playerIndex;
          }
        }
        resolve(res);
      });

      setTimeout(() => reject(new Error('Joining room timed out')), 5000);
    });
  }

  /**
   * Sends real-time 2-button player inputs to host
   */
  public sendInput(input: PlayerInput, playerIndex?: number): void {
    const pIdx = playerIndex ?? this.playerIndex;

    // Send over Socket.IO if connected to a virtual room
    if (this.socket && this.isConnected && this.roomCode) {
      this.socket.emit('playerInput', {
        roomCode: this.roomCode,
        input,
        playerIndex: pIdx
      });
    }

    // Also broadcast to local bus for LAN/Local testing
    if (this.localBus) {
      this.localBus.postMessage({
        type: 'PLAYER_INPUT',
        playerId: `p${pIdx + 1}`,
        input
      });
    }
  }

  /**
   * Host broadcasts authoritative game state to all room clients
   */
  public broadcastHostState(state: any): void {
    // Send over Socket.IO to remote clients in virtual room
    if (this.socket && this.isConnected && this.roomCode) {
      this.socket.emit('hostStateUpdate', {
        roomCode: this.roomCode,
        state
      });
    }

    // Broadcast to local tabs
    if (this.localBus) {
      this.localBus.postMessage({
        type: 'HOST_STATE_UPDATE',
        data: state
      });
    }
  }

  /**
   * Relays 30s Crate Draft vote
   */
  public voteDraftCrate(crateId: string): void {
    if (this.socket && this.isConnected && this.roomCode) {
      this.socket.emit('voteDraftCrate', {
        roomCode: this.roomCode,
        crateId
      });
    }

    if (this.localBus) {
      this.localBus.postMessage({
        type: 'VOTE_DRAFT_CRATE',
        playerId: `p${this.playerIndex + 1}`,
        crateId
      });
    }
  }

  /**
   * Host triggers fullscreen 2-3s tactile station minigame on specific controller
   */
  public triggerStationMinigame(targetSocketId: string, stationType: string): void {
    if (this.socket && this.isConnected && this.roomCode) {
      this.socket.emit('triggerMinigame', {
        roomCode: this.roomCode,
        targetSocketId,
        stationType
      });
    }

    if (this.localBus) {
      this.localBus.postMessage({
        type: 'TRIGGER_MINIGAME',
        data: { stationType },
        playerId: 'p1'
      });
    }
  }
}
