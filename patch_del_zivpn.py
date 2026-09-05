import sys

file_path = "/tmp/repos/nexTPro-ScriptAll/menu/zivpn.sh"
with open(file_path, "r") as f:
    content = f.read()

old_cmd = 'sqlite3 /etc/nexus-tunnel-web/nexus.db "INSERT OR REPLACE INTO clients (id, username, password, protocol, expires_at, quota_limit_mb, max_logins, status, created_by, created_at, updated_at) VALUES (lower(hex(randomblob(16))), \'$user\', \'$pass\', \'zipvpn\', \'$exp\', $QuotaLimit, $MaxLogins, \'active\', \'terminal\', datetime(\'now\'), datetime(\'now\'));" >/dev/null 2>&1'
new_cmd = 'sqlite3 /etc/nexus-tunnel-web/nexus.db "DELETE FROM clients WHERE username = \'$user\' AND protocol = \'zipvpn\';" >/dev/null 2>&1'

# Only replace the second occurrence (the one in del_zivpn)
# A safe way is to split by old_cmd and rejoin, keeping the first as is, replacing the second
parts = content.split(old_cmd)
if len(parts) > 2:
    new_content = parts[0] + old_cmd + parts[1] + new_cmd + parts[2]
    with open(file_path, "w") as f:
        f.write(new_content)
else:
    print("Error: Could not find exactly two occurrences")
