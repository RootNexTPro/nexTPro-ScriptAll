#!/bin/bash
FILE="/tmp/repos/nexTPro-ScriptAll/nexus-web/server/routes/clients.ts"

if ! grep -q "execSync" "$FILE"; then
  sed -i 's/import { Router, Response } from .express.;/import { Router, Response } from "express";\nimport { execSync } from "child_process";/' "$FILE"
fi

sed -i 's/query = .SELECT id, username, protocol, plan_id, expires_at, status, created_by, created_at, updated_at FROM clients.;/query = `SELECT id, username, protocol, plan_id, expires_at, quota_limit_mb, quota_used_mb, max_logins, status, created_by, created_at, updated_at FROM clients`;/' "$FILE"

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

# Dans post /sync (vers ligne 130) on a uuidv4()
sed -i 's/uuidv4(), username, password || '"''"', protocol, expiry, superAdmin.id,/uuidv4(), username, password || '"''"', protocol, expiry, 0, 1, superAdmin.id,/g' "$FILE"
sed -i 's/INSERT INTO clients (id, username, password, protocol, expires_at, status, created_by, extra_data)/INSERT INTO clients (id, username, password, protocol, expires_at, quota_limit_mb, max_logins, status, created_by, extra_data)/g' "$FILE"
sed -i 's/VALUES (?, ?, ?, ?, ?, .active., ?, ?)/VALUES (?, ?, ?, ?, ?, ?, ?, .active., ?, ?)/g' "$FILE"

sed -i 's/const { username, password, protocol, days, plan_id } = req.body as any;/const { username, password, protocol, days, plan_id, quota_limit_mb, max_logins } = req.body as any;/g' "$FILE"
sed -i '/const exists = db.prepare(.SELECT id FROM clients WHERE username = ? AND protocol = ?.).get(username, normalizedProtocol);/i \  const finalQuotaPOST = quota_limit_mb || 0;\n  const finalMaxLoginsPOST = max_logins || 1;\n' "$FILE"

sed -i "s/case 'ssh': scriptResult = createSshAccount(username, password, days); break;/case 'ssh': scriptResult = createSshAccount(username, password, days, finalMaxLoginsPOST); break;/g" "$FILE"
sed -i "s/case 'slowdns': scriptResult = createSlowDnsAccount(username, password, days); break;/case 'slowdns': scriptResult = createSlowDnsAccount(username, password, days, finalMaxLoginsPOST); break;/g" "$FILE"

sed -i 's/INSERT INTO clients (id, username, password, protocol, plan_id, expires_at, status, created_by, extra_data)/INSERT INTO clients (id, username, password, protocol, plan_id, expires_at, quota_limit_mb, max_logins, status, created_by, extra_data)/g' "$FILE"
sed -i 's/VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)/VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)/g' "$FILE"
sed -i "s/\.run(id, username, password, normalizedProtocol, plan_id || null, expiresAt, 'active', req.admin!.id, JSON.stringify(scriptResult.data || {})/\.run(id, username, password, normalizedProtocol, plan_id || null, expiresAt, finalQuotaPOST, finalMaxLoginsPOST, 'active', req.admin!.id, JSON.stringify(scriptResult.data || {})/g" "$FILE"
