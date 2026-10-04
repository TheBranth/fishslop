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

const PORT = Number(process.env.PORT) || 3050;
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

// Helper: Auto-detect active public tunnel (ngrok or cloudflared)
async function getPublicTunnelUrl(): Promise<string | null> {
  if (process.env.PUBLIC_URL) return process.env.PUBLIC_URL;
  if (process.env.TUNNEL_URL) return process.env.TUNNEL_URL;
  try {
    const res = await fetch('http://127.0.0.1:4040/api/tunnels', { signal: AbortSignal.timeout(1000) });
    if (res.ok) {
      const data = await res.json() as any;
      const tunnels = data.tunnels;
      if (Array.isArray(tunnels) && tunnels.length > 0) {
        const httpsTunnel = tunnels.find((t: any) => t.proto === 'https') || tunnels[0];
        if (httpsTunnel?.public_url) {
          return httpsTunnel.public_url;
        }
      }
    }
  } catch (_) {}
  return null;
}

// API: Generate QR Code data URL for a room
app.get('/api/qr', async (req, res) => {
  const { room, pwd, host: customHost } = req.query;
  if (!room) return res.status(400).json({ error: 'Room code required' });

  const tunnelUrl = await getPublicTunnelUrl();
  const hostHeader = customHost || (tunnelUrl ? tunnelUrl.replace(/^https?:\/\//, '') : req.headers.host) || `${localIp}:${PORT}`;
  const protocol = tunnelUrl ? tunnelUrl.split('://')[0] : (req.headers['x-forwarded-proto'] || req.protocol || 'http');
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
app.get('/api/health', async (_req, res) => {
  const publicTunnel = await getPublicTunnelUrl();
  res.json({ 
    status: 'ok', 
    serverTime: Date.now(), 
    localIp, 
    port: PORT,
    publicUrl: publicTunnel,
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
const clientAssetsPath = path.join(__dirname, '../client/assets');

// Directly serve assets (sprites, icons, sound) before SPA fallback
app.use('/assets', express.static(clientAssetsPath));
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

    const publicTunnel = await getPublicTunnelUrl();
    const isLocalOrigin = !data?.hostOrigin || data.hostOrigin.includes('localhost') || data.hostOrigin.includes('127.0.0.1');
    const baseUrl = (publicTunnel && isLocalOrigin) ? publicTunnel : (data?.hostOrigin || publicTunnel || `http://${localIp}:${PORT}`);
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
    const summary = roomManager.getCrewSummary(result.roomCode!);
    socket.emit('roomJoined', {
      ...result,
      ...summary
    });

    // Notify the room and host about the new connected player/controller
    const room = roomManager.getRoom(roomCode);
    if (room) {
      io.to(room.roomCode).emit('remotePlayerJoined', {
        socketId: socket.id,
        role,
        name: room.clients.get(socket.id)?.name,
        playerIndex: result.playerIndex,
        isHost: result.isHost,
        ...summary
      });
    }

    console.log(`[Client Joined] ${role} joined ${roomCode} as Player ${result.playerIndex !== undefined ? result.playerIndex + 1 : 'Viewer'} (isHost: ${result.isHost})`);
  });

  // 3. Player Input Stream (from Remote Controller or Remote Keyboard Client)
  socket.on('playerInput', (data: { roomCode: string; input: any; playerIndex?: number }) => {
    const room = roomManager.getRoomForSocket(socket.id);
    if (room) {
      const client = room.clients.get(socket.id);
      const playerIndex = data.playerIndex ?? client?.playerIndex ?? 0;

      // Relay directly to the TV display simulation engine
      io.to(room.displaySocketId).emit('remotePlayerInput', {
        socketId: socket.id,
        playerIndex,
        input: data.input
      });
    }
  });

  // 4. Host / TV Display State Broadcast (snapshots from TV to all connected controllers & viewers)
  socket.on('hostStateUpdate', (data: { roomCode: string; state: any }) => {
    const room = roomManager.getRoom(data.roomCode);
    if (room && room.displaySocketId === socket.id) {
      // Broadcast state to all other clients in the virtual room
      socket.to(room.roomCode).emit('gameStateUpdate', data.state);
    }
  });

  // 5. Crate Draft Vote Relay
  socket.on('voteDraftCrate', (data: { roomCode: string; crateId: string }) => {
    const room = roomManager.getRoomForSocket(socket.id);
    if (room) {
      const client = room.clients.get(socket.id);
      io.to(room.displaySocketId).emit('remoteVoteDraftCrate', {
        socketId: socket.id,
        playerIndex: client?.playerIndex ?? 0,
        crateId: data.crateId
      });
    }
  });

  // 6. Station Minigame Trigger & Bounty Sync
  socket.on('triggerMinigame', (data: { roomCode: string; targetSocketId: string; stationType: string }) => {
    io.to(data.targetSocketId).emit('triggerMinigame', { stationType: data.stationType });
  });

  // 6.2 Player Ready State Toggle (Agree to Start from Mobile Controller)
  socket.on('setPlayerReady', (data: { roomCode: string; isReady: boolean }) => {
    const result = roomManager.setClientReady(socket.id, data.isReady);
    if (result.success && result.room) {
      const summary = roomManager.getCrewSummary(result.room.roomCode);
      io.to(result.room.roomCode).emit('crewReadyUpdated', {
        socketId: socket.id,
        playerIndex: result.client?.playerIndex,
        isReady: data.isReady,
        ...summary
      });
      console.log(`[Player Ready] ${result.client?.name} (P${(result.client?.playerIndex ?? 0) + 1}) in ${result.room.roomCode}: ${data.isReady ? 'READY' : 'WAITING'}`);
    }
  });

  // 6.3 Host / Captain Started Game Notification to all controllers
  socket.on('hostGameStarted', (data: { roomCode: string }) => {
    const room = roomManager.getRoom(data.roomCode);
    if (room && (room.captainSocketId === socket.id || room.displaySocketId === socket.id)) {
      io.to(room.roomCode).emit('lobbyGameStarted');
      io.to(room.displaySocketId).emit('startRoundFromPhone');
      console.log(`[Lobby Cast Off] Game started in room ${room.roomCode}!`);
    }
  });

  // 6.5 VIP Captain (P1 Phone) Cast Off from Phone Controller!
  socket.on('startRoundFromController', () => {
    const room = roomManager.getRoomForSocket(socket.id);
    if (room) {
      io.to(room.displaySocketId).emit('startRoundFromPhone');
      io.to(room.roomCode).emit('lobbyGameStarted');
      console.log(`[Lobby Cast Off] Round started from Captain phone in room ${room.roomCode}!`);
    }
  });

  // 7. Disconnect Handler
  socket.on('disconnect', () => {
    const { roomCode, wasDisplay, wasCaptain } = roomManager.handleSocketDisconnect(socket.id);
    if (roomCode) {
      if (wasDisplay) {
        io.to(roomCode).emit('hostDisconnected', { message: 'TV Display has closed the virtual room.' });
        console.log(`[TV Display Left] Virtual Room ${roomCode} closed.`);
      } else {
        const room = roomManager.getRoom(roomCode);
        if (room) {
          const summary = roomManager.getCrewSummary(roomCode);
          io.to(room.roomCode).emit('remotePlayerLeft', { 
            socketId: socket.id,
            wasCaptain,
            ...summary 
          });
        }
        console.log(`[Client Disconnected] ${socket.id} left ${roomCode} (wasCaptain: ${wasCaptain})`);
      }
    }
  });
});

server.listen(PORT, async () => {
  const tunnel = await getPublicTunnelUrl();
  console.log(`=======================================================`);
  console.log(`🎣 FRIENDSLOP FISHING CO. — VIRTUAL ROOM SERVER ONLINE!`);
  console.log(`📡 Local Host:    http://localhost:${PORT}`);
  console.log(`📱 LAN Controller: http://${localIp}:${PORT}`);
  if (tunnel) {
    console.log(`🌐 Public Tunnel:  ${tunnel}`);
  }
  console.log(`=======================================================`);
});
