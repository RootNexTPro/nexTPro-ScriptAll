import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getDb, logAction } from '../db';
import { requireAuth, AuthRequest } from '../middleware/auth';
import {
  createSshAccount,
  renewSshAccount,
  deleteSshAccount,
  suspendSshAccount,
  setSshAccountExpiry,
  createXrayVmessAccount,
  createXrayVlessAccount,
  createXrayTrojanAccount,
  createXraySocksAccount,
  createZipVpnAccount,
  createSlowDnsAccount,
  createUdpCustomAccount
} from '../scripts';

const router = Router();

const PROTOCOLS = ['ssh', 'vmess', 'vless', 'trojan', 'socks', 'zipvpn', 'slowdns', 'udpcustom'];

type BouquetItem = { protocolId?: string; maxAccounts?: number; usedAccounts?: number };

function normalizeProtocol(protocol: string): string {
  const p = String(protocol || '').toLowerCase().trim();
  if (p === 'udp-custom') return 'udpcustom';
  if (p === 'zivpn') return 'zipvpn';
  return p;
}

function getResellerState(adminId: string): {
  bouquet: BouquetItem[];
  remainingDays: number;
} | null {
  const db = getDb();
  // Enforce reseller expiry_date on the server side so changing client time has no effect
  const row = db.prepare(
    "SELECT bouquet, expiry_date FROM admins WHERE id = ? AND role = 'reseller' AND status = 'active' AND (expiry_date IS NULL OR expiry_date >= date('now'))"
  ).get(adminId) as { bouquet?: string; expiry_date?: string } | undefined;

  if (!row) return null;
  let bouquet: BouquetItem[] = [];
  try {
    bouquet = row.bouquet ? JSON.parse(row.bouquet) : [];
  } catch {
    bouquet = [];
  }

  // Calculate remaining days from server-side expiry date
  let remainingDays = 9999; // unlimited if no expiry
  if (row.expiry_date) {
    const result = db.prepare(
      "SELECT CAST(JULIANDAY(?) - JULIANDAY(date('now')) AS INTEGER) as days"
    ).get(row.expiry_date) as { days: number };
    remainingDays = Math.max(0, result.days);
  }

  return {
    bouquet: Array.isArray(bouquet) ? bouquet : [],
    remainingDays,
  };
}

function canResellerUseProtocol(adminId: string, protocol: string): { ok: boolean; error?: string } {
  const db = getDb();
  const state = getResellerState(adminId);
  if (!state) return { ok: false, error: 'Reseller account not active or not found' };

  const item = state.bouquet.find(b => normalizeProtocol(String(b.protocolId || '')) === protocol);
  if (!item) return { ok: false, error: `Protocol '${protocol}' not allowed for your reseller bouquet` };

  const maxAccounts = Number(item.maxAccounts || 0);
  if (maxAccounts < 1) return { ok: false, error: `Protocol '${protocol}' quota is 0` };

  const used = Number(
    (db.prepare('SELECT COUNT(*) as c FROM clients WHERE created_by = ? AND protocol = ?').get(adminId, protocol) as { c: number }).c
  );
  if (used >= maxAccounts) {
    return { ok: false, error: `Quota atteint pour le protocole '${protocol}' (${used}/${maxAccounts})` };
  }
  return { ok: true };
}

function getResellerRemainingDays(adminId: string): number | null {
  const state = getResellerState(adminId);
  return state ? state.remainingDays : null;
}

// GET /api/clients
router.get('/', requireAuth, (req: AuthRequest, res: Response): void => {
  const db = getDb();
  const admin = req.admin!;

  // Resellers can only see their own clients; admins can see all (or filter)
  const mine = req.query.mine === 'true' || admin.role === 'reseller';
  const createdBy = req.query.created_by as string | undefined;

  let query = `SELECT id, username, protocol, plan_id, expires_at, status, created_by, created_at, updated_at
               FROM clients`;
  const params: string[] = [];

  if (mine) {
    query += ' WHERE created_by = ?';
    params.push(admin.id);
  } else if (createdBy) {
    query += ' WHERE created_by = ?';
    params.push(createdBy);
  }

  query += ' ORDER BY created_at DESC';

  const clients = db.prepare(query).all(...params);
  res.json(clients);
});

