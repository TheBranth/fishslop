// Virtual Room Manager with 4-Letter Code Generation, Optional Password Security, and Socket Relay Routing

import { Server, Socket } from 'socket.io';

export interface VirtualRoomClient {
  socketId: string;
  role: 'display' | 'controller' | 'viewer' | 'host';
  name?: string;
  playerIndex?: number;
  isReady?: boolean;
  isHost?: boolean;
}

export interface VirtualRoom {
  roomCode: string;
  displaySocketId: string;    // TV Monitor socket (simulation & canvas)
  captainSocketId?: string;   // First connected phone controller socket (Captain / Host)
  hostSocketId: string;       // Alias for displaySocketId for simulation relays
  password?: string;
  hasPassword: boolean;
  clients: Map<string, VirtualRoomClient>;
  createdAt: number;
  lastActivity: number;
}

export class RoomManager {
  private rooms: Map<string, VirtualRoom> = new Map();
  private socketToRoom: Map<string, string> = new Map();

  constructor() {}

  /**
   * Generates a collision-free 4-letter uppercase code (excluding confusing chars)
   */
  public generateRoomCode(): string {
    const letters = 'BCDFGHJKLMNPQRSTVWXYZ';
    let code = '';
    let attempts = 0;
    do {
      code = '';
      for (let i = 0; i < 4; i++) {
        code += letters.charAt(Math.floor(Math.random() * letters.length));
      }
      attempts++;
    } while (this.rooms.has(code) && attempts < 1000);
    return code;
  }

  /**
   * Checks if an active room already exists by room code / name
   */
  public hasRoom(roomCode: string): boolean {
    if (!roomCode) return false;
    return this.rooms.has(roomCode.toUpperCase().trim());
  }

  /**
   * Creates a new virtual room hosted by hostSocketId with custom room name and optional password
   */
  public createRoom(
    displaySocketId: string,
    customRoomName?: string,
    password?: string
  ): { success: boolean; room?: VirtualRoom; error?: string } {
    let roomCode = '';
    if (customRoomName && customRoomName.trim().length > 0) {
      roomCode = customRoomName.trim().toUpperCase().replace(/[^A-Z0-9_-]/g, '');
      if (roomCode.length < 2) {
        return { success: false, error: 'Room name must be at least 2 characters long' };
      }
      if (this.rooms.has(roomCode)) {
        return { success: false, error: `Room name "${roomCode}" is already active!` };
      }
    } else {
      roomCode = this.generateRoomCode();
    }

    const cleanPassword = password && password.trim().length > 0 ? password.trim() : undefined;

    const room: VirtualRoom = {
      roomCode,
      displaySocketId,
      captainSocketId: undefined,
      hostSocketId: displaySocketId,
      password: cleanPassword,
      hasPassword: Boolean(cleanPassword),
      clients: new Map(),
      createdAt: Date.now(),
      lastActivity: Date.now()
    };

    // Register TV Monitor as display (NOT taking player slot 0!)
    room.clients.set(displaySocketId, {
      socketId: displaySocketId,
      role: 'display',
      name: 'TV Monitor',
      playerIndex: undefined,
      isReady: true,
      isHost: false
    });

    this.rooms.set(roomCode, room);
    this.socketToRoom.set(displaySocketId, roomCode);

    return { success: true, room };
  }

  public getRoom(roomCode: string): VirtualRoom | undefined {
    if (!roomCode) return undefined;
    return this.rooms.get(roomCode.toUpperCase().trim());
  }

  public getRoomForSocket(socketId: string): VirtualRoom | undefined {
    const code = this.socketToRoom.get(socketId);
    if (!code) return undefined;
    return this.getRoom(code);
  }

  /**
   * Verifies if provided password matches the room's password
   */
  public verifyPassword(roomCode: string, password?: string): boolean {
    const room = this.getRoom(roomCode);
    if (!room) return false;
    if (!room.hasPassword) return true;
    return room.password === (password ? password.trim() : '');
  }

  /**
   * Assigns an available player slot index (0 to 3) for controllers or players
   */
  public getAvailablePlayerIndex(room: VirtualRoom): number | null {
    const occupied = new Set<number>();
    room.clients.forEach(c => {
      if (c.playerIndex !== undefined) {
        occupied.add(c.playerIndex);
      }
    });

    for (let i = 0; i < 4; i++) {
      if (!occupied.has(i)) return i;
    }
    return null; // All 4 slots full
  }

