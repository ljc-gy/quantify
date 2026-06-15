import express from 'express';
import 'dotenv/config';
import cors from 'cors';
import { createServer } from 'node:http';
import { Server } from 'socket.io';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { existsSync } from 'node:fs';
import { initDb } from './utils/initDb.js';
import { startSimulator } from './services/simulator.js';
import { startHoldingsUpdater } from './services/holdingsUpdater.js';
import marketRouter from './routes/market.js';
import stockRouter from './routes/stock.js';
import assetRouter from './routes/asset.js';
import riskRouter from './routes/risk.js';
import portfolioRouter from './routes/portfolio.js';
import alertRouter from './routes/alert.js';
import importRouter from './routes/import.js';
import configRouter from './routes/config.js';
import fundRoutes from './routes/fundRoutes.js';
import strategyRouter from './routes/strategy.js';
import journalRouter from './routes/journal.js';
import longTermRouter from './routes/longTerm.js';

const API_PORT = process.env.PORT || 3001;

const app = express();
const httpServer = createServer(app);
httpServer.timeout = 1800000; // 30 min for long scans
httpServer.requestTimeout = 1800000;

// --- CORS ---
// Set CORS_ORIGIN in .env to restrict; defaults to true (allow all) for personal use.
const corsOrigin = process.env.CORS_ORIGIN || true;

const io = new Server(httpServer, {
  cors: { origin: corsOrigin, methods: ['GET', 'POST'] },
});

// --- Middleware ---
app.use(cors({ origin: corsOrigin }));
app.use(express.json());

// --- Routes ---
app.use('/api/market', marketRouter);
app.use('/api/stock', stockRouter);
app.use('/api/asset', assetRouter);
app.use('/api/risk', riskRouter);
app.use('/api/portfolio', portfolioRouter);
app.use('/api/alert', alertRouter);
app.use('/api/import', importRouter);
app.use('/api/config', configRouter);
app.use('/api/fund', fundRoutes);
app.use('/api/strategy', strategyRouter);
app.use('/api/journal', journalRouter);
app.use('/api/long-term', longTermRouter);

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ code: 0, data: { status: 'ok', uptime: process.uptime() }, ts: Date.now() });
});

// --- Socket.IO — default namespace (market:tick) ---
io.on('connection', (socket) => {
  console.log(`[WS] client connected: ${socket.id}`);

  socket.on('subscribe', (codes) => {
    console.log(`[WS] ${socket.id} subscribed to:`, codes);
    socket.join(codes);
  });

  socket.on('disconnect', () => {
    console.log(`[WS] client disconnected: ${socket.id}`);
  });
});

// --- Socket.IO — /realtime namespace (dashboard:snapshot) ---
const realtimeNs = io.of('/realtime');

realtimeNs.on('connection', (socket) => {
  console.log(`[WS:realtime] client connected: ${socket.id}`);

  socket.on('subscribe', (codes) => {
    socket.join(codes);
  });

  socket.on('disconnect', () => {
    console.log(`[WS:realtime] client disconnected: ${socket.id}`);
  });
});

// --- Boot ---
async function boot() {
  await initDb();

  httpServer.listen(API_PORT, () => {
    console.log(`[server] API + WebSocket running at http://localhost:${API_PORT}`);
    startSimulator(io, realtimeNs);
    startHoldingsUpdater();
  });
}

boot();

export { io, realtimeNs };

// --- Production: serve built frontend with SPA fallback ---
const __dirname = dirname(fileURLToPath(import.meta.url));
const distPath = join(__dirname, '..', 'client', 'dist');
if (existsSync(distPath)) {
  app.use(express.static(distPath));
  app.get('*', (_req, res) => {
    res.sendFile(join(distPath, 'index.html'));
  });
  console.log('[server] Serving static frontend from client/dist');
}
