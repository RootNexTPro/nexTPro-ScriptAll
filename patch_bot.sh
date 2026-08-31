#!/bin/bash
FILE="/tmp/repos/nexTPro-ScriptAll/nexus_core_bot/modules/ssh_core.py"
sed -i 's/exp_date = data.get(.expiry., .N\/A.)/exp_date = data.get("expiry", "N\/A")\n    \n    quota_limit, quota_used = 0, 0\n    active_conn = 0\n    try:\n        import sqlite3\n        conn = sqlite3.connect("\/etc\/nexus-tunnel-web\/nexus.db")\n        c = conn.cursor()\n        c.execute("SELECT quota_limit_mb, quota_used_mb FROM clients WHERE username = ? AND protocol = ?", (user, "ssh"))\n        row = c.fetchone()\n        if row:\n            quota_limit, quota_used = row\n        conn.close()\n        active_conn = subprocess.getoutput(f"ps -u {user} | grep sshd | wc -l").strip()\n    except Exception:\n        pass\n/g' "$FILE"

sed -i 's/f"⏳ <b>Expiry Date:<\/b> {exp_date}\\n"/f"⏳ <b>Expiry Date:<\/b> {exp_date}\\n" \\\n        f"📊 <b>Quota:<\/b> {quota_used} Mo \/ {quota_limit} Mo\\n" \\\n        f"👥 <b>Sessions Actives:<\/b> {active_conn}\\n"/g' "$FILE"
