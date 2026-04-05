import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { getDb, seedSuperAdmin } from './db';
import authRouter from './routes/auth';
import adminsRouter from './routes/admins';
import clientsRouter from './routes/clients';
import plansRouter from './routes/plans';
import logsRouter from './routes/logs';

// ─── Load configuration ────────────────────────────────────────────────────────
const CONFIG_FILE = process.env.NEXUS_CONFIG || '/etc/nexus-tunnel-web/config.json';
let config: {
  port?: number;
  admin_user?: string;
  admin_password?: string;
  jwt_secret?: string;
} = {};

if (fs.existsSync(CONFIG_FILE)) {
  try {
    config = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
  } catch (e) {
    console.error('[CONFIG] Failed to parse config file:', e);
  }
}

// Override from config file (env vars take precedence)
if (config.jwt_secret && !process.env.NEXUS_JWT_SECRET) {
  process.env.NEXUS_JWT_SECRET = config.jwt_secret;
}

const PORT_CANDIDATES = [2087, 2096, 8787, 3001, 9090];
const configuredPort = config.port || parseInt(process.env.NEXUS_PORT || '0', 10);

function findAvailablePort(candidates: number[], preferred?: number): number {
  // Try preferred port first
  if (preferred && preferred > 0) {
    return preferred;
  }
  return candidates[0]; // Use first candidate; actual binding will fail gracefully if occupied
}

const PORT = findAvailablePort(PORT_CANDIDATES, configuredPort);

// ─── Bootstrap super admin ────────────────────────────────────────────────────
const adminUser = config.admin_user || process.env.NEXUS_ADMIN_USER || 'admin';
const adminPass = config.admin_password || process.env.NEXUS_ADMIN_PASS || 'admin123';

// Initialize DB and seed super admin
getDb();
seedSuperAdmin(adminUser, adminPass);

// ─── Express app ──────────────────────────────────────────────────────────────
const app = express();

app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

// Serve static frontend
const PUBLIC_DIR = path.join(__dirname, '..', '..', 'public');
if (fs.existsSync(PUBLIC_DIR)) {
  app.use(express.static(PUBLIC_DIR));
}

// API routes
app.use('/api/auth', authRouter);
app.use('/api/admins', adminsRouter);
app.use('/api/clients', clientsRouter);
app.use('/api/plans', plansRouter);
app.use('/api/logs', logsRouter);

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', service: 'nexus-tunnel-web', version: '1.0.0' });
});

// SPA fallback — serve index.html for non-API routes
if (fs.existsSync(PUBLIC_DIR)) {
  app.get('*', (_req, res) => {
    const indexPath = path.join(PUBLIC_DIR, 'index.html');
    if (fs.existsSync(indexPath)) {
      res.sendFile(indexPath);
    } else {
      res.status(404).json({ error: 'Frontend not found' });
    }
  });
}

// ─── Start server ─────────────────────────────────────────────────────────────
function tryListen(portList: number[], idx: number): void {
  if (idx >= portList.length) {
    console.error('[ERROR] No available port found. Exiting.');
    process.exit(1);
  }

  const port = portList[idx];
  app.listen(port)
    .on('listening', () => {
      console.log(`[NEXUS-WEB] Server running on http://0.0.0.0:${port}`);
      console.log(`[NEXUS-WEB] Admin: ${adminUser}`);

      // Write the actual port to config file so shell scripts can reference it
      const configDir = path.dirname(CONFIG_FILE);
      try {
        fs.mkdirSync(configDir, { recursive: true });
        const existingConfig = fs.existsSync(CONFIG_FILE)
          ? JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'))
          : {};
        existingConfig.port = port;
        fs.writeFileSync(CONFIG_FILE, JSON.stringify(existingConfig, null, 2));
      } catch {}
    })
    .on('error', (err: NodeJS.ErrnoException) => {
      if (err.code === 'EADDRINUSE') {
        console.warn(`[NEXUS-WEB] Port ${port} in use, trying next...`);
        tryListen(portList, idx + 1);
      } else {
        console.error('[NEXUS-WEB] Server error:', err);
        process.exit(1);
      }
    });
}

const portList = configuredPort > 0
  ? [configuredPort, ...PORT_CANDIDATES.filter(p => p !== configuredPort)]
  : PORT_CANDIDATES;

tryListen(portList, 0);

export default app;
