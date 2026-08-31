#!/bin/bash
FILE="/tmp/repos/nexTPro-ScriptAll/nexus-web/server/routes/clients.ts"

# 1. Importer execSync
sed -i 's/import { Router, Response } from .express.;/import { Router, Response } from "express";\nimport { execSync } from "child_process";/' "$FILE"

# 2. Modifier la requête SQL SELECT dans le GET /
sed -i 's/query = .SELECT id, username, protocol, plan_id, expires_at, status, created_by, created_at, updated_at FROM clients.;/query = `SELECT id, username, protocol, plan_id, expires_at, quota_limit_mb, quota_used_mb, max_logins, status, created_by, created_at, updated_at FROM clients`;/' "$FILE"

# 3. Injecter l'enrichissement (ps -u et tail access.log) avant le res.json
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
    } else if (["vless", "vmess", "trojan", "socks"].includes(client.protocol)) {\n\
       try {\n\
         const cmd = `tail -n 10000 /var/log/xray/access.log | grep "${client.username}" | awk "{print \\$3}" | cut -d: -f1 | sort | uniq | wc -l`;\n\
         const ips = execSync(cmd).toString().trim();\n\
         client.active_connections = parseInt(ips) || 0;\n\
       } catch (e) {\n\
         client.active_connections = 0;\n\
       }\n\
    } else {\n\
       client.active_connections = 0;\n\
    }\n\
    return client;\n\
  });\n\
  res.json(clientsWithConnections);' "$FILE"

# 4. Dans le POST /, extraire les nouvelles variables
sed -i 's/const { username, password, protocol, days, plan_id } = req.body as any;/const { username, password, protocol, days, plan_id, quota_limit_mb, max_logins } = req.body as any;/g' "$FILE"

# 5. Définir des valeurs par défaut pour les quotas et les connexions
sed -i '/const exists = db.prepare(.SELECT id FROM clients WHERE username = ? AND protocol = ?.).get(username, normalizedProtocol);/i \  const finalQuota = quota_limit_mb || 0;\n  const finalMaxLogins = max_logins || 1;\n' "$FILE"

# 6. Injecter dans createSshAccount
sed -i "s/case 'ssh': scriptResult = createSshAccount(username, password, days); break;/case 'ssh': scriptResult = createSshAccount(username, password, days, finalMaxLogins); break;/g" "$FILE"
sed -i "s/case 'slowdns': scriptResult = createSlowDnsAccount(username, password, days); break;/case 'slowdns': scriptResult = createSlowDnsAccount(username, password, days, finalMaxLogins); break;/g" "$FILE"

# 7. Modifier les requêtes INSERT
sed -i 's/INSERT INTO clients (id, username, password, protocol, expires_at, status, created_by, extra_data)/INSERT INTO clients (id, username, password, protocol, expires_at, quota_limit_mb, max_logins, status, created_by, extra_data)/g' "$FILE"
sed -i 's/uuidv4(), username, password || '"''"', protocol, expiry, superAdmin.id, JSON.stringify({ uuid: uuid || '"''"' })/uuidv4(), username, password || '"''"', protocol, expiry, finalQuota, finalMaxLogins, superAdmin.id, JSON.stringify({ uuid: uuid || '"''"' })/g' "$FILE"

sed -i 's/INSERT INTO clients (id, username, password, protocol, plan_id, expires_at, status, created_by, extra_data)/INSERT INTO clients (id, username, password, protocol, plan_id, expires_at, quota_limit_mb, max_logins, status, created_by, extra_data)/g' "$FILE"
sed -i 's/VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)/VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)/g' "$FILE"
sed -i "s/\.run(id, username, password, normalizedProtocol, plan_id || null, expiresAt, 'active', req.admin!.id, JSON.stringify(scriptResult.data || {})/\.run(id, username, password, normalizedProtocol, plan_id || null, expiresAt, finalQuota, finalMaxLogins, 'active', req.admin!.id, JSON.stringify(scriptResult.data || {})/g" "$FILE"
