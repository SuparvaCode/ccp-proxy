// ═══════════════════════════════════════════════════════════════
//   ██████╗ ██████╗██████╗ 
//  ██╔════╝██╔════╝██╔══██╗   Claude Code Proxy (CCP)
//  ██║     ██║     ██████╔╝   Powered by SuparvaCodes
//  ██║     ██║     ██╔═══╝ 
//  ╚██████╗╚██████╗██║        Copyright (c) 2026 Suparva
//   ╚═════╝ ╚═════╝╚═╝ 
// ═══════════════════════════════════════════════════════════════

import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import path from 'path';
import { fileURLToPath } from 'url';
import { initDb, getSettings, getAuthToken } from './db/store.js';
import { authMiddleware } from './middleware/auth.js';
import { requestLogger } from './middleware/logger.js';
import anthropicRouter from './routes/anthropic.js';
import openaiRouter from './routes/openai.js';
import adminRouter from './routes/admin.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const HOST = process.env.HOST || '127.0.0.1';

const allowedOrigins = (process.env.ADMIN_CORS_ORIGINS || 'http://localhost:5173,http://127.0.0.1:5173')
  .split(',')
  .map(s => s.trim());

const app = express();

app.use(cors({
  origin: (origin, cb) => {
    if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
    cb(null, false);
  },
  credentials: true,
}));

app.use(express.json({ limit: '10mb' }));
app.use(morgan('dev'));

// Serve built admin panel
const adminDistPath = path.join(__dirname, '../../admin/dist');
app.use('/admin', express.static(adminDistPath));
app.get('/admin/*', (_req, res) => {
  res.sendFile(path.join(adminDistPath, 'index.html'));
});

// Health check (no auth)
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', version: '1.0.0', timestamp: new Date().toISOString() });
});

// Admin API (no proxy auth)
app.use('/api/admin', adminRouter);

// Proxy routes — require Claude Code / Codex auth token
app.use('/v1', authMiddleware, requestLogger, anthropicRouter);
app.use('/v1', authMiddleware, requestLogger, openaiRouter);

// 404
app.use((_req, res) => {
  res.status(404).json({ error: { type: 'not_found', message: 'Route not found' } });
});

// Error handler
app.use((err, _req, res, _next) => {
  console.error('[CCP]', err);
  res.status(err.status || 500).json({
    error: { type: err.type || 'internal_server_error', message: err.message || 'Internal server error' },
  });
});

// Init DB then start server
initDb().then(async () => {
  const settings = await getSettings();
  const dbPort = settings.port ? parseInt(settings.port, 10) : 8082;
  const PORT = parseInt(process.env.PORT || dbPort, 10);

  app.listen(PORT, HOST, () => {
    console.log(`\n⚡ CCP Proxy running at http://${HOST}:${PORT}`);
    console.log(`📋 Admin panel:      http://${HOST}:${PORT}/admin`);
    console.log(`🔌 Anthropic API:    http://${HOST}:${PORT}/v1/messages`);
    console.log(`🤖 OpenAI API:       http://${HOST}:${PORT}/v1/responses`);
    console.log(`\n   Set in your client env:`);
    console.log(`   ANTHROPIC_BASE_URL=http://${HOST}:${PORT}`);
    console.log(`   ANTHROPIC_AUTH_TOKEN=${getAuthToken()}\n`);
  });
}).catch(err => {
  console.error('[CCP] Failed to initialize DB:', err);
  process.exit(1);
});

export default app;
