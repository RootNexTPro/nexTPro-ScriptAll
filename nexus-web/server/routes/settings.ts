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

function detectServerInfo(): { ip: string; domain: string; nsDomain: string; slowdnsPub: string; openvpnDownload: string } {
  let ip = '';
  let domain = '';
  let nsDomain = '';
  let slowdnsPub = '';
  let openvpnDownload = '';

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

  try {
    if (fs.existsSync('/etc/slowdns/nsdomain')) {
      nsDomain = fs.readFileSync('/etc/slowdns/nsdomain', 'utf8').trim();
    }
  } catch {}

  try {
    if (fs.existsSync('/etc/slowdns/server.pub')) {
      slowdnsPub = fs.readFileSync('/etc/slowdns/server.pub', 'utf8').trim();
    }
  } catch {}

  if (domain) {
    openvpnDownload = `https://${domain}:2081`;
  }

  return { ip, domain, nsDomain, slowdnsPub, openvpnDownload };
}

// GET /api/settings
router.get('/', requireAuth, (req: AuthRequest, res: Response): void => {
  const settings = loadSettings();

  // Auto-detect and auto-fill server info from host machine when fields are missing
  const detected = detectServerInfo();
  settings.server = {
    ...DEFAULT_SETTINGS.server,
    ...settings.server,
    ip: settings.server?.ip || detected.ip,
    domain: settings.server?.domain || detected.domain,
    nsDomain: settings.server?.nsDomain || detected.nsDomain,
    slowdnsPub: settings.server?.slowdnsPub || detected.slowdnsPub,
    openvpnDownload: settings.server?.openvpnDownload || detected.openvpnDownload,
  };

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


// POST /api/settings/terminal
router.post('/terminal', requireAuth, (req: AuthRequest, res: Response): void => {
  const admin = req.admin!;
  // Strict security: Only super_admin is allowed to execute terminal commands
  if (admin.role !== 'super_admin') {
    res.status(403).json({ error: 'Forbidden. Only super_admin can use the terminal.' });
    return;
  }

  const { command } = req.body as { command: string };
  if (!command) {
    res.status(400).json({ error: 'Command is required' });
    return;
  }

  try {
    // Execute command with a timeout of 10s to prevent hanging
    let output = '';
    try {
      output = execSync(command, { encoding: 'utf8', timeout: 10000 });
      if (!output) output = 'OK';
      res.json({ output });
    } catch (err: any) {
      output = err.stdout || '';
      const stderr = err.stderr || '';
      res.status(500).json({ error: stderr || err.message || 'Execution failed' });
    }
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Execution failed' });
  }
});

export default router;

// GET /api/settings/system
router.get('/system', requireAuth, (req: AuthRequest, res: Response): void => {
  const admin = req.admin!;
  if (admin.role !== 'admin' && admin.role !== 'super_admin') {
    res.status(403).json({ error: 'Forbidden' });
    return;
  }

  try {
    const cpu = execSync("top -bn1 | grep 'Cpu(s)' | awk '{print $2 + $4}'", { encoding: 'utf8' }).trim() + '%';

    // Convert RAM to GB formatting
    const ramOutput = execSync("free -m | awk 'NR==2{printf \"%.2f / %.2f GB\", $3/1024, $2/1024 }'", { encoding: 'utf8' }).trim();

    const disk = execSync("df -h / | awk 'NR==2{print $5}'", { encoding: 'utf8' }).trim();

    const uptime = execSync("uptime -p | sed 's/up //'", { encoding: 'utf8' }).trim();

    res.json({ cpu, ram: ramOutput, disk, uptime });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch system info' });
  }
});

// GET /api/settings/xray-logs
router.get('/xray-logs', requireAuth, (req: AuthRequest, res: Response): void => {
  const admin = req.admin!;
  if (admin.role !== 'admin' && admin.role !== 'super_admin') {
    res.status(403).json({ error: 'Forbidden' });
    return;
  }

  try {
    const logFile = '/var/log/xray/access.log';
    if (!fs.existsSync(logFile)) {
      res.json({ logs: 'No Xray access logs found.' });
      return;
    }

    // Get the last 100 lines of the log file
    const logs = execSync(`tail -n 100 ${logFile}`, { encoding: 'utf8' });
    res.json({ logs });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to read Xray logs' });
  }
});

// POST /api/settings/broadcast
router.post('/broadcast', requireAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  const admin = req.admin!;
  if (admin.role !== 'super_admin') {
    res.status(403).json({ error: 'Forbidden' });
    return;
  }

  const { message } = req.body as { message: string };
  if (!message) {
    res.status(400).json({ error: 'Message is required' });
    return;
  }

  try {
    const fetch = require('node-fetch');
    const settings = loadSettings();
    if (!settings.telegramBot || !settings.telegramChannel) {
      res.status(400).json({ error: 'Telegram non configuré dans les paramètres' });
      return;
    }

    const formattedMsg = `📢 <b>MESSAGE GLOBAL (Super Admin)</b>\n\n${message}`;
    const response = await fetch(`https://api.telegram.org/bot${settings.telegramBot}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: settings.telegramChannel, text: formattedMsg, parse_mode: 'HTML' })
    });

    if (!response.ok) {
      throw new Error('Telegram API Error');
    }

    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: 'Erreur lors de l\'envoi du broadcast' });
  }
});
