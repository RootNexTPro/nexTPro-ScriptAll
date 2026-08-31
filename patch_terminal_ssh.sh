#!/bin/bash
FILE="/tmp/repos/nexTPro-ScriptAll/menu/ssh.sh"

sed -i '/read -p "  Account Validity (days) : " DaysActive/i \
read -p "  Quota Data Limit (MB, 0=illimité) : " QuotaLimit\n\
if [[ -z "$QuotaLimit" ]]; then QuotaLimit=0; fi\n\
read -p "  Max Logins / IP : " MaxLogins\n\
if [[ -z "$MaxLogins" ]]; then MaxLogins=1; fi\n' "$FILE"

sed -i 's/useradd -e \$(date -d "$DaysActive days" +"%Y-%m-%d") -s \/bin\/false -M "$Login"/useradd -e $(date -d "$DaysActive days" +"%Y-%m-%d") -s \/bin\/false -M "$Login" \&\& echo "$Login hard maxlogins $MaxLogins" >> \/etc\/security\/limits.conf/g' "$FILE"

sed -i '/" | passwd "$Login" &>\/dev\/null/a \
sqlite3 /etc/nexus-tunnel-web/nexus.db "INSERT OR REPLACE INTO clients (id, username, password, protocol, expires_at, quota_limit_mb, max_logins, status, created_by, created_at, updated_at) VALUES (lower(hex(randomblob(16))), '"'"'$Login'"'"', '"'"'$Pass'"'"', '"'"'ssh'"'"', '"'"'$exp'"'"', $QuotaLimit, $MaxLogins, '"'"'active'"'"', '"'"'terminal'"'"', datetime('"'"'now'"'"'), datetime('"'"'now'"'"'));" &>/dev/null' "$FILE"
