// Room Manager with 4-letter room code generation and lifecycle management

import { Server } from 'socket.io';
import { GameRoom } from './GameRoom';

export class RoomManager {
  private rooms: Map<string, GameRoom> = new Map();
  private socketToRoom: Map<string, string> = new Map();
  private io: Server;

  constructor(io: Server) {
    this.io = io;
  }

  public createRoom(): GameRoom {
    const code = this.generateRoomCode();
    const room = new GameRoom(code, this.io);
    this.rooms.set(code, room);
    return room;
  }

  public getRoom(roomCode: string): GameRoom | undefined {
    return this.rooms.get(roomCode.toUpperCase().trim());
  }

  public registerSocketToRoom(socketId: string, roomCode: string): void {
    this.socketToRoom.set(socketId, roomCode.toUpperCase().trim());
  }

  public getRoomForSocket(socketId: string): GameRoom | undefined {
    const code = this.socketToRoom.get(socketId);
    if (!code) return undefined;
    return this.getRoom(code);
  }

  public handleSocketDisconnect(socketId: string): void {
    const roomCode = this.socketToRoom.get(socketId);
    if (roomCode) {
      const room = this.rooms.get(roomCode);
      if (room) {
        room.removeClient(socketId);
        // If room is empty, clean up after 5 minutes
        if (room.state.players.length === 0) {
          setTimeout(() => {
            const currentRoom = this.rooms.get(roomCode);
            if (currentRoom && currentRoom.state.players.length === 0) {
              currentRoom.destroy();
              this.rooms.delete(roomCode);
            }
          }, 300000);
        }
      }
      this.socketToRoom.delete(socketId);
    }
  }

  private generateRoomCode(): string {
    const letters = 'BCDFGHJKLMNPQRSTVWXYZ';
    let code = '';
    do {
      code = '';
      for (let i = 0; i < 4; i++) {
        code += letters.charAt(Math.floor(Math.random() * letters.length));
      }
    } while (this.rooms.has(code));
    return code;
  }
}
