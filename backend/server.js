const express = require('express');
const http = require('http');
const path = require('path');
const { Server } = require('socket.io');
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('./database');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

const PORT = process.env.PORT || 3000;
const JWT_SECRET = 'super_secret_jwt_key_for_carepulse'; // In production, use env var

// Middleware
app.use(cors());
app.use(express.json());

// Serve frontend static files
app.use(express.static(path.join(__dirname, '../frontend/dist')));


// --- Authentication APIs ---

app.post('/api/auth/register', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'Username and password required' });

  try {
    const hash = await bcrypt.hash(password, 10);
    // In Postgres, returning id works with SERIAL, but our wrapper fetches it or sqlite returns this.lastID
    const sql = process.env.DATABASE_URL 
      ? 'INSERT INTO users (username, password_hash) VALUES (?, ?) RETURNING id'
      : 'INSERT INTO users (username, password_hash) VALUES (?, ?)';
      
    const result = await db.run(sql, [username, hash]);
    res.status(201).json({ message: 'User created successfully', userId: result.lastID });
  } catch (err) {
    if (err.message && (err.message.includes('UNIQUE') || err.code === '23505')) {
      return res.status(400).json({ error: 'Username already exists' });
    }
    console.error('Register error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  const { username, password } = req.body;
  
  try {
    const user = await db.get('SELECT * FROM users WHERE username = ?', [username]);
    if (!user) return res.status(401).json({ error: 'Invalid username or password' });

    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) return res.status(401).json({ error: 'Invalid username or password' });

    const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, { expiresIn: '24h' });
    res.json({ message: 'Login successful', token });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// --- ESP32 Data Ingestion API ---
// This endpoint is for the ESP32 to POST data
app.post('/api/data/ingest', (req, res) => {
  // We can secure this endpoint with a specific device token if needed.
  // For now, we accept data and broadcast it to all connected socket clients.
  const { spo2, heart_rate, blood_glucose } = req.body;
  
  // Note: We might want to associate the data with a user ID in the future if multiple devices
  // are connected to different users. For MVP, we'll store it as user 1 or general.
  
  // Emit to all connected web clients
  io.emit('vitals_update', { spo2, heart_rate, blood_glucose, timestamp: new Date() });
  
  res.status(200).json({ message: 'Data ingested successfully' });
});

// --- Socket.io Real-time Connection ---
io.use((socket, next) => {
  const token = socket.handshake.auth.token;
  if (!token) return next(new Error('Authentication error'));

  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) return next(new Error('Authentication error'));
    socket.user = decoded;
    next();
  });
});

io.on('connection', (socket) => {
  console.log(`User connected to stream: ${socket.user.username}`);
  
  socket.on('disconnect', () => {
    console.log(`User disconnected: ${socket.user.username}`);
  });
});

// --- Catch-all Route for Frontend ---
// This ensures client-side routing works, but returns JSON 404 for missing API routes.
app.use((req, res) => {
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ error: 'API endpoint not found' });
  }
  res.sendFile(path.join(__dirname, '../frontend/dist/index.html'));
});

// --- Start Server ---
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
