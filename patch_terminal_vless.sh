#!/bin/bash
FILE="/tmp/repos/nexTPro-ScriptAll/menu/vless.sh"

sed -i '/read -rp "  Validity (days): " masaaktif/i \
while true; do\n\
read -rp "  Quota Data Limit (MB, 0=illimité) : " QuotaLimit\n\
if [[ -z "$QuotaLimit" ]]; then QuotaLimit=0; fi\n\
read -rp "  Max Logins / IP : " MaxLogins\n\
if [[ -z "$MaxLogins" ]]; then MaxLogins=1; fi\n\
break\n\
done\n' "$FILE"


# Find the post /sync line to replace it by direct DB insert or just update the curl payload. We will update the curl payload to the nodeJS backend directly!
sed -i 's/-d .{"username":"'"'"'$user'"'"'", "protocol":"vless", "password":"", "expiry":"'"'"'$exp'"'"', "uuid":"'"'"'$uuid'"'"'}. > \/dev\/null 2>&1/-d '"'"'{"username":"'"$user"'", "protocol":"vless", "password":"", "expiry":"'"$exp"'", "uuid":"'"$uuid"'", "quota_limit_mb":'"$QuotaLimit"', "max_logins":'"$MaxLogins"'}'"'"' > \/dev\/null 2>\&1/g' "$FILE"
