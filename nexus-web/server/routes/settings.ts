import { Router, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { requireAuth, AuthRequest } from '../middleware/auth';

const router = Router();

const SETTINGS_DIR = process.env.NEXUS_DB_DIR || '/etc/nexus-tunnel-web';
const SETTINGS_FILE = path.join(SETTINGS_DIR, 'settings.json');

const DEFAULT_SETTINGS = {
  siteName: 'Nexus Pro',
  sitePort: 2087,
  primaryColor: '270 100% 65%',
  accentColor: '320 100% 60%',
  logoText: 'N',
  footerText: 'Nexus Pro VPN Panel',
  maintenanceMode: false,
  registrationEnabled: false,
  maxResellersPerAdmin: 10,
  defaultResellerDuration: 30,
  telegramBot: '',
  telegramChannel: '',
  server: {
    ip: '',
    domain: '',
    nsDomain: '',
    slowdnsPub: '',
    openvpnDownload: '',
  },
};

function loadSettings(): typeof DEFAULT_SETTINGS & Record<string, any> {
  try {
    if (fs.existsSync(SETTINGS_FILE)) {
      const raw = fs.readFileSync(SETTINGS_FILE, 'utf8');
      return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
    }
  } catch {}
  return { ...DEFAULT_SETTINGS };
}

function saveSettings(data: Record<string, any>): void {
  fs.mkdirSync(SETTINGS_DIR, { recursive: true });
  fs.writeFileSync(SETTINGS_FILE, JSON.stringify(data, null, 2));
}

function detectServerInfo(): { ip: string; domain: string } {
  let ip = '';
  let domain = '';

  try {
    ip = execSync('curl -s4 --connect-timeout 3 ipv4.icanhazip.com', { timeout: 5000 })
      .toString()
      .trim();
  } catch {}

  try {
    if (fs.existsSync('/etc/xray/domain')) {
      domain = fs.readFileSync('/etc/xray/domain', 'utf8').trim();
    }
  } catch {}

  return { ip, domain };
}

// GET /api/settings
router.get('/', requireAuth, (req: AuthRequest, res: Response): void => {
  const settings = loadSettings();

  // Auto-detect server info if not already set
  if (!settings.server?.ip || !settings.server?.domain) {
    const detected = detectServerInfo();
    settings.server = {
      ...DEFAULT_SETTINGS.server,
      ...settings.server,
      ip: settings.server?.ip || detected.ip,
      domain: settings.server?.domain || detected.domain,
    };
  }

  res.json(settings);
});

// PUT /api/settings
router.put('/', requireAuth, (req: AuthRequest, res: Response): void => {
  const admin = req.admin!;
  if (admin.role !== 'admin' && admin.role !== 'super_admin') {
    res.status(403).json({ error: 'Forbidden' });
    return;
  }

  const current = loadSettings();
  const incoming = req.body as Record<string, any>;

  // Deep merge server sub-object
  const updated = {
    ...current,
    ...incoming,
    server: {
      ...current.server,
      ...(incoming.server || {}),
    },
  };

  try {
    saveSettings(updated);
    res.json(updated);
  } catch (e: any) {
    res.status(500).json({ error: 'Failed to save settings: ' + (e.message || e) });
  }
});

export default router;
