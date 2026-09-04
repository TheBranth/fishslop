// Express + Socket.IO Server for Friendslop Fishing Co. (Virtual Rooms & Password Protection)

import express from 'express';
import http from 'http';
import { Server, Socket } from 'socket.io';
import path from 'path';
import os from 'os';
import QRCode from 'qrcode';
import { fileURLToPath } from 'url';
import { RoomManager } from './RoomManager.js';

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

const PORT = Number(process.env.PORT) || 3000;
const roomManager = new RoomManager();

// Helper: Get local network IP for LAN mobile connection
function getLocalNetworkIp(): string {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name] || []) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return 'localhost';
}

const localIp = getLocalNetworkIp();

app.use(express.json());

// API: Generate QR Code data URL for a room
app.get('/api/qr', async (req, res) => {
  const { room, pwd, host: customHost } = req.query;
  if (!room) return res.status(400).json({ error: 'Room code required' });

  const hostHeader = customHost || req.headers.host || `${localIp}:${PORT}`;
  const protocol = req.headers['x-forwarded-proto'] || req.protocol || 'http';
  let joinUrl = `${protocol}://${hostHeader}/controller.html?room=${room}`;
  if (pwd) {
    joinUrl += `&pwd=${encodeURIComponent(String(pwd))}`;
  }

  try {
    const qrDataUrl = await QRCode.toDataURL(joinUrl, {
      margin: 1,
      color: {
        dark: '#030b14',
        light: '#2dd4bf'
      }
    });
    res.json({ qrDataUrl, joinUrl });
  } catch (err) {
    res.status(500).json({ error: 'Failed to generate QR' });
  }
});

// API: Check Room Name Availability (Duplicate Prevention)
app.get('/api/check-room', (req, res) => {
  const name = String(req.query.name || '').trim().toUpperCase();
  if (!name) return res.status(400).json({ error: 'Room name required', available: false });
  const exists = roomManager.hasRoom(name);
  res.json({ roomName: name, available: !exists, exists });
});

// API: Health check & active rooms
app.get('/api/health', (_req, res) => {
  res.json({ 
    status: 'ok', 
    serverTime: Date.now(), 
    localIp, 
    port: PORT,
    activeRooms: roomManager.getAllRooms().map(r => ({
      roomCode: r.roomCode,
      hasPassword: r.hasPassword,
      clientCount: r.clients.size
    }))
  });
});

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const distPath = path.join(__dirname, '../dist');
app.use(express.static(distPath));

// Fallback for SPA routing
app.get('*', (_req, res) => {
  res.sendFile(path.join(distPath, 'index.html'), (err) => {
    if (err) {
      res.send(`Friendslop Fishing Co. Server Running on port ${PORT}. Run Vite build or dev server.`);
    }
  });
});

