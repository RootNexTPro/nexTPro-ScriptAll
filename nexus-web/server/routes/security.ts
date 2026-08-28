import { Router, Response } from 'express';
import { getDb } from '../db';
import { requireAuth, AuthRequest } from '../middleware/auth';
const router = Router();
router.get('/logs', requireAuth, (req: AuthRequest, res: Response) => {
  const admin = req.admin!;
  if (admin.role !== 'super_admin') {
    const db = getDb();
    const adminData = db.prepare('SELECT can_manage_security FROM admins WHERE id = ?').get(admin.id) as any;
    if (!adminData || !adminData.can_manage_security) { return res.status(403).json({ error: 'Forbidden.' }); }
  }
  const db = getDb();
  const logs = db.prepare('SELECT * FROM login_logs ORDER BY created_at DESC LIMIT 100').all();
  const blocked = db.prepare('SELECT * FROM blocked_ips').all();
  res.json({ logs, blocked });
});
router.post('/block', requireAuth, (req: AuthRequest, res: Response) => {
  const admin = req.admin!;
  if (admin.role !== 'super_admin') {
    const db = getDb();
    const adminData = db.prepare('SELECT can_manage_security FROM admins WHERE id = ?').get(admin.id) as any;
    if (!adminData || !adminData.can_manage_security) { return res.status(403).json({ error: 'Forbidden.' }); }
  }
  const { ip, durationMinutes, reason } = req.body;
  if (!ip) return res.status(400).json({ error: 'IP is required' });
  const db = getDb();
  let blockedUntil = 'forever';
  if (durationMinutes && durationMinutes > 0) {
    const d = new Date(); d.setMinutes(d.getMinutes() + durationMinutes); blockedUntil = d.toISOString();
  }
  db.prepare(`INSERT OR REPLACE INTO blocked_ips (ip, blocked_until, reason) VALUES (?, ?, ?)`).run(ip, blockedUntil, reason || 'Suspicious activity');
  res.json({ success: true, message: 'IP blocked successfully' });
});
router.post('/unblock', requireAuth, (req: AuthRequest, res: Response) => {
  const admin = req.admin!;
  if (admin.role !== 'super_admin') {
    const db = getDb();
    const adminData = db.prepare('SELECT can_manage_security FROM admins WHERE id = ?').get(admin.id) as any;
    if (!adminData || !adminData.can_manage_security) { return res.status(403).json({ error: 'Forbidden.' }); }
  }
  const { ip } = req.body;
  if (!ip) return res.status(400).json({ error: 'IP is required' });
  const db = getDb();
  db.prepare('DELETE FROM blocked_ips WHERE ip = ?').run(ip);
  res.json({ success: true, message: 'IP unblocked successfully' });
});
router.get('/permissions', requireAuth, (req: AuthRequest, res: Response) => {
  const admin = req.admin!;
  if (admin.role !== 'super_admin') { return res.status(403).json({ error: 'Forbidden' }); }
  const db = getDb();
  const adminsList = db.prepare('SELECT id, username, can_manage_security FROM admins WHERE role = ?').all('admin');
  res.json({ admins: adminsList });
});
router.post('/permissions', requireAuth, (req: AuthRequest, res: Response) => {
  const admin = req.admin!;
  if (admin.role !== 'super_admin') { return res.status(403).json({ error: 'Forbidden' }); }
  const { adminId, canManage } = req.body;
  if (!adminId) return res.status(400).json({ error: 'Admin ID required' });
  const db = getDb();
  db.prepare('UPDATE admins SET can_manage_security = ? WHERE id = ?').run(canManage ? 1 : 0, adminId);
  res.json({ success: true, message: 'Permissions updated successfully' });
});
router.get('/my-permissions', requireAuth, (req: AuthRequest, res: Response) => {
  const admin = req.admin!;
  if (admin.role === 'super_admin') { return res.json({ canManage: true }); }
  const db = getDb();
  const adminData = db.prepare('SELECT can_manage_security FROM admins WHERE id = ?').get(admin.id) as any;
  res.json({ canManage: !!(adminData && adminData.can_manage_security) });
});
export default router;
