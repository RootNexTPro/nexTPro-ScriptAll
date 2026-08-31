#!/bin/bash
FILE="/tmp/repos/nexTPro-ScriptAll/menu/zivpn.sh"

# Injecter les inputs
sed -i '/read -rp "  Validity (days): " days/i \
while true; do\n\
read -rp "  Quota Data Limit (MB, 0=illimité) : " QuotaLimit\n\
if [[ -z "$QuotaLimit" ]]; then QuotaLimit=0; fi\n\
read -rp "  Max Logins / IP : " MaxLogins\n\
if [[ -z "$MaxLogins" ]]; then MaxLogins=1; fi\n\
break\n\
done\n' "$FILE"

# Injecter l'insertion SQLite
sed -i '/systemctl restart zivpn/a \
sqlite3 /etc/nexus-tunnel-web/nexus.db "INSERT OR REPLACE INTO clients (id, username, password, protocol, expires_at, quota_limit_mb, max_logins, status, created_by, created_at, updated_at) VALUES (lower(hex(randomblob(16))), '"'"'$user'"'"', '"'"'$pass'"'"', '"'"'zipvpn'"'"', '"'"'$exp'"'"', $QuotaLimit, $MaxLogins, '"'"'active'"'"', '"'"'terminal'"'"', datetime('"'"'now'"'"'), datetime('"'"'now'"'"'));" >/dev/null 2>&1' "$FILE"