// Socket.IO Real-time Virtual Room Relay
io.on('connection', (socket: Socket) => {
  // 0. Check Room Name Availability
  socket.on('checkRoom', (data: { roomName: string }, callback?: (res: any) => void) => {
    const name = String(data?.roomName || '').trim().toUpperCase();
    const exists = roomManager.hasRoom(name);
    const result = { roomName: name, available: !exists, exists };
    if (callback) callback(result);
    else socket.emit('roomChecked', result);
  });

  // 1. Create Virtual Room (from Host / TV) with optional custom name and password
  socket.on('createRoom', async (data?: { roomName?: string; password?: string; hostOrigin?: string }) => {
    const creation = roomManager.createRoom(socket.id, data?.roomName, data?.password);
    if (!creation.success || !creation.room) {
      socket.emit('roomCreateError', { error: creation.error || 'Failed to create room' });
      return;
    }
    const room = creation.room;
    socket.join(room.roomCode);

    const baseUrl = data?.hostOrigin || `http://${localIp}:${PORT}`;
    let joinUrl = `${baseUrl}/?room=${room.roomCode}`;
    let controllerUrl = `${baseUrl}/controller.html?room=${room.roomCode}`;

    if (room.hasPassword && room.password) {
      const pwdParam = `&pwd=${encodeURIComponent(room.password)}`;
      joinUrl += pwdParam;
      controllerUrl += pwdParam;
    }

    let qrUrl = '';
    try {
      qrUrl = await QRCode.toDataURL(controllerUrl, {
        margin: 1,
        color: {
          dark: '#030b14',
          light: '#2dd4bf'
        }
      });
    } catch (e) {}

    socket.emit('roomCreated', { 
      roomCode: room.roomCode, 
      hasPassword: room.hasPassword,
      joinUrl,
      controllerUrl,
      qrUrl 
    });

    console.log(`[Room Created] ${room.roomCode} (Password: ${room.hasPassword ? 'YES' : 'NO'}) by Host ${socket.id}`);
  });

  // 2. Join Virtual Room (from Phone Controller or Remote Player)
  socket.on('joinRoom', (data: { roomCode: string; role: 'controller' | 'viewer'; name?: string; password?: string }) => {
    const { roomCode, role, name, password } = data;
    const result = roomManager.joinRoom(roomCode, socket.id, role || 'controller', name, password);

    if (!result.success) {
      socket.emit('roomJoined', result);
      return;
    }

    socket.join(result.roomCode!);
    socket.emit('roomJoined', result);

    // Notify the host about the new connected player/controller
    const room = roomManager.getRoom(roomCode);
    if (room && room.hostSocketId !== socket.id) {
      io.to(room.hostSocketId).emit('remotePlayerJoined', {
        socketId: socket.id,
        role,
        name,
        playerIndex: result.playerIndex
      });
    }

    console.log(`[Client Joined] ${role} joined ${roomCode} as Player ${result.playerIndex ?? 'Viewer'}`);
  });

  // 3. Player Input Stream (from Remote Controller or Remote Keyboard Client)
  socket.on('playerInput', (data: { roomCode: string; input: any; playerIndex?: number }) => {
    const room = roomManager.getRoomForSocket(socket.id);
    if (room) {
      const client = room.clients.get(socket.id);
      const playerIndex = data.playerIndex ?? client?.playerIndex ?? 1;

      // Relay directly to the room's host engine
      io.to(room.hostSocketId).emit('remotePlayerInput', {
        socketId: socket.id,
        playerIndex,
        input: data.input
      });
    }
  });

  // 4. Host State Broadcast (30-60 Hz snapshots from Host to all connected controllers & viewers)
  socket.on('hostStateUpdate', (data: { roomCode: string; state: any }) => {
    const room = roomManager.getRoom(data.roomCode);
    if (room && room.hostSocketId === socket.id) {
      // Broadcast state to all other clients in the virtual room
      socket.to(room.roomCode).emit('gameStateUpdate', data.state);
    }
  });

  // 5. Crate Draft Vote Relay
  socket.on('voteDraftCrate', (data: { roomCode: string; crateId: string }) => {
    const room = roomManager.getRoomForSocket(socket.id);
    if (room) {
      const client = room.clients.get(socket.id);
      io.to(room.hostSocketId).emit('remoteVoteDraftCrate', {
        socketId: socket.id,
        playerIndex: client?.playerIndex ?? 1,
        crateId: data.crateId
      });
    }
  });

  // 6. Station Minigame Trigger & Bounty Sync
  socket.on('triggerMinigame', (data: { roomCode: string; targetSocketId: string; stationType: string }) => {
    io.to(data.targetSocketId).emit('triggerMinigame', { stationType: data.stationType });
  });

  // 6.5 VIP Player 1 Cast Off from Phone Controller!
  socket.on('startRoundFromController', () => {
    const room = roomManager.getRoomForSocket(socket.id);
    if (room) {
      const client = room.clients.get(socket.id);
      if (client && client.playerIndex === 0) {
        // Player 1 verified! Notify host to start game and notify room
        io.to(room.hostSocketId).emit('startRoundFromPhone');
        io.to(room.roomCode).emit('lobbyGameStarted');
        console.log(`[Lobby Cast Off] Player 1 started game in room ${room.roomCode}!`);
      }
    }
  });

  // 7. Disconnect Handler
  socket.on('disconnect', () => {
    const { roomCode, wasHost } = roomManager.handleSocketDisconnect(socket.id);
    if (roomCode) {
      if (wasHost) {
        io.to(roomCode).emit('hostDisconnected', { message: 'Host has closed the virtual room.' });
        console.log(`[Host Left] Virtual Room ${roomCode} closed.`);
      } else {
        const room = roomManager.getRoom(roomCode);
        if (room) {
          io.to(room.hostSocketId).emit('remotePlayerLeft', { socketId: socket.id });
        }
        console.log(`[Client Disconnected] ${socket.id} left ${roomCode}`);
      }
    }
  });
});

server.listen(PORT, () => {
  console.log(`=======================================================`);
  console.log(`🎣 FRIENDSLOP FISHING CO. — VIRTUAL ROOM SERVER ONLINE!`);
  console.log(`📡 Local Host:    http://localhost:${PORT}`);
  console.log(`📱 LAN Controller: http://${localIp}:${PORT}`);
  console.log(`=======================================================`);
});