  /**
   * Adds a remote client (controller or viewer) to a virtual room with password verification
   */
  public joinRoom(
    roomCode: string,
    socketId: string,
    role: 'controller' | 'viewer',
    name?: string,
    password?: string
  ): { success: boolean; roomCode?: string; playerIndex?: number; isHost?: boolean; hasPassword?: boolean; error?: string } {
    const room = this.getRoom(roomCode);
    if (!room) {
      return { success: false, error: `Room "${roomCode.toUpperCase()}" not found!` };
    }

    // Password verification
    if (room.hasPassword && !this.verifyPassword(roomCode, password)) {
      return {
        success: false,
        hasPassword: true,
        error: `🔒 Incorrect password for room ${roomCode.toUpperCase()}`
      };
    }

    // Assign player slot for controllers
    let playerIndex: number | undefined = undefined;
    let isHost = false;
    if (role === 'controller') {
      const assigned = this.getAvailablePlayerIndex(room);
      if (assigned === null) {
        return { success: false, error: `Room ${roomCode.toUpperCase()} is full! (Max 4 players)` };
      }
      playerIndex = assigned;

      // The first controller to connect is the Captain / Host!
      if (!room.captainSocketId || playerIndex === 0) {
        room.captainSocketId = socketId;
        isHost = true;
      }
    }

    const defaultName = role === 'controller'
      ? (isHost ? 'Captain (P1)' : `Sailor (P${(playerIndex || 0) + 1})`)
      : 'Spectator';

    room.clients.set(socketId, {
      socketId,
      role,
      name: name || defaultName,
      playerIndex,
      isReady: false,
      isHost
    });

    room.lastActivity = Date.now();
    this.socketToRoom.set(socketId, room.roomCode);

    return {
      success: true,
      roomCode: room.roomCode,
      playerIndex,
      isHost,
      hasPassword: room.hasPassword
    };
  }

  /**
   * Sets client readiness state (agree to start)
   */
  public setClientReady(socketId: string, isReady: boolean): { success: boolean; room?: VirtualRoom; client?: VirtualRoomClient } {
    const room = this.getRoomForSocket(socketId);
    if (!room) return { success: false };
    const client = room.clients.get(socketId);
    if (!client) return { success: false };

    client.isReady = Boolean(isReady);
    room.lastActivity = Date.now();
    return { success: true, room, client };
  }

  /**
   * Checks whether all connected mobile controllers are ready
   */
  public areAllControllersReady(roomCode: string): boolean {
    const room = this.getRoom(roomCode);
    if (!room) return false;
    let controllerCount = 0;
    let readyCount = 0;
    room.clients.forEach(c => {
      if (c.role === 'controller') {
        controllerCount++;
        if (c.isReady) readyCount++;
      }
    });
    return controllerCount > 0 && readyCount === controllerCount;
  }

  /**
   * Gets crew summary (roster, readiness counts)
   */
  public getCrewSummary(roomCode: string): { crewList: VirtualRoomClient[]; readyCount: number; controllerCount: number; allReady: boolean } {
    const room = this.getRoom(roomCode);
    if (!room) return { crewList: [], readyCount: 0, controllerCount: 0, allReady: false };
    const crewList = Array.from(room.clients.values());
    let controllerCount = 0;
    let readyCount = 0;
    crewList.forEach(c => {
      if (c.role === 'controller') {
        controllerCount++;
        if (c.isReady) readyCount++;
      }
    });
    return {
      crewList,
      readyCount,
      controllerCount,
      allReady: controllerCount > 0 && readyCount === controllerCount
    };
  }

  /**
   * Handles client or host disconnect
   */
  public handleSocketDisconnect(socketId: string): { roomCode?: string; wasDisplay: boolean; wasCaptain: boolean; wasHost: boolean } {
    const roomCode = this.socketToRoom.get(socketId);
    this.socketToRoom.delete(socketId);

    if (!roomCode) return { wasDisplay: false, wasCaptain: false, wasHost: false };

    const room = this.rooms.get(roomCode);
    if (!room) return { roomCode, wasDisplay: false, wasCaptain: false, wasHost: false };

    const wasDisplay = room.displaySocketId === socketId;
    const wasCaptain = room.captainSocketId === socketId;
    room.clients.delete(socketId);

    if (wasDisplay) {
      // If the TV display disconnects, close room
      this.rooms.delete(roomCode);
    } else if (wasCaptain) {
      // If Captain phone disconnects, promote the next controller (P2 becomes Captain)
      const remainingControllers = Array.from(room.clients.values()).filter(c => c.role === 'controller');
      if (remainingControllers.length > 0) {
        const nextCaptain = remainingControllers[0];
        nextCaptain.isHost = true;
        room.captainSocketId = nextCaptain.socketId;
      } else {
        room.captainSocketId = undefined;
      }
    }

    if (room.clients.size === 0) {
      this.rooms.delete(roomCode);
    }

    return { roomCode, wasDisplay, wasCaptain, wasHost: wasDisplay || wasCaptain };
  }

  public getAllRooms(): VirtualRoom[] {
    return Array.from(this.rooms.values());
  }
}
