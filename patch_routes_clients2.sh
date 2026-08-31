#!/bin/bash
FILE="/tmp/repos/nexTPro-ScriptAll/nexus-web/server/routes/clients.ts"

# Récupérer quota_limit_mb et max_logins
sed -i 's/const { username, password, protocol, days, plan_id } = req.body as any;/const { username, password, protocol, days, plan_id, quota_limit_mb, max_logins } = req.body as any;/g' "$FILE"

# Valider la valeur par défaut pour max_logins (si vide)
sed -i '/const exists = db.prepare(.SELECT id FROM clients WHERE username = ? AND protocol = ?.).get(username, normalizedProtocol);/i \  const finalQuota = quota_limit_mb || 0;\n  const finalMaxLogins = max_logins || 1;\n' "$FILE"

# Injecter dans les paramètres de scripts.ts (ssh/slowdns)
# Note: createSshAccount va maintenant prendre max_logins en 4eme paramètre.
sed -i "s/case 'ssh': scriptResult = createSshAccount(username, password, days); break;/case 'ssh': scriptResult = createSshAccount(username, password, days, finalMaxLogins); break;/g" "$FILE"
sed -i "s/case 'slowdns': scriptResult = createSlowDnsAccount(username, password, days); break;/case 'slowdns': scriptResult = createSlowDnsAccount(username, password, days, finalMaxLogins); break;/g" "$FILE"

# Modifier la requête d'insertion (Ligne ~197)
sed -i 's/VALUES (?, ?, ?, ?, ?, .active., ?, ?)`).run(/VALUES (?, ?, ?, ?, ?, ?, ?, .active., ?, ?)`).run(/g' "$FILE"
sed -i "s/INSERT INTO clients (id, username, password, protocol, expires_at, status, created_by, extra_data)/INSERT INTO clients (id, username, password, protocol, expires_at, quota_limit_mb, max_logins, status, created_by, extra_data)/g" "$FILE"
sed -i 's/uuidv4(), username, password, normalizedProtocol, (scriptResult.data as any).expiry || new Date(Date.now() + days * 86400000).toISOString().split("T")[0], req.admin!.id, JSON.stringify(scriptResult.data)/uuidv4(), username, password, normalizedProtocol, (scriptResult.data as any).expiry || new Date(Date.now() + days * 86400000).toISOString().split("T")[0], finalQuota, finalMaxLogins, req.admin!.id, JSON.stringify(scriptResult.data)/g' "$FILE"
