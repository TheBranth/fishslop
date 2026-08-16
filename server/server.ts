// Express + Socket.IO Server for Friendslop Fishing Co.

import express from 'express';
import http from 'http';
import { Server, Socket } from 'socket.io';
import path from 'path';
import os from 'os';
import QRCode from 'qrcode';
import { RoomManager } from './RoomManager';
import { ClientToServerEvents, ServerToClientEvents } from '../shared/types';

const app = express();
const server = http.createServer(app);
const io = new Server<ClientToServerEvents, ServerToClientEvents>(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

const PORT = process.env.PORT || 3000;
const roomManager = new RoomManager(io);

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
  const { room, host: customHost } = req.query;
  if (!room) return res.status(400).json({ error: 'Room code required' });

  const hostHeader = customHost || req.headers.host || `${localIp}:${PORT}`;
  const protocol = req.headers['x-forwarded-proto'] || req.protocol || 'http';
  const joinUrl = `${protocol}://${hostHeader}/?room=${room}&role=controller`;

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

// API: Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', serverTime: Date.now(), localIp, port: PORT });
});

import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const distPath = path.join(__dirname, '../dist');
app.use(express.static(distPath));

// Fallback for SPA routing
app.get('*', (req, res) => {
  res.sendFile(path.join(distPath, 'index.html'), (err) => {
    if (err) {
      res.send(`Friendslop Fishing Co. Server Running on port ${PORT}. Open Vite dev server on port 5173.`);
    }
  });
});

// Socket.IO Real-time Connection Handler
io.on('connection', (socket: Socket) => {
  // 1. Create Room (from Host / TV)
  socket.on('createRoom', async (data?: { hostOrigin?: string }) => {
    const room = roomManager.createRoom();
    roomManager.registerSocketToRoom(socket.id, room.roomCode);
    
    const baseUrl = data?.hostOrigin || `http://${localIp}:${PORT}`;
    const joinUrl = `${baseUrl}/?room=${room.roomCode}&role=controller`;
    let qrUrl = '';
    try {
      qrUrl = await QRCode.toDataURL(joinUrl, {
        margin: 1,
        color: {
          dark: '#030b14',
          light: '#2dd4bf'
        }
      });
    } catch (e) {}

    room.addClient(socket, 'display');
    socket.emit('roomCreated', { roomCode: room.roomCode, qrUrl });
  });

  // 2. Join Room (from Phone Controller or secondary Display)
  socket.on('joinRoom', (data) => {
    const { roomCode, role, name } = data;
    const room = roomManager.getRoom(roomCode);

    if (!room) {
      socket.emit('roomJoined', { success: false, roomCode, error: `Room ${roomCode} not found!` });
      return;
    }

    roomManager.registerSocketToRoom(socket.id, roomCode);
    const result = room.addClient(socket, role, name);
    socket.emit('roomJoined', { ...result, roomCode });
  });

  // 3. Player Input Stream (from Controller)
  socket.on('playerInput', (input) => {
    const room = roomManager.getRoomForSocket(socket.id);
    if (room) {
      room.setPlayerInput(socket.id, input);
    }
  });

  // 4. Ready Status Toggle
  socket.on('setReady', (isReady) => {
    const room = roomManager.getRoomForSocket(socket.id);
    if (room) {
      room.setPlayerReady(socket.id, isReady);
    }
  });

  // 5. Cast Off / Start Round (from TV Host or Player 1)
  socket.on('startRound', () => {
    const room = roomManager.getRoomForSocket(socket.id);
    if (room) {
      room.startRound();
    }
  });

  // 6. Uncle Gary Sabotage Bounty Reroll
  socket.on('rerollBounty', () => {
    const room = roomManager.getRoomForSocket(socket.id);
    if (room) {
      room.rerollPlayerBounty(socket.id);
    }
  });

  // 7. Disconnect Handler
  socket.on('disconnect', () => {
    roomManager.handleSocketDisconnect(socket.id);
  });
});

server.listen(PORT, () => {
  console.log(`=======================================================`);
  console.log(`🎣 FRIENDSLOP FISHING CO. — MULTIPLAYER SERVER ONLINE!`);
  console.log(`📡 Local Host:    http://localhost:${PORT}`);
  console.log(`📱 LAN Controller: http://${localIp}:${PORT}`);
  console.log(`=======================================================`);
});
