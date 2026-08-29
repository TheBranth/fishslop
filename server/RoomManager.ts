// Virtual Room Manager with 4-Letter Code Generation, Optional Password Security, and Socket Relay Routing

import { Server, Socket } from 'socket.io';

export interface VirtualRoomClient {
  socketId: string;
  role: 'host' | 'controller' | 'viewer';
  name?: string;
  playerIndex?: number;
}

export interface VirtualRoom {
  roomCode: string;
  hostSocketId: string;
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
   * Creates a new virtual room hosted by hostSocketId with optional password
   */
  public createRoom(hostSocketId: string, password?: string): VirtualRoom {
    const roomCode = this.generateRoomCode();
    const cleanPassword = password && password.trim().length > 0 ? password.trim() : undefined;

    const room: VirtualRoom = {
      roomCode,
      hostSocketId,
      password: cleanPassword,
      hasPassword: Boolean(cleanPassword),
      clients: new Map(),
      createdAt: Date.now(),
      lastActivity: Date.now()
    };

    // Register host as first client
    room.clients.set(hostSocketId, {
      socketId: hostSocketId,
      role: 'host',
      name: 'Host Display',
      playerIndex: 0
    });

    this.rooms.set(roomCode, room);
    this.socketToRoom.set(hostSocketId, roomCode);

    return room;
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
  ): { success: boolean; roomCode?: string; playerIndex?: number; hasPassword?: boolean; error?: string } {
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
    if (role === 'controller') {
      const assigned = this.getAvailablePlayerIndex(room);
      if (assigned === null) {
        return { success: false, error: `Room ${roomCode.toUpperCase()} is full! (Max 4 players)` };
      }
      playerIndex = assigned;
    }

    room.clients.set(socketId, {
      socketId,
      role,
      name: name || (role === 'controller' ? `Sailor P${(playerIndex || 0) + 1}` : 'Spectator'),
      playerIndex
    });

    room.lastActivity = Date.now();
    this.socketToRoom.set(socketId, room.roomCode);

    return {
      success: true,
      roomCode: room.roomCode,
      playerIndex,
      hasPassword: room.hasPassword
    };
  }

  /**
   * Handles client or host disconnect
   */
  public handleSocketDisconnect(socketId: string): { roomCode?: string; wasHost: boolean } {
    const roomCode = this.socketToRoom.get(socketId);
    this.socketToRoom.delete(socketId);

    if (!roomCode) return { wasHost: false };

    const room = this.rooms.get(roomCode);
    if (!room) return { roomCode, wasHost: false };

    const wasHost = room.hostSocketId === socketId;
    room.clients.delete(socketId);

    if (wasHost) {
      // If host disconnected, close room after grace period or immediately
      this.rooms.delete(roomCode);
    } else if (room.clients.size === 0) {
      // Empty room cleanup
      this.rooms.delete(roomCode);
    }

    return { roomCode, wasHost };
  }

  public getAllRooms(): VirtualRoom[] {
    return Array.from(this.rooms.values());
  }
}
