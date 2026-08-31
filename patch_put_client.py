import sys

file_path = "/tmp/repos/nexTPro-ScriptAll/nexus-web/server/routes/clients.ts"
with open(file_path, "r") as f:
    content = f.read()

old_put = """router.put('/:id', requireAuth, (req: AuthRequest, res: Response): void => {
  const { password } = req.body as { password?: string };
  const db = getDb();
  const client = db.prepare('SELECT * FROM clients WHERE id = ?').get(req.params.id) as any;
  if (!client) { res.status(404).json({ error: 'Client not found' }); return; }
  if (req.admin!.role === 'reseller') {
    const own = db.prepare('SELECT created_by FROM clients WHERE id = ?').get(req.params.id) as any;
    if (!own || own.created_by !== req.admin!.id) { res.status(403).json({ error: 'Forbidden' }); return; }
  }
  if (!password) { res.status(400).json({ error: 'password required' }); return; }
  db.prepare("UPDATE clients SET password = ?, updated_at = datetime('now') WHERE id = ?").run(password, req.params.id);
  logAction(req.admin!.id, req.admin!.username, 'UPDATE_CLIENT', 'client', req.params.id, { username: client.username }, req.ip || null);
  res.json({ message: 'Client updated' });
});"""

new_put = """router.put('/:id', requireAuth, (req: AuthRequest, res: Response): void => {
  const { password, quota_limit_mb, max_logins } = req.body as any;
  const db = getDb();
  const client = db.prepare('SELECT * FROM clients WHERE id = ?').get(req.params.id) as any;
  if (!client) { res.status(404).json({ error: 'Client not found' }); return; }

  if (req.admin!.role === 'reseller') {
    const own = db.prepare('SELECT created_by FROM clients WHERE id = ?').get(req.params.id) as any;
    if (!own || own.created_by !== req.admin!.id) { res.status(403).json({ error: 'Forbidden' }); return; }
  }

  let updates = [];
  let params = [];

  if (password) {
    updates.push("password = ?");
    params.push(password);
  }
  if (quota_limit_mb !== undefined) {
    updates.push("quota_limit_mb = ?");
    params.push(quota_limit_mb || 0);
  }
  if (max_logins !== undefined) {
    updates.push("max_logins = ?");
    params.push(max_logins || 1);
  }

  if (updates.length === 0) {
    res.status(400).json({ error: 'No fields to update' }); return;
  }

  updates.push("updated_at = datetime('now')");
  params.push(req.params.id);

  db.prepare(`UPDATE clients SET ${updates.join(', ')} WHERE id = ?`).run(...params);

  logAction(req.admin!.id, req.admin!.username, 'UPDATE_CLIENT', 'client', req.params.id, { username: client.username, updates }, req.ip || null);
  res.json({ message: 'Client updated successfully' });
});"""

content = content.replace(old_put, new_put)

with open(file_path, "w") as f:
    f.write(content)