// POST /api/clients — create client + provision account
router.post('/', requireAuth, (req: AuthRequest, res: Response): void => {
  const {
    username,
    password,
    protocol,
    days,
    plan_id
  } = req.body as {
    username?: string;
    password?: string;
    protocol?: string;
    days?: number;
    plan_id?: string;
  };

  if (!username || !password || !protocol || !days) {
    res.status(400).json({ error: 'username, password, protocol, and days are required' });
    return;
  }

  const normalizedProtocol = normalizeProtocol(protocol);
  if (!PROTOCOLS.includes(normalizedProtocol)) {
    res.status(400).json({ error: `Protocol must be one of: ${PROTOCOLS.join(', ')}` });
    return;
  }

  if (days < 1 || days > 3650) {
    res.status(400).json({ error: 'days must be between 1 and 3650' });
    return;
  }

  const db = getDb();
  const exists = db.prepare('SELECT id FROM clients WHERE username = ? AND protocol = ?').get(username, normalizedProtocol);
  if (exists) {
    res.status(409).json({ error: `Client '${username}' already exists for protocol '${normalizedProtocol}'` });
    return;
  }

  if (req.admin!.role === 'reseller') {
    const protocolCheck = canResellerUseProtocol(req.admin!.id, normalizedProtocol);
    if (!protocolCheck.ok) {
      res.status(403).json({ error: protocolCheck.error || 'Protocol not allowed for reseller' });
      return;
    }
    // Verify reseller account is still valid (server-side check)
    const remaining = getResellerRemainingDays(req.admin!.id);
    if (remaining === null) {
      res.status(403).json({ error: 'Reseller account not active or expired' });
      return;
    }
  }

  // Provision the account via shell scripts
  let scriptResult;
  switch (normalizedProtocol) {
    case 'ssh':       scriptResult = createSshAccount(username, password, days); break;
    case 'vmess':     scriptResult = createXrayVmessAccount(username, days); break;
    case 'vless':     scriptResult = createXrayVlessAccount(username, days); break;
    case 'trojan':    scriptResult = createXrayTrojanAccount(username, password, days); break;
    case 'socks':     scriptResult = createXraySocksAccount(username, password, days); break;
    case 'zipvpn':    scriptResult = createZipVpnAccount(username, password, days); break;
    case 'slowdns':   scriptResult = createSlowDnsAccount(username, password, days); break;
    case 'udpcustom': scriptResult = createUdpCustomAccount(username, password, days); break;
    default:
      res.status(400).json({ error: 'Unknown protocol' });
      return;
  }

  if (!scriptResult.success) {
    res.status(500).json({ error: scriptResult.error || 'Failed to create account' });
    return;
  }

  const expiresAt = (db.prepare("SELECT date('now', ?) as d").get(`+${days} days`) as { d: string }).d;
  const id = uuidv4();

  try {
    db.prepare(
      `INSERT INTO clients (id, username, password, protocol, plan_id, expires_at, status, created_by, extra_data)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(id, username, password, normalizedProtocol, plan_id || null, expiresAt, 'active', req.admin!.id, JSON.stringify(scriptResult.data || {}));
  } catch (e) {
    res.status(500).json({ error: 'Failed to persist client in database' });
    return;
  }

  logAction(req.admin!.id, req.admin!.username, 'CREATE_CLIENT', 'client', id,
    { username, protocol: normalizedProtocol, days }, req.ip || null);

  res.status(201).json({ id, username, protocol: normalizedProtocol, expires_at: expiresAt, account_data: scriptResult.data });
});

// GET /api/clients/:id
router.get('/:id', requireAuth, (req: AuthRequest, res: Response): void => {
  const db = getDb();
  const client = db.prepare('SELECT * FROM clients WHERE id = ?').get(req.params.id) as (Record<string, unknown> & { created_by?: string }) | undefined;
  if (!client) {
    res.status(404).json({ error: 'Client not found' });
    return;
  }
  if (req.admin!.role === 'reseller' && client.created_by !== req.admin!.id) {
    res.status(403).json({ error: 'Forbidden: reseller can only access own clients' });
    return;
  }
  // Parse extra_data
  try {
    client['extra_data'] = JSON.parse(client['extra_data'] as string);
  } catch {}
  res.json(client);
});

// PUT /api/clients/:id — update client info (password change)
router.put('/:id', requireAuth, (req: AuthRequest, res: Response): void => {
  const { password } = req.body as { password?: string };
  const db = getDb();

  const client = db.prepare('SELECT * FROM clients WHERE id = ?').get(req.params.id) as { id: string; username: string; protocol: string } | undefined;
  if (!client) {
    res.status(404).json({ error: 'Client not found' });
    return;
  }
  if (req.admin!.role === 'reseller') {
    const own = db.prepare('SELECT created_by FROM clients WHERE id = ?').get(req.params.id) as { created_by?: string } | undefined;
    if (!own || own.created_by !== req.admin!.id) {
      res.status(403).json({ error: 'Forbidden: reseller can only update own clients' });
      return;
    }
  }

  if (!password) {
    res.status(400).json({ error: 'password required' });
    return;
  }

  db.prepare("UPDATE clients SET password = ?, updated_at = datetime('now') WHERE id = ?").run(password, req.params.id);

  logAction(req.admin!.id, req.admin!.username, 'UPDATE_CLIENT', 'client', req.params.id, { username: client.username }, req.ip || null);

  res.json({ message: 'Client updated' });
});

// POST /api/clients/:id/renew
router.post('/:id/renew', requireAuth, (req: AuthRequest, res: Response): void => {
  const { days } = req.body as { days?: number };
  if (!days || days < 1) {
    res.status(400).json({ error: 'days required and must be >= 1' });
    return;
  }

  const db = getDb();
  const client = db.prepare('SELECT * FROM clients WHERE id = ?').get(req.params.id) as {
    id: string; username: string; protocol: string; expires_at: string; status: string; created_by?: string
  } | undefined;

  if (!client) {
    res.status(404).json({ error: 'Client not found' });
    return;
  }

  if (req.admin!.role === 'reseller' && client.created_by !== req.admin!.id) {
    res.status(403).json({ error: 'Forbidden: reseller can only renew own clients' });
    return;
  }
  if (req.admin!.role === 'reseller') {
    const remaining = getResellerRemainingDays(req.admin!.id);
    if (remaining === null) {
      res.status(403).json({ error: 'Reseller account not active or expired' });
      return;
    }
    if (days > remaining) {
      res.status(403).json({
        error: `Impossible de renouveler pour ${days} jour(s) : votre compte revendeur expire dans ${remaining} jour(s)`,
      });
      return;
    }
  }

  let scriptResult;
  if (['ssh', 'slowdns', 'udpcustom'].includes(client.protocol)) {
    scriptResult = renewSshAccount(client.username, days);
  } else {
    // For Xray/ZipVPN just update the DB expiry
    scriptResult = { success: true, data: {} };
  }

  if (!scriptResult.success) {
    res.status(500).json({ error: scriptResult.error });
    return;
  }

  const newExpiry = (db.prepare("SELECT date('now', ?) as d").get(`+${days} days`) as { d: string }).d;
  db.prepare("UPDATE clients SET expires_at = ?, status = 'active', updated_at = datetime('now') WHERE id = ?")
    .run(newExpiry, req.params.id);

  logAction(req.admin!.id, req.admin!.username, 'RENEW_CLIENT', 'client', req.params.id,
    { username: client.username, days, new_expiry: newExpiry }, req.ip || null);

  res.json({ message: 'Client renewed', expires_at: newExpiry });
});

// POST /api/clients/:id/suspend
router.post('/:id/suspend', requireAuth, (req: AuthRequest, res: Response): void => {
  const db = getDb();
  const client = db.prepare('SELECT * FROM clients WHERE id = ?').get(req.params.id) as {
    id: string; username: string; protocol: string; created_by?: string;
  } | undefined;

  if (!client) {
    res.status(404).json({ error: 'Client not found' });
    return;
  }

  if (req.admin!.role === 'reseller' && client.created_by !== req.admin!.id) {
    res.status(403).json({ error: 'Forbidden: reseller can only suspend own clients' });
    return;
  }

  if (['ssh', 'slowdns', 'udpcustom'].includes(client.protocol)) {
    const result = suspendSshAccount(client.username);
    if (!result.success) {
      res.status(500).json({ error: result.error });
      return;
    }
  }

  db.prepare("UPDATE clients SET status = 'suspended', updated_at = datetime('now') WHERE id = ?").run(req.params.id);

  logAction(req.admin!.id, req.admin!.username, 'SUSPEND_CLIENT', 'client', req.params.id,
    { username: client.username }, req.ip || null);

  res.json({ message: 'Client suspended' });
});

// POST /api/clients/:id/reduce-days — subtract days from a client's expiry
router.post('/:id/reduce-days', requireAuth, (req: AuthRequest, res: Response): void => {
  const { days } = req.body as { days?: number };
  if (!days || days < 1) {
    res.status(400).json({ error: 'days required and must be >= 1' });
    return;
  }

  const db = getDb();
  const client = db.prepare('SELECT * FROM clients WHERE id = ?').get(req.params.id) as {
    id: string; username: string; protocol: string; expires_at: string; status: string; created_by?: string
  } | undefined;

  if (!client) {
    res.status(404).json({ error: 'Client not found' });
    return;
  }

  if (req.admin!.role === 'reseller' && client.created_by !== req.admin!.id) {
    res.status(403).json({ error: 'Forbidden: reseller can only modify own clients' });
    return;
  }

  // Calculate new expiry by subtracting days from current expires_at (server time arithmetic)
  const newExpiryRow = db.prepare("SELECT date(?, ?) as d").get(client.expires_at, `-${days} days`) as { d: string };
  const newExpiry = newExpiryRow.d;

  // Check if new expiry is already in the past (server date)
  const isExpired = (db.prepare("SELECT ? < date('now') as expired").get(newExpiry) as { expired: number }).expired;

  // Update system account expiry for SSH-based protocols
  if (['ssh', 'slowdns', 'udpcustom'].includes(client.protocol)) {
    if (isExpired) {
      // Suspend the system account
      try { suspendSshAccount(client.username); } catch (e) {
        console.warn(`[REDUCE-DAYS] Could not suspend SSH account '${client.username}':`, e);
      }
    } else {
      try { setSshAccountExpiry(client.username, newExpiry); } catch (e) {
        console.warn(`[REDUCE-DAYS] Could not update SSH expiry for '${client.username}':`, e);
      }
    }
  }

  const newStatus = isExpired ? 'suspended' : (client.status === 'suspended' ? 'suspended' : 'active');
  db.prepare("UPDATE clients SET expires_at = ?, status = ?, updated_at = datetime('now') WHERE id = ?")
    .run(newExpiry, newStatus, req.params.id);

  logAction(req.admin!.id, req.admin!.username, 'REDUCE_CLIENT_DAYS', 'client', req.params.id,
    { username: client.username, days_removed: days, new_expiry: newExpiry }, req.ip || null);

  res.json({ message: 'Client expiry reduced', expires_at: newExpiry, status: newStatus });
});

// DELETE /api/clients/:id
router.delete('/:id', requireAuth, (req: AuthRequest, res: Response): void => {
  const db = getDb();
  const client = db.prepare('SELECT * FROM clients WHERE id = ?').get(req.params.id) as {
    id: string; username: string; protocol: string; created_by?: string;
  } | undefined;

  if (!client) {
    res.status(404).json({ error: 'Client not found' });
    return;
  }

  if (req.admin!.role === 'reseller' && client.created_by !== req.admin!.id) {
    res.status(403).json({ error: 'Forbidden: reseller can only delete own clients' });
    return;
  }

  if (['ssh', 'slowdns', 'udpcustom'].includes(client.protocol)) {
    deleteSshAccount(client.username);
  }

  db.prepare('DELETE FROM clients WHERE id = ?').run(req.params.id);

  logAction(req.admin!.id, req.admin!.username, 'DELETE_CLIENT', 'client', req.params.id,
    { username: client.username, protocol: client.protocol }, req.ip || null);

  res.json({ message: 'Client deleted' });
});

export default router;
