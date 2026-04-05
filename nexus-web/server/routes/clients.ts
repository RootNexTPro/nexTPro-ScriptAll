import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getDb, logAction } from '../db';
import { requireAuth, AuthRequest } from '../middleware/auth';
import {
  createSshAccount,
  renewSshAccount,
  deleteSshAccount,
  suspendSshAccount,
  createXrayVmessAccount,
  createXrayVlessAccount,
  createXrayTrojanAccount,
  createZipVpnAccount,
  createSlowDnsAccount,
  createUdpCustomAccount
} from '../scripts';

const router = Router();

const PROTOCOLS = ['ssh', 'vmess', 'vless', 'trojan', 'zipvpn', 'slowdns', 'udpcustom'];

// GET /api/clients
router.get('/', requireAuth, (req: AuthRequest, res: Response): void => {
  const db = getDb();
  const clients = db.prepare(
    `SELECT id, username, protocol, plan_id, expires_at, status, created_by, created_at, updated_at
     FROM clients ORDER BY created_at DESC`
  ).all();
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

  if (!PROTOCOLS.includes(protocol)) {
    res.status(400).json({ error: `Protocol must be one of: ${PROTOCOLS.join(', ')}` });
    return;
  }

  if (days < 1 || days > 3650) {
    res.status(400).json({ error: 'days must be between 1 and 3650' });
    return;
  }

  const db = getDb();
  const exists = db.prepare('SELECT id FROM clients WHERE username = ? AND protocol = ?').get(username, protocol);
  if (exists) {
    res.status(409).json({ error: `Client '${username}' already exists for protocol '${protocol}'` });
    return;
  }

  // Provision the account via shell scripts
  let scriptResult;
  switch (protocol) {
    case 'ssh':       scriptResult = createSshAccount(username, password, days); break;
    case 'vmess':     scriptResult = createXrayVmessAccount(username, days); break;
    case 'vless':     scriptResult = createXrayVlessAccount(username, days); break;
    case 'trojan':    scriptResult = createXrayTrojanAccount(username, password, days); break;
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

  const expiresAt = new Date(Date.now() + days * 86400 * 1000).toISOString().split('T')[0];
  const id = uuidv4();

  db.prepare(
    `INSERT INTO clients (id, username, password, protocol, plan_id, expires_at, status, created_by, extra_data)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(id, username, password, protocol, plan_id || null, expiresAt, 'active', req.admin!.id, JSON.stringify(scriptResult.data || {}));

  logAction(req.admin!.id, req.admin!.username, 'CREATE_CLIENT', 'client', id,
    { username, protocol, days }, req.ip || null);

  res.status(201).json({ id, username, protocol, expires_at: expiresAt, account_data: scriptResult.data });
});

// GET /api/clients/:id
router.get('/:id', requireAuth, (req: AuthRequest, res: Response): void => {
  const db = getDb();
  const client = db.prepare('SELECT * FROM clients WHERE id = ?').get(req.params.id) as Record<string, unknown> | undefined;
  if (!client) {
    res.status(404).json({ error: 'Client not found' });
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
    id: string; username: string; protocol: string; expires_at: string; status: string
  } | undefined;

  if (!client) {
    res.status(404).json({ error: 'Client not found' });
    return;
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

  const newExpiry = new Date(Date.now() + days * 86400 * 1000).toISOString().split('T')[0];
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
    id: string; username: string; protocol: string;
  } | undefined;

  if (!client) {
    res.status(404).json({ error: 'Client not found' });
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

// DELETE /api/clients/:id
router.delete('/:id', requireAuth, (req: AuthRequest, res: Response): void => {
  const db = getDb();
  const client = db.prepare('SELECT * FROM clients WHERE id = ?').get(req.params.id) as {
    id: string; username: string; protocol: string;
  } | undefined;

  if (!client) {
    res.status(404).json({ error: 'Client not found' });
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
