#!/bin/bash
FILE="/tmp/repos/nexTPro-ScriptAll/nexus-web/server/routes/clients.ts"

# Chercher le if protocol == 'ssh' et injecter la suite pour xray uniquement dans la route GET /
sed -i '/} else {/c\
    } else if (["vless", "vmess", "trojan", "socks"].includes(client.protocol)) {\n\
       try {\n\
         const cmd = `tail -n 10000 /var/log/xray/access.log | grep "${client.username}" | awk "{print \\$3}" | cut -d: -f1 | sort | uniq | wc -l`;\n\
         const ips = execSync(cmd).toString().trim();\n\
         client.active_connections = parseInt(ips) || 0;\n\
       } catch (e) {\n\
         client.active_connections = 0;\n\
       }\n\
    } else {' "$FILE"
