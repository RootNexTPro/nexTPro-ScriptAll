#!/bin/bash
FILE="/tmp/repos/nexTPro-ScriptAll/nexus-web/server/routes/clients.ts"

# Importer execSync
sed -i 's/import { Router, Response } from .express.;/import { Router, Response } from "express";\nimport { execSync } from "child_process";/' "$FILE"

# Modifier la requête SQL SELECT
sed -i 's/query = .SELECT id, username, protocol, plan_id, expires_at, status, created_by, created_at, updated_at FROM clients.;/query = `SELECT id, username, protocol, plan_id, expires_at, quota_limit_mb, quota_used_mb, status, created_by, created_at, updated_at FROM clients`;/' "$FILE"

# Modifier la réponse (ps -u)
sed -i '/res.json(db.prepare(query).all(...params));/c\
  const clients = db.prepare(query).all(...params) as any[];\n\
  const clientsWithConnections = clients.map(client => {\n\
    if (client.protocol === "ssh") {\n\
      try {\n\
        const connections = execSync(`ps -u ${client.username} | grep sshd | wc -l`).toString().trim();\n\
        client.active_connections = parseInt(connections) || 0;\n\
      } catch (e) {\n\
        client.active_connections = 0;\n\
      }\n\
    } else {\n\
       client.active_connections = 0;\n\
    }\n\
    return client;\n\
  });\n\
  res.json(clientsWithConnections);' "$FILE"


# Récupérer quota_limit_mb et max_logins
sed -i 's/const { username, password, protocol, days, plan_id } = req.body as any;/const { username, password, protocol, days, plan_id, quota_limit_mb, max_logins } = req.body as any;/g' "$FILE"

# Valider la valeur par défaut pour max_logins (si vide)
sed -i '/const exists = db.prepare(.SELECT id FROM clients WHERE username = ? AND protocol = ?.).get(username, normalizedProtocol);/i \  const finalQuota = quota_limit_mb || 0;\n  const finalMaxLogins = max_logins || 1;\n' "$FILE"

# Injecter dans les paramètres de scripts.ts (ssh/slowdns)
sed -i "s/case 'ssh': scriptResult = createSshAccount(username, password, days); break;/case 'ssh': scriptResult = createSshAccount(username, password, days, finalMaxLogins); break;/g" "$FILE"
sed -i "s/case 'slowdns': scriptResult = createSlowDnsAccount(username, password, days); break;/case 'slowdns': scriptResult = createSlowDnsAccount(username, password, days, finalMaxLogins); break;/g" "$FILE"

# Modifier la requête INSERT INTO clients
sed -i 's/INSERT INTO clients (id, username, password, protocol, plan_id, expires_at, status, created_by, extra_data)/INSERT INTO clients (id, username, password, protocol, plan_id, expires_at, quota_limit_mb, max_logins, status, created_by, extra_data)/g' "$FILE"
sed -i 's/VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)/VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)/g' "$FILE"
sed -i "s/\.run(id, username, password, normalizedProtocol, plan_id || null, expiresAt, 'active', req.admin!.id, JSON.stringify(scriptResult.data || {})/\.run(id, username, password, normalizedProtocol, plan_id || null, expiresAt, finalQuota, finalMaxLogins, 'active', req.admin!.id, JSON.stringify(scriptResult.data || {})/g" "$FILE"
