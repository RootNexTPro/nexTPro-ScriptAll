#!/bin/bash

function patch_xray_script() {
  FILE=$1
  PROTO=$2

  # Inject inputs after Validity request
  sed -i '/read -rp "  Validity (days): " masaaktif/i \
while true; do\n\
read -rp "  Quota Data Limit (MB, 0=illimité) : " QuotaLimit\n\
if [[ -z "$QuotaLimit" ]]; then QuotaLimit=0; fi\n\
read -rp "  Max Logins / IP : " MaxLogins\n\
if [[ -z "$MaxLogins" ]]; then MaxLogins=1; fi\n\
break\n\
done\n' "$FILE"

  # Also support 'read -p' without r
  sed -i '/read -p "  Validity (days): " masaaktif/i \
while true; do\n\
read -p "  Quota Data Limit (MB, 0=illimité) : " QuotaLimit\n\
if [[ -z "$QuotaLimit" ]]; then QuotaLimit=0; fi\n\
read -p "  Max Logins / IP : " MaxLogins\n\
if [[ -z "$MaxLogins" ]]; then MaxLogins=1; fi\n\
break\n\
done\n' "$FILE"

  # Patch the sync logic CURL payload
  # Old pattern: -d '{"username":"'"$user"'", "protocol":"PROTO", "password":"", "expiry":"'"$exp"'", "uuid":"'"$uuid"'"}' > /dev/null 2>&1
  # For Socks, trojan they may have password populated. So just replace the end
  sed -i 's/"uuid":"'"'"'$uuid'"'"'"}/"uuid":"'"'"'$uuid'"'"'", "quota_limit_mb":'"$QuotaLimit"', "max_logins":'"$MaxLogins"'}/g' "$FILE"
}

patch_xray_script "/tmp/repos/nexTPro-ScriptAll/menu/vmess.sh" "vmess"
patch_xray_script "/tmp/repos/nexTPro-ScriptAll/menu/trojan.sh" "trojan"
patch_xray_script "/tmp/repos/nexTPro-ScriptAll/menu/socks.sh" "socks"
