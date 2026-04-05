import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { getDb, logAction } from '../db';
import { requireAuth, AuthRequest, JWT_SECRET } from '../middleware/auth';

const router = Router();
const SESSION_HOURS = 24;

// POST /api/auth/login
router.post('/login', (req: AuthRequest, res: Response): void => {
  const { username, password } = req.body as { username?: string; password?: string };
  if (!username || !password) {
    res.status(400).json({ error: 'Username and password required' });
    return;
  }

  const db = getDb();
  const admin = db.prepare(
    'SELECT id, username, password_hash, role, status FROM admins WHERE username = ?'
  ).get(username) as { id: string; username: string; password_hash: string; role: string; status: string } | undefined;

  if (!admin || !bcrypt.compareSync(password, admin.password_hash)) {
    res.status(401).json({ error: 'Invalid credentials' });
    return;
  }

  if (admin.status !== 'active') {
    res.status(403).json({ error: 'Account suspended' });
    return;
  }

  const expiresAt = new Date(Date.now() + SESSION_HOURS * 3600 * 1000);
  const token = jwt.sign(
    { id: admin.id, username: admin.username, role: admin.role },
    JWT_SECRET,
    { expiresIn: `${SESSION_HOURS}h` }
  );

  db.prepare(
    'INSERT INTO sessions (id, admin_id, token, expires_at) VALUES (?, ?, ?, ?)'
  ).run(uuidv4(), admin.id, token, expiresAt.toISOString());

  logAction(admin.id, admin.username, 'LOGIN', null, null, {}, req.ip || null);

  res.json({
    token,
    admin: { id: admin.id, username: admin.username, role: admin.role }
  });
});

// POST /api/auth/logout
router.post('/logout', requireAuth, (req: AuthRequest, res: Response): void => {
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice(7);
    const db = getDb();
    db.prepare('DELETE FROM sessions WHERE token = ?').run(token);
  }
  logAction(req.admin?.id || null, req.admin?.username || null, 'LOGOUT', null, null, {}, req.ip || null);
  res.json({ message: 'Logged out' });
});

// GET /api/auth/me
router.get('/me', requireAuth, (req: AuthRequest, res: Response): void => {
  const db = getDb();
  const admin = db.prepare(
    'SELECT id, username, role, status, bouquet, expiry_date, credits, max_credits FROM admins WHERE id = ?'
  ).get(req.admin!.id) as {
    id: string; username: string; role: string; status: string;
    bouquet?: string; expiry_date?: string; credits?: number; max_credits?: number;
  } | undefined;

  if (!admin) {
    res.status(404).json({ error: 'Admin not found' });
    return;
  }

  res.json({
    admin: {
      id: admin.id,
      username: admin.username,
      role: admin.role,
      status: admin.status,
      bouquet: admin.bouquet,
      expiry_date: admin.expiry_date,
      credits: admin.credits,
      max_credits: admin.max_credits,
    },
  });
});

// POST /api/auth/change-password
router.post('/change-password', requireAuth, (req: AuthRequest, res: Response): void => {
  const { current_password, new_password, new_username } = req.body as {
    current_password?: string;
    new_password?: string;
    new_username?: string;
  };

  if (!current_password || (!new_password && !new_username)) {
    res.status(400).json({ error: 'current_password and at least one of new_password or new_username required' });
    return;
  }

  const db = getDb();
  const admin = db.prepare(
    'SELECT id, username, password_hash FROM admins WHERE id = ?'
  ).get(req.admin!.id) as { id: string; username: string; password_hash: string } | undefined;

  if (!admin || !bcrypt.compareSync(current_password, admin.password_hash)) {
    res.status(401).json({ error: 'Current password incorrect' });
    return;
  }

  const updates: string[] = [];
  const params: unknown[] = [];

  if (new_password) {
    if (new_password.length < 6) {
      res.status(400).json({ error: 'New password must be at least 6 characters' });
      return;
    }
    updates.push('password_hash = ?');
    params.push(bcrypt.hashSync(new_password, 12));
  }

  if (new_username) {
    const exists = db.prepare('SELECT id FROM admins WHERE username = ? AND id != ?').get(new_username, admin.id);
    if (exists) {
      res.status(409).json({ error: 'Username already taken' });
      return;
    }
    updates.push('username = ?');
    params.push(new_username);
  }

  updates.push("updated_at = datetime('now')");
  params.push(admin.id);

  db.prepare(`UPDATE admins SET ${updates.join(', ')} WHERE id = ?`).run(...params);

  logAction(req.admin!.id, req.admin!.username, 'CHANGE_CREDENTIALS', 'admin', admin.id, {}, req.ip || null);

  res.json({ message: 'Credentials updated successfully' });
});

export default router;
