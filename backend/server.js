require('dotenv').config();
const express = require('express');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);

const PORT = process.env.PORT || 8000;
const SECRET_KEY = process.env.JWT_SECRET;
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || 'http://localhost:3000';

if (!SECRET_KEY) {
  console.error('FATAL: JWT_SECRET environment variable is not set. Refusing to start.');
  process.exit(1);
}

// Socket.io with CORS
const io = new Server(server, {
  cors: { origin: CLIENT_ORIGIN, credentials: true }
});

// Middleware
app.use(cors({ origin: CLIENT_ORIGIN, credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// In-memory user store (replace with a real DB in production)
const users = {};

// Seed two demo accounts with hashed passwords
(async () => {
  users['admin'] = {
    username: 'admin',
    full_name: 'Administrator',
    email: 'admin@example.com',
    password: await bcrypt.hash('admin123', 10),
  };
  users['user'] = {
    username: 'user',
    full_name: 'Regular User',
    email: 'user@example.com',
    password: await bcrypt.hash('password123', 10),
  };
  console.log('Demo users created: admin / admin123  and  user / password123');
})();

// In-memory test data store
let testDataStore = {};

// ─── Auth helpers ───────────────────────────────────────────────────────────

function generateToken(username) {
  return jwt.sign({ sub: username }, SECRET_KEY, { expiresIn: '30m' });
}

function verifyToken(req, res) {
  const auth = req.headers.authorization;
  if (!auth?.startsWith('Bearer ')) {
    res.status(401).json({ detail: 'Not authenticated' });
    return null;
  }
  try {
    return jwt.verify(auth.slice(7), SECRET_KEY);
  } catch {
    res.status(401).json({ detail: 'Invalid or expired token' });
    return null;
  }
}

// ─── REST endpoints ──────────────────────────────────────────────────────────

app.get('/', (_, res) => res.json({ message: 'Auth + Video Call API running' }));

// Register
app.post('/register', async (req, res) => {
  const { username, password, email, full_name } = req.body;
  if (!username || !password || !email) {
    return res.status(400).json({ detail: 'username, password and email are required' });
  }
  if (users[username]) {
    return res.status(400).json({ detail: 'Username already taken' });
  }
  const hashed = await bcrypt.hash(password, 10);
  users[username] = { username, full_name: full_name || username, email, password: hashed };
  res.status(201).json({ message: 'Account created', username });
});

// Login (form-data or JSON both work)
app.post('/token', async (req, res) => {
  const { username, password } = req.body;
  const user = users[username];
  if (!user || !(await bcrypt.compare(password, user.password))) {
    return res.status(401).json({ detail: 'Incorrect username or password' });
  }
  res.json({ access_token: generateToken(username), token_type: 'bearer' });
});

// Current user
app.get('/users/me', (req, res) => {
  const decoded = verifyToken(req, res);
  if (!decoded) return;
  const { password: _, ...safeUser } = users[decoded.sub] || {};
  if (!safeUser.username) return res.status(404).json({ detail: 'User not found' });
  res.json(safeUser);
});

// Logout (client-side token removal; endpoint kept for compatibility)
app.post('/auth/logout', (_, res) => res.json({ message: 'Logged out' }));

// Test data (POST / GET)
app.post('/test-data', (req, res) => {
  const decoded = verifyToken(req, res);
  if (!decoded) return;
  testDataStore = req.body;
  res.json({ message: 'Data stored', data: testDataStore });
});

app.get('/test-data', (req, res) => {
  const decoded = verifyToken(req, res);
  if (!decoded) return;
  res.json({ data: testDataStore });
});

// ─── WebRTC Signaling (Socket.io) ────────────────────────────────────────────
// Max 2 participants per room

const rooms = new Map(); // roomId -> [ { socketId, username } ]

function removeFromRoom(socket) {
  const roomId = socket.data.roomId;
  if (!roomId) return;
  const room = rooms.get(roomId);
  if (!room) return;
  const updated = room.filter(u => u.socketId !== socket.id);
  if (updated.length === 0) {
    rooms.delete(roomId);
  } else {
    rooms.set(roomId, updated);
  }
  socket.to(roomId).emit('user-left', { socketId: socket.id });
  socket.leave(roomId);
  socket.data.roomId = null;
}

io.on('connection', (socket) => {
  // Authenticate the socket connection
  const token = socket.handshake.auth?.token;
  try {
    const decoded = jwt.verify(token, SECRET_KEY);
    socket.data.username = decoded.sub;
  } catch {
    socket.disconnect(true);
    return;
  }

  socket.on('join-room', (roomId) => {
    if (!roomId) return;
    const room = rooms.get(roomId) || [];

    if (room.length >= 2) {
      socket.emit('room-full');
      return;
    }

    room.push({ socketId: socket.id, username: socket.data.username });
    rooms.set(roomId, room);
    socket.join(roomId);
    socket.data.roomId = roomId;

    if (room.length === 1) {
      socket.emit('waiting');
    } else {
      // Tell the first user to create an offer for the new peer
      const firstUser = room[0];
      socket.to(firstUser.socketId).emit('user-joined', {
        socketId: socket.id,
        username: socket.data.username,
      });
    }
  });

  socket.on('offer', ({ target, offer }) => {
    socket.to(target).emit('offer', { from: socket.id, offer });
  });

  socket.on('answer', ({ target, answer }) => {
    socket.to(target).emit('answer', { from: socket.id, answer });
  });

  socket.on('ice-candidate', ({ target, candidate }) => {
    socket.to(target).emit('ice-candidate', { from: socket.id, candidate });
  });

  socket.on('leave-room', () => removeFromRoom(socket));
  socket.on('disconnect', () => removeFromRoom(socket));
});

// ─── Start ────────────────────────────────────────────────────────────────────

server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
